import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  SafeAreaView,
  ScrollView,
  Animated,
  StyleSheet,
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
import { QRSaveOverlay } from '../../components/submission/QRSaveOverlay';
import type { QRPageDetectedPayload } from '../../components/submission/QRSaveOverlay';
import { AutoFillPill } from '../../components/submission/AutoFillPill';
import { CredentialPrompt } from '../../components/submission/CredentialPrompt';
import { CopyableField } from '../../components/guide';
import { getSchemaByCountryCode } from '../../services/schemas/schemaRegistry';
import { submissionCoordinator } from '../../services/submission/submissionCoordinator';
import type { PageType } from '../../services/submission/submissionCoordinator';
import { getPortalName } from '../../utils/countryUtils';
import { formatFieldValue } from '../../utils/fieldFormatters';
import { useTripStore } from '../../stores';
import { useProfileStore } from '../../stores/useProfileStore';
import { TripStackParamList } from '../../app/navigation/types';
import type { FilledFormSection, FilledFormField } from '../../services/forms/formEngine';

import { usePortalProfiles } from '../../hooks/usePortalProfiles';
import { useLoadTimeout } from '../../hooks/useLoadTimeout';
import { usePortalAutoLogin } from '../../hooks/usePortalAutoLogin';
import { usePortalAutoFill } from '../../hooks/usePortalAutoFill';

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

  // Incomplete-form message shown when Submit in App is tapped with missing fields
  const [showIncompleteMessage, setShowIncompleteMessage] = useState(false);
  const incompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // QR save overlay state
  const [qrPayload, setQrPayload] = useState<QRPageDetectedPayload | null>(null);

  // Page detection state
  const [pageType, setPageType] = useState<PageType>('unknown');
  const [pillDismissed, setPillDismissed] = useState(false);

  // URL tracking for page change detection
  const lastUrlRef = useRef<string>(url);

  // ─── Store access ──────────────────────────────────────────────────────────
  const { trips, addQRCode, markLegAsSubmitted } = useTripStore();
  const { profile, familyProfiles } = useProfileStore();

  const trip = trips.find(t => t.id === tripId);
  const leg = trip?.legs.find(l => l.id === legId);
  const schema = getSchemaByCountryCode(countryCode);
  const totalSteps = schema?.submissionGuide?.length ?? 0;

  // ─── Custom hooks ──────────────────────────────────────────────────────────

  const {
    availableProfiles,
    selectedProfileId,
    effectiveProfile,
    lastUsedProfileRef,
    handleProfileChange,
  } = usePortalProfiles();

  const {
    loadError,
    startTimer: handleLoadStart,
    onLoadComplete,
    onWebViewError: handleWebViewError,
    clearError: clearLoadError,
  } = useLoadTimeout();

  const autoLogin = usePortalAutoLogin({
    countryCode,
    schema,
    selectedProfileId,
    primaryProfileId: familyProfiles.primaryProfileId,
    profileEmail: profile?.email ?? '',
    webViewRef,
  });

  const autoFill = usePortalAutoFill({
    countryCode,
    schema,
    leg,
    effectiveProfile,
    selectedProfileId,
    currentStep,
    lastUsedProfileRef,
    webViewRef,
  });

  // ─── Copy-paste panel fields ───────────────────────────────────────────────

  const currentStepFields = (() => {
    if (!schema || !leg || !effectiveProfile) return [];
    const step = schema.submissionGuide?.[currentStep - 1];
    if (!step) return [];

    const filledForm = submissionCoordinator.generateFilledForm(effectiveProfile, leg, schema);
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
  })();

  // ─── Navigation callbacks ─────────────────────────────────────────────────

  const handleNavigationChange = useCallback((state: NavigationState) => {
    setNavState(state);
    if (state.url && state.url !== lastUrlRef.current) {
      lastUrlRef.current = state.url;
      setPageType('unknown');
      setPillDismissed(false);
      autoLogin.resetForNewPage();
    }
  }, [autoLogin]);

  const handleContinueManually = useCallback(() => {
    (navigation as any).navigate('SubmissionGuide', { legId, tripId });
  }, [navigation, legId, tripId]);

  // ─── Page load & type detection ───────────────────────────────────────────

  const handlePageLoad = useCallback(
    (loadedUrl: string) => {
      onLoadComplete();
      setPageType('unknown');
      setPillDismissed(false);
      autoLogin.resetForNewPage();

      if (!schema) return;

      const stepIdx = submissionCoordinator.detectStep(loadedUrl, schema);
      if (stepIdx >= 0) {
        setCurrentStep(stepIdx + 1);
      }

      webViewRef.current?.injectJavaScript(submissionCoordinator.getPageTypeCheckScript());

      const qrScript = submissionCoordinator.getQRDetectionScript(countryCode);
      if (qrScript) {
        webViewRef.current?.injectJavaScript(qrScript);
      }
    },
    [schema, countryCode, onLoadComplete, autoLogin],
  );

  // ─── Message handling ─────────────────────────────────────────────────────

  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data) as Record<string, unknown>;
        const msgType = typeof msg.type === 'string' ? msg.type : '';

        if (msgType === 'PAGE_TYPE_CHECK') {
          const html = typeof msg.html === 'string' ? msg.html : '';
          const formFieldCount =
            typeof msg.formFieldCount === 'number' ? msg.formFieldCount : 0;

          const detected = submissionCoordinator.detectPageType(html, formFieldCount);

          autoLogin.checkAuthToFormTransition(autoLogin.prevPageTypeRef.current, detected);
          setPageType(detected);

          if (detected === 'auth') {
            autoLogin.attemptAutoLogin();
          }
          return;
        }

        if (msgType === 'AUTO_LOGIN_RESULT') {
          autoLogin.handleAutoLoginResult(msg.success === true);
          return;
        }

        if (msgType === 'EXTRACT_LOGIN_USERNAME') {
          const username = typeof msg.username === 'string' ? msg.username : '';
          if (__DEV__) {
            console.log('[PortalSubmissionScreen] Extracted username for save prompt:', username);
          }
          autoLogin.handleExtractedUsername(username);
          return;
        }

        if (msgType === 'AUTO_FILL_RESULT') {
          autoFill.handleAutoFillResult(msg);
          return;
        }

        if (msgType === 'QR_PAGE_DETECTED' && msg.isQRPage === true) {
          const newPayload: QRPageDetectedPayload = {
            countryCode:
              typeof msg.countryCode === 'string' ? msg.countryCode : countryCode,
            qrImageBase64:
              typeof msg.qrImageBase64 === 'string' ? msg.qrImageBase64 : null,
            pageUrl: typeof msg.pageUrl === 'string' ? msg.pageUrl : '',
          };
          if (msg.confirmationNumber !== undefined) {
            newPayload.confirmationNumber =
              typeof msg.confirmationNumber === 'string'
                ? msg.confirmationNumber
                : null;
          }
          setQrPayload(newPayload);
        }
      } catch {
        // Not a Borderly message — ignore
      }
    },
    [countryCode, autoLogin, autoFill],
  );

  // ─── Toolbar callbacks ────────────────────────────────────────────────────

  const handleGoBack = useCallback(() => {
    webViewRef.current?.injectJavaScript('window.history.back(); true;');
  }, []);

  const handleGoForward = useCallback(() => {
    webViewRef.current?.injectJavaScript('window.history.forward(); true;');
  }, []);

  const handleRefresh = useCallback(() => {
    clearLoadError();
    webViewRef.current?.injectJavaScript('window.location.reload(); true;');
  }, [clearLoadError]);

  const handleClose = useCallback(() => {
    (navigation as any).navigate('TripDetail', { tripId });
  }, [navigation, tripId]);

  // ─── Submit in App ────────────────────────────────────────────────────────

  /**
   * Primary submission CTA. When all required fields are filled, triggers
   * auto-fill of the current portal page. When fields are missing, shows a
   * brief inline message listing what needs to be completed first.
   */
  const handleSubmitInApp = useCallback(() => {
    if (!autoFill.isFormComplete) {
      if (incompleteTimerRef.current) clearTimeout(incompleteTimerRef.current);
      setShowIncompleteMessage(true);
      incompleteTimerRef.current = setTimeout(() => setShowIncompleteMessage(false), 3000);
      return;
    }
    autoFill.handleAutoFill();
  }, [autoFill]);

  // ─── QR wallet callbacks ──────────────────────────────────────────────────

  const handleSaveQR = useCallback(
    async (imageBase64: string | null) => {
      const qrTypeMap: Record<string, 'immigration' | 'customs' | 'health' | 'combined'> = {
        JPN: 'immigration',
        MYS: 'immigration',
        SGP: 'immigration',
      };
      const type = qrTypeMap[countryCode] ?? 'immigration';
      const label = `${getPortalName(countryCode)} — Immigration QR`;

      await addQRCode(legId, {
        type,
        imageBase64: imageBase64 ?? '',
        label,
      });

      await markLegAsSubmitted(legId);
    },
    [addQRCode, markLegAsSubmitted, legId, countryCode],
  );

  const handleOpenWallet = useCallback(() => {
    setQrPayload(null);
    (navigation as any).navigate('Main', { screen: 'Wallet' });
  }, [navigation]);

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

      {/* Loading indicator */}
      {navState.loading && loadError === null && (
        <View
          style={{ backgroundColor: '#EFF6FF', borderBottomWidth: 1, borderBottomColor: '#BFDBFE', paddingHorizontal: 16, paddingVertical: 4 }}
          testID="portal-loading-indicator"
        >
          <Text style={{ fontSize: 12, color: '#1D4ED8' }}>Loading portal...</Text>
        </View>
      )}

      {/* Toolbar */}
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

      {/* Auth page banners */}
      {pageType === 'auth' && autoLogin.autoLoginBannerState === 'in_progress' && (
        <View
          style={{ backgroundColor: '#EFF6FF', borderBottomWidth: 1, borderBottomColor: '#3B82F6', paddingHorizontal: 16, paddingVertical: 10 }}
          testID="auto-login-progress-banner"
        >
          <Text style={{ fontSize: 13, color: '#1D4ED8', fontWeight: '500' }}>
            🔐 Logging in automatically...
          </Text>
        </View>
      )}

      {pageType === 'auth' && autoLogin.autoLoginBannerState === 'failed' && (
        <View
          style={{ backgroundColor: '#FEF3C7', borderBottomWidth: 1, borderBottomColor: '#F59E0B', paddingHorizontal: 16, paddingVertical: 10 }}
          testID="auto-login-failed-banner"
        >
          <Text style={{ fontSize: 13, color: '#92400E', fontWeight: '500' }}>
            ⚠️ Auto-login failed. Please log in manually.
          </Text>
        </View>
      )}

      {pageType === 'auth' && autoLogin.autoLoginBannerState === 'idle' && (
        <View
          style={{ backgroundColor: '#FEF3C7', borderBottomWidth: 1, borderBottomColor: '#F59E0B', paddingHorizontal: 16, paddingVertical: 10 }}
          testID="auth-page-banner"
        >
          <Text style={{ fontSize: 13, color: '#92400E', fontWeight: '500' }}>
            🔐 Log in to continue
          </Text>
        </View>
      )}

      {pageType === 'captcha' && (
        <View
          style={{ backgroundColor: '#FEF3C7', borderBottomWidth: 1, borderBottomColor: '#F59E0B', paddingHorizontal: 16, paddingVertical: 10 }}
          testID="captcha-page-banner"
        >
          <Text style={{ fontSize: 13, color: '#92400E', fontWeight: '500' }}>
            🤖 Complete the verification to continue
          </Text>
        </View>
      )}

      {/* Auto-fill feedback banner */}
      {autoFill.bannerState !== null && (
        <AutoFillBanner
          filled={autoFill.bannerState.filled}
          total={autoFill.bannerState.total}
          {...(autoFill.bannerState.results ? { results: autoFill.bannerState.results } : {})}
          onDismiss={autoFill.dismissBanner}
          testID="autofill-banner"
        />
      )}

      {/* Low fill-rate warning banner */}
      {autoFill.showLowFillWarning && (
        <View
          style={{ backgroundColor: '#FEF3C7', borderBottomWidth: 1, borderBottomColor: '#F59E0B' }}
          className="px-4 py-2 flex-row items-center justify-between"
          testID="low-fill-warning-banner"
        >
          <Text style={{ flex: 1, fontSize: 12, color: '#92400E' }}>
            {"Auto-fill couldn't complete all fields. Would you like to use the manual guide?"}
          </Text>
          <Pressable
            onPress={handleContinueManually}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, marginLeft: 8 })}
            accessibilityLabel="Switch to manual submission guide"
            testID="manual-guide-button"
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#92400E' }}>Manual Guide</Text>
          </Pressable>
        </View>
      )}

      {/* Save credentials prompt */}
      {autoLogin.showSaveCredentialsPrompt && (
        <CredentialPrompt
          visible
          portalName={schema?.portalName ?? 'this portal'}
          initialUsername={autoLogin.extractedUsername}
          title="Save your login for next time?"
          onSave={autoLogin.handleCredentialSave}
          onSkip={autoLogin.dismissCredentialPrompt}
          testID="save-credentials-prompt"
        />
      )}

      {/* WebView */}
      <View style={{ flex: 1 }}>
        <PortalWebView
          ref={webViewRef}
          url={url}
          onNavigationChange={handleNavigationChange}
          onPageLoad={handlePageLoad}
          onLoadStart={handleLoadStart}
          onMessage={handleMessage}
          onError={handleWebViewError}
          testID="portal-webview"
        />

        {pageType === 'form' && !pillDismissed && availableProfiles.length > 0 && (
          <AutoFillPill
            profiles={availableProfiles}
            selectedProfileId={selectedProfileId}
            onProfileChange={handleProfileChange}
            onAutoFill={autoFill.handleAutoFill}
            onDismiss={() => setPillDismissed(true)}
            testID="autofill-pill"
          />
        )}

        {/* Error overlay */}
        {loadError !== null && (
          <View
            style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: 'rgba(107, 114, 128, 0.92)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 24,
            }}
            testID="load-error-overlay"
          >
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: 12,
                padding: 24,
                width: '100%',
                maxWidth: 360,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                Unable to Load Portal
              </Text>
              <Text style={{ fontSize: 14, color: '#4B5563', marginBottom: 20, lineHeight: 20 }}>
                {loadError}
              </Text>
              <Pressable
                onPress={() => {
                  clearLoadError();
                  handleRefresh();
                }}
                style={({ pressed }) => ({
                  backgroundColor: '#3B82F6',
                  borderRadius: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  marginBottom: 10,
                  opacity: pressed ? 0.8 : 1,
                })}
                accessibilityLabel="Try again"
                testID="error-try-again-button"
              >
                <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>
                  Try Again
                </Text>
              </Pressable>
              <Pressable
                onPress={handleContinueManually}
                style={({ pressed }) => ({
                  backgroundColor: '#F3F4F6',
                  borderRadius: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  opacity: pressed ? 0.8 : 1,
                })}
                accessibilityLabel="Continue with manual guide"
                testID="error-continue-manually-button"
              >
                <Text style={{ color: '#374151', fontWeight: '600', textAlign: 'center' }}>
                  Continue Manually
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Submit in App — primary CTA (gated on form completeness) */}
      {qrPayload === null && (
        <View
          style={{ backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 }}
          testID="submit-in-app-section"
        >
          {showIncompleteMessage && (
            <View
              style={{ backgroundColor: '#FEF3C7', borderRadius: 8, padding: 10, marginBottom: 8 }}
              testID="incomplete-form-message"
            >
              <Text style={{ fontSize: 13, color: '#92400E', fontWeight: '500' }}>
                {'Complete required fields first:'}
              </Text>
              {autoFill.missingRequiredFields.length > 0 && (
                <Text style={{ fontSize: 12, color: '#92400E', marginTop: 2 }} testID="missing-fields-list">
                  {autoFill.missingRequiredFields.join(', ')}
                </Text>
              )}
            </View>
          )}
          <Pressable
            onPress={handleSubmitInApp}
            style={({ pressed }) => ({
              backgroundColor: autoFill.isFormComplete ? '#3B82F6' : '#93C5FD',
              borderRadius: 8,
              paddingVertical: 11,
              alignItems: 'center' as const,
              opacity: pressed && autoFill.isFormComplete ? 0.8 : autoFill.isFormComplete ? 1 : 0.5,
            })}
            accessibilityLabel={
              autoFill.isFormComplete
                ? 'Submit in app — auto-fill and submit this portal form'
                : 'Submit in app — disabled until all required fields are complete'
            }
            accessibilityState={{ disabled: !autoFill.isFormComplete }}
            testID="submit-in-app-button"
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>
              Submit in App
            </Text>
          </Pressable>
        </View>
      )}

      {/* Collapsible bottom panel */}
      {qrPayload === null && (
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
      )}

      {/* QR save overlay */}
      <QRSaveOverlay
        payload={qrPayload}
        onSave={handleSaveQR}
        onDismiss={() => setQrPayload(null)}
        onOpenWallet={handleOpenWallet}
        testID="qr-save-overlay"
      />
    </SafeAreaView>
  );
}
