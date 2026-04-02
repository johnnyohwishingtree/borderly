/**
 * PortalSubmissionScreen — state machine tests.
 *
 * Documents the four auto-login state transitions and verifies that each state
 * renders the correct banner or pill:
 *
 *   unknown ──► auth detected + credentials ──► auto-login-in-progress
 *   auto-login-in-progress ──► login success + form detected ──► auto-fill-available
 *   auto-login-in-progress ──► login failure ──► manual-login-required
 *   unknown ──► auth detected + no credentials ──► manual-login-required
 *
 * Each state must show the correct testID'd element:
 *   auto-login-in-progress  → testID="auto-login-progress-banner"
 *   manual-login-required   → testID="auth-page-banner" or "auto-login-failed-banner"
 *   auto-fill-available     → no login banners; auto-fill pill visible
 *
 * The setup is identical to PortalSubmissionScreen.test.tsx but the test
 * scenarios focus on state transitions rather than individual feature flags.
 */

import { render, act } from '@testing-library/react-native';

// ── Module mocks ───────────────────────────────────────────────────────────────

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({ navigate: jest.fn() })),
  useRoute: jest.fn(() => ({
    params: {
      url: 'https://vjw-lp.digital.go.jp/en/',
      countryCode: 'JPN',
      tripId: 'trip-1',
      legId: 'leg-1',
    },
  })),
}));

jest.mock('@/services/submission/pageDetection', () => ({
  pageDetector: {
    isAuthPage: jest.fn(() => false),
    isCaptchaPage: jest.fn(() => false),
  },
}));

jest.mock('@/services/submission/credentialResolver', () => ({
  resolvePortalCredential: jest.fn(),
}));

jest.mock('@/services/submission/autoLogin', () => ({
  buildLoginScript: jest.fn(() => 'mock_login_script'),
}));

let capturedInjectJS: jest.Mock;
let capturedOnMessage: ((event: { nativeEvent: { data: string } }) => void) | undefined;

jest.mock('@/components/submission/PortalWebView', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    PortalWebView: React.forwardRef((props: any, ref: any) => {
      capturedOnMessage = props.onMessage;
      React.useImperativeHandle(ref, () => ({
        injectJavaScript: capturedInjectJS,
      }));
      return <View testID="portal-webview" />;
    }),
  };
});

jest.mock('@/components/submission/AutoFillBanner', () => {
  const { View } = require('react-native');
  return {
    AutoFillBanner: (props: any) => <View testID={props.testID ?? 'autofill-banner'} />,
  };
});

jest.mock('@/components/submission/QRSaveOverlay', () => {
  const { View } = require('react-native');
  return { QRSaveOverlay: () => <View testID="qr-save-overlay" /> };
});

jest.mock('@/components/submission/AutoFillPill', () => {
  const { View } = require('react-native');
  return { AutoFillPill: () => <View testID="autofill-pill" /> };
});

jest.mock('@/services/schemas/schemaRegistry', () => ({
  getSchemaByCountryCode: jest.fn(() => ({
    countryCode: 'JPN',
    portalName: 'Visit Japan Web',
    portalUrl: 'https://vjw-lp.digital.go.jp/en/',
    submissionGuide: [
      {
        title: 'Create account',
        automation: { url: 'https://vjw-lp.digital.go.jp/en/' },
        fieldsOnThisScreen: [],
      },
    ],
    portalFlow: {
      requiresAccount: true,
      familyPolicy: { type: 'companion', description: 'One account for the whole family' },
      multiStep: true,
      canSaveProgress: true,
    },
  })),
}));

jest.mock('@/services/forms/formEngine', () => ({
  generateFilledFormForTraveler: jest.fn(() => ({ sections: [] })),
}));

jest.mock('@/services/submission', () => ({
  automationScriptRegistry: { getScriptSync: jest.fn(() => null) },
  AutomationScriptUtils: { applyTransform: jest.fn() },
  formFiller: { isAutoFillSufficient: jest.fn(() => true) },
}));

jest.mock('@/services/automation/qrDetection', () => ({
  getQRDetectionScript: jest.fn(() => null),
}));

jest.mock('@/utils/countryUtils', () => ({
  getPortalName: jest.fn(() => 'Visit Japan Web'),
}));

jest.mock('@/utils/fieldFormatters', () => ({
  formatFieldValue: jest.fn(() => ''),
}));

