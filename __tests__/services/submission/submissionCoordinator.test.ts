/**
 * Tests for submissionCoordinator (facade)
 */

import { submissionCoordinator, PAGE_TYPE_CHECK_SCRIPT } from '@/services/submission/submissionCoordinator';

// Mock dependencies — the coordinator delegates to these services
jest.mock('@/services/submission/automationScripts', () => ({
  automationScriptRegistry: { getScriptSync: jest.fn() },
  AutomationScriptRegistry: jest.fn(),
  AutomationScriptUtils: { applyTransform: jest.fn() },
}));

jest.mock('@/services/submission/formFiller', () => ({
  formFiller: {
    buildAutoFillScript: jest.fn().mockReturnValue('(function(){})()'),
    isAutoFillSufficient: jest.fn().mockImplementation((rate: number) => rate >= 0.5),
  },
}));

jest.mock('@/services/submission/pageDetection', () => ({
  pageDetector: {
    isCaptchaPage: jest.fn().mockReturnValue(false),
    isAuthPage: jest.fn().mockReturnValue(false),
  },
}));

jest.mock('@/services/submission/credentialResolver', () => ({
  resolvePortalCredential: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/services/submission/autoLogin', () => ({
  buildLoginScript: jest.fn().mockReturnValue('login_script();'),
}));

jest.mock('@/services/automation/qrDetection', () => ({
  getQRDetectionScript: jest.fn().mockReturnValue(null),
}));

jest.mock('@/services/storage/keychain', () => ({
  keychainService: {
    storePortalCredential: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/services/forms/formEngine', () => ({
  generateFilledFormForTraveler: jest.fn().mockReturnValue(null),
}));

jest.mock('@/utils/fieldFormatters', () => ({
  formatFieldValue: jest.fn().mockImplementation((v: unknown) => (v ? String(v) : null)),
}));

const { pageDetector } = jest.requireMock('@/services/submission/pageDetection') as {
  pageDetector: { isCaptchaPage: jest.Mock; isAuthPage: jest.Mock };
};

// ---------------------------------------------------------------------------
// detectPageType
// ---------------------------------------------------------------------------
describe('detectPageType', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns "captcha" when page looks like a CAPTCHA', () => {
    pageDetector.isCaptchaPage.mockReturnValue(true);
    expect(submissionCoordinator.detectPageType('<html>captcha</html>', 0)).toBe('captcha');
  });

  it('returns "auth" when page looks like a login page', () => {
    pageDetector.isCaptchaPage.mockReturnValue(false);
    pageDetector.isAuthPage.mockReturnValue(true);
    expect(submissionCoordinator.detectPageType('<html>login</html>', 0)).toBe('auth');
  });

  it('returns "form" when form fields are present and not captcha/auth', () => {
    pageDetector.isCaptchaPage.mockReturnValue(false);
    pageDetector.isAuthPage.mockReturnValue(false);
    expect(submissionCoordinator.detectPageType('<html></html>', 5)).toBe('form');
  });

  it('returns "unknown" when no signals match', () => {
    pageDetector.isCaptchaPage.mockReturnValue(false);
    pageDetector.isAuthPage.mockReturnValue(false);
    expect(submissionCoordinator.detectPageType('<html></html>', 0)).toBe('unknown');
  });
});

// ---------------------------------------------------------------------------
// detectStep
// ---------------------------------------------------------------------------
describe('detectStep', () => {
  const schema = {
    submissionGuide: [
      { title: 'Step 1', automation: { url: 'https://portal.gov/step1' } },
      { title: 'Step 2', automation: { url: 'https://portal.gov/step2' } },
    ],
  };

  it('returns the matching step index when URL starts with step URL', () => {
    expect(submissionCoordinator.detectStep('https://portal.gov/step2/page', schema as never)).toBe(1);
  });

  it('returns -1 when no step matches', () => {
    expect(submissionCoordinator.detectStep('https://other.gov/', schema as never)).toBe(-1);
  });

  it('returns -1 when schema has no submissionGuide', () => {
    expect(submissionCoordinator.detectStep('https://portal.gov/step1', {} as never)).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// getPageTypeCheckScript
// ---------------------------------------------------------------------------
describe('getPageTypeCheckScript', () => {
  it('returns the PAGE_TYPE_CHECK_SCRIPT constant', () => {
    expect(submissionCoordinator.getPageTypeCheckScript()).toBe(PAGE_TYPE_CHECK_SCRIPT);
  });

  it('contains ReactNativeWebView.postMessage call', () => {
    expect(submissionCoordinator.getPageTypeCheckScript()).toContain('ReactNativeWebView.postMessage');
  });
});

// ---------------------------------------------------------------------------
// isAutoFillSufficient
// ---------------------------------------------------------------------------
describe('isAutoFillSufficient', () => {
  it('returns true for fill rates >= 50%', () => {
    expect(submissionCoordinator.isAutoFillSufficient(0.5)).toBe(true);
    expect(submissionCoordinator.isAutoFillSufficient(1.0)).toBe(true);
  });

  it('returns false for fill rates < 50%', () => {
    expect(submissionCoordinator.isAutoFillSufficient(0.49)).toBe(false);
    expect(submissionCoordinator.isAutoFillSufficient(0)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildLoginScript
// ---------------------------------------------------------------------------
describe('buildLoginScript', () => {
  it('delegates to autoLogin.buildLoginScript', () => {
    const result = submissionCoordinator.buildLoginScript('user@test.com', 'pass123');
    expect(result).toBe('login_script();');
  });
});

// ---------------------------------------------------------------------------
// buildUsernameExtractionScript
// ---------------------------------------------------------------------------
describe('buildUsernameExtractionScript', () => {
  it('returns a script that posts EXTRACT_LOGIN_USERNAME message', () => {
    const script = submissionCoordinator.buildUsernameExtractionScript();
    expect(script).toContain('EXTRACT_LOGIN_USERNAME');
    expect(script).toContain('ReactNativeWebView.postMessage');
  });
});

// ---------------------------------------------------------------------------
// generateFilledForm
// ---------------------------------------------------------------------------
describe('generateFilledForm', () => {
  it('returns null when form generation fails', () => {
    const result = submissionCoordinator.generateFilledForm(
      { id: 'p1' } as never,
      { formData: {} } as never,
      {} as never,
    );
    expect(result).toBeNull();
  });
});
