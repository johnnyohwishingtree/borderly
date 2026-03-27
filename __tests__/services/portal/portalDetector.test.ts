import { PortalDetector } from '../../../src/services/portal/portalDetector';
import {
  CAPTCHA_DETECTION_SCRIPT,
  FORM_ANALYSIS_SCRIPT,
  AUTH_CHECK_SCRIPT,
  FEATURE_DETECTION_SCRIPT,
  PAGE_INFO_SCRIPT,
  SIGNATURE_GENERATION_SCRIPT,
} from '../../../src/services/portal/portalScripts';
import type {
  FormStructureInfo,
  AuthenticationInfo,
  PortalFeatures,
} from '../../../src/services/portal/portalTypes';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makePageInfo(overrides?: Record<string, unknown>) {
  return {
    url: 'https://vjw-lp.digital.go.jp/vjw/login',
    domain: 'vjw-lp.digital.go.jp',
    pathname: '/vjw/login',
    title: 'Visit Japan Web',
    ...overrides,
  };
}

const defaultFeatures: PortalFeatures = {
  hasFileUpload: false,
  hasMultiPageForm: true,
  hasProgressIndicator: true,
  hasSessionTimeout: false,
  hasCaptcha: false,
  hasQRCodeGeneration: false,
  hasLanguageSelection: true,
  hasFormSave: false,
  hasPrefill: false,
  hasValidation: true,
  supportsMobile: true,
  requiresJavaScript: true,
};

const defaultAuthInfo: AuthenticationInfo = {
  required: true,
  methods: ['email_password'],
  remembersSession: true,
  twoFactorAuth: false,
};

const defaultFormStructure: FormStructureInfo = {
  totalSteps: 3,
  currentStep: 1,
  sections: [],
  requiredFields: ['name', 'passport'],
  optionalFields: ['phone'],
  uploadFields: [],
  validationRules: [],
};

/** Creates a mock executeScript that maps script strings to return values. */
function makeExecuteScript(
  scriptMap: Record<string, unknown>
): (code: string) => Promise<any> {
  return async (code: string) => {
    for (const [key, value] of Object.entries(scriptMap)) {
      if (code === key) return value;
    }
    return {};
  };
}

