/**
 * Unit tests for page detection logic (PortalDetector)
 *
 * PortalDetector identifies which government portal is loaded in the WebView
 * by analysing domain names, URL patterns, and page titles.  These tests mock
 * the executeScript function to control what the "page" looks like.
 */
import { PortalDetector } from '../../src/utils/portalDetection';

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeExecutor(pageInfo: {
  url?: string;
  title?: string;
  domain?: string;
  pathname?: string;
  language?: string;
  viewport?: { width: number; height: number };
}) {
  return jest.fn().mockResolvedValue({
    url: pageInfo.url ?? 'https://example.com/',
    title: pageInfo.title ?? 'Test Page',
    domain: pageInfo.domain ?? 'example.com',
    pathname: pageInfo.pathname ?? '/',
    language: pageInfo.language ?? 'en',
    viewport: pageInfo.viewport ?? { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0',
    hasJavaScript: true,
    loadTime: 'complete',
  });
}

// ─── PortalDetector construction ──────────────────────────────────────────

describe('PortalDetector — construction', () => {
  it('creates an instance without throwing', () => {
    expect(() => new PortalDetector()).not.toThrow();
  });
});

// ─── identifyPortal — Japan (Visit Japan Web) ─────────────────────────────

describe('PortalDetector.identifyPortal — Japan (VJW)', () => {
  it('identifies japan_vjw when domain matches vjw-lp.digital.go.jp', async () => {
    const detector = new PortalDetector();
    // The detector calls executeScript multiple times for features / auth / form.
    // All calls after the first (pageInfo) return empty safe defaults.
    const execute = jest
      .fn()
      .mockResolvedValueOnce({
        url: 'https://vjw-lp.digital.go.jp/visit-japan-web/',
        title: 'Visit Japan Web',
        domain: 'vjw-lp.digital.go.jp',
        pathname: '/visit-japan-web/',
        language: 'ja',
        viewport: { width: 390, height: 844 },
        userAgent: 'test',
        hasJavaScript: true,
        loadTime: 'complete',
      })
      // Subsequent calls (feature detection, auth, form structure) return safe defaults
      .mockResolvedValue({});

    const result = await detector.identifyPortal(execute);

    expect(result.portalType).toBe('japan_vjw');
    expect(result.countryCode).toBe('JP');
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it('sets portalName to Visit Japan Web', async () => {
    const detector = new PortalDetector();
    const execute = jest
      .fn()
      .mockResolvedValueOnce({
        url: 'https://vjw-lp.digital.go.jp/',
        title: 'Visit Japan Web',
        domain: 'vjw-lp.digital.go.jp',
        pathname: '/',
        language: 'ja',
        viewport: { width: 390, height: 844 },
        userAgent: 'test',
        hasJavaScript: true,
        loadTime: 'complete',
      })
      .mockResolvedValue({});

    const result = await detector.identifyPortal(execute);
    expect(result.portalName).toBe('Visit Japan Web');
  });
});

// ─── identifyPortal — Malaysia (MDAC) ────────────────────────────────────

describe('PortalDetector.identifyPortal — Malaysia (MDAC)', () => {
  it('identifies malaysia_mdac when domain matches mdac.gov.my', async () => {
    const detector = new PortalDetector();
    const execute = jest
      .fn()
      .mockResolvedValueOnce({
        url: 'https://mdac.gov.my/digital-arrival/',
        title: 'Malaysia Digital Arrival Card',
        domain: 'mdac.gov.my',
        pathname: '/digital-arrival/',
        language: 'en',
        viewport: { width: 390, height: 844 },
        userAgent: 'test',
        hasJavaScript: true,
        loadTime: 'complete',
      })
      .mockResolvedValue({});

    const result = await detector.identifyPortal(execute);

    expect(result.portalType).toBe('malaysia_mdac');
    expect(result.countryCode).toBe('MY');
    expect(result.confidence).toBeGreaterThan(0.7);
  });
});

// ─── identifyPortal — Singapore (ICA) ────────────────────────────────────

describe('PortalDetector.identifyPortal — Singapore (ICA)', () => {
  it('identifies singapore_ica when domain matches eservices.ica.gov.sg', async () => {
    const detector = new PortalDetector();
    const execute = jest
      .fn()
      .mockResolvedValueOnce({
        url: 'https://eservices.ica.gov.sg/arrival-card/',
        title: 'SG Arrival Card',
        domain: 'eservices.ica.gov.sg',
        pathname: '/arrival-card/',
        language: 'en',
        viewport: { width: 390, height: 844 },
        userAgent: 'test',
        hasJavaScript: true,
        loadTime: 'complete',
      })
      .mockResolvedValue({});

    const result = await detector.identifyPortal(execute);

    expect(result.portalType).toBe('singapore_ica');
    expect(result.countryCode).toBe('SG');
    expect(result.confidence).toBeGreaterThan(0.7);
  });
});

// ─── identifyPortal — unknown / generic ──────────────────────────────────

describe('PortalDetector.identifyPortal — unknown domain', () => {
  it('returns generic type for an unrecognised domain', async () => {
    const detector = new PortalDetector();
    const execute = jest
      .fn()
      .mockResolvedValueOnce({
        url: 'https://unknown-portal.gov/',
        title: 'Some Government Form',
        domain: 'unknown-portal.gov',
        pathname: '/',
        language: 'en',
        viewport: { width: 390, height: 844 },
        userAgent: 'test',
        hasJavaScript: true,
        loadTime: 'complete',
      })
      .mockResolvedValue({});

    const result = await detector.identifyPortal(execute);

    expect(['generic', 'unknown']).toContain(result.portalType);
  });

  it('returns unknown type when execute throws', async () => {
    const detector = new PortalDetector();
    const execute = jest.fn().mockRejectedValue(new Error('WebView unavailable'));

    const result = await detector.identifyPortal(execute);
    expect(result.portalType).toBe('unknown');
    expect(result.confidence).toBe(0);
  });
});

// ─── detectPortalChanges ──────────────────────────────────────────────────

describe('PortalDetector.detectPortalChanges', () => {
  it('returns hasChanged=false when signatures are identical', async () => {
    const detector = new PortalDetector();
    const signature = JSON.stringify({
      url: 'https://vjw-lp.digital.go.jp/',
      title: 'Visit Japan Web',
      elements: [],
      formCount: 1,
      inputCount: 10,
      hash: 5000,
    });

    // When signatures match, execute is called to get the current signature.
    // We simulate it returning the same content.
    const execute = jest.fn().mockResolvedValue({
      url: 'https://vjw-lp.digital.go.jp/',
      title: 'Visit Japan Web',
      elements: [],
      formCount: 1,
      inputCount: 10,
      hash: 5000,
    });

    const result = await detector.detectPortalChanges(signature, execute);
    expect(result.hasChanged).toBe(false);
  });

  it('returns hasChanged=true and impact=high when form count changes', async () => {
    const detector = new PortalDetector();
    const previousSignature = JSON.stringify({
      url: 'https://vjw-lp.digital.go.jp/',
      title: 'Visit Japan Web',
      elements: [],
      formCount: 1,
      inputCount: 10,
      hash: 5000,
    });

    // Simulate different formCount (portal DOM changed)
    const execute = jest.fn().mockResolvedValue({
      url: 'https://vjw-lp.digital.go.jp/',
      title: 'Visit Japan Web',
      elements: [],
      formCount: 2, // changed!
      inputCount: 20,
      hash: 6000,
    });

    const result = await detector.detectPortalChanges(previousSignature, execute);
    expect(result.hasChanged).toBe(true);
    expect(result.impact).toBe('high');
  });

  it('returns hasChanged=true and high impact when execute throws', async () => {
    const detector = new PortalDetector();
    const execute = jest.fn().mockRejectedValue(new Error('Script failed'));

    const result = await detector.detectPortalChanges('{}', execute);
    expect(result.hasChanged).toBe(true);
    expect(result.impact).toBe('high');
    expect(result.suggestedAction).toContain('manual');
  });
});

// ─── detectCaptcha ────────────────────────────────────────────────────────

describe('PortalDetector.detectCaptcha', () => {
  it('returns present=false when execute returns no captcha signals', async () => {
    const detector = new PortalDetector();
    const execute = jest.fn().mockResolvedValue({
      present: false,
      type: 'unknown',
      selector: null,
      provider: null,
      difficulty: 'medium',
    });

    const result = await detector.detectCaptcha(execute);
    expect(result.present).toBe(false);
  });

  it('returns present=true with type=recaptcha when recaptcha is detected', async () => {
    const detector = new PortalDetector();
    const execute = jest.fn().mockResolvedValue({
      present: true,
      type: 'recaptcha',
      selector: '.g-recaptcha',
      provider: 'Google',
      difficulty: 'medium',
    });

    const result = await detector.detectCaptcha(execute);
    expect(result.present).toBe(true);
    expect(result.type).toBe('recaptcha');
    expect(result.provider).toBe('Google');
  });

  it('returns present=false when execute throws', async () => {
    const detector = new PortalDetector();
    const execute = jest.fn().mockRejectedValue(new Error('Script error'));

    const result = await detector.detectCaptcha(execute);
    expect(result.present).toBe(false);
  });

  it('marks text captcha as bypassable', async () => {
    const detector = new PortalDetector();
    const execute = jest.fn().mockResolvedValue({
      present: true,
      type: 'text',
      selector: 'input[name="captcha"]',
      provider: null,
      difficulty: 'easy',
    });

    const result = await detector.detectCaptcha(execute);
    expect(result.bypassable).toBe(true);
  });
});

// ─── analyzeFormStructure ─────────────────────────────────────────────────

describe('PortalDetector.analyzeFormStructure', () => {
  it('returns default structure when execute returns null', async () => {
    const detector = new PortalDetector();
    const execute = jest.fn().mockResolvedValue(null);

    const result = await detector.analyzeFormStructure(execute);
    expect(result.totalSteps).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(result.sections)).toBe(true);
    expect(Array.isArray(result.requiredFields)).toBe(true);
    expect(Array.isArray(result.optionalFields)).toBe(true);
  });

  it('returns default structure when execute throws', async () => {
    const detector = new PortalDetector();
    const execute = jest.fn().mockRejectedValue(new Error('Timeout'));

    const result = await detector.analyzeFormStructure(execute);
    expect(result.totalSteps).toBeGreaterThanOrEqual(1);
  });

  it('forwards script result to caller when execute succeeds', async () => {
    const detector = new PortalDetector();
    const mockStructure = {
      totalSteps: 3,
      currentStep: 2,
      sections: [],
      requiredFields: ['passport', 'dob'],
      optionalFields: ['middleName'],
      uploadFields: [],
      validationRules: [],
    };
    const execute = jest.fn().mockResolvedValue(mockStructure);

    const result = await detector.analyzeFormStructure(execute);
    expect(result.totalSteps).toBe(3);
    expect(result.requiredFields).toContain('passport');
  });
});

// ─── checkAuthenticationRequired ─────────────────────────────────────────

describe('PortalDetector.checkAuthenticationRequired', () => {
  it('returns required=false when execute returns no auth signals', async () => {
    const detector = new PortalDetector();
    const execute = jest.fn().mockResolvedValue({
      required: false,
      methods: [],
      loginUrl: null,
      registrationUrl: null,
      sessionDuration: null,
      remembersSession: false,
      twoFactorAuth: false,
    });

    const result = await detector.checkAuthenticationRequired(execute);
    expect(result.required).toBe(false);
  });

  it('returns required=true with email_password method when login form is detected', async () => {
    const detector = new PortalDetector();
    const execute = jest.fn().mockResolvedValue({
      required: true,
      methods: ['email_password'],
      loginUrl: 'https://vjw-lp.digital.go.jp/login',
      registrationUrl: null,
      sessionDuration: null,
      remembersSession: false,
      twoFactorAuth: false,
    });

    const result = await detector.checkAuthenticationRequired(execute);
    expect(result.required).toBe(true);
    expect(result.methods).toContain('email_password');
  });

  it('returns default when execute throws', async () => {
    const detector = new PortalDetector();
    const execute = jest.fn().mockRejectedValue(new Error('Script error'));

    const result = await detector.checkAuthenticationRequired(execute);
    expect(result.required).toBe(false);
  });
});

// ─── caching ──────────────────────────────────────────────────────────────

describe('PortalDetector — caching', () => {
  it('returns cached result on second call for same URL+title', async () => {
    const detector = new PortalDetector();
    const pageInfoResult = {
      url: 'https://vjw-lp.digital.go.jp/',
      title: 'Visit Japan Web',
      domain: 'vjw-lp.digital.go.jp',
      pathname: '/',
      language: 'ja',
      viewport: { width: 390, height: 844 },
      userAgent: 'test',
      hasJavaScript: true,
      loadTime: 'complete',
    };

    const execute = jest.fn().mockResolvedValue(pageInfoResult);

    const result1 = await detector.identifyPortal(execute);
    const callCountAfterFirst = execute.mock.calls.length;

    const result2 = await detector.identifyPortal(execute);
    // Second call should return cached result (execute called fewer additional times)
    const callCountAfterSecond = execute.mock.calls.length;

    expect(result1.portalType).toBe(result2.portalType);
    // Cached: only the page info call is made; subsequent calls skip feature detection
    expect(callCountAfterSecond).toBe(callCountAfterFirst + 1);
  });
});
