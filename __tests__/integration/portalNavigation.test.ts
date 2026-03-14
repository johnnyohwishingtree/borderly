/**
 * Integration tests for portal navigation and page detection.
 *
 * Verifies that `pageDetector` (PageDetector class + singleton) correctly
 * identifies which submission guide step corresponds to a given URL, and
 * that CAPTCHA / auth page patterns are detected reliably across all portals.
 *
 * Coverage:
 *  - detectPage: real portal base URLs from portalRegistry for all 8 countries
 *  - detectPage: URL prefix matching, query-string tolerance, no match
 *  - isCaptchaPage: all known CAPTCHA patterns across multiple portal contexts
 *  - isAuthPage: all known auth / session-expired patterns
 *  - getPortalBaseUrl: all 8 registered portals return non-null values
 */

import { pageDetector, PageDetector } from '../../src/services/submission/pageDetection';
import { getPortalBaseUrl, getAllPortals } from '../../src/services/submission/portalRegistry';
import { ALL_SUPPORTED_COUNTRIES } from '../fixtures/sampleProfile';

// ---------------------------------------------------------------------------
// Build per-country mock schemas with automation URLs derived from the real
// portal base URLs in portalRegistry.
//
// The real JSON schemas intentionally omit automation.url from submissionGuide
// (those steps are navigated manually). We inject synthetic URLs here so that
// detectPage can find a matching step — which is the integration point under test.
// ---------------------------------------------------------------------------