// ---------------------------------------------------------------------------
// PortalDetector — constructor
// ---------------------------------------------------------------------------
describe('PortalDetector', () => {
  describe('constructor', () => {
    it('initializes with an empty detection cache', () => {
      const detector = new PortalDetector();
      // Accessing private via any to verify cache is empty
      expect((detector as any).detectionCache.size).toBe(0);
    });

    it('initializes known portals map', () => {
      const detector = new PortalDetector();
      expect((detector as any).knownPortals.size).toBe(3);
    });
  });

  // ---------------------------------------------------------------------------
  // identifyPortal
  // ---------------------------------------------------------------------------
  describe('identifyPortal', () => {
    it('identifies a known Japan VJW portal', async () => {
      const detector = new PortalDetector();
      const executeScript = makeExecuteScript({
        [PAGE_INFO_SCRIPT]: makePageInfo(),
        [FEATURE_DETECTION_SCRIPT]: defaultFeatures,
        [AUTH_CHECK_SCRIPT]: defaultAuthInfo,
        [FORM_ANALYSIS_SCRIPT]: defaultFormStructure,
      });

      const result = await detector.identifyPortal(executeScript);
      expect(result.portalType).toBe('japan_vjw');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.countryCode).toBe('JP');
      expect(result.portalName).toBe('Visit Japan Web');
    });

    it('returns generic for unrecognized portal', async () => {
      const detector = new PortalDetector();
      const executeScript = makeExecuteScript({
        [PAGE_INFO_SCRIPT]: makePageInfo({
          url: 'https://example.gov/form',
          domain: 'example.gov',
          pathname: '/form',
          title: 'Government Form',
        }),
        [FEATURE_DETECTION_SCRIPT]: defaultFeatures,
        [AUTH_CHECK_SCRIPT]: defaultAuthInfo,
        [FORM_ANALYSIS_SCRIPT]: defaultFormStructure,
      });

      const result = await detector.identifyPortal(executeScript);
      expect(result.portalType).toBe('generic');
      expect(result.confidence).toBe(0.5);
      expect(result.countryCode).toBe('US');
    });

    it('uses cache on repeat calls with same page info', async () => {
      const detector = new PortalDetector();
      let callCount = 0;
      const executeScript = async (code: string) => {
        callCount++;
        if (code === PAGE_INFO_SCRIPT) return makePageInfo();
        if (code === FEATURE_DETECTION_SCRIPT) return defaultFeatures;
        if (code === AUTH_CHECK_SCRIPT) return defaultAuthInfo;
        if (code === FORM_ANALYSIS_SCRIPT) return defaultFormStructure;
        return {};
      };

      await detector.identifyPortal(executeScript);
      const firstCallCount = callCount;

      await detector.identifyPortal(executeScript);
      // Second call should only invoke PAGE_INFO_SCRIPT (to build cache key),
      // then return cached result — fewer total calls
      expect(callCount - firstCallCount).toBeLessThan(firstCallCount);
    });

    it('returns unknown portal on script execution error', async () => {
      const detector = new PortalDetector();
      const executeScript = async () => {
        throw new Error('WebView not available');
      };

      const result = await detector.identifyPortal(executeScript);
      expect(result.portalType).toBe('unknown');
      expect(result.confidence).toBe(0);
      expect(result.countryCode).toBe('');
      expect(result.portalName).toBe('Unknown Portal');
    });

    it('guesses US from .gov domain', async () => {
      const detector = new PortalDetector();
      const executeScript = makeExecuteScript({
        [PAGE_INFO_SCRIPT]: makePageInfo({
          domain: 'travel.gov',
          pathname: '/apply',
          title: 'Travel Application',
        }),
        [FEATURE_DETECTION_SCRIPT]: defaultFeatures,
        [AUTH_CHECK_SCRIPT]: defaultAuthInfo,
        [FORM_ANALYSIS_SCRIPT]: defaultFormStructure,
      });

      const result = await detector.identifyPortal(executeScript);
      expect(result.countryCode).toBe('US');
    });

    it('guesses GB from .gov.uk domain', async () => {
      const detector = new PortalDetector();
      const executeScript = makeExecuteScript({
        [PAGE_INFO_SCRIPT]: makePageInfo({
          domain: 'www.gov.uk',
          pathname: '/visa',
          title: 'UK Visa',
        }),
        [FEATURE_DETECTION_SCRIPT]: defaultFeatures,
        [AUTH_CHECK_SCRIPT]: defaultAuthInfo,
        [FORM_ANALYSIS_SCRIPT]: defaultFormStructure,
      });

      const result = await detector.identifyPortal(executeScript);
      expect(result.countryCode).toBe('GB');
    });
  });

  // ---------------------------------------------------------------------------
  // detectCaptcha
  // ---------------------------------------------------------------------------
  describe('detectCaptcha', () => {
    it('returns captcha info when present', async () => {
      const detector = new PortalDetector();
      const executeScript = makeExecuteScript({
        [CAPTCHA_DETECTION_SCRIPT]: {
          present: true,
          type: 'recaptcha',
          selector: '.g-recaptcha',
          provider: 'Google',
          difficulty: 'medium',
        },
      });

      const result = await detector.detectCaptcha(executeScript);
      expect(result.present).toBe(true);
      expect(result.type).toBe('recaptcha');
      expect(result.provider).toBe('Google');
      expect(result.bypassable).toBe(false);
    });

    it('sets bypassable true for text captcha', async () => {
      const detector = new PortalDetector();
      const executeScript = makeExecuteScript({
        [CAPTCHA_DETECTION_SCRIPT]: {
          present: true,
          type: 'text',
          selector: '#captcha',
          provider: 'custom',
          difficulty: 'easy',
        },
      });

      const result = await detector.detectCaptcha(executeScript);
      expect(result.bypassable).toBe(true);
    });

    it('sets bypassable true for image captcha', async () => {
      const detector = new PortalDetector();
      const executeScript = makeExecuteScript({
        [CAPTCHA_DETECTION_SCRIPT]: {
          present: true,
          type: 'image',
          selector: '#captcha-img',
          provider: 'custom',
          difficulty: 'medium',
        },
      });

      const result = await detector.detectCaptcha(executeScript);
      expect(result.bypassable).toBe(true);
    });

    it('returns not present on error', async () => {
      const detector = new PortalDetector();
      const executeScript = async () => {
        throw new Error('Script failed');
      };

      const result = await detector.detectCaptcha(executeScript);
      expect(result.present).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // analyzeFormStructure
  // ---------------------------------------------------------------------------
  describe('analyzeFormStructure', () => {
    it('returns form structure from script', async () => {
      const detector = new PortalDetector();
      const executeScript = makeExecuteScript({
        [FORM_ANALYSIS_SCRIPT]: defaultFormStructure,
      });

      const result = await detector.analyzeFormStructure(executeScript);
      expect(result.totalSteps).toBe(3);
      expect(result.requiredFields).toContain('name');
    });

    it('returns default form structure on error', async () => {
      const detector = new PortalDetector();
      const executeScript = async () => {
        throw new Error('error');
      };

      const result = await detector.analyzeFormStructure(executeScript);
      expect(result.totalSteps).toBe(1);
      expect(result.sections).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // checkAuthenticationRequired
  // ---------------------------------------------------------------------------
  describe('checkAuthenticationRequired', () => {
    it('returns auth info from script', async () => {
      const detector = new PortalDetector();
      const executeScript = makeExecuteScript({
        [AUTH_CHECK_SCRIPT]: defaultAuthInfo,
      });

      const result = await detector.checkAuthenticationRequired(executeScript);
      expect(result.required).toBe(true);
      expect(result.methods).toContain('email_password');
    });

    it('returns default auth info on error', async () => {
      const detector = new PortalDetector();
      const executeScript = async () => {
        throw new Error('error');
      };

      const result = await detector.checkAuthenticationRequired(executeScript);
      expect(result.required).toBe(false);
      expect(result.methods).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // detectPortalChanges
  // ---------------------------------------------------------------------------
  describe('detectPortalChanges', () => {
    it('returns no changes when signatures match', async () => {
      const detector = new PortalDetector();
      const sig = JSON.stringify({ url: 'https://a.com', title: 'A', formCount: 1, inputCount: 5, hash: 100 });
      const executeScript = makeExecuteScript({
        [SIGNATURE_GENERATION_SCRIPT]: JSON.parse(sig),
      });

      const result = await detector.detectPortalChanges(sig, executeScript);
      expect(result.hasChanged).toBe(false);
    });

    it('detects URL change as high impact', async () => {
      const detector = new PortalDetector();
      const prev = JSON.stringify({ url: 'https://a.com', title: 'A', formCount: 1, inputCount: 5, hash: 100 });
      const executeScript = makeExecuteScript({
        [SIGNATURE_GENERATION_SCRIPT]: { url: 'https://b.com', title: 'A', formCount: 1, inputCount: 5, hash: 100 },
      });

      const result = await detector.detectPortalChanges(prev, executeScript);
      expect(result.hasChanged).toBe(true);
      expect(result.impact).toBe('high');
      expect(result.changedElements).toContain('url');
    });

    it('detects title change as low impact', async () => {
      const detector = new PortalDetector();
      const prev = JSON.stringify({ url: 'https://a.com', title: 'A', formCount: 1, inputCount: 5, hash: 100 });
      const executeScript = makeExecuteScript({
        [SIGNATURE_GENERATION_SCRIPT]: { url: 'https://a.com', title: 'B', formCount: 1, inputCount: 5, hash: 100 },
      });

      const result = await detector.detectPortalChanges(prev, executeScript);
      expect(result.hasChanged).toBe(true);
      expect(result.impact).toBe('low');
      expect(result.changedElements).toContain('title');
    });

    it('detects form structure change as high impact', async () => {
      const detector = new PortalDetector();
      const prev = JSON.stringify({ url: 'https://a.com', title: 'A', formCount: 1, inputCount: 5, hash: 100 });
      const executeScript = makeExecuteScript({
        [SIGNATURE_GENERATION_SCRIPT]: { url: 'https://a.com', title: 'A', formCount: 3, inputCount: 10, hash: 100 },
      });

      const result = await detector.detectPortalChanges(prev, executeScript);
      expect(result.hasChanged).toBe(true);
      expect(result.changeType).toBe('structure');
      expect(result.impact).toBe('high');
    });

    it('detects large hash difference as layout change', async () => {
      const detector = new PortalDetector();
      const prev = JSON.stringify({ url: 'https://a.com', title: 'A', formCount: 1, inputCount: 5, hash: 100 });
      const executeScript = makeExecuteScript({
        [SIGNATURE_GENERATION_SCRIPT]: { url: 'https://a.com', title: 'A', formCount: 1, inputCount: 5, hash: 200 },
      });

      const result = await detector.detectPortalChanges(prev, executeScript);
      expect(result.hasChanged).toBe(true);
      expect(result.changeType).toBe('layout');
      expect(result.impact).toBe('medium');
    });

    it('returns no significant changes for small hash difference', async () => {
      const detector = new PortalDetector();
      const prev = JSON.stringify({ url: 'https://a.com', title: 'A', formCount: 1, inputCount: 5, hash: 100 });
      const executeScript = makeExecuteScript({
        [SIGNATURE_GENERATION_SCRIPT]: { url: 'https://a.com', title: 'A', formCount: 1, inputCount: 5, hash: 105 },
      });

      const result = await detector.detectPortalChanges(prev, executeScript);
      expect(result.hasChanged).toBe(false);
    });

    it('returns error change info when script throws', async () => {
      const detector = new PortalDetector();
      const executeScript = async () => {
        throw new Error('script error');
      };

      const result = await detector.detectPortalChanges('{}', executeScript);
      expect(result.hasChanged).toBe(true);
      expect(result.impact).toBe('high');
    });
  });
});
