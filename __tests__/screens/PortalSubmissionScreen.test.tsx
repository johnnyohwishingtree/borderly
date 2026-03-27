/**
 * Unit tests for PortalSubmissionScreen auto-login states.
 *
 * Tests cover:
 * - Auto-login progress banner shown when auth page detected + credentials exist
 * - Auto-login failed banner shown when AUTO_LOGIN_RESULT reports failure
 * - Default auth banner shown when no credentials are stored
 * - "Save credentials?" prompt shown after manual auth → form transition
 * - Max 1 auto-login attempt per page load (no infinite loops)
 *
 * Also includes focused unit tests for the autoLogin.ts helper:
 * - buildLoginScript produces the correct JS structure
 * - Username/password are correctly embedded
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

// PageDetector mock — use jest.fn so return values can be controlled per-test
jest.mock('@/services/submission/pageDetection', () => ({
  pageDetector: {
    isAuthPage: jest.fn(() => false),
    isCaptchaPage: jest.fn(() => false),
  },
}));

// Credential resolver mock
jest.mock('@/services/submission/credentialResolver', () => ({
  resolvePortalCredential: jest.fn(),
}));

// autoLogin mock — track calls to buildLoginScript
jest.mock('@/services/submission/autoLogin', () => ({
  buildLoginScript: jest.fn(() => 'login_script_stub'),
}));

// WebView mock — captures props so tests can trigger onMessage and verify injectJavaScript
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

jest.mock('@/components/guide', () => {
  const { View } = require('react-native');
  return { CopyableField: () => <View /> };
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
      familyPolicy: { type: 'companion', description: 'One account for all' },
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

// Stable store value — MUST avoid creating new objects on every render,
// otherwise useEffect([..., familyProfiles]) triggers infinite re-renders.
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
  const mockFamilyProfiles = {
    primaryProfileId: 'profile-1',
    profiles: new Map(),
  };
  const mockGetAllProfiles = jest.fn(async () =>
    new Map([['profile-1', mockProfile]]),
  );
  const storeValue = {
    profile: mockProfile,
    getAllProfiles: mockGetAllProfiles,
    familyProfiles: mockFamilyProfiles,
  };
  return { useProfileStore: jest.fn(() => storeValue) };
});

jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  const Icon = () => <View />;
  return { ArrowLeft: Icon, ArrowRight: Icon, RefreshCw: Icon, X: Icon, ChevronDown: Icon, ChevronUp: Icon };
});

// ── Import mocked modules for controlling return values ───────────────────────

import { pageDetector } from '@/services/submission/pageDetection';
import { resolvePortalCredential } from '@/services/submission/credentialResolver';
import { buildLoginScript } from '@/services/submission/autoLogin';

// Import screen AFTER all mocks
import PortalSubmissionScreen from '@/screens/trips/PortalSubmissionScreen/PortalSubmissionScreen';

// ── Typed mock helpers ────────────────────────────────────────────────────────

const mockPageDetector = pageDetector as unknown as {
  isAuthPage: jest.Mock;
  isCaptchaPage: jest.Mock;
};
const mockResolvePortalCredential = resolvePortalCredential as jest.Mock;
const mockBuildLoginScript = buildLoginScript as jest.Mock;

// ── Message simulation helpers ────────────────────────────────────────────────

/** Simulate a PAGE_TYPE_CHECK WebView message. */
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
          html: opts.isAuth
            ? 'login-page html'
            : opts.isCaptcha
              ? 'captcha html'
              : 'page html',
          formFieldCount: opts.formFieldCount ?? 0,
        }),
      },
    });
  });
}

/** Simulate an AUTO_LOGIN_RESULT WebView message. */
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