jest.mock('@/stores', () => {
  const storeValue = {
    trips: [
      { id: 'trip-1', legs: [{ id: 'leg-1', destinationCountry: 'JPN', formData: {} }] },
    ],
    addQRCode: jest.fn(),
    markLegAsSubmitted: jest.fn(),
  };
  return { useTripStore: jest.fn(() => storeValue) };
});

jest.mock('@/stores/useProfileStore', () => {
  const mockProfile = { id: 'profile-1', givenNames: 'Alice', surname: 'Smith' };
  const storeValue = {
    profile: mockProfile,
    getAllProfiles: jest.fn(async () => new Map([['profile-1', mockProfile]])),
    familyProfiles: { primaryProfileId: 'profile-1', profiles: new Map() },
  };
  return { useProfileStore: jest.fn(() => storeValue) };
});

jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  const Icon = () => <View />;
  return {
    ArrowLeft: Icon,
    ArrowRight: Icon,
    RefreshCw: Icon,
    X: Icon,
    ChevronDown: Icon,
    ChevronUp: Icon,
  };
});

// ── Imports (after mocks) ──────────────────────────────────────────────────────

import { pageDetector } from '@/services/submission/pageDetection';
import { resolvePortalCredential } from '@/services/submission/credentialResolver';
import PortalSubmissionScreen from '@/screens/trips/PortalSubmissionScreen/PortalSubmissionScreen';

// ── Typed mock helpers ─────────────────────────────────────────────────────────

const mockPageDetector = pageDetector as unknown as {
  isAuthPage: jest.Mock;
  isCaptchaPage: jest.Mock;
};
const mockResolvePortalCredential = resolvePortalCredential as jest.Mock;

// ── Simulation helpers ─────────────────────────────────────────────────────────

function simulatePageTypeCheck(opts: {
  isAuth?: boolean;
  isCaptcha?: boolean;
  formFieldCount?: number;
}) {
  mockPageDetector.isCaptchaPage.mockReturnValueOnce(opts.isCaptcha ?? false);
  mockPageDetector.isAuthPage.mockReturnValueOnce(opts.isAuth ?? false);
  act(() => {
    capturedOnMessage?.({
      nativeEvent: {
        data: JSON.stringify({
          type: 'PAGE_TYPE_CHECK',
          html: opts.isAuth ? 'login page' : opts.isCaptcha ? 'captcha html' : 'form page',
          formFieldCount: opts.formFieldCount ?? 0,
        }),
      },
    });
  });
}

