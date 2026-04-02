/**
 * usePortalSubmission — Business logic for PortalSubmissionScreen.
 *
 * Manages navigation state, step tracking, page type detection, QR overlay,
 * incomplete-form messaging, and coordinates the existing auto-login/auto-fill hooks.
 */

import { useState, useRef, useCallback } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { PortalWebViewHandle } from '@/components/submission/PortalWebView';
import type { NavigationState } from '@/components/submission/PortalWebView';
import type { QRPageDetectedPayload } from '@/components/submission/QRSaveOverlay';
import { getSchemaByCountryCode } from '@/services/schemas/schemaRegistry';
import { submissionCoordinator } from '@/services/submission/submissionCoordinator';
import type { PageType } from '@/services/submission/submissionCoordinator';
import { getPortalName } from '@/utils/countryUtils';
import { formatFieldValue } from '@/utils/fieldFormatters';
import { useTripStore } from '@/stores';
import { useProfileStore } from '@/stores/useProfileStore';
import { TripStackParamList } from '@/app/navigation/types';
import type { FilledFormSection, FilledFormField } from '@/services/forms/formEngine';

import { usePortalProfiles } from '@/hooks/usePortalProfiles';
import { useLoadTimeout } from '@/hooks/useLoadTimeout';
import { usePortalAutoLogin } from '@/hooks/usePortalAutoLogin';
import { usePortalAutoFill } from '@/hooks/usePortalAutoFill';

type PortalSubmissionRouteProp = RouteProp<TripStackParamList, 'PortalSubmission'>;

export function usePortalSubmission() {
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

  // Incomplete-form message
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
      autoLogin.actions.resetForNewPage();
    }
  }, [autoLogin]);

  // ─── Page load & type detection ───────────────────────────────────────────

  const handlePageLoad = useCallback(
    (loadedUrl: string) => {
      onLoadComplete();
      setPageType('unknown');
      setPillDismissed(false);
      autoLogin.actions.resetForNewPage();

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

          autoLogin.actions.checkAuthToFormTransition(autoLogin.refs.prevPageTypeRef.current, detected);
          setPageType(detected);

          if (detected === 'auth') {
            autoLogin.actions.attemptAutoLogin();
          }
          return;
        }

        if (msgType === 'AUTO_LOGIN_RESULT') {
          autoLogin.actions.handleAutoLoginResult(msg.success === true);
          return;
        }

        if (msgType === 'EXTRACT_LOGIN_USERNAME') {
          const username = typeof msg.username === 'string' ? msg.username : '';
          if (__DEV__) {
            console.log('[usePortalSubmission] Extracted username for save prompt:', username);
          }
          autoLogin.actions.handleExtractedUsername(username);
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
    (navigation as any).goBack();
  }, [navigation, tripId]);

  // ─── Submit in App ────────────────────────────────────────────────────────

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

  const dismissPill = useCallback(() => setPillDismissed(true), []);
  const togglePanel = useCallback(() => setIsPanelOpen(prev => !prev), []);
  const dismissQrPayload = useCallback(() => setQrPayload(null), []);

  const progressPercent = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

  return {
    route: { url, countryCode, tripId, legId },
    webViewRef,
    state: {
      navState,
      currentStep,
      isPanelOpen,
      showIncompleteMessage,
      qrPayload,
      pageType,
      pillDismissed,
    },
    derived: { schema, totalSteps, progressPercent, currentStepFields, loadError },
    profiles: { availableProfiles, selectedProfileId, handleProfileChange },
    autoLogin,
    autoFill,
    webViewHandlers: {
      handleNavigationChange,
      handlePageLoad,
      handleLoadStart,
      handleMessage,
      handleWebViewError,
      handleGoBack,
      handleGoForward,
      handleRefresh,
    },
    actions: {
      handleClose,
      handleSubmitInApp,
      handleSaveQR,
      handleOpenWallet,
      dismissPill,
      togglePanel,
      dismissQrPayload,
      clearLoadError,
    },
  };
}
