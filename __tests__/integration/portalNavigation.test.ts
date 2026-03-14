/**
 * Integration tests for portal navigation and page detection.
 *
 * Verifies that PageDetector correctly identifies submission steps, CAPTCHA pages,
 * and auth pages across all 8 registered country portals.
 */

import {
  PageDetector,
  pageDetector,
} from '../../src/services/submission/pageDetection';
import {
  getAllPortals,
  getPortalBaseUrl,
} from '../../src/services/submission/portalRegistry';
import { SUPPORTED_COUNTRIES, SupportedCountry } from '../fixtures/sampleProfile';

// ---------------------------------------------------------------------------
// Portal registry completeness
// ---------------------------------------------------------------------------

describe('Portal Registry', () => {
  it('has exactly 8 registered portals', () => {
    const portals = getAllPortals();
    expect(portals).toHaveLength(8);
  });

  it('all portals have required fields', () => {
    const portals = getAllPortals();
    for (const portal of portals) {
      expect(portal.countryCode.length).toBeGreaterThan(0);
      expect(portal.portalName.length).toBeGreaterThan(0);
      expect(portal.portalUrl).toMatch(/^https?:\/\//);
      expect(portal.allowedDomain.length).toBeGreaterThan(0);
      expect(portal.baseUrl).toMatch(/^https?:\/\//);
    }
  });

  it('all 8 supported countries have a portal entry', () => {
    const portals = getAllPortals();
    const codes = portals.map((p) => p.countryCode);
    for (const code of SUPPORTED_COUNTRIES) {
      expect(codes).toContain(code);
    }
  });

  it('all portals have distinct base URLs', () => {
    const portals = getAllPortals();
    const baseUrls = portals.map((p) => p.baseUrl);
    const unique = new Set(baseUrls);
    expect(unique.size).toBe(portals.length);
  });
});

// ---------------------------------------------------------------------------
// getPortalBaseUrl — all 8 countries
// ---------------------------------------------------------------------------

describe('getPortalBaseUrl', () => {
  it.each(SUPPORTED_COUNTRIES)('returns a non-null URL for %s', (code) => {
    const url = getPortalBaseUrl(code);
    expect(url).not.toBeNull();
  });

  it.each(SUPPORTED_COUNTRIES)('returns a valid https URL for %s', (code) => {
    const url = getPortalBaseUrl(code);
    expect(url).toMatch(/^https:\/\//);
  });

  it('returns null for an unregistered country code', () => {
    const url = getPortalBaseUrl('ZZZ');
    expect(url).toBeNull();
  });

  it('all 8 country base URLs are distinct', () => {
    const urls = SUPPORTED_COUNTRIES.map((code) => getPortalBaseUrl(code));
    const unique = new Set(urls);
    expect(unique.size).toBe(SUPPORTED_COUNTRIES.length);
  });
});

// ---------------------------------------------------------------------------
// PageDetector.detectPage — step detection
// ---------------------------------------------------------------------------

describe('PageDetector.detectPage', () => {
  let detector: PageDetector;

  beforeEach(() => {
    detector = new PageDetector();
  });

  it('detects the first step when URL matches the first step automation URL', () => {
    const schema = {
      submissionGuide: [
        {
          title: 'Step One',
          automation: { url: 'https://portal.example.com/step1' },
          fieldsOnThisScreen: ['surname'],
        },
        {
          title: 'Step Two',
          automation: { url: 'https://portal.example.com/step2' },
          fieldsOnThisScreen: ['passportNumber'],
        },
      ],
    };

    const result = detector.detectPage(
      'https://portal.example.com/step1',
      'JPN',
      schema,
    );

    expect(result).not.toBeNull();
    expect(result!.stepIndex).toBe(0);
    expect(result!.stepTitle).toBe('Step One');
    expect(result!.countryCode).toBe('JPN');
  });

  it('detects the second step when URL matches the second step automation URL', () => {
    const schema = {
      submissionGuide: [
        { title: 'Step One', automation: { url: 'https://portal.example.com/step1' } },
        { title: 'Step Two', automation: { url: 'https://portal.example.com/step2' } },
      ],
    };

    const result = detector.detectPage(
      'https://portal.example.com/step2?q=hello',
      'MYS',
      schema,
    );

    expect(result).not.toBeNull();
    expect(result!.stepIndex).toBe(1);
    expect(result!.stepTitle).toBe('Step Two');
  });

  it('returns null when URL does not match any step', () => {
    const schema = {
      submissionGuide: [
        { title: 'Step One', automation: { url: 'https://portal.example.com/step1' } },
      ],
    };

    const result = detector.detectPage(
      'https://other.example.com/unrelated',
      'SGP',
      schema,
    );

    expect(result).toBeNull();
  });

  it('returns null when schema has no submissionGuide', () => {
    const result = detector.detectPage(
      'https://portal.example.com/step1',
      'JPN',
      {},
    );
    expect(result).toBeNull();
  });

  it('returns null when submissionGuide is empty', () => {
    const result = detector.detectPage(
      'https://portal.example.com/step1',
      'JPN',
      { submissionGuide: [] },
    );
    expect(result).toBeNull();
  });

  it('matches URL by prefix (query parameters are ignored)', () => {
    const schema = {
      submissionGuide: [
        {
          title: 'Registration',
          automation: { url: 'https://portal.example.com/register' },
        },
      ],
    };

    const result = detector.detectPage(
      'https://portal.example.com/register?token=abc123&lang=en',
      'THA',
      schema,
    );

    expect(result).not.toBeNull();
    expect(result!.stepTitle).toBe('Registration');
  });

  it('skips steps without automation URL', () => {
    const schema = {
      submissionGuide: [
        { title: 'Manual Step', fieldsOnThisScreen: [] }, // no automation.url
        {
          title: 'Auto Step',
          automation: { url: 'https://portal.example.com/auto' },
        },
      ],
    };

    const result = detector.detectPage(
      'https://portal.example.com/auto',
      'VNM',
      schema,
    );

    expect(result).not.toBeNull();
    expect(result!.stepIndex).toBe(1);
    expect(result!.stepTitle).toBe('Auto Step');
  });
});

// ---------------------------------------------------------------------------
// PageDetector.getPortalBaseUrl
// ---------------------------------------------------------------------------

describe('PageDetector.getPortalBaseUrl', () => {
  let detector: PageDetector;

  beforeEach(() => {
    detector = new PageDetector();
  });

  it.each(SUPPORTED_COUNTRIES)('returns a non-null URL for %s', (code) => {
    expect(detector.getPortalBaseUrl(code)).not.toBeNull();
  });

  it('returns null for unregistered country', () => {
    expect(detector.getPortalBaseUrl('ZZZ')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// PageDetector.isCaptchaPage — all known CAPTCHA patterns
// ---------------------------------------------------------------------------

describe('PageDetector.isCaptchaPage', () => {
  let detector: PageDetector;

  beforeEach(() => {
    detector = new PageDetector();
  });

  const captchaPatterns = [
    ['captcha', '<div class="captcha">Please solve</div>'],
    ['recaptcha', '<div class="g-recaptcha" data-sitekey="abc123"></div>'],
    ['hcaptcha', '<div class="h-captcha"></div>'],
    ['cf-challenge', '<div id="cf-challenge-running">Checking your browser...</div>'],
    ['challenge-form', '<form id="challenge-form" action="/.well-known/cloudflare/"></form>'],
    ['i-am-not-a-robot', '<p>I am not a robot</p>'],
  ];

  it.each(captchaPatterns)('detects %s pattern', (_pattern, html) => {
    expect(detector.isCaptchaPage(html)).toBe(true);
  });

  it('returns false for a normal form page', () => {
    const html = '<form><input name="surname" type="text"><button type="submit">Submit</button></form>';
    expect(detector.isCaptchaPage(html)).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(detector.isCaptchaPage('')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(detector.isCaptchaPage('<div class="CAPTCHA">Solve me</div>')).toBe(true);
    expect(detector.isCaptchaPage('<div class="reCAPTCHA"></div>')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// PageDetector.isAuthPage — all known auth patterns
// ---------------------------------------------------------------------------

describe('PageDetector.isAuthPage', () => {
  let detector: PageDetector;

  beforeEach(() => {
    detector = new PageDetector();
  });

  const authPatterns = [
    ['login', '<form action="/login"><input type="text" name="username"></form>'],
    ['signin', '<a href="/signin">Sign in to continue</a>'],
    ['sign-in', '<div class="sign-in-container">Please sign in</div>'],
    ['log-in', '<button class="log-in-btn">Log In</button>'],
    ['password', '<input type="password" name="password">'],
    ['authenticate', '<h1>Please authenticate to proceed</h1>'],
    ['session-expired', '<p>Your session-expired. Please log in again.</p>'],
    ['session_expired', '<p>session_expired — please log in again</p>'],
  ];

  it.each(authPatterns)('detects %s pattern', (_pattern, html) => {
    expect(detector.isAuthPage(html)).toBe(true);
  });

  it('returns false for a normal form page', () => {
    const html = '<form><input name="passport_no" type="text"><button type="submit">Next</button></form>';
    expect(detector.isAuthPage(html)).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(detector.isAuthPage('')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(detector.isAuthPage('<form action="/LOGIN">Enter credentials</form>')).toBe(true);
    expect(detector.isAuthPage('<div class="SignIn">Please sign in</div>')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Singleton vs new instance
// ---------------------------------------------------------------------------

describe('pageDetector singleton', () => {
  it('is an instance of PageDetector', () => {
    expect(pageDetector).toBeInstanceOf(PageDetector);
  });

  it('returns the same result as a new PageDetector instance', () => {
    const html = '<div class="captcha">Solve me</div>';
    expect(pageDetector.isCaptchaPage(html)).toBe(new PageDetector().isCaptchaPage(html));
  });

  it('getPortalBaseUrl matches a fresh instance', () => {
    for (const code of SUPPORTED_COUNTRIES) {
      expect(pageDetector.getPortalBaseUrl(code)).toBe(
        new PageDetector().getPortalBaseUrl(code),
      );
    }
  });
});