function simulateAutoLoginResult(success: boolean, error?: string) {
  act(() => {
    capturedOnMessage?.({
      nativeEvent: {
        data: JSON.stringify({
          type: 'AUTO_LOGIN_RESULT',
          success,
          ...(error !== undefined ? { error } : {}),
        }),
      },
    });
  });
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// State machine transition tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('PortalSubmissionScreen — state machine transitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedInjectJS = jest.fn();
    capturedOnMessage = undefined;
    mockPageDetector.isAuthPage.mockReturnValue(false);
    mockPageDetector.isCaptchaPage.mockReturnValue(false);
  });

  // ── Transition 1: unknown → auto-login-in-progress ───────────────────────

  describe('unknown → auth detected + credentials → auto-login-in-progress', () => {
    it('shows auto-login-progress-banner (not auth-page-banner or failed-banner)', async () => {
      mockResolvePortalCredential.mockResolvedValue({
        username: 'alice@example.com',
        password: 'secret',
      });

      const { queryByTestId } = render(<PortalSubmissionScreen />);

      simulatePageTypeCheck({ isAuth: true });
      await flushPromises();

      expect(queryByTestId('auto-login-progress-banner')).not.toBeNull();
      expect(queryByTestId('auth-page-banner')).toBeNull();
      expect(queryByTestId('auto-login-failed-banner')).toBeNull();
    });

    it('injects the login script into the WebView', async () => {
      mockResolvePortalCredential.mockResolvedValue({
        username: 'alice@example.com',
        password: 'secret',
      });

      render(<PortalSubmissionScreen />);
      simulatePageTypeCheck({ isAuth: true });
      await flushPromises();

      expect(capturedInjectJS).toHaveBeenCalledWith('mock_login_script');
    });
  });

  // ── Transition 2: unknown → manual-login-required (no credentials) ────────

  describe('unknown → auth detected + no credentials → manual-login-required', () => {
    it('shows auth-page-banner (not progress or failed banners)', async () => {
      mockResolvePortalCredential.mockResolvedValue(null);

      const { queryByTestId } = render(<PortalSubmissionScreen />);

      simulatePageTypeCheck({ isAuth: true });
      await flushPromises();

      expect(queryByTestId('auth-page-banner')).not.toBeNull();
      expect(queryByTestId('auto-login-progress-banner')).toBeNull();
      expect(queryByTestId('auto-login-failed-banner')).toBeNull();
    });

    it('does NOT inject a login script when no credential is stored', async () => {
      mockResolvePortalCredential.mockResolvedValue(null);

      render(<PortalSubmissionScreen />);
      simulatePageTypeCheck({ isAuth: true });
      await flushPromises();

      expect(capturedInjectJS).not.toHaveBeenCalled();
    });
  });

  // ── Transition 3: auto-login-in-progress → login failure → manual-login-required

  describe('auto-login-in-progress → login failure → manual-login-required', () => {
    it('shows auto-login-failed-banner after AUTO_LOGIN_RESULT failure', async () => {
      mockResolvePortalCredential.mockResolvedValue({
        username: 'alice@example.com',
        password: 'secret',
      });

      const { queryByTestId } = render(<PortalSubmissionScreen />);

      simulatePageTypeCheck({ isAuth: true });
      await flushPromises();
      // State: auto-login-in-progress
      expect(queryByTestId('auto-login-progress-banner')).not.toBeNull();

      simulateAutoLoginResult(false, 'Login fields not found');
      // State: manual-login-required (via failed banner)
      expect(queryByTestId('auto-login-failed-banner')).not.toBeNull();
      expect(queryByTestId('auto-login-progress-banner')).toBeNull();
    });

    it('hides auth-page-banner once the failure banner is shown', async () => {
      mockResolvePortalCredential.mockResolvedValue({ username: 'u', password: 'p' });

      const { queryByTestId } = render(<PortalSubmissionScreen />);

      simulatePageTypeCheck({ isAuth: true });
      await flushPromises();

      simulateAutoLoginResult(false, 'err');

      expect(queryByTestId('auth-page-banner')).toBeNull();
    });
  });

  // ── Transition 4: auto-login-in-progress → login success → auto-fill-available

  describe('auto-login-in-progress → login success + form detected → auto-fill-available', () => {
    it('removes login banners when form page detected after successful auto-login', async () => {
      mockResolvePortalCredential.mockResolvedValue({
        username: 'alice@example.com',
        password: 'secret',
      });

      const { queryByTestId } = render(<PortalSubmissionScreen />);

      // Step 1: auth page → auto-login starts
      simulatePageTypeCheck({ isAuth: true });
      await flushPromises();
      expect(queryByTestId('auto-login-progress-banner')).not.toBeNull();

      // Step 2: login script succeeds (credential submitted, page redirect pending)
      simulateAutoLoginResult(true);
      // Still shows progress banner while waiting for redirect
      expect(queryByTestId('auto-login-progress-banner')).not.toBeNull();

      // Step 3: portal redirects to form page
      simulatePageTypeCheck({ formFieldCount: 5 });
      await flushPromises();

      // Login banners should be gone — user is now on a form page (auto-fill-available)
      expect(queryByTestId('auto-login-progress-banner')).toBeNull();
      expect(queryByTestId('auto-login-failed-banner')).toBeNull();
      expect(queryByTestId('auth-page-banner')).toBeNull();
    });

    it('auto-fill pill is visible on form page (auto-fill-available state)', async () => {
      mockResolvePortalCredential.mockResolvedValue({
        username: 'alice@example.com',
        password: 'secret',
      });

      const { queryByTestId } = render(<PortalSubmissionScreen />);

      simulatePageTypeCheck({ isAuth: true });
      await flushPromises();

      simulateAutoLoginResult(true);

      // Redirect to form
      simulatePageTypeCheck({ formFieldCount: 5 });
      await flushPromises();

      // AutoFillPill should be present in auto-fill-available state
      expect(queryByTestId('autofill-pill')).not.toBeNull();
    });
  });

  // ── Guard: max 1 auto-login attempt per page load ─────────────────────────

  describe('guard: max 1 auto-login attempt per page load', () => {
    it('does not re-attempt auto-login on repeated PAGE_TYPE_CHECK messages', async () => {
      mockResolvePortalCredential.mockResolvedValue({ username: 'u', password: 'p' });

      render(<PortalSubmissionScreen />);

      simulatePageTypeCheck({ isAuth: true });
      await flushPromises();

      simulatePageTypeCheck({ isAuth: true });
      await flushPromises();

      simulatePageTypeCheck({ isAuth: true });
      await flushPromises();

      // Credential resolver should only be called once
      expect(mockResolvePortalCredential).toHaveBeenCalledTimes(1);
    });
  });

  // ── State: all required testIDs are present ────────────────────────────────

  describe('testID availability — all state banners have required testIDs', () => {
    it('auto-login-progress-banner testID is rendered in in-progress state', async () => {
      mockResolvePortalCredential.mockResolvedValue({ username: 'u', password: 'p' });

      const { queryByTestId } = render(<PortalSubmissionScreen />);
      simulatePageTypeCheck({ isAuth: true });
      await flushPromises();

      expect(queryByTestId('auto-login-progress-banner')).not.toBeNull();
    });

    it('auth-page-banner testID is rendered in manual-login-required state', async () => {
      mockResolvePortalCredential.mockResolvedValue(null);

      const { queryByTestId } = render(<PortalSubmissionScreen />);
      simulatePageTypeCheck({ isAuth: true });
      await flushPromises();

      expect(queryByTestId('auth-page-banner')).not.toBeNull();
    });

    it('auto-login-failed-banner testID is rendered after login failure', async () => {
      mockResolvePortalCredential.mockResolvedValue({ username: 'u', password: 'p' });

      const { queryByTestId } = render(<PortalSubmissionScreen />);
      simulatePageTypeCheck({ isAuth: true });
      await flushPromises();

      simulateAutoLoginResult(false, 'Login fields not found');

      expect(queryByTestId('auto-login-failed-banner')).not.toBeNull();
    });
  });

  // ── Save credentials prompt ────────────────────────────────────────────────

  describe('save credentials prompt — shown after manual login transition', () => {
    it('shows save-credentials-prompt when user manually logs in (auth → form, no auto-login)', async () => {
      mockResolvePortalCredential.mockResolvedValue(null);

      const { queryByTestId } = render(<PortalSubmissionScreen />);

      // Auth page first (manual login required)
      simulatePageTypeCheck({ isAuth: true });
      await flushPromises();

      // User logs in manually → portal redirects to form
      simulatePageTypeCheck({ formFieldCount: 3 });
      await flushPromises();

      expect(queryByTestId('save-credentials-prompt')).not.toBeNull();
    });

    it('does NOT show save-credentials-prompt when auto-login handled the session', async () => {
      mockResolvePortalCredential.mockResolvedValue({ username: 'alice@example.com', password: 'secret' });

      const { queryByTestId } = render(<PortalSubmissionScreen />);

      simulatePageTypeCheck({ isAuth: true });
      await flushPromises();

      simulateAutoLoginResult(true);

      // Form page detected after auto-login redirect
      simulatePageTypeCheck({ formFieldCount: 3 });
      await flushPromises();

      expect(queryByTestId('save-credentials-prompt')).toBeNull();
    });
  });

  // ── Initial render — no banners before PAGE_TYPE_CHECK ──────────────────

  describe('initial render — no login banners before any page type detection', () => {
    it('does NOT show auto-login-failed-banner on initial render', () => {
      mockResolvePortalCredential.mockResolvedValue(null);

      const { queryByTestId } = render(<PortalSubmissionScreen />);

      // Before any PAGE_TYPE_CHECK message, the banner must not be present
      expect(queryByTestId('auto-login-failed-banner')).toBeNull();
    });

    it('does NOT show auto-login-progress-banner on initial render', () => {
      mockResolvePortalCredential.mockResolvedValue(null);

      const { queryByTestId } = render(<PortalSubmissionScreen />);

      expect(queryByTestId('auto-login-progress-banner')).toBeNull();
    });

    it('does NOT show auth-page-banner on initial render', () => {
      mockResolvePortalCredential.mockResolvedValue(null);

      const { queryByTestId } = render(<PortalSubmissionScreen />);

      expect(queryByTestId('auth-page-banner')).toBeNull();
    });

    it('does NOT show any login banners even when credentials exist', async () => {
      // Credentials exist but no PAGE_TYPE_CHECK has been sent yet —
      // banners should NOT appear until the page is classified as 'auth'.
      mockResolvePortalCredential.mockResolvedValue({
        username: 'alice@example.com',
        password: 'secret',
      });

      const { queryByTestId } = render(<PortalSubmissionScreen />);
      await flushPromises();

      expect(queryByTestId('auto-login-failed-banner')).toBeNull();
      expect(queryByTestId('auto-login-progress-banner')).toBeNull();
      expect(queryByTestId('auth-page-banner')).toBeNull();
    });
  });
});
