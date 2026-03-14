/**
 * Integration tests for portal navigation and page detection.
 *
 * Verifies that:
 * - getPortalBaseUrl returns valid URLs for all 8 countries
 * - getAllPortals returns a complete, well-formed registry
 * - detectPage correctly identifies submission steps from URLs
 * - isCaptchaPage and isAuthPage detect the expected patterns
 */

import { pageDetector, PageDetector } from '../../src/services/submission/pageDetection';
import {
  getAllPortals,
  getPortalInfo,
  getPortalBaseUrl,
} from '../../src/services/submission/portalRegistry';
import { ALL_SUPPORTED_COUNTRIES } from '../fixtures/sampleProfile';

// ---------------------------------------------------------------------------
// getPortalBaseUrl — all 8 countries
// ---------------------------------------------------------------------------

describe('getPortalBaseUrl', () => {
  it('returns a non-null value for all 8 supported countries', () => {
    ALL_SUPPORTED_COUNTRIES.forEach((code) => {
      const url = getPortalBaseUrl(code);
      expect(url).not.toBeNull();
      expect(typeof url).toBe('string');
      expect(url!.length).toBeGreaterThan(0);
    });
  });

  it('returns URLs that start with https://', () => {
    ALL_SUPPORTED_COUNTRIES.forEach((code) => {
      const url = getPortalBaseUrl(code);
      expect(url).toMatch(/^https:\/\//);
    });
  });

  it('returns null for an unregistered country code', () => {
    expect(getPortalBaseUrl('XYZ')).toBeNull();
    expect(getPortalBaseUrl('')).toBeNull();
    expect(getPortalBaseUrl('UNKNOWN')).toBeNull();
  });

  it('returns distinct base URLs for each country', () => {
    const urls = ALL_SUPPORTED_COUNTRIES.map((code) => getPortalBaseUrl(code));
    const uniqueUrls = new Set(urls);
    // All 8 URLs should be unique
    expect(uniqueUrls.size).toBe(ALL_SUPPORTED_COUNTRIES.length);
  });

  it('JPN base URL comes from the Visit Japan Web portal', () => {
    const url = getPortalBaseUrl('JPN');
    expect(url).toContain('vjw-lp.digital.go.jp');
  });

  it('MYS base URL comes from the MDAC portal', () => {
    const url = getPortalBaseUrl('MYS');
    expect(url).toContain('imigresen-online.imi.gov.my');
  });

  it('SGP base URL comes from the ICA SG Arrival Card portal', () => {
    const url = getPortalBaseUrl('SGP');
    expect(url).toContain('eservices.ica.gov.sg');
  });

  it('USA base URL comes from the ESTA portal', () => {
    const url = getPortalBaseUrl('USA');
    expect(url).toContain('esta.cbp.dhs.gov');
  });
});

// ---------------------------------------------------------------------------
// getAllPortals — registry completeness
// ---------------------------------------------------------------------------

describe('getAllPortals', () => {
  it('returns exactly 8 registered portals', () => {
    const portals = getAllPortals();
    expect(portals).toHaveLength(8);
  });

  it('includes all 8 supported country codes', () => {
    const portals = getAllPortals();
    const codes = portals.map((p) => p.countryCode);
    ALL_SUPPORTED_COUNTRIES.forEach((code) => {
      expect(codes).toContain(code);
    });
  });

  it('each portal entry has the required fields', () => {
    const portals = getAllPortals();
    portals.forEach((portal) => {
      expect(portal.countryCode).toBeTruthy();
      expect(portal.portalName).toBeTruthy();
      expect(portal.portalUrl).toBeTruthy();
      expect(portal.allowedDomain).toBeTruthy();
      expect(portal.baseUrl).toBeTruthy();
    });
  });

  it('allowedDomain is extracted from portalUrl (no protocol or path)', () => {
    const portals = getAllPortals();
    portals.forEach((portal) => {
      expect(portal.allowedDomain).not.toContain('https://');
      expect(portal.allowedDomain).not.toContain('http://');
      expect(portal.allowedDomain).not.toContain('/');
    });
  });

  it('baseUrl is the origin (scheme + host only)', () => {
    const portals = getAllPortals();
    portals.forEach((portal) => {
      expect(portal.baseUrl).toMatch(/^https:\/\/[^/]+$/);
    });
  });
});

// ---------------------------------------------------------------------------
// getPortalInfo
// ---------------------------------------------------------------------------

describe('getPortalInfo', () => {
  it('returns portal info for all 8 countries', () => {
    ALL_SUPPORTED_COUNTRIES.forEach((code) => {
      const info = getPortalInfo(code);
      expect(info).toBeDefined();
      expect(info?.countryCode).toBe(code);
    });
  });

  it('returns undefined for unknown country codes', () => {
    expect(getPortalInfo('XYZ')).toBeUndefined();
    expect(getPortalInfo('')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// detectPage — step detection using mock schema with automation.url
// ---------------------------------------------------------------------------

describe('detectPage', () => {
  const mockSchema = {
    submissionGuide: [
      {
        title: 'Account Creation',
        automation: { url: 'https://example-portal.gov/register' },
        fieldsOnThisScreen: [],
      },
      {
        title: 'Personal Details',
        automation: { url: 'https://example-portal.gov/personal' },
        fieldsOnThisScreen: ['surname', 'givenNames'],
      },
      {
        title: 'Passport Information',
        automation: { url: 'https://example-portal.gov/passport' },
        fieldsOnThisScreen: ['passportNumber', 'nationality'],
      },
      {
        title: 'Trip Details',
        // No automation.url — should never match
        fieldsOnThisScreen: ['arrivalDate', 'flightNumber'],
      },
    ],
  };

  it('detects the correct step for an exact URL match', () => {
    const detected = pageDetector.detectPage(
      'https://example-portal.gov/personal',
      'JPN',
      mockSchema,
    );
    expect(detected).not.toBeNull();
    expect(detected?.stepIndex).toBe(1);
    expect(detected?.stepTitle).toBe('Personal Details');
    expect(detected?.countryCode).toBe('JPN');
  });

  it('detects step for a URL with a query string (startsWith match)', () => {
    const detected = pageDetector.detectPage(
      'https://example-portal.gov/passport?lang=en',
      'SGP',
      mockSchema,
    );
    expect(detected).not.toBeNull();
    expect(detected?.stepIndex).toBe(2);
    expect(detected?.stepTitle).toBe('Passport Information');
  });

  it('returns the first matching step when URL matches the first entry', () => {
    const detected = pageDetector.detectPage(
      'https://example-portal.gov/register',
      'MYS',
      mockSchema,
    );
    expect(detected).not.toBeNull();
    expect(detected?.stepIndex).toBe(0);
    expect(detected?.stepTitle).toBe('Account Creation');
  });

  it('returns null for a URL that does not match any step', () => {
    const detected = pageDetector.detectPage(
      'https://other-site.com/page',
      'JPN',
      mockSchema,
    );
    expect(detected).toBeNull();
  });

  it('returns null for a step without automation.url', () => {
    // The Trip Details step has no automation.url, so its URL won't match
    const detected = pageDetector.detectPage(
      'https://example-portal.gov/trip',
      'JPN',
      mockSchema,
    );
    expect(detected).toBeNull();
  });

  it('returns null when schema has no submissionGuide', () => {
    const detected = pageDetector.detectPage('https://example.com/', 'JPN', {});
    expect(detected).toBeNull();
  });

  it('returns null when submissionGuide is empty', () => {
    const detected = pageDetector.detectPage('https://example.com/', 'JPN', {
      submissionGuide: [],
    });
    expect(detected).toBeNull();
  });

  it('includes the original URL in the result', () => {
    const url = 'https://example-portal.gov/personal?step=1';
    const detected = pageDetector.detectPage(url, 'JPN', mockSchema);
    expect(detected?.url).toBe(url);
  });
});

// ---------------------------------------------------------------------------
// isCaptchaPage — known CAPTCHA patterns
// ---------------------------------------------------------------------------

describe('isCaptchaPage', () => {
  it('detects "captcha" keyword in page HTML', () => {
    expect(pageDetector.isCaptchaPage('<div class="captcha-widget">...</div>')).toBe(true);
  });

  it('detects "recaptcha" keyword in page HTML', () => {
    expect(pageDetector.isCaptchaPage('<div id="recaptcha">...</div>')).toBe(true);
  });

  it('detects "hcaptcha" keyword in page HTML', () => {
    expect(pageDetector.isCaptchaPage('<script src="hcaptcha.com/1/api.js"></script>')).toBe(true);
  });

  it('detects "cf-challenge" keyword (Cloudflare CAPTCHA)', () => {
    expect(pageDetector.isCaptchaPage('<form id="cf-challenge">...</form>')).toBe(true);
  });

  it('detects "challenge-form" keyword', () => {
    expect(pageDetector.isCaptchaPage('<form id="challenge-form"></form>')).toBe(true);
  });

  it('detects "i-am-not-a-robot" keyword', () => {
    expect(pageDetector.isCaptchaPage('<label>i-am-not-a-robot</label>')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(pageDetector.isCaptchaPage('<div class="CAPTCHA">solve me</div>')).toBe(true);
    expect(pageDetector.isCaptchaPage('<div>ReCAPTCHA challenge</div>')).toBe(true);
  });

  it('returns false for regular page HTML without CAPTCHA', () => {
    expect(pageDetector.isCaptchaPage('<html><body><form><input name="surname"/></form></body></html>')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(pageDetector.isCaptchaPage('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isAuthPage — known auth/login patterns
// ---------------------------------------------------------------------------

describe('isAuthPage', () => {
  it('detects "login" keyword in page HTML', () => {
    expect(pageDetector.isAuthPage('<form id="login-form">...</form>')).toBe(true);
  });

  it('detects "signin" keyword in page HTML', () => {
    expect(pageDetector.isAuthPage('<button class="signin-btn">Sign In</button>')).toBe(true);
  });

  it('detects "sign-in" keyword', () => {
    expect(pageDetector.isAuthPage('<div class="sign-in-section">...</div>')).toBe(true);
  });

  it('detects "log-in" keyword', () => {
    expect(pageDetector.isAuthPage('<a href="/log-in">Log in here</a>')).toBe(true);
  });

  it('detects "password" keyword', () => {
    expect(pageDetector.isAuthPage('<input type="password" name="pass"/>')).toBe(true);
  });

  it('detects "authenticate" keyword', () => {
    expect(pageDetector.isAuthPage('<p>Please authenticate to continue</p>')).toBe(true);
  });

  it('detects "session-expired" keyword', () => {
    expect(pageDetector.isAuthPage('<div class="session-expired-notice">Your session has expired.</div>')).toBe(true);
  });

  it('detects "session_expired" keyword', () => {
    expect(pageDetector.isAuthPage('<span id="session_expired">Please log in again.</span>')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(pageDetector.isAuthPage('<div class="LOGIN-PAGE">...</div>')).toBe(true);
    expect(pageDetector.isAuthPage('<h1>Please SIGN-IN to continue</h1>')).toBe(true);
  });

  it('returns false for regular form page', () => {
    expect(pageDetector.isAuthPage('<html><body><form><input name="surname"/><input name="givenNames"/></form></body></html>')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(pageDetector.isAuthPage('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Singleton vs new instance parity
// ---------------------------------------------------------------------------

describe('pageDetector singleton vs new PageDetector instance', () => {
  it('singleton and a new instance produce the same results for isCaptchaPage', () => {
    const newDetector = new PageDetector();
    const html = '<div class="captcha">...</div>';
    expect(pageDetector.isCaptchaPage(html)).toBe(newDetector.isCaptchaPage(html));
  });

  it('singleton and a new instance produce the same results for isAuthPage', () => {
    const newDetector = new PageDetector();
    const html = '<input type="password"/>';
    expect(pageDetector.isAuthPage(html)).toBe(newDetector.isAuthPage(html));
  });

  it('singleton and a new instance return the same portal base URL for JPN', () => {
    const newDetector = new PageDetector();
    expect(pageDetector.getPortalBaseUrl('JPN')).toBe(newDetector.getPortalBaseUrl('JPN'));
  });
});
