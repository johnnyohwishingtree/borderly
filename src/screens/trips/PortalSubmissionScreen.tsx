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
import { WebViewMessageEvent } from 'react-native-webview';
import { PortalWebView, PortalWebViewHandle } from '../../components/submission/PortalWebView';
import type { NavigationState } from '../../components/submission/PortalWebView';
import { AutoFillBanner } from '../../components/submission/AutoFillBanner';
import { CopyableField } from '../../components/guide';
import { getSchemaByCountryCode } from '../../services/schemas/schemaRegistry';
import { generateFilledFormForTraveler } from '../../services/forms/formEngine';
import { useTripStore } from '../../stores';
import { useProfileStore } from '../../stores/useProfileStore';
import { TripStackParamList } from '../../app/navigation/types';
import type { FilledFormSection, FilledFormField } from '../../services/forms/formEngine';
import { formatFieldValue } from '../../utils/fieldFormatters';
import { automationScriptRegistry, AutomationScriptUtils } from '../../services/submission/automationScripts';

type PortalSubmissionRouteProp = RouteProp<TripStackParamList, 'PortalSubmission'>;

// ---------------------------------------------------------------------------
// Auto-fill script helpers
// ---------------------------------------------------------------------------

/** Describes one field to fill via JavaScript injection */
interface AutoFillFieldData {
  fieldId: string;
  selector: string;
  inputType: string;
  value: string;
}

/** Result posted back from the injected auto-fill script */
interface AutoFillWebViewResult {
  type: 'AUTO_FILL_RESULT';
  filled: string[];
  skipped: string[];
  failed: string[];
}

/**
 * Build a self-contained JavaScript string that:
 * 1. Iterates the provided field list
 * 2. Skips fields that already have a value (non-destructive)
 * 3. Fills empty fields with the supplied values
 * 4. Briefly highlights each filled field with a blue border
 * 5. Posts `{ type: 'AUTO_FILL_RESULT', filled, skipped, failed }` back to RN
 */
