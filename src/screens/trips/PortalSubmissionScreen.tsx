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
import { CopyableField } from '../../components/guide';
import { getSchemaByCountryCode } from '../../services/schemas/schemaRegistry';
import { generateFilledFormForTraveler } from '../../services/forms/formEngine';
import { useTripStore } from '../../stores';
import { useProfileStore } from '../../stores/useProfileStore';
import { TripStackParamList } from '../../app/navigation/types';
import type { FilledFormSection, FilledFormField } from '../../services/forms/formEngine';
import { formatFieldValue } from '../../utils/fieldFormatters';

type PortalSubmissionRouteProp = RouteProp<TripStackParamList, 'PortalSubmission'>;

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

  const handleNavigationChange = useCallback((state: NavigationState) => {
    setNavState(state);
  }, []);

  const handlePageLoad = useCallback((loadedUrl: string) => {
    // Try to advance step when URL matches an automation step's URL
    if (!schema?.submissionGuide) return;
    const stepIndex = schema.submissionGuide.findIndex((step) => {
      if (!step.automation?.url) return false;
      return loadedUrl.startsWith(step.automation.url);
    });
    if (stepIndex >= 0) {
      setCurrentStep(stepIndex + 1);
    }
  }, [schema]);

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

      {/* WebView */}
      <View style={{ flex: 1 }}>
        <PortalWebView
          ref={webViewRef}
          url={url}
          onNavigationChange={handleNavigationChange}
          onPageLoad={handlePageLoad}
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
