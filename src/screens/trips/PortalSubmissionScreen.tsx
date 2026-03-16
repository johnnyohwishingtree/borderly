import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
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
import type { AutoFillFieldResult } from '../../components/submission/AutoFillBanner';
import { QRSaveOverlay } from '../../components/submission/QRSaveOverlay';
import type { QRPageDetectedPayload } from '../../components/submission/QRSaveOverlay';
import { AutoFillPill } from '../../components/submission/AutoFillPill';
import type { ProfileOption } from '../../components/submission/AutoFillPill';
import { CredentialPrompt } from '../../components/submission/CredentialPrompt';
import { keychainService } from '../../services/storage/keychain';
import { CopyableField } from '../../components/guide';
import { getSchemaByCountryCode } from '../../services/schemas/schemaRegistry';
import { generateFilledFormForTraveler } from '../../services/forms/formEngine';
import { automationScriptRegistry, AutomationScriptUtils, formFiller } from '../../services/submission';
import { pageDetector } from '../../services/submission/pageDetection';
import { getQRDetectionScript } from '../../services/automation/qrDetection';
import { getPortalName } from '../../utils/countryUtils';
import { resolvePortalCredential } from '../../services/submission/credentialResolver';
import { buildLoginScript } from '../../services/submission/autoLogin';
import { useTripStore } from '../../stores';
import { useProfileStore } from '../../stores/useProfileStore';
import { TripStackParamList } from '../../app/navigation/types';
import type { FilledForm, FilledFormSection, FilledFormField } from '../../services/forms/formEngine';
import type { TravelerProfile } from '../../types/profile';
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
  results?: AutoFillFieldResult[];
}

/** Detected page type from HTML analysis. */
type PageType = 'unknown' | 'auth' | 'captcha' | 'form';

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

