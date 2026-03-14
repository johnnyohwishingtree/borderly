import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  SafeAreaView,
  ScrollView,
  Animated,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { PortalWebView, PortalWebViewHandle } from '../../components/submission/PortalWebView';
import type { NavigationState } from '../../components/submission/PortalWebView';
import { AutoFillBanner } from '../../components/submission/AutoFillBanner';
import { CopyableField } from '../../components/guide';
import { getSchemaByCountryCode } from '../../services/schemas/schemaRegistry';
import { generateFilledFormForTraveler } from '../../services/forms/formEngine';
import { automationScriptRegistry, AutomationScriptUtils } from '../../services/submission';
import { useTripStore } from '../../stores';
import { useProfileStore } from '../../stores/useProfileStore';
import { TripStackParamList } from '../../app/navigation/types';
import type { FilledForm, FilledFormSection, FilledFormField } from '../../services/forms/formEngine';
import { formatFieldValue } from '../../utils/fieldFormatters';

type PortalSubmissionRouteProp = RouteProp<TripStackParamList, 'PortalSubmission'>;

/** Shape of a field spec sent to the in-page auto-fill script. */
interface FieldSpec {
  id: string;
  selector: string;
  value: string;
  inputType: string;
}

/** Banner state tracked between page loads. */
interface BannerState {
  filled: number;
  total: number;
}

/**
 * Build the JavaScript snippet injected into the WebView to auto-fill form fields.
 *
 * Design goals:
 * - Non-destructive: skips fields that already have a value.
 * - Works for text, select, radio, checkbox, and date inputs.
 * - Reports results back via window.ReactNativeWebView.postMessage so the
 *   screen can show the AutoFillBanner.
 * - Adds a brief blue highlight to each successfully filled field.
 */
function buildAutoFillScript(fields: FieldSpec[]): string {
  // Serialise field specs into the script. JSON.stringify is safe here —
  // it escapes quotes/slashes so the embedded string can't break out of
  // the surrounding JS string.
  const fieldsJson = JSON.stringify(fields);

  return (
    '(function(){' +
    'var fields=' + fieldsJson + ';' +
    'var filled=0,failed=0;' +
    'var results=[];' +
    'for(var i=0;i<fields.length;i++){' +
      'var f=fields[i];' +
      'try{' +
        'var el=document.querySelector(f.selector);' +
        'if(!el){results.push({id:f.id,status:"not_found"});failed++;continue;}' +
        // Non-destructive: skip if field already has content
        'var existing=(el.value!==undefined?el.value.toString().trim():"");' +
        'if(existing!==""){results.push({id:f.id,status:"skipped"});continue;}' +
        'if(f.inputType==="select"){' +
          'var opts=Array.from(el.options||[]);' +
          'var m=opts.find(function(o){return o.value===f.value;})||' +
              'opts.find(function(o){return o.text.toLowerCase().indexOf(f.value.toLowerCase())>=0;});' +
          'if(m){el.value=m.value;el.dispatchEvent(new Event("change",{bubbles:true}));' +
            'results.push({id:f.id,status:"filled"});filled++;}' +
          'else{results.push({id:f.id,status:"failed"});failed++;}' +
        '}else if(f.inputType==="radio"){' +
          'var r=document.querySelector(f.selector);' +
          'if(r){r.checked=true;r.dispatchEvent(new Event("change",{bubbles:true}));' +
            'results.push({id:f.id,status:"filled"});filled++;}' +
          'else{results.push({id:f.id,status:"failed"});failed++;}' +
        '}else if(f.inputType==="checkbox"){' +
          'el.checked=(f.value==="true");' +
          'el.dispatchEvent(new Event("change",{bubbles:true}));' +
          'results.push({id:f.id,status:"filled"});filled++;' +
        '}else{' +
          // Use native setter so React-controlled inputs pick up the change
          'var desc=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value");' +
          'if(desc&&desc.set){desc.set.call(el,f.value);}else{el.value=f.value;}' +
          'el.dispatchEvent(new Event("input",{bubbles:true}));' +
          'el.dispatchEvent(new Event("change",{bubbles:true}));' +
          // Brief blue highlight so the user can see what was filled
          'el.style.outline="2px solid #3B82F6";' +
          '(function(e){setTimeout(function(){e.style.outline="";},2500);}(el));' +
          'results.push({id:f.id,status:"filled"});filled++;' +
        '}' +
      '}catch(e){results.push({id:f.id,status:"failed",error:e.message});failed++;}' +
    '}' +
    'window.ReactNativeWebView.postMessage(JSON.stringify({' +
      'type:"AUTO_FILL_RESULT",' +
      'filled:filled,' +
      'failed:failed,' +
      'total:fields.length,' +
      'results:results' +
    '}));' +
    'true;' +
    '})();'
  );
}