function makeSchemaWithGuide(countryCode: string) {
  const base = getPortalBaseUrl(countryCode) ?? `https://${countryCode.toLowerCase()}.example.gov`;

  return {
    submissionGuide: [
      {
        title: 'Open Portal',
        automation: { url: `${base}/` },
        fieldsOnThisScreen: [],
      },
      {
        title: 'Fill Passport Details',
        automation: { url: `${base}/registration/passport` },
        fieldsOnThisScreen: ['surname', 'givenNames', 'passportNumber'],
      },
      {
        title: 'Fill Travel Details',
        automation: { url: `${base}/registration/travel` },
        fieldsOnThisScreen: ['arrivalDate', 'flightNumber'],
      },
      {
        title: 'Customs Declaration',
        automation: { url: `${base}/registration/customs` },
        fieldsOnThisScreen: ['carryingProhibitedItems', 'currencyDeclaration'],
      },
      {
        title: 'Review and Submit',
        automation: { url: `${base}/registration/submit` },
        fieldsOnThisScreen: [],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// getPortalBaseUrl — all 8 countries
// ---------------------------------------------------------------------------

describe('portalNavigation — getPortalBaseUrl', () => {
  it('returns non-null base URLs for all 8 registered countries', () => {
    ALL_SUPPORTED_COUNTRIES.forEach((countryCode) => {
      const base = getPortalBaseUrl(countryCode);
      expect(base).not.toBeNull();
      expect(typeof base).toBe('string');
      expect(base!.length).toBeGreaterThan(0);
    });
  });

  it('returns a URL that starts with http:// or https://', () => {
    ALL_SUPPORTED_COUNTRIES.forEach((countryCode) => {
      const base = getPortalBaseUrl(countryCode);
      expect(base).toMatch(/^https?:\/\//);
    });
  });

  it('returns distinct base URLs for each country', () => {
    const urls = ALL_SUPPORTED_COUNTRIES.map((c) => getPortalBaseUrl(c));
    const unique = new Set(urls);
    expect(unique.size).toBe(ALL_SUPPORTED_COUNTRIES.length);
  });

  it('returns null for an unknown country code', () => {
    expect(getPortalBaseUrl('ZZZ')).toBeNull();
    expect(getPortalBaseUrl('')).toBeNull();
    expect(getPortalBaseUrl('INVALID')).toBeNull();
  });

  // Spot-check known values (these come from the JSON schemas)
  it('JPN base URL is from vjw-lp.digital.go.jp', () => {
    expect(getPortalBaseUrl('JPN')).toContain('vjw-lp.digital.go.jp');
  });

  it('SGP base URL is from eservices.ica.gov.sg', () => {
    expect(getPortalBaseUrl('SGP')).toContain('eservices.ica.gov.sg');
  });

  it('MYS base URL is from imigresen-online.imi.gov.my', () => {
    expect(getPortalBaseUrl('MYS')).toContain('imigresen-online.imi.gov.my');
  });
});

// ---------------------------------------------------------------------------
// getAllPortals — registry completeness
// ---------------------------------------------------------------------------

describe('portalNavigation — getAllPortals registry', () => {
  it('returns exactly 8 registered portals', () => {
    expect(getAllPortals()).toHaveLength(8);
  });

  it('every portal entry has countryCode, portalName, portalUrl, allowedDomain, baseUrl', () => {
    getAllPortals().forEach((portal) => {
      expect(portal.countryCode).toBeTruthy();
      expect(portal.portalName).toBeTruthy();
      expect(portal.portalUrl).toBeTruthy();
      expect(portal.allowedDomain).toBeTruthy();
      expect(portal.baseUrl).toBeTruthy();
    });
  });

  it('all 8 supported countries are represented in the registry', () => {
    const registeredCodes = new Set(getAllPortals().map((p) => p.countryCode));
    ALL_SUPPORTED_COUNTRIES.forEach((code) => {
      expect(registeredCodes.has(code)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// detectPage — per-country step detection with portal base URLs
// ---------------------------------------------------------------------------

describe('portalNavigation — detectPage across all 8 countries', () => {
  ALL_SUPPORTED_COUNTRIES.forEach((countryCode) => {
    describe(`${countryCode}`, () => {
      const schema = makeSchemaWithGuide(countryCode);
      const base = getPortalBaseUrl(countryCode)!;

      it('detects the first step (portal home)', () => {
        const result = pageDetector.detectPage(`${base}/`, countryCode, schema);
        expect(result).not.toBeNull();
        expect(result!.stepIndex).toBe(0);
        expect(result!.stepTitle).toBe('Open Portal');
        expect(result!.countryCode).toBe(countryCode);
      });

      it('detects the passport details step', () => {
        const result = pageDetector.detectPage(
          `${base}/registration/passport`,
          countryCode,
          schema,
        );
        expect(result).not.toBeNull();
        expect(result!.stepIndex).toBe(1);
        expect(result!.stepTitle).toBe('Fill Passport Details');
      });

      it('detects the travel details step', () => {
        const result = pageDetector.detectPage(
          `${base}/registration/travel`,
          countryCode,
          schema,
        );
        expect(result).not.toBeNull();
        expect(result!.stepIndex).toBe(2);
      });

      it('detects the customs declaration step', () => {
        const result = pageDetector.detectPage(
          `${base}/registration/customs`,
          countryCode,
          schema,
        );
        expect(result).not.toBeNull();
        expect(result!.stepIndex).toBe(3);
      });

      it('detects the submit step', () => {
        const result = pageDetector.detectPage(
          `${base}/registration/submit`,
          countryCode,
          schema,
        );
        expect(result).not.toBeNull();
        expect(result!.stepIndex).toBe(4);
        expect(result!.stepTitle).toBe('Review and Submit');
      });

      it('returns null for an unrelated URL', () => {
        const result = pageDetector.detectPage(
          'https://google.com',
          countryCode,
          schema,
        );
        expect(result).toBeNull();
      });

      it('URL with query params still matches via startsWith', () => {
        const result = pageDetector.detectPage(
          `${base}/registration/passport?lang=en&step=1`,
          countryCode,
          schema,
        );
        expect(result).not.toBeNull();
        expect(result!.stepIndex).toBe(1);
      });

      it('detected page includes the exact URL', () => {
        const url = `${base}/registration/travel`;
        const result = pageDetector.detectPage(url, countryCode, schema);
        expect(result!.url).toBe(url);
      });
    });
  });
});

// ---------------------------------------------------------------------------
// detectPage — schema edge cases
// ---------------------------------------------------------------------------

describe('portalNavigation — detectPage schema edge cases', () => {
  const detector = new PageDetector();

  it('returns null when submissionGuide is empty', () => {
    expect(
      detector.detectPage('https://example.gov/page', 'JPN', { submissionGuide: [] }),
    ).toBeNull();
  });

  it('returns null when schema has no submissionGuide key', () => {
    expect(detector.detectPage('https://example.gov/page', 'JPN', {})).toBeNull();
  });

  it('skips steps without automation.url', () => {
    const schema = {
      submissionGuide: [
        { title: 'Manual Step', fieldsOnThisScreen: [] }, // no automation
        { title: 'Auto Step', automation: { url: 'https://example.gov/auto' }, fieldsOnThisScreen: [] },
      ],
    };
    const result = detector.detectPage('https://example.gov/auto', 'TST', schema);
    expect(result).not.toBeNull();
    expect(result!.stepIndex).toBe(1);
    expect(result!.stepTitle).toBe('Auto Step');
  });

  it('returns null when URL is empty string', () => {
    const schema = makeSchemaWithGuide('JPN');
    expect(detector.detectPage('', 'JPN', schema)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isCaptchaPage — CAPTCHA detection patterns
// ---------------------------------------------------------------------------

describe('portalNavigation — isCaptchaPage', () => {
  const detector = new PageDetector();

  const captchaPatterns: Array<[string, string]> = [
    ['captcha keyword', '<div class="captcha">Please solve this</div>'],
    ['recaptcha div', '<div class="g-recaptcha" data-sitekey="abc"></div>'],
    ['hcaptcha div', '<div class="h-captcha" data-sitekey="def"></div>'],
    ['cf-challenge (Cloudflare)', '<form id="cf-challenge">...</form>'],
    ['challenge-form', '<form class="challenge-form">...</form>'],
    ['i-am-not-a-robot', '<label class="i-am-not-a-robot">I am not a robot</label>'],
    ['CAPTCHA uppercase', '<div class="CAPTCHA">Enter text</div>'],
    ['recaptcha iframe src', '<iframe src="https://www.google.com/recaptcha/api2/frame"></iframe>'],
  ];

  captchaPatterns.forEach(([label, html]) => {
    it(`detects: ${label}`, () => {
      expect(detector.isCaptchaPage(html)).toBe(true);
    });
  });

  const nonCaptchaPages: Array<[string, string]> = [
    ['normal form page', '<html><body><form><input type="text" name="name"/></form></body></html>'],
    ['confirmation page', '<div class="confirmation-code">Your code: 12345</div>'],
    ['passport details page', '<h1>Enter Passport Details</h1><input name="surname"/>'],
    ['empty HTML', ''],
    ['just whitespace', '   '],
  ];

  nonCaptchaPages.forEach(([label, html]) => {
    it(`does NOT flag: ${label}`, () => {
      expect(detector.isCaptchaPage(html)).toBe(false);
    });
  });

  it('is case-insensitive for all patterns', () => {
    expect(detector.isCaptchaPage('<DIV CLASS="RECAPTCHA"></DIV>')).toBe(true);
    expect(detector.isCaptchaPage('<span id="HCaptcha"></span>')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isAuthPage — authentication / login page detection
// ---------------------------------------------------------------------------

describe('portalNavigation — isAuthPage', () => {
  const detector = new PageDetector();

  const authPatterns: Array<[string, string]> = [
    ['login form', '<form class="login-form"><input name="email"/></form>'],
    ['signin container', '<div id="signin-container">...</div>'],
    ['sign-in heading', '<h1>Sign-In to your account</h1>'],
    ['log-in link', '<a href="/log-in">Log-In</a>'],
    ['password input', '<input type="password" name="pw"/>'],
    ['authenticate', '<p>Please authenticate to continue.</p>'],
    ['session-expired', '<div class="session-expired">Your session has expired.</div>'],
    ['session_expired', '<div id="session_expired">Please log in again.</div>'],
    ['LOGIN uppercase', '<h1>LOGIN</h1>'],
    ['SIGNIN page', '<div class="SIGNIN"></div>'],
  ];

  authPatterns.forEach(([label, html]) => {
    it(`detects: ${label}`, () => {
      expect(detector.isAuthPage(html)).toBe(true);
    });
  });

  const nonAuthPages: Array<[string, string]> = [
    ['normal form page', '<html><body><h1>Welcome</h1><p>Fill out the form.</p></body></html>'],
    ['confirmation page', '<div class="success">Your form has been submitted.</div>'],
    ['passport details page', '<h1>Enter Passport Details</h1><input name="surname"/>'],
    ['empty HTML', ''],
  ];

  nonAuthPages.forEach(([label, html]) => {
    it(`does NOT flag: ${label}`, () => {
      expect(detector.isAuthPage(html)).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Singleton instance behaves the same as a new instance
// ---------------------------------------------------------------------------

describe('portalNavigation — singleton pageDetector', () => {
  it('is an instance of PageDetector', () => {
    expect(pageDetector).toBeInstanceOf(PageDetector);
  });

  it('singleton detects captcha the same as a new instance', () => {
    const html = '<div class="g-recaptcha"></div>';
    expect(pageDetector.isCaptchaPage(html)).toBe(new PageDetector().isCaptchaPage(html));
  });

  it('singleton detects auth page the same as a new instance', () => {
    const html = '<input type="password">';
    expect(pageDetector.isAuthPage(html)).toBe(new PageDetector().isAuthPage(html));
  });

  it('singleton getPortalBaseUrl matches registry directly', () => {
    ALL_SUPPORTED_COUNTRIES.forEach((code) => {
      expect(pageDetector.getPortalBaseUrl(code)).toBe(getPortalBaseUrl(code));
    });
  });
});
