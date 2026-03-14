/**
 * Integration tests for portal navigation / page detection.
 *
 * Tests:
 *   - PageDetector.detectPage: step detection via URL prefix matching
 *   - PageDetector.isCaptchaPage: all 6 known captcha patterns
 *   - PageDetector.isAuthPage: all 8 known auth patterns
 *   - getPortalBaseUrl: all 8 registered countries return valid HTTPS URLs
 *   - getAllPortals: registry completeness (8 portals, all required fields)
 *   - pageDetector singleton vs new PageDetector() parity
 */

import { PageDetector, pageDetector } from '../../src/services/submission/pageDetection';
import {
  getAllPortals,
  getPortalBaseUrl,
  getPortalInfo,
  getPortalName,
} from '../../src/services/submission/portalRegistry';
import { SUPPORTED_COUNTRIES } from '../fixtures/sampleProfile';

// ---------------------------------------------------------------------------
// Helpers — minimal SchemaWithGuide shapes for detectPage tests
// ---------------------------------------------------------------------------

function makeSchema(steps: Array<{ title: string; automationUrl?: string }>) {
  return {
    submissionGuide: steps.map((s) => ({
      title: s.title,
      automation: s.automationUrl ? { url: s.automationUrl } : undefined,
    })),
  };
}

// ---------------------------------------------------------------------------
// Suite 1 — Portal registry: getAllPortals
// ---------------------------------------------------------------------------

