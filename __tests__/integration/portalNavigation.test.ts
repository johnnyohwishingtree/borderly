/**
 * Integration tests — page detection across all 8 government portals.
 *
 * Tests:
 * - PageDetector.detectPage: identifies the correct submission step by URL
 * - PageDetector.isCaptchaPage: detects CAPTCHA challenge pages
 * - PageDetector.isAuthPage: detects login / session-expired pages
 * - getPortalBaseUrl / getAllPortals: portal registry completeness
 */

import { PageDetector, pageDetector } from '../../src/services/submission/pageDetection';
import {
  getPortalBaseUrl,
  getAllPortals,
  getPortalName,
  getPortalInfo,
} from '../../src/services/submission/portalRegistry';
import { SUPPORTED_COUNTRIES } from '../fixtures/sampleProfile';

// ---------------------------------------------------------------------------
// Portal registry completeness
// ---------------------------------------------------------------------------

describe('Portal registry', () => {
  it('registers exactly 8 portals', () => {
    const portals = getAllPortals();
    expect(portals).toHaveLength(8);
  });

  it('has all 8 supported country codes', () => {
    const portals = getAllPortals();
    const codes = portals.map((p) => p.countryCode);
    for (const code of SUPPORTED_COUNTRIES) {
      expect(codes).toContain(code);
    }
  });

  it('every portal has required fields', () => {
    for (const portal of getAllPortals()) {
      expect(typeof portal.countryCode).toBe('string');
      expect(portal.countryCode.length).toBe(3);
      expect(typeof portal.portalName).toBe('string');
      expect(portal.portalName.length).toBeGreaterThan(0);
      expect(typeof portal.portalUrl).toBe('string');
      expect(portal.portalUrl).toMatch(/^https?:\/\//);
      expect(typeof portal.allowedDomain).toBe('string');
      expect(portal.allowedDomain.length).toBeGreaterThan(0);
      expect(typeof portal.baseUrl).toBe('string');
      expect(portal.baseUrl).toMatch(/^https?:\/\//);
    }
  });

  it('all portal base URLs are distinct', () => {
    const baseUrls = getAllPortals().map((p) => p.baseUrl);
    const unique = new Set(baseUrls);
    expect(unique.size).toBe(baseUrls.length);
  });
});

// ---------------------------------------------------------------------------
// getPortalBaseUrl
// ---------------------------------------------------------------------------

describe('getPortalBaseUrl', () => {
  it.each(SUPPORTED_COUNTRIES)('%s: returns a non-null https URL', (code) => {
    const url = getPortalBaseUrl(code);
    expect(url).not.toBeNull();
    expect(url).toMatch(/^https:\/\//);
  });

  it('returns null for an unknown country code', () => {
    expect(getPortalBaseUrl('ZZZ')).toBeNull();
    expect(getPortalBaseUrl('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getPortalName
// ---------------------------------------------------------------------------

describe('getPortalName', () => {
  it.each(SUPPORTED_COUNTRIES)('%s: returns a non-empty portal name', (code) => {
    const name = getPortalName(code);
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
    // The name should not just be the country code (would indicate missing entry)
    expect(name).not.toBe(code);
  });

  it('falls back to the raw country code for unknown codes', () => {
    expect(getPortalName('ZZZ')).toBe('ZZZ');
  });
});

// ---------------------------------------------------------------------------
// getPortalInfo
// ---------------------------------------------------------------------------

describe('getPortalInfo', () => {
  it.each(SUPPORTED_COUNTRIES)('%s: returns a complete PortalInfo', (code) => {
    const info = getPortalInfo(code);
    expect(info).toBeDefined();
    expect(info?.countryCode).toBe(code);
  });

  it('returns undefined for an unknown country code', () => {
    expect(getPortalInfo('ZZZ')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// PageDetector.detectPage
// ---------------------------------------------------------------------------

describe('PageDetector.detectPage', () => {
  /**
   * Build a minimal schema stub with a submissionGuide that has one step
   * pointing to the given URL.
   */
  function buildSchema(stepUrl: string, stepTitle: string) {
    return {
      submissionGuide: [
        {
          title: stepTitle,
          automation: { url: stepUrl },
          fieldsOnThisScreen: [],
        },
      ],
    };
  }

  it('detects the matching step when URL starts with automation.url', () => {
    const baseUrl = 'https://example.com/form/step1';
    const schema = buildSchema(baseUrl, 'Personal Information');

    const result = pageDetector.detectPage(`${baseUrl}?lang=en`, 'JPN', schema);
    expect(result).not.toBeNull();
    expect(result?.stepIndex).toBe(0);
    expect(result?.stepTitle).toBe('Personal Information');
    expect(result?.countryCode).toBe('JPN');
  });

  it('returns null when no step URL matches', () => {
    const schema = buildSchema('https://example.com/form/step1', 'Step 1');
    const result = pageDetector.detectPage('https://other.com/page', 'JPN', schema);
    expect(result).toBeNull();
  });

  it('returns null when submissionGuide is empty', () => {
    const schema = { submissionGuide: [] };
    const result = pageDetector.detectPage('https://example.com', 'JPN', schema);
    expect(result).toBeNull();
  });

  it('returns null when schema has no submissionGuide', () => {
    const result = pageDetector.detectPage('https://example.com', 'JPN', {});
    expect(result).toBeNull();
  });

  it('returns correct stepIndex for a multi-step schema', () => {
    const schema = {
      submissionGuide: [
        { title: 'Step A', automation: { url: 'https://portal.com/a' }, fieldsOnThisScreen: [] },
        { title: 'Step B', automation: { url: 'https://portal.com/b' }, fieldsOnThisScreen: [] },
        { title: 'Step C', automation: { url: 'https://portal.com/c' }, fieldsOnThisScreen: [] },
      ],
    };

    const result = pageDetector.detectPage('https://portal.com/b?foo=bar', 'MYS', schema);
    expect(result).not.toBeNull();
    expect(result?.stepIndex).toBe(1);
    expect(result?.stepTitle).toBe('Step B');
  });

  it('matches URLs with query parameters when step URL is a prefix', () => {
    const schema = buildSchema('https://vjw-lp.digital.go.jp/en/', 'Load Portal');
    const fullUrl = 'https://vjw-lp.digital.go.jp/en/?session=abc123';
    const result = pageDetector.detectPage(fullUrl, 'JPN', schema);
    expect(result).not.toBeNull();
    expect(result?.stepIndex).toBe(0);
  });

  it('skips steps without an automation.url', () => {
    const schema = {
      submissionGuide: [
        { title: 'No URL step', fieldsOnThisScreen: [] },
        { title: 'Has URL step', automation: { url: 'https://portal.com/step2' }, fieldsOnThisScreen: [] },
      ],
    };

    const result = pageDetector.detectPage('https://portal.com/step2', 'SGP', schema);
    expect(result).not.toBeNull();
    expect(result?.stepIndex).toBe(1);
  });

  it('populates countryCode and url on the result', () => {
    const url = 'https://portal.com/start';
    const schema = buildSchema('https://portal.com/start', 'Start Page');
    const result = pageDetector.detectPage(url, 'THA', schema);
    expect(result?.countryCode).toBe('THA');
    expect(result?.url).toBe(url);
  });
});

// ---------------------------------------------------------------------------
// PageDetector.isCaptchaPage
// ---------------------------------------------------------------------------

describe('PageDetector.isCaptchaPage', () => {
  const captchaPatterns = [
    'captcha',
    'recaptcha',
    'hcaptcha',
    'cf-challenge',
    'challenge-form',
    'i-am-not-a-robot',
  ];

  it.each(captchaPatterns)('detects "%s" pattern', (pattern) => {
    expect(pageDetector.isCaptchaPage(`<html><body>${pattern}</body></html>`)).toBe(true);
  });

  it('detects captcha patterns case-insensitively', () => {
    expect(pageDetector.isCaptchaPage('<div class="RECAPTCHA"></div>')).toBe(true);
    expect(pageDetector.isCaptchaPage('<div class="CaPtChA"></div>')).toBe(true);
  });

  it('returns false for normal HTML without captcha patterns', () => {
    const html = '<html><body><form><input type="text" /></form></body></html>';
    expect(pageDetector.isCaptchaPage(html)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(pageDetector.isCaptchaPage('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PageDetector.isAuthPage
// ---------------------------------------------------------------------------

describe('PageDetector.isAuthPage', () => {
  const authPatterns = [
    'login',
    'signin',
    'sign-in',
    'log-in',
    'password',
    'authenticate',
    'session-expired',
    'session_expired',
  ];

  it.each(authPatterns)('detects "%s" pattern', (pattern) => {
    expect(pageDetector.isAuthPage(`<html><body>${pattern}</body></html>`)).toBe(true);
  });

  it('detects auth patterns case-insensitively', () => {
    expect(pageDetector.isAuthPage('<div class="LOGIN"></div>')).toBe(true);
    expect(pageDetector.isAuthPage('<span>Please SIGN-IN to continue</span>')).toBe(true);
  });

  it('returns false for a normal form page', () => {
    const html = '<html><body><form method="post"><input type="text" /></form></body></html>';
    expect(pageDetector.isAuthPage(html)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(pageDetector.isAuthPage('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Singleton vs new instance
// ---------------------------------------------------------------------------

describe('PageDetector singleton vs new instance', () => {
  it('singleton pageDetector and new PageDetector() behave identically', () => {
    const instance = new PageDetector();
    const html = '<div class="recaptcha"></div>';
    expect(pageDetector.isCaptchaPage(html)).toBe(instance.isCaptchaPage(html));
    expect(pageDetector.isAuthPage('<form action="/login">')).toBe(
      instance.isAuthPage('<form action="/login">'),
    );
  });

  it('getPortalBaseUrl on instance delegates to the registry', () => {
    const instance = new PageDetector();
    for (const code of SUPPORTED_COUNTRIES) {
      expect(instance.getPortalBaseUrl(code)).toBe(getPortalBaseUrl(code));
    }
  });
});
