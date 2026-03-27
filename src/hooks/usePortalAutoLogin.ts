import { useState, useRef, useCallback } from 'react';
import { submissionCoordinator } from '../services/submission/submissionCoordinator';
import type { PortalWebViewHandle } from '../components/submission/PortalWebView';
import type { CountryFormSchema } from '../types/schema';

type AutoLoginBannerState = 'idle' | 'in_progress' | 'failed';

interface UsePortalAutoLoginOptions {
  countryCode: string;
  schema: CountryFormSchema | null;
  selectedProfileId: string;
  primaryProfileId: string;
  profileEmail: string;
  webViewRef: React.RefObject<PortalWebViewHandle | null>;
}

/**
 * Manages auto-login lifecycle for portal submission:
 * - Attempts auto-login when an auth page is detected
 * - Tracks banner state (idle / in_progress / failed)
 * - Handles "save credentials" prompt after manual login
 *
 * Delegates credential resolution, script building, and storage
 * to submissionCoordinator.
 */
export function usePortalAutoLogin({
  countryCode,
  schema,
  selectedProfileId,
  primaryProfileId,
  profileEmail,
  webViewRef,
}: UsePortalAutoLoginOptions) {
  const [autoLoginBannerState, setAutoLoginBannerState] = useState<AutoLoginBannerState>('idle');
  const [showSaveCredentialsPrompt, setShowSaveCredentialsPrompt] = useState(false);
  const [extractedUsername, setExtractedUsername] = useState('');

  const autoLoginAttemptedRef = useRef(false);
  const autoLoginTriggeredRef = useRef(false);
  const prevPageTypeRef = useRef<string>('unknown');

  const resetForNewPage = useCallback(() => {
    autoLoginAttemptedRef.current = false;
    autoLoginTriggeredRef.current = false;
    prevPageTypeRef.current = 'unknown';
    setAutoLoginBannerState('idle');
    setShowSaveCredentialsPrompt(false);
  }, []);

  const attemptAutoLogin = useCallback(async () => {
    if (autoLoginAttemptedRef.current) return;
    autoLoginAttemptedRef.current = true;

    const familyPolicyType = schema?.portalFlow?.familyPolicy?.type ?? 'none';
    const profileId = selectedProfileId || primaryProfileId;

    try {
      const credential = await submissionCoordinator.resolveCredential(
        profileId,
        primaryProfileId,
        countryCode,
        familyPolicyType,
      );

      if (credential) {
        autoLoginTriggeredRef.current = true;
        setAutoLoginBannerState('in_progress');
        webViewRef.current?.injectJavaScript(
          submissionCoordinator.buildLoginScript(credential.username, credential.password),
        );
      } else {
        autoLoginTriggeredRef.current = false;
      }
    } catch {
      autoLoginTriggeredRef.current = false;
    }
  }, [selectedProfileId, primaryProfileId, countryCode, schema, webViewRef]);

  const handleShowCredentialPrompt = useCallback(() => {
    setExtractedUsername(profileEmail);
    webViewRef.current?.injectJavaScript(
      submissionCoordinator.buildUsernameExtractionScript(),
    );
    setShowSaveCredentialsPrompt(true);
  }, [profileEmail, webViewRef]);

  const handleCredentialSave = useCallback(
    async (username: string, password: string) => {
      setShowSaveCredentialsPrompt(false);
      const profileId = selectedProfileId || primaryProfileId;
      try {
        await submissionCoordinator.storeCredential(profileId, countryCode, username, password);
      } catch (err) {
        if (__DEV__) {
          console.error('[usePortalAutoLogin] Failed to store credential:', err);
        }
      }
    },
    [selectedProfileId, primaryProfileId, countryCode],
  );

  const handleAutoLoginResult = useCallback((success: boolean) => {
    if (!success) {
      setAutoLoginBannerState('failed');
    }
  }, []);

  const handleExtractedUsername = useCallback((username: string) => {
    setExtractedUsername(username || profileEmail);
    setShowSaveCredentialsPrompt(true);
  }, [profileEmail]);

  const checkAuthToFormTransition = useCallback((prevPageType: string, newPageType: string) => {
    if (prevPageType === 'auth' && newPageType === 'form' && !autoLoginTriggeredRef.current) {
      handleShowCredentialPrompt();
    }
    prevPageTypeRef.current = newPageType;
  }, [handleShowCredentialPrompt]);

  return {
    state: {
      autoLoginBannerState,
      showSaveCredentialsPrompt,
      extractedUsername,
    },
    refs: {
      autoLoginTriggeredRef,
      prevPageTypeRef,
    },
    actions: {
      resetForNewPage,
      attemptAutoLogin,
      handleShowCredentialPrompt,
      handleCredentialSave,
      handleAutoLoginResult,
      handleExtractedUsername,
      checkAuthToFormTransition,
      dismissCredentialPrompt: useCallback(() => setShowSaveCredentialsPrompt(false), []),
    },
  };
}