describe('getAllPortals — registry completeness', () => {
  it('returns exactly 8 portals', () => {
    const portals = getAllPortals();
    expect(portals).toHaveLength(8);
  });

  it('every portal has countryCode, portalName, portalUrl, allowedDomain, baseUrl', () => {
    const portals = getAllPortals();
    for (const portal of portals) {
      expect(typeof portal.countryCode).toBe('string');
      expect(portal.countryCode.length).toBeGreaterThan(0);
      expect(typeof portal.portalName).toBe('string');
      expect(portal.portalName.length).toBeGreaterThan(0);
      expect(typeof portal.portalUrl).toBe('string');
      expect(portal.portalUrl).toMatch(/^https:\/\//);
      expect(typeof portal.allowedDomain).toBe('string');
      expect(portal.allowedDomain.length).toBeGreaterThan(0);
      expect(typeof portal.baseUrl).toBe('string');
      expect(portal.baseUrl).toMatch(/^https:\/\//);
    }
  });

  it('all 8 supported countries are present', () => {
    const codes = getAllPortals().map((p) => p.countryCode);
    for (const country of SUPPORTED_COUNTRIES) {
      expect(codes).toContain(country);
    }
  });

  it('all base URLs are distinct', () => {
    const baseUrls = getAllPortals().map((p) => p.baseUrl);
    const unique = new Set(baseUrls);
    expect(unique.size).toBe(baseUrls.length);
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — getPortalBaseUrl: valid HTTPS URLs for all 8 countries
// ---------------------------------------------------------------------------

describe('getPortalBaseUrl', () => {
  SUPPORTED_COUNTRIES.forEach((code) => {
    it(`${code}: returns a non-null HTTPS base URL`, () => {
      const url = getPortalBaseUrl(code);
      expect(url).not.toBeNull();
      expect(url).toMatch(/^https:\/\//);
    });
  });

  it('returns null for an unknown country code', () => {
    expect(getPortalBaseUrl('ZZZ')).toBeNull();
    expect(getPortalBaseUrl('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — getPortalInfo / getPortalName
// ---------------------------------------------------------------------------

describe('getPortalInfo', () => {
  it('returns PortalInfo for JPN', () => {
    const info = getPortalInfo('JPN');
    expect(info).toBeDefined();
    expect(info!.countryCode).toBe('JPN');
    expect(info!.portalName).toBeTruthy();
    expect(info!.portalUrl).toMatch(/^https:\/\//);
  });

  it('returns undefined for unknown country', () => {
    expect(getPortalInfo('ZZZ')).toBeUndefined();
  });
});

describe('getPortalName', () => {
  it('returns portal name for known country', () => {
    expect(getPortalName('JPN')).toBeTruthy();
    expect(getPortalName('JPN')).not.toBe('JPN');
  });

  it('falls back to country code for unknown country', () => {
    expect(getPortalName('ZZZ')).toBe('ZZZ');
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — detectPage: URL prefix matching
// ---------------------------------------------------------------------------

describe('PageDetector.detectPage', () => {
  let detector: PageDetector;

  beforeEach(() => {
    detector = new PageDetector();
  });

  it('returns null for empty submissionGuide', () => {
    const schema = { submissionGuide: [] };
    expect(detector.detectPage('https://example.com/page', 'JPN', schema)).toBeNull();
  });

  it('returns null when no schema is provided (undefined guide)', () => {
    const schema = {};
    expect(detector.detectPage('https://example.com', 'JPN', schema)).toBeNull();
  });

  it('detects step 0 when URL matches first step prefix', () => {
    const schema = makeSchema([
      { title: 'Login', automationUrl: 'https://portal.example.com/login' },
      { title: 'Fill Form', automationUrl: 'https://portal.example.com/form' },
    ]);

    const result = detector.detectPage('https://portal.example.com/login', 'JPN', schema);
    expect(result).not.toBeNull();
    expect(result!.stepIndex).toBe(0);
    expect(result!.stepTitle).toBe('Login');
    expect(result!.countryCode).toBe('JPN');
    expect(result!.url).toBe('https://portal.example.com/login');
  });

  it('detects step 1 when URL matches second step prefix', () => {
    const schema = makeSchema([
      { title: 'Login', automationUrl: 'https://portal.example.com/login' },
      { title: 'Fill Form', automationUrl: 'https://portal.example.com/form' },
    ]);

    const result = detector.detectPage('https://portal.example.com/form/step1', 'SGP', schema);
    expect(result).not.toBeNull();
    expect(result!.stepIndex).toBe(1);
    expect(result!.stepTitle).toBe('Fill Form');
    expect(result!.countryCode).toBe('SGP');
  });

  it('returns null when no step URL matches', () => {
    const schema = makeSchema([
      { title: 'Login', automationUrl: 'https://portal.example.com/login' },
    ]);

    const result = detector.detectPage('https://other.example.com/page', 'JPN', schema);
    expect(result).toBeNull();
  });

  it('matches URL with query parameters (startsWith match)', () => {
    const schema = makeSchema([
      { title: 'Register', automationUrl: 'https://portal.example.com/register' },
    ]);

    const result = detector.detectPage(
      'https://portal.example.com/register?ref=123',
      'MYS',
      schema,
    );
    expect(result).not.toBeNull();
    expect(result!.stepTitle).toBe('Register');
  });

  it('skips steps that have no automation URL', () => {
    const schema = makeSchema([
      { title: 'Introduction' }, // no automationUrl
      { title: 'Form', automationUrl: 'https://portal.example.com/form' },
    ]);

    const result = detector.detectPage('https://portal.example.com/form', 'JPN', schema);
    expect(result).not.toBeNull();
    expect(result!.stepIndex).toBe(1);
    expect(result!.stepTitle).toBe('Form');
  });

  it('pageDetector singleton behaves identically to new instance', () => {
    const schema = makeSchema([
      { title: 'Step A', automationUrl: 'https://portal.example.com/step-a' },
    ]);
    const url = 'https://portal.example.com/step-a';

    const fromSingleton = pageDetector.detectPage(url, 'CAN', schema);
    const fromNew = detector.detectPage(url, 'CAN', schema);

    expect(fromSingleton).toEqual(fromNew);
  });
});

// ---------------------------------------------------------------------------
// Suite 5 — isCaptchaPage: all 6 known patterns
// ---------------------------------------------------------------------------

describe('PageDetector.isCaptchaPage', () => {
  let detector: PageDetector;

  beforeEach(() => {
    detector = new PageDetector();
  });

  const captchaPatterns = [
    { pattern: 'captcha', html: '<div class="captcha-box">Please complete the captcha</div>' },
    { pattern: 'recaptcha', html: '<div class="g-recaptcha" data-sitekey="abc123"></div>' },
    { pattern: 'hcaptcha', html: '<div class="h-captcha"></div>' },
    { pattern: 'cf-challenge', html: '<form id="cf-challenge-form">Checking...</form>' },
    { pattern: 'challenge-form', html: '<div id="challenge-form">Security check</div>' },
    { pattern: 'i-am-not-a-robot', html: '<input type="checkbox" id="i-am-not-a-robot">' },
  ];

  captchaPatterns.forEach(({ pattern, html }) => {
    it(`detects "${pattern}" pattern`, () => {
      expect(detector.isCaptchaPage(html)).toBe(true);
    });
  });

  it('returns false for normal page content', () => {
    expect(detector.isCaptchaPage('<html><body><form><input name="name"></form></body></html>')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(detector.isCaptchaPage('<div class="CAPTCHA-container">Test</div>')).toBe(true);
    expect(detector.isCaptchaPage('<div id="ReCaptcha">Test</div>')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suite 6 — isAuthPage: all 8 known patterns
// ---------------------------------------------------------------------------

describe('PageDetector.isAuthPage', () => {
  let detector: PageDetector;

  beforeEach(() => {
    detector = new PageDetector();
  });

  const authPatterns = [
    { pattern: 'login', html: '<a href="/login">Log in to continue</a>' },
    { pattern: 'signin', html: '<button id="signin-btn">Sign In</button>' },
    { pattern: 'sign-in', html: '<div class="sign-in-form">Please sign-in</div>' },
    { pattern: 'log-in', html: '<p>Please log-in to continue</p>' },
    { pattern: 'password', html: '<input type="password" name="password">' },
    { pattern: 'authenticate', html: '<h2>Please authenticate to proceed</h2>' },
    { pattern: 'session-expired', html: '<p class="error">Your session-expired, please login again</p>' },
    { pattern: 'session_expired', html: '<span id="session_expired">Session expired.</span>' },
  ];

  authPatterns.forEach(({ pattern, html }) => {
    it(`detects "${pattern}" pattern`, () => {
      expect(detector.isAuthPage(html)).toBe(true);
    });
  });

  it('returns false for normal page content', () => {
    expect(detector.isAuthPage('<html><body><h1>Welcome</h1><form>...</form></body></html>')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(detector.isAuthPage('<div class="LOGIN-PAGE">Please LOGIN</div>')).toBe(true);
    expect(detector.isAuthPage('<form id="SignIn">Enter Password</form>')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suite 7 — getPortalBaseUrl via PageDetector.getPortalBaseUrl
// ---------------------------------------------------------------------------

describe('PageDetector.getPortalBaseUrl — delegates to portalRegistry', () => {
  let detector: PageDetector;

  beforeEach(() => {
    detector = new PageDetector();
  });

  SUPPORTED_COUNTRIES.forEach((code) => {
    it(`${code}: returns same value as portalRegistry.getPortalBaseUrl`, () => {
      const viaDetector = detector.getPortalBaseUrl(code);
      const viaRegistry = getPortalBaseUrl(code);
      expect(viaDetector).toBe(viaRegistry);
    });
  });

  it('returns null for unknown country', () => {
    expect(detector.getPortalBaseUrl('ZZZ')).toBeNull();
  });
});