export default function PortalSubmissionScreen() {
  const navigation = useNavigation();
  const route = useRoute<PortalSubmissionRouteProp>();
  const { url, countryCode, tripId, legId } = route.params;

  const webViewRef = useRef<PortalWebViewHandle>(null);

  // Navigation state from WebView
  const [navState, setNavState] = useState<NavigationState>({
    url,
    loading: true,
    canGoBack: false,
    canGoForward: false,
  });

  // Progress tracking
  const [currentStep, setCurrentStep] = useState(1);

  // Collapsible panel
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Auto-fill banner state (null = hidden)
  const [bannerState, setBannerState] = useState<BannerState | null>(null);

  // Load schema and form data
  const { trips } = useTripStore();
  const { profile } = useProfileStore();

  const trip = trips.find(t => t.id === tripId);
  const leg = trip?.legs.find(l => l.id === legId);
  const schema = getSchemaByCountryCode(countryCode);
  const totalSteps = schema?.submissionGuide?.length ?? 0;

  // Build fields for the current step (for the copy-paste fallback panel)
  const currentStepFields = (() => {
    if (!schema || !leg || !profile) return [];
    const step = schema.submissionGuide?.[currentStep - 1];
    if (!step) return [];

    try {
      const filledForm = generateFilledFormForTraveler(
        profile.id,
        [profile],
        leg,
        schema,
        leg.formData ?? {}
      );

      if (!filledForm) return [];

      const allFields: { id: string; label: string; value: string }[] = [];
      filledForm.sections.forEach((section: FilledFormSection) => {
        section.fields.forEach((field: FilledFormField) => {
          const fieldsOnScreen = step.fieldsOnThisScreen ?? [];
          if (fieldsOnScreen.length === 0 || fieldsOnScreen.includes(field.id)) {
            const value = formatFieldValue(field.currentValue, field.type);
            if (value) {
              allFields.push({ id: field.id, label: field.label, value });
            }
          }
        });
      });
      return allFields;
    } catch {
      return [];
    }
  })();

  const handleNavigationChange = useCallback((state: NavigationState) => {
    setNavState(state);
  }, []);

  /**
   * Called when a page finishes loading.
   * 1. Detects which submission guide step the URL corresponds to.
   * 2. Injects a non-destructive auto-fill script for the fields on that page.
   */
  const handlePageLoad = useCallback(
    (loadedUrl: string) => {
      if (!schema?.submissionGuide) return;

      // Detect step by URL
      let stepIndex = currentStep - 1;
      const detected = schema.submissionGuide.findIndex((step) => {
        if (!step.automation?.url) return false;
        return loadedUrl.startsWith(step.automation.url);
      });
      if (detected >= 0) {
        stepIndex = detected;
        setCurrentStep(detected + 1);
      }

      // Early exit if we don't have the data we need
      if (!leg || !profile) return;

      const automationScript = automationScriptRegistry.getScriptSync(countryCode);
      if (!automationScript) return;

      const step = schema.submissionGuide[stepIndex];
      const fieldsOnScreen = step?.fieldsOnThisScreen ?? [];

      let filledForm: FilledForm | null;
      try {
        filledForm = generateFilledFormForTraveler(
          profile.id,
          [profile],
          leg,
          schema,
          leg.formData ?? {}
        );
      } catch {
        return;
      }

      if (!filledForm) return;

      const fieldSpecs: FieldSpec[] = [];
      filledForm.sections.forEach((section: FilledFormSection) => {
        section.fields.forEach((field: FilledFormField) => {
          // Only include fields listed for this screen (or all if none specified)
          if (fieldsOnScreen.length > 0 && !fieldsOnScreen.includes(field.id)) return;

          const mapping = automationScript.fieldMappings[field.id];
          if (!mapping) return;

          let value = formatFieldValue(field.currentValue, field.type);
          if (!value) return;

          // Apply any configured value transforms (date format, country code, etc.)
          if (mapping.transform) {
            const transformed = AutomationScriptUtils.applyTransform(value, mapping.transform);
            if (transformed !== null && transformed !== undefined) {
              value = String(transformed);
            }
          }

          // Use the first CSS selector from a comma-separated list
          const selector = mapping.selector.split(',')[0].trim();

          fieldSpecs.push({
            id: field.id,
            selector,
            value,
            inputType: mapping.inputType,
          });
        });
      });

      if (fieldSpecs.length === 0) return;

      webViewRef.current?.injectJavaScript(buildAutoFillScript(fieldSpecs));
    },
    [schema, currentStep, leg, profile, countryCode],
  );

  /**
   * Called when the WebView posts a message via window.ReactNativeWebView.postMessage.
   * Handles AUTO_FILL_RESULT messages to show the AutoFillBanner.
   */
  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data) as {
          type: string;
          filled: number;
          total: number;
        };
        if (msg.type === 'AUTO_FILL_RESULT' && typeof msg.total === 'number' && msg.total > 0) {
          setBannerState({ filled: msg.filled, total: msg.total });
        }
      } catch {
        // Not a Borderly message — ignore
      }
    },
    [],
  );

  const handleGoBack = useCallback(() => {
    webViewRef.current?.injectJavaScript('window.history.back(); true;');
  }, []);

  const handleGoForward = useCallback(() => {
    webViewRef.current?.injectJavaScript('window.history.forward(); true;');
  }, []);

  const handleRefresh = useCallback(() => {
    webViewRef.current?.injectJavaScript('window.location.reload(); true;');
  }, []);

  const handleClose = useCallback(() => {
    (navigation as any).navigate('TripDetail', { tripId });
  }, [navigation, tripId]);

  const progressPercent = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

  return (
    <SafeAreaView className="flex-1 bg-white" testID="portal-submission-screen">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-semibold text-gray-900" numberOfLines={1} style={{ flex: 1 }}>
            {schema?.portalName ?? 'Government Portal'}
          </Text>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, padding: 4 })}
            accessibilityLabel="Close portal and go back to trip"
            testID="close-portal-button"
          >
            <X size={22} color="#374151" />
          </Pressable>
        </View>

        {/* Step progress bar */}
        {totalSteps > 0 && (
          <View className="mt-2">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-xs text-gray-500">
                Step {currentStep} of {totalSteps}
              </Text>
              {schema?.submissionGuide?.[currentStep - 1]?.title ? (
                <Text className="text-xs text-blue-600 font-medium" numberOfLines={1}>
                  {schema.submissionGuide[currentStep - 1].title}
                </Text>
              ) : null}
            </View>
            <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <Animated.View
                style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  backgroundColor: '#3B82F6',
                  borderRadius: 9999,
                }}
                testID="progress-bar"
              />
            </View>
          </View>
        )}
      </View>

      {/* Toolbar: back, forward, refresh */}
      <View className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex-row items-center space-x-4">
        <Pressable
          onPress={handleGoBack}
          disabled={!navState.canGoBack}
          style={({ pressed }) => ({ opacity: pressed || !navState.canGoBack ? 0.4 : 1, padding: 6 })}
          accessibilityLabel="Go back"
          testID="toolbar-back-button"
        >
          <ArrowLeft size={20} color="#374151" />
        </Pressable>
        <Pressable
          onPress={handleGoForward}
          disabled={!navState.canGoForward}
          style={({ pressed }) => ({ opacity: pressed || !navState.canGoForward ? 0.4 : 1, padding: 6 })}
          accessibilityLabel="Go forward"
          testID="toolbar-forward-button"
        >
          <ArrowRight size={20} color="#374151" />
        </Pressable>
        <Pressable
          onPress={handleRefresh}
          style={({ pressed }) => ({ opacity: pressed ? 0.4 : 1, padding: 6 })}
          accessibilityLabel="Refresh page"
          testID="toolbar-refresh-button"
        >
          <RefreshCw size={20} color="#374151" />
        </Pressable>
        <Text className="flex-1 text-xs text-gray-400" numberOfLines={1}>
          {navState.url}
        </Text>
      </View>

      {/* Auto-fill feedback banner */}
      {bannerState !== null && (
        <AutoFillBanner
          filled={bannerState.filled}
          total={bannerState.total}
          onDismiss={() => setBannerState(null)}
          testID="autofill-banner"
        />
      )}

      {/* WebView */}
      <View style={{ flex: 1 }}>
        <PortalWebView
          ref={webViewRef}
          url={url}
          onNavigationChange={handleNavigationChange}
          onPageLoad={handlePageLoad}
          onMessage={handleMessage}
          testID="portal-webview"
        />
      </View>

      {/* Collapsible bottom panel: "Fields for this page" */}
      <View className="bg-white border-t border-gray-200">
        <Pressable
          onPress={() => setIsPanelOpen(prev => !prev)}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          className="flex-row items-center justify-between px-4 py-3"
          accessibilityLabel={isPanelOpen ? 'Collapse fields panel' : 'Expand fields panel'}
          testID="toggle-fields-panel"
        >
          <Text className="text-sm font-semibold text-gray-700">
            Fields for this page
            {currentStepFields.length > 0 ? ` (${currentStepFields.length})` : ''}
          </Text>
          {isPanelOpen ? (
            <ChevronDown size={18} color="#6B7280" />
          ) : (
            <ChevronUp size={18} color="#6B7280" />
          )}
        </Pressable>

        {isPanelOpen && (
          <ScrollView
            style={{ maxHeight: 220 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}
            keyboardShouldPersistTaps="handled"
            testID="fields-panel"
          >
            {currentStepFields.length === 0 ? (
              <Text className="text-sm text-gray-500 py-2">
                No copyable fields for this page.
              </Text>
            ) : (
              currentStepFields.map((field) => (
                <View key={field.id} className="mb-3">
                  <CopyableField
                    label={field.label}
                    value={field.value}
                  />
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