/** Script injected to detect the page type (auth/captcha/form). */
const PAGE_TYPE_CHECK_SCRIPT =
  '(function(){' +
  'var html=document.documentElement.innerHTML.substring(0,50000);' +
  'var formFields=document.querySelectorAll(\'input:not([type="hidden"]),select,textarea\');' +
  'window.ReactNativeWebView.postMessage(JSON.stringify({' +
    'type:"PAGE_TYPE_CHECK",' +
    'html:html,' +
    'formFieldCount:formFields.length' +
  '}));' +
  'true;' +
  '})();';

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

  // Low fill-rate warning banner (shown when auto-fill < 50%)
  const [showLowFillWarning, setShowLowFillWarning] = useState(false);

  // Load error state — set when page times out or WebView reports an error
  const [loadError, setLoadError] = useState<string | null>(null);

  // Timer ref for the 30-second load timeout
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // QR save overlay state (null = hidden)
  const [qrPayload, setQrPayload] = useState<QRPageDetectedPayload | null>(null);

  // ─── Page detection & passive auto-fill state ────────────────────────────────

  /** Detected type of the current page. Drives whether pill/banners are shown. */
  const [pageType, setPageType] = useState<PageType>('unknown');

  /** Whether the user has dismissed the auto-fill pill for this page load. */
  const [pillDismissed, setPillDismissed] = useState(false);

  /** All loaded TravelerProfile objects, keyed by profile ID. */
  const [loadedProfiles, setLoadedProfiles] = useState<Map<string, TravelerProfile>>(new Map());

  /** Profile options shown in the pill's profile selector. */
  const [availableProfiles, setAvailableProfiles] = useState<ProfileOption[]>([]);

  /** Currently selected profile ID for auto-fill. */
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

  /** Persists the last-used profile ID across page navigations within a leg. */
  const lastUsedProfileRef = useRef<string>('');

  /** Tracks the last URL seen, used to detect URL changes. */
  const lastUrlRef = useRef<string>(url);

  // ─── Auto-login state ─────────────────────────────────────────────────────────

  /**
   * Current auto-login banner state:
   * - 'idle'        → no attempt or not applicable (use default auth banner)
   * - 'in_progress' → login script injected, waiting for page redirect
   * - 'failed'      → login script ran but reported failure
   */
  const [autoLoginBannerState, setAutoLoginBannerState] = useState<
    'idle' | 'in_progress' | 'failed'
  >('idle');

  /**
   * Whether auto-login has been attempted for the current page load.
   * Reset to false on every new page load / URL change.
   * Prevents infinite retry loops (max 1 auto-attempt per page load).
   */
  const autoLoginAttemptedRef = useRef(false);

  /**
   * Whether auto-login was triggered on the current auth page.
   * Used to decide whether to show the "Save credentials?" prompt when
   * the page transitions from auth → form: if auto-login triggered the
   * login, there's no need to save credentials again.
   */
  const autoLoginTriggeredRef = useRef(false);

  /**
   * The page type detected on the previous page load.
   * Used to detect auth → form transitions for the "Save credentials?" prompt.
   */
  const prevPageTypeRef = useRef<PageType>('unknown');

  /**
   * Whether to show the "Save credentials for next time?" prompt.
   * Shown when the user manually logs in (auth → form transition without
   * auto-login being triggered).
   */
  const [showSaveCredentialsPrompt, setShowSaveCredentialsPrompt] = useState(false);

  /**
   * Username extracted from the login form DOM after the user manually logs in.
   * Pre-fills the CredentialPrompt so the user doesn't have to retype it.
   */
  const [extractedUsername, setExtractedUsername] = useState('');

  // ─── Store access ────────────────────────────────────────────────────────────

  const { trips, addQRCode, markLegAsSubmitted } = useTripStore();
  const { profile, getAllProfiles, familyProfiles } = useProfileStore();

  const trip = trips.find(t => t.id === tripId);
  const leg = trip?.legs.find(l => l.id === legId);
  const schema = getSchemaByCountryCode(countryCode);
  const totalSteps = schema?.submissionGuide?.length ?? 0;

  // ─── Profile loading ─────────────────────────────────────────────────────────

  /**
   * Load all family profiles on mount and build the ProfileOption list.
   * Falls back gracefully to the primary profile if loading fails.
   */
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const allProfiles = await getAllProfiles();
        if (cancelled) return;

        const options: ProfileOption[] = [];
        for (const [profileId, travelerProfile] of allProfiles) {
          const metadata = familyProfiles.profiles.get(profileId);
          options.push({
            id: profileId,
            name: `${travelerProfile.givenNames} ${travelerProfile.surname}`,
            relationship: metadata?.relationship ?? 'other',
          });
        }

        setAvailableProfiles(options);
        setLoadedProfiles(allProfiles);

        // Default to primary profile, or the first available profile
        const primaryId = familyProfiles.primaryProfileId;
        const defaultId =
          primaryId && allProfiles.has(primaryId)
            ? primaryId
            : options[0]?.id ?? '';
        const resolvedId = lastUsedProfileRef.current || defaultId;
        setSelectedProfileId(resolvedId);
      } catch {
        if (cancelled) return;
        // Graceful fallback: use just the primary profile
        if (profile) {
          const fallbackOption: ProfileOption = {
            id: profile.id,
            name: `${profile.givenNames} ${profile.surname}`,
            relationship: 'self',
          };
          setAvailableProfiles([fallbackOption]);
          setLoadedProfiles(new Map([[profile.id, profile]]));
          setSelectedProfileId(profile.id);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [getAllProfiles, familyProfiles, profile]);

  /**
   * The profile data used for auto-fill and field display.
   * Resolves from loadedProfiles by selectedProfileId, falling back to primary profile.
   */
  const effectiveProfile = useMemo<TravelerProfile | null>(() => {
    if (selectedProfileId && loadedProfiles.has(selectedProfileId)) {
      return loadedProfiles.get(selectedProfileId) ?? null;
    }
    return profile ?? null;
  }, [selectedProfileId, loadedProfiles, profile]);

  // ─── Copy-paste panel fields ─────────────────────────────────────────────────

  // Build fields for the current step (for the copy-paste fallback panel)
  const currentStepFields = (() => {
    if (!schema || !leg || !effectiveProfile) return [];
    const step = schema.submissionGuide?.[currentStep - 1];
    if (!step) return [];

    try {
      const filledForm = generateFilledFormForTraveler(
        effectiveProfile.id,
        [effectiveProfile],
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

  // ─── Navigation callbacks ────────────────────────────────────────────────────

  const handleNavigationChange = useCallback((state: NavigationState) => {
    setNavState(state);
    // When the URL changes, clear page detection state so we start fresh
    if (state.url && state.url !== lastUrlRef.current) {
      lastUrlRef.current = state.url;
      setPageType('unknown');
      setPillDismissed(false);
      // Reset auto-login state for the new page
      autoLoginAttemptedRef.current = false;
      autoLoginTriggeredRef.current = false;
      prevPageTypeRef.current = 'unknown';
      setAutoLoginBannerState('idle');
      setShowSaveCredentialsPrompt(false);
    }
  }, []);

  /** Start a 30-second load timeout when the WebView begins loading a page. */
  const handleLoadStart = useCallback(() => {
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    setLoadError(null);
    loadTimerRef.current = setTimeout(() => {
      setLoadError('The page took too long to load. Please try again or continue manually.');
    }, 30000);
  }, []);

  /** Clear timer and error state on unmount. */
  useEffect(() => {
    return () => {
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    };
  }, []);

  /** Navigate to the manual SubmissionGuide screen. */
  const handleContinueManually = useCallback(() => {
    (navigation as any).navigate('SubmissionGuide', { legId, tripId });
  }, [navigation, legId, tripId]);

  /** Handle WebView-reported load errors. */
  const handleWebViewError = useCallback((_errorMessage: string) => {
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    setLoadError('Failed to load the portal. Please check your connection and try again.');
  }, []);

  // ─── Page load & type detection ──────────────────────────────────────────────

  /**
   * Called when a page finishes loading.
   * 1. Detects which submission guide step the URL corresponds to.
   * 2. Resets page detection state for the new page.
   * 3. Injects a lightweight page-type detection script (auth/captcha/form).
   * 4. Injects the country-specific QR page detection script.
   *
   * Auto-fill is NOT triggered here — the pill lets the user initiate it.
   */
  const handlePageLoad = useCallback(
    (loadedUrl: string) => {
      // Clear the load timeout — the page loaded successfully
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
      setLoadError(null);

      // Reset page type, pill, and auto-login state for the new page
      setPageType('unknown');
      setPillDismissed(false);
      autoLoginAttemptedRef.current = false;
      autoLoginTriggeredRef.current = false;
      prevPageTypeRef.current = 'unknown';
      setAutoLoginBannerState('idle');
      setShowSaveCredentialsPrompt(false);

      if (!schema?.submissionGuide) return;

      // Detect step by URL
      const detected = schema.submissionGuide.findIndex((step) => {
        if (!step.automation?.url) return false;
        return loadedUrl.startsWith(step.automation.url);
      });
      if (detected >= 0) {
        setCurrentStep(detected + 1);
      }

      // Inject page-type detection script to determine auth/captcha/form state
      webViewRef.current?.injectJavaScript(PAGE_TYPE_CHECK_SCRIPT);

      // Inject QR page detection script
      const qrScript = getQRDetectionScript(countryCode);
      if (qrScript) {
        webViewRef.current?.injectJavaScript(qrScript);
      }
    },
    [schema, countryCode],
  );

  // ─── Auto-login ──────────────────────────────────────────────────────────────

  /**
   * Attempts to auto-login using stored credentials for the current portal.
   *
   * Guards:
   * - Only runs once per page load (autoLoginAttemptedRef prevents retry loops).
   * - Resolves credentials respecting the portal's family policy.
   * - If credentials are found: injects the login script into the WebView.
   * - If no credentials: no-op (the default auth banner stays visible).
   */
  const attemptAutoLogin = useCallback(async () => {
    if (autoLoginAttemptedRef.current) return;
    autoLoginAttemptedRef.current = true;

    const familyPolicyType = schema?.portalFlow?.familyPolicy?.type ?? 'none';
    const primaryProfileId = familyProfiles.primaryProfileId;
    const profileId = selectedProfileId || primaryProfileId;

    try {
      const credential = await resolvePortalCredential(
        profileId,
        primaryProfileId,
        countryCode,
        familyPolicyType,
      );

      if (credential) {
        autoLoginTriggeredRef.current = true;
        setAutoLoginBannerState('in_progress');
        webViewRef.current?.injectJavaScript(
          buildLoginScript(credential.username, credential.password),
        );
      } else {
        // No credentials stored — auth banner visible, user logs in manually
        autoLoginTriggeredRef.current = false;
      }
    } catch {
      autoLoginTriggeredRef.current = false;
    }
  }, [selectedProfileId, familyProfiles.primaryProfileId, countryCode, schema]);

  /**
   * Called when the user taps "Save" on the inline "Save credentials?" banner.
   * Injects a script to extract the username from the prior login form DOM so
   * we can pre-populate the CredentialPrompt. The prompt is shown once the
   * EXTRACT_LOGIN_USERNAME message is received (or immediately with profile email
   * as fallback if no value is found).
   */
  const handleShowCredentialPrompt = useCallback(() => {
    // Pre-seed with profile email in case extraction finds nothing
    setExtractedUsername(profile?.email ?? '');
    // Attempt to extract the username from any login form still in DOM
    webViewRef.current?.injectJavaScript(
      '(function(){' +
      'var selectors=["input[type=\\"email\\"]","input[name=\\"email\\"]","input[name=\\"username\\"]","input[id*=\\"email\\"]","input[id*=\\"user\\"]"];' +
      'var username="";' +
      'for(var i=0;i<selectors.length;i++){' +
        'var el=document.querySelector(selectors[i]);' +
        'if(el&&el.value){username=el.value;break;}' +
      '}' +
      'window.ReactNativeWebView.postMessage(JSON.stringify({' +
        'type:"EXTRACT_LOGIN_USERNAME",' +
        'username:username' +
      '}));' +
      'true;' +
      '})();',
    );
    // Show the prompt immediately (username may be pre-filled once extraction returns)
    setShowSaveCredentialsPrompt(true);
  }, [profile?.email]);

  /**
   * Called when the user confirms saving credentials in the CredentialPrompt.
   * Persists the credential to the OS Keychain for future auto-login.
   */
  const handleCredentialSave = useCallback(
    async (username: string, password: string) => {
      setShowSaveCredentialsPrompt(false);
      const profileId = selectedProfileId || familyProfiles.primaryProfileId;
      try {
        await keychainService.storePortalCredential(profileId, countryCode, username, password);
      } catch (err) {
        if (__DEV__) {
          console.error('[PortalSubmissionScreen] Failed to store credential:', err);
        }
      }
    },
    [selectedProfileId, familyProfiles.primaryProfileId, countryCode],
  );

  // ─── Auto-fill execution ─────────────────────────────────────────────────────

  /**
   * Executes the auto-fill for the currently selected profile.
   * Called when the user taps "Auto-fill Now" in the pill.
   */
  const handleAutoFill = useCallback(() => {
    if (!schema?.submissionGuide || !leg || !effectiveProfile) return;

    // Remember the profile choice for subsequent pages in this leg
    lastUsedProfileRef.current = selectedProfileId;

    const automationScript = automationScriptRegistry.getScriptSync(countryCode);
    if (!automationScript) return;

    const stepIndex = currentStep - 1;
    const step = schema.submissionGuide[stepIndex];
    const fieldsOnScreen = step?.fieldsOnThisScreen ?? [];

    let filledForm: FilledForm | null;
    try {
      filledForm = generateFilledFormForTraveler(
        effectiveProfile.id,
        [effectiveProfile],
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

    if (fieldSpecs.length > 0) {
      webViewRef.current?.injectJavaScript(buildAutoFillScript(fieldSpecs));
    }
  }, [schema, currentStep, leg, effectiveProfile, selectedProfileId, countryCode]);

  // ─── Message handling ────────────────────────────────────────────────────────

  /**
   * Called when the WebView posts a message via window.ReactNativeWebView.postMessage.
   * Handles:
   *  - PAGE_TYPE_CHECK       → determine page type; trigger auto-login on auth pages
   *  - AUTO_LOGIN_RESULT     → update auto-login banner (success waits for redirect; failure shows error)
   *  - EXTRACT_LOGIN_USERNAME → receive extracted username after manual-login save prompt
   *  - AUTO_FILL_RESULT      → show AutoFillBanner
   *  - QR_PAGE_DETECTED      → show QRSaveOverlay
   */
  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        // Use a wide record type so all message shapes can coexist.
        const msg = JSON.parse(event.nativeEvent.data) as Record<string, unknown>;
        const msgType = typeof msg.type === 'string' ? msg.type : '';

        if (msgType === 'PAGE_TYPE_CHECK') {
          const html = typeof msg.html === 'string' ? msg.html : '';
          const formFieldCount =
            typeof msg.formFieldCount === 'number' ? msg.formFieldCount : 0;

          let detected: PageType = 'unknown';
          if (pageDetector.isCaptchaPage(html)) {
            detected = 'captcha';
          } else if (pageDetector.isAuthPage(html)) {
            detected = 'auth';
          } else if (formFieldCount > 0) {
            detected = 'form';
          }

          // Detect auth → form transition for "Save credentials?" prompt.
          // Only prompt if the user logged in manually (no auto-login triggered).
          if (
            prevPageTypeRef.current === 'auth' &&
            detected === 'form' &&
            !autoLoginTriggeredRef.current
          ) {
            handleShowCredentialPrompt();
          }

          prevPageTypeRef.current = detected;
          setPageType(detected);

          // Trigger auto-login when an auth page is detected
          if (detected === 'auth') {
            attemptAutoLogin();
          }
          return;
        }

        if (msgType === 'AUTO_LOGIN_RESULT') {
          const success = msg.success === true;
          if (success) {
            // Script injected successfully — wait for the page to redirect.
            // The banner stays in 'in_progress' until the next PAGE_TYPE_CHECK
            // (which fires after the redirect completes).
          } else {
            // Login script ran but couldn't find/submit the form — show failure.
            setAutoLoginBannerState('failed');
          }
          return;
        }

        if (msgType === 'EXTRACT_LOGIN_USERNAME') {
          // Username extracted from DOM — pre-fill the credential prompt.
          const username = typeof msg.username === 'string' ? msg.username : '';
          if (__DEV__) {
            console.log('[PortalSubmissionScreen] Extracted username for save prompt:', username);
          }
          // Pre-fill with extracted value (fall back to profile email)
          setExtractedUsername(username || profile?.email || '');
          setShowSaveCredentialsPrompt(true);
          return;
        }

        if (msgType === 'AUTO_FILL_RESULT') {
          const total = typeof msg.total === 'number' ? msg.total : 0;
          const filled = typeof msg.filled === 'number' ? msg.filled : 0;
          if (total > 0) {
            // Parse field-level results for the expandable detail panel
            const rawResults = Array.isArray(msg.results) ? msg.results : [];
            const fieldResults: AutoFillFieldResult[] = rawResults
              .filter((r): r is Record<string, unknown> => r !== null && typeof r === 'object')
              .map(r => {
                const result: AutoFillFieldResult = {
                  id: typeof r.id === 'string' ? r.id : String(r.id ?? ''),
                  status: (r.status as AutoFillFieldResult['status']) ?? 'failed',
                };
                if (typeof r.error === 'string') {
                  result.error = r.error;
                }
                return result;
              });
            setBannerState(fieldResults.length > 0 ? { filled, total, results: fieldResults } : { filled, total });
            const fillRate = filled / total;
            if (!formFiller.isAutoFillSufficient(fillRate)) {
              setShowLowFillWarning(true);
              if (__DEV__) {
                console.warn(
                  `[PortalSubmissionScreen] Auto-fill rate ${Math.round(fillRate * 100)}% is below 50%. ` +
                  'Possible CSS selector mismatch on this portal page.',
                );
              }
            } else {
              setShowLowFillWarning(false);
            }
          }
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
          // Only set confirmationNumber when it's a string or null (not undefined)
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
    [countryCode, attemptAutoLogin, handleShowCredentialPrompt],
  );

  // ─── Toolbar callbacks ───────────────────────────────────────────────────────

  const handleGoBack = useCallback(() => {
    webViewRef.current?.injectJavaScript('window.history.back(); true;');
  }, []);

  const handleGoForward = useCallback(() => {
    webViewRef.current?.injectJavaScript('window.history.forward(); true;');
  }, []);

  const handleRefresh = useCallback(() => {
    setLoadError(null);
    webViewRef.current?.injectJavaScript('window.location.reload(); true;');
  }, []);

  const handleClose = useCallback(() => {
    (navigation as any).navigate('TripDetail', { tripId });
  }, [navigation, tripId]);

  // ─── QR wallet callbacks ─────────────────────────────────────────────────────

  /**
   * Save the detected QR code to the wallet and mark the leg as submitted.
   */
  const handleSaveQR = useCallback(
    async (imageBase64: string | null) => {
      // Determine the QR type based on country
      const qrTypeMap: Record<string, 'immigration' | 'customs' | 'health' | 'combined'> = {
        JPN: 'immigration',
        MYS: 'immigration',
        SGP: 'immigration',
      };
      const type = qrTypeMap[countryCode] ?? 'immigration';

      // Generate a label for the QR code
      const label = `${getPortalName(countryCode)} — Immigration QR`;

      // Persist to QR wallet (imageBase64 can be null if extraction failed;
      // in that case we still record the submission but without an image).
      await addQRCode(legId, {
        type,
        imageBase64: imageBase64 ?? '',
        label,
      });

      // Mark leg as submitted
      await markLegAsSubmitted(legId);
    },
    [addQRCode, markLegAsSubmitted, legId, countryCode],
  );

  /**
   * Navigate to the QR Wallet tab after saving.
   */
  const handleOpenWallet = useCallback(() => {
    setQrPayload(null);
    (navigation as any).navigate('Main', { screen: 'Wallet' });
  }, [navigation]);

  // ─── Profile selector callbacks ──────────────────────────────────────────────

  const handleProfileChange = useCallback((profileId: string) => {
    setSelectedProfileId(profileId);
    lastUsedProfileRef.current = profileId;
  }, []);

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

      {/* Loading indicator — visible while the WebView is fetching the page */}
      {navState.loading && loadError === null && (
        <View
          style={{ backgroundColor: '#EFF6FF', borderBottomWidth: 1, borderBottomColor: '#BFDBFE', paddingHorizontal: 16, paddingVertical: 4 }}
          testID="portal-loading-indicator"
        >
          <Text style={{ fontSize: 12, color: '#1D4ED8' }}>Loading portal...</Text>
        </View>
      )}

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

      {/* Auth page banners — three mutually exclusive states */}

      {/* Auto-login in progress */}
      {pageType === 'auth' && autoLoginBannerState === 'in_progress' && (
        <View
          style={{ backgroundColor: '#EFF6FF', borderBottomWidth: 1, borderBottomColor: '#3B82F6', paddingHorizontal: 16, paddingVertical: 10 }}
          testID="auto-login-progress-banner"
        >
          <Text style={{ fontSize: 13, color: '#1D4ED8', fontWeight: '500' }}>
            🔐 Logging in automatically...
          </Text>
        </View>
      )}

      {/* Auto-login failed — user must log in manually */}
      {pageType === 'auth' && autoLoginBannerState === 'failed' && (
        <View
          style={{ backgroundColor: '#FEF3C7', borderBottomWidth: 1, borderBottomColor: '#F59E0B', paddingHorizontal: 16, paddingVertical: 10 }}
          testID="auto-login-failed-banner"
        >
          <Text style={{ fontSize: 13, color: '#92400E', fontWeight: '500' }}>
            ⚠️ Auto-login failed. Please log in manually.
          </Text>
        </View>
      )}

      {/* No credentials / idle — show default "Log in to continue" */}
      {pageType === 'auth' && autoLoginBannerState === 'idle' && (
        <View
          style={{ backgroundColor: '#FEF3C7', borderBottomWidth: 1, borderBottomColor: '#F59E0B', paddingHorizontal: 16, paddingVertical: 10 }}
          testID="auth-page-banner"
        >
          <Text style={{ fontSize: 13, color: '#92400E', fontWeight: '500' }}>
            🔐 Log in to continue
          </Text>
        </View>
      )}

      {/* Captcha page detection banner */}
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
      {bannerState !== null && (
        <AutoFillBanner
          filled={bannerState.filled}
          total={bannerState.total}
          {...(bannerState.results ? { results: bannerState.results } : {})}
          onDismiss={() => setBannerState(null)}
          testID="autofill-banner"
        />
      )}

      {/* Low fill-rate warning banner */}
      {showLowFillWarning && (
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

      {/* "Save credentials for next time?" prompt — shown after manual login */}
      <CredentialPrompt
        visible={showSaveCredentialsPrompt}
        portalName={schema?.portalName ?? 'this portal'}
        initialUsername={extractedUsername}
        title="Save your login for next time?"
        onSave={handleCredentialSave}
        onSkip={() => setShowSaveCredentialsPrompt(false)}
        testID="save-credentials-prompt"
      />

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

        {/* Auto-fill pill — shown when form fields are detected on the page */}
        {pageType === 'form' && !pillDismissed && availableProfiles.length > 0 && (
          <AutoFillPill
            profiles={availableProfiles}
            selectedProfileId={selectedProfileId}
            onProfileChange={handleProfileChange}
            onAutoFill={handleAutoFill}
            onDismiss={() => setPillDismissed(true)}
            testID="autofill-pill"
          />
        )}

        {/* Error overlay — shown on load timeout or WebView error */}
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
                  setLoadError(null);
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

      {/* Collapsible bottom panel: "Fields for this page" */}
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

      {/* QR save overlay — shown when portal QR page is detected */}
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