// ═══════════════════════════════════════════════════════════════════════════════
// buildLoginScript unit tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('buildLoginScript', () => {
  // Use jest.requireActual to bypass the jest.mock and access the real implementation
  const realBuildLoginScript: (username: string, password: string) => string =
    jest.requireActual('@/services/submission/autoLogin').buildLoginScript;

  it('returns a string IIFE', () => {
    const script = realBuildLoginScript('user@example.com', 'secret');
    expect(typeof script).toBe('string');
    expect(script).toMatch(/^\(function\(\)/);
    expect(script).toMatch(/\)\(\);$/);
  });

  it('embeds username via JSON.stringify', () => {
    const username = 'user"with"quotes@example.com';
    const script = realBuildLoginScript(username, 'pass');
    expect(script).toContain(JSON.stringify(username));
  });

  it('embeds password via JSON.stringify', () => {
    const password = 'p@ss\\w0rd"special';
    const script = realBuildLoginScript('user', password);
    expect(script).toContain(JSON.stringify(password));
  });

  it('posts AUTO_LOGIN_RESULT with success:true path', () => {
    const script = realBuildLoginScript('u', 'p');
    expect(script).toContain('AUTO_LOGIN_RESULT');
    expect(script).toContain('success:true');
  });

  it('posts AUTO_LOGIN_RESULT with success:false when fields not found', () => {
    const script = realBuildLoginScript('u', 'p');
    expect(script).toContain('success:false');
    expect(script).toContain('Login fields not found');
  });

  it('includes common email and password selectors', () => {
    const script = realBuildLoginScript('u', 'p');
    // Selectors are embedded via JSON.stringify, so double-quotes are backslash-escaped
    // in the raw script string: input[type=\"email\"]
    expect(script).toContain('input[type=\\"email\\"]');
    expect(script).toContain('input[type=\\"password\\"]');
  });

  it('ends with true; so WebView injection succeeds', () => {
    const script = realBuildLoginScript('u', 'p');
    expect(script).toMatch(/true;\s*\}\)\(\);$/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PortalSubmissionScreen — auto-login state tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('PortalSubmissionScreen — auto-login states', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedInjectJS = jest.fn();
    capturedOnMessage = undefined;
    // Reset page detector defaults
    mockPageDetector.isAuthPage.mockReturnValue(false);
    mockPageDetector.isCaptchaPage.mockReturnValue(false);
  });

  function renderScreen() {
    return render(<PortalSubmissionScreen />);
  }

  // ── Default auth banner (no credentials) ─────────────────────────────────

  it('shows default auth banner when auth page detected and no credentials stored', async () => {
    mockResolvePortalCredential.mockResolvedValue(null);

    const { queryByTestId } = renderScreen();

    simulatePageTypeCheck({ isAuth: true });

    await act(async () => {
      await Promise.resolve();
    });

    expect(queryByTestId('auth-page-banner')).not.toBeNull();
    expect(queryByTestId('auto-login-progress-banner')).toBeNull();
    expect(queryByTestId('auto-login-failed-banner')).toBeNull();
  });

  // ── Auto-login in progress ────────────────────────────────────────────────

  it('shows auto-login-progress-banner when credentials exist and auth page detected', async () => {
    mockResolvePortalCredential.mockResolvedValue({
      username: 'alice@example.com',
      password: 'secret',
    });

    const { queryByTestId } = renderScreen();

    simulatePageTypeCheck({ isAuth: true });

    await act(async () => {
      await Promise.resolve();
    });

    expect(queryByTestId('auto-login-progress-banner')).not.toBeNull();
    expect(queryByTestId('auth-page-banner')).toBeNull();
  });

  it('injects the login script into the WebView when credentials are resolved', async () => {
    mockResolvePortalCredential.mockResolvedValue({
      username: 'alice@example.com',
      password: 'secret',
    });

    renderScreen();

    simulatePageTypeCheck({ isAuth: true });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockBuildLoginScript).toHaveBeenCalledWith('alice@example.com', 'secret');
    expect(capturedInjectJS).toHaveBeenCalledWith('login_script_stub');
  });

  // ── Auto-login failure ────────────────────────────────────────────────────

  it('shows auto-login-failed-banner when AUTO_LOGIN_RESULT reports failure', async () => {
    mockResolvePortalCredential.mockResolvedValue({
      username: 'alice@example.com',
      password: 'secret',
    });

    const { queryByTestId } = renderScreen();

    simulatePageTypeCheck({ isAuth: true });
    await act(async () => { await Promise.resolve(); });

    simulateAutoLoginResult(false, 'Login fields not found');

    expect(queryByTestId('auto-login-failed-banner')).not.toBeNull();
    expect(queryByTestId('auto-login-progress-banner')).toBeNull();
  });

  it('keeps progress banner when AUTO_LOGIN_RESULT is success (waiting for redirect)', async () => {
    mockResolvePortalCredential.mockResolvedValue({
      username: 'alice@example.com',
      password: 'secret',
    });

    const { queryByTestId } = renderScreen();

    simulatePageTypeCheck({ isAuth: true });
    await act(async () => { await Promise.resolve(); });

    simulateAutoLoginResult(true);

    // Success: stays in 'in_progress' while page redirects
    expect(queryByTestId('auto-login-progress-banner')).not.toBeNull();
    expect(queryByTestId('auto-login-failed-banner')).toBeNull();
  });

  // ── Max 1 auto-login attempt per page load ────────────────────────────────

  it('only attempts auto-login once per page load (prevents infinite loops)', async () => {
    mockResolvePortalCredential.mockResolvedValue({
      username: 'alice@example.com',
      password: 'secret',
    });

    renderScreen();

    // Simulate auth page detected multiple times (as could happen with page re-scans)
    simulatePageTypeCheck({ isAuth: true });
    await act(async () => { await Promise.resolve(); });

    simulatePageTypeCheck({ isAuth: true });
    await act(async () => { await Promise.resolve(); });

    simulatePageTypeCheck({ isAuth: true });
    await act(async () => { await Promise.resolve(); });

    // Auto-login should only have been triggered once
    expect(mockResolvePortalCredential).toHaveBeenCalledTimes(1);
    expect(mockBuildLoginScript).toHaveBeenCalledTimes(1);
  });

  // ── "Save credentials?" prompt ────────────────────────────────────────────

  it('shows save-credentials-prompt after manual auth → form transition', async () => {
    // No credentials → user logs in manually
    mockResolvePortalCredential.mockResolvedValue(null);

    const { queryByTestId } = renderScreen();

    // Auth page
    simulatePageTypeCheck({ isAuth: true });
    await act(async () => { await Promise.resolve(); });

    expect(queryByTestId('save-credentials-prompt')).toBeNull();

    // Form page (user logged in manually → portal redirected)
    simulatePageTypeCheck({ formFieldCount: 3 });
    await act(async () => { await Promise.resolve(); });

    expect(queryByTestId('save-credentials-prompt')).not.toBeNull();
    expect(queryByTestId('credential-prompt-save')).not.toBeNull();
    expect(queryByTestId('credential-prompt-skip')).not.toBeNull();
  });

  it('does NOT show save-credentials-prompt when auto-login handled the login', async () => {
    mockResolvePortalCredential.mockResolvedValue({
      username: 'alice@example.com',
      password: 'secret',
    });

    const { queryByTestId } = renderScreen();

    simulatePageTypeCheck({ isAuth: true });
    await act(async () => { await Promise.resolve(); });

    simulateAutoLoginResult(true);

    // Page redirects to form after auto-login
    simulatePageTypeCheck({ formFieldCount: 3 });
    await act(async () => { await Promise.resolve(); });

    // No save-credentials prompt — login was automated
    expect(queryByTestId('save-credentials-prompt')).toBeNull();
  });

  it('does NOT show save-credentials-prompt when form detected without prior auth', async () => {
    mockResolvePortalCredential.mockResolvedValue(null);

    const { queryByTestId } = renderScreen();

    // Form detected straight away (no prior auth page)
    simulatePageTypeCheck({ formFieldCount: 5 });
    await act(async () => { await Promise.resolve(); });

    expect(queryByTestId('save-credentials-prompt')).toBeNull();
  });

  // ── All new UI states have testIDs ────────────────────────────────────────

  it('progress and failed banners both have required testIDs', async () => {
    mockResolvePortalCredential.mockResolvedValue({ username: 'u', password: 'p' });

    const { queryByTestId } = renderScreen();

    // Trigger progress banner
    simulatePageTypeCheck({ isAuth: true });
    await act(async () => { await Promise.resolve(); });
    expect(queryByTestId('auto-login-progress-banner')).not.toBeNull();

    // Trigger failed banner
    simulateAutoLoginResult(false, 'err');
    expect(queryByTestId('auto-login-failed-banner')).not.toBeNull();
  });
});