function buildAutoFillScript(fields: AutoFillFieldData[]): string {
  const fieldsJson = JSON.stringify(fields);
  return `
(function() {
  var fields = ${fieldsJson};
  var filled = [];
  var skipped = [];
  var failed = [];

  fields.forEach(function(field) {
    try {
      var el = document.querySelector(field.selector);
      if (!el) {
        failed.push(field.fieldId);
        return;
      }

      // Non-destructive: skip if the element already holds a value
      var alreadyFilled = false;
      if (field.inputType === 'checkbox' || field.inputType === 'radio') {
        // A checked state counts as "already filled"
        alreadyFilled = el.checked === true;
      } else {
        alreadyFilled = (el.value || '').length > 0;
      }

      if (alreadyFilled) {
        skipped.push(field.fieldId);
        return;
      }

      // Fill based on input type
      if (field.inputType === 'select') {
        el.value = field.value;
        // Fallback: match by option text if exact value not found
        if (el.value !== field.value) {
          var opts = Array.from(el.options || []);
          var match = opts.find(function(o) {
            return o.value.toLowerCase() === field.value.toLowerCase() ||
                   o.text.toLowerCase().indexOf(field.value.toLowerCase()) >= 0;
          });
          if (match) el.value = match.value;
        }
        el.dispatchEvent(new Event('change', { bubbles: true }));

      } else if (field.inputType === 'radio') {
        // Use the selector to find the first radio in the group, then select by value
        var radioName = el.name;
        if (radioName) {
          var radios = document.querySelectorAll('input[type="radio"][name="' + radioName + '"]');
          radios.forEach(function(r) {
            if (r.value === field.value || r.value.toLowerCase() === field.value.toLowerCase()) {
              r.checked = true;
              r.dispatchEvent(new Event('change', { bubbles: true }));
            }
          });
        } else {
          el.checked = true;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }

      } else if (field.inputType === 'checkbox') {
        el.checked = (field.value === 'true' || field.value === '1');
        el.dispatchEvent(new Event('change', { bubbles: true }));

      } else {
        // text, date, number, textarea, email, tel, etc.
        // Use the native setter when available (works with React-controlled inputs)
        try {
          var nativeDescriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value') ||
                                 Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
          if (nativeDescriptor && nativeDescriptor.set) {
            nativeDescriptor.set.call(el, field.value);
          } else {
            el.value = field.value;
          }
        } catch (_e) {
          el.value = field.value;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Brief blue-border highlight so the user can see what was auto-filled
      var origBorder = el.style.border;
      var origBg = el.style.backgroundColor;
      el.style.transition = 'border 0.3s ease, background-color 0.3s ease';
      el.style.border = '2px solid #3B82F6';
      el.style.backgroundColor = 'rgba(59, 130, 246, 0.06)';
      setTimeout(function() {
        el.style.border = origBorder;
        el.style.backgroundColor = origBg;
      }, 2500);

      filled.push(field.fieldId);
    } catch (_err) {
      failed.push(field.fieldId);
    }
  });

  window.ReactNativeWebView.postMessage(JSON.stringify({
    type: 'AUTO_FILL_RESULT',
    filled: filled,
    skipped: skipped,
    failed: failed
  }));

  true; // scripts must end with a truthy value
})();
`.trim();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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

  // Auto-fill banner state
  const [bannerVisible, setBannerVisible] = useState(false);
  const [autoFillResult, setAutoFillResult] = useState<{
    filled: string[];
    skipped: string[];
    failed: string[];
  }>({ filled: [], skipped: [], failed: [] });

  // Track failed fields so they appear in the bottom panel for manual copy
  const [autoFillFailedIds, setAutoFillFailedIds] = useState<string[]>([]);

  // Load schema and form data
  const { trips } = useTripStore();
  const { profile } = useProfileStore();

  const trip = trips.find(t => t.id === tripId);
  const leg = trip?.legs.find(l => l.id === legId);
  const schema = getSchemaByCountryCode(countryCode);
  const totalSteps = schema?.submissionGuide?.length ?? 0;

  // Build fields for the current step
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

  // Fields that failed auto-fill appear in the panel so the user can copy them
  const failedFields = currentStepFields.filter(f =>
    autoFillFailedIds.includes(f.id)
  );
  // Non-failed fields are shown normally; if auto-fill ran, only show fallback fields
  const panelFields = autoFillFailedIds.length > 0 ? failedFields : currentStepFields;

  // ---------------------------------------------------------------------------
  // Auto-fill trigger
  // ---------------------------------------------------------------------------

  /**
   * Trigger auto-fill for a given submission guide step.
   * Generates a JavaScript payload from form data + automation field mappings
   * and injects it into the WebView. Results arrive via `handleMessage`.
   */
  const triggerAutoFill = useCallback((stepIdx: number) => {
    if (!schema || !leg || !profile || !webViewRef.current) return;

    const step = schema.submissionGuide?.[stepIdx];
    const fieldsOnScreen = step?.fieldsOnThisScreen ?? [];
    if (fieldsOnScreen.length === 0) return;

    // Get the country's automation script (synchronously from cache)
    const automationScript = automationScriptRegistry.getScriptSync(countryCode);
    if (!automationScript) return;

    // Generate form data
    let filledForm;
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

    // Flatten all fields for fast lookup
    const fieldValueMap = new Map<string, unknown>();
    filledForm.sections.forEach(section => {
      section.fields.forEach(field => {
        if (field.currentValue !== undefined && field.currentValue !== '') {
          fieldValueMap.set(field.id, field.currentValue);
        }
      });
    });

    // Build the fill list: only fields that are on this screen AND have values AND have a selector
    const fieldData: AutoFillFieldData[] = [];
    for (const fieldId of fieldsOnScreen) {
      const mapping = automationScript.fieldMappings[fieldId];
      if (!mapping) continue;

      const rawValue = fieldValueMap.get(fieldId);
      if (rawValue === undefined || rawValue === null || rawValue === '') continue;

      const transformedValue = AutomationScriptUtils.applyTransform(rawValue, mapping.transform);
      if (transformedValue === undefined || transformedValue === null || transformedValue === '') continue;

      fieldData.push({
        fieldId,
        selector: mapping.selector,
        inputType: mapping.inputType,
        value: String(transformedValue),
      });
    }

    if (fieldData.length === 0) return;

    const script = buildAutoFillScript(fieldData);
    webViewRef.current.injectJavaScript(script);
  }, [schema, leg, profile, countryCode]);

  // ---------------------------------------------------------------------------
  // WebView event handlers
  // ---------------------------------------------------------------------------

  const handleNavigationChange = useCallback((state: NavigationState) => {
    setNavState(state);
  }, []);

  const handlePageLoad = useCallback((loadedUrl: string) => {
    // Reset auto-fill state on each new page
    setAutoFillFailedIds([]);
    setBannerVisible(false);

    // Try to match the loaded URL to a submission guide step
    if (!schema?.submissionGuide) return;
    const stepIndex = schema.submissionGuide.findIndex((step) => {
      if (!step.automation?.url) return false;
      return loadedUrl.startsWith(step.automation.url);
    });

    if (stepIndex >= 0) {
      setCurrentStep(stepIndex + 1);
      // Trigger auto-fill for the detected step
      triggerAutoFill(stepIndex);
    } else {
      // No URL match — still trigger auto-fill for the current step (best-effort)
      triggerAutoFill(currentStep - 1);
    }
  }, [schema, currentStep, triggerAutoFill]);

  /**
   * Handle messages posted from within the WebView (e.g. auto-fill results).
   * The auto-fill script posts `{ type: 'AUTO_FILL_RESULT', filled, skipped, failed }`.
   */
  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as AutoFillWebViewResult;
      if (data.type !== 'AUTO_FILL_RESULT') return;

      const filled = data.filled ?? [];
      const skipped = data.skipped ?? [];
      const failed = data.failed ?? [];

      setAutoFillResult({ filled, skipped, failed });
      setAutoFillFailedIds(failed);

      // Show the banner whenever we attempted auto-fill
      if (filled.length > 0 || failed.length > 0) {
        setBannerVisible(true);
      }
    } catch {
      // Ignore non-JSON or unrecognised messages
    }
  }, []);

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

  // ---------------------------------------------------------------------------
  // Auto-fill summary for the banner
  // ---------------------------------------------------------------------------
  const bannerTotalCount = autoFillResult.filled.length + autoFillResult.failed.length;

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
      <AutoFillBanner
        visible={bannerVisible}
        filledCount={autoFillResult.filled.length}
        totalCount={bannerTotalCount}
        failedCount={autoFillResult.failed.length}
        onDismiss={() => setBannerVisible(false)}
        testID="auto-fill-banner"
      />

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

      {/* Collapsible bottom panel: "Fields for this page" / fallback copy panel */}
      <View className="bg-white border-t border-gray-200">
        <Pressable
          onPress={() => setIsPanelOpen(prev => !prev)}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          className="flex-row items-center justify-between px-4 py-3"
          accessibilityLabel={isPanelOpen ? 'Collapse fields panel' : 'Expand fields panel'}
          testID="toggle-fields-panel"
        >
          <Text className="text-sm font-semibold text-gray-700">
            {autoFillFailedIds.length > 0
              ? `Copy manually (${panelFields.length} field${panelFields.length !== 1 ? 's' : ''} couldn't be auto-filled)`
              : `Fields for this page${currentStepFields.length > 0 ? ` (${currentStepFields.length})` : ''}`}
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
            {panelFields.length === 0 ? (
              <Text className="text-sm text-gray-500 py-2">
                {autoFillFailedIds.length > 0
                  ? 'All fields were auto-filled successfully.'
                  : 'No copyable fields for this page.'}
              </Text>
            ) : (
              panelFields.map((field) => (
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
