/**
 * Tests for PageDetector — portal page detection, CAPTCHA, and auth page recognition.
 */

import { PageDetector, pageDetector } from '../../../src/services/submission/pageDetection';

// ---------------------------------------------------------------------------
// Test helper — minimal schema with submissionGuide steps that have automation URLs
// ---------------------------------------------------------------------------

const mockSchema = {
  submissionGuide: [
    {
      title: 'Create Account',
      automation: { url: 'https://example-portal.gov/signup' },
      fieldsOnThisScreen: [],
    },
    {
      title: 'Fill Passport Details',
      automation: { url: 'https://example-portal.gov/registration/passport' },
      fieldsOnThisScreen: ['surname', 'givenNames'],
    },
    {
      title: 'Review and Submit',
      automation: { url: 'https://example-portal.gov/registration/submit' },
      fieldsOnThisScreen: [],
    },
  ],
};

// Step that has no automation URL
const schemaWithMixedSteps = {
  submissionGuide: [
    {
      title: 'Introduction',
      // No automation property
      fieldsOnThisScreen: [],
    },
    {
      title: 'Fill Details',
      automation: { url: 'https://example-portal.gov/details' },
      fieldsOnThisScreen: ['name'],
    },
  ],
};

const emptySchema = { submissionGuide: [] };
const noGuideSchema = {};

// ---------------------------------------------------------------------------
// PageDetector class
// ---------------------------------------------------------------------------

describe('PageDetector', () => {
  let detector: PageDetector;

  beforeEach(() => {
    detector = new PageDetector();
  });

  // -------------------------------------------------------------------------
  // detectPage
  // -------------------------------------------------------------------------

  describe('detectPage', () => {
    it('returns null for empty submissionGuide', () => {
      expect(detector.detectPage('https://example-portal.gov/signup', 'TST', emptySchema)).toBeNull();
    });

    it('returns null for schema without submissionGuide', () => {
      expect(detector.detectPage('https://example-portal.gov/signup', 'TST', noGuideSchema)).toBeNull();
    });

    it('detects the first step from a matching URL', () => {
      const result = detector.detectPage(
        'https://example-portal.gov/signup',
        'TST',
        mockSchema,
      );
      expect(result).not.toBeNull();
      expect(result!.stepIndex).toBe(0);
      expect(result!.stepTitle).toBe('Create Account');
      expect(result!.countryCode).toBe('TST');
    });

    it('detects a middle step from a matching URL', () => {
      const result = detector.detectPage(
        'https://example-portal.gov/registration/passport',
        'TST',
        mockSchema,
      );
      expect(result).not.toBeNull();
      expect(result!.stepIndex).toBe(1);
      expect(result!.stepTitle).toBe('Fill Passport Details');
    });

    it('detects the last step from a matching URL', () => {
      const result = detector.detectPage(
        'https://example-portal.gov/registration/submit',
        'TST',
        mockSchema,
      );
      expect(result).not.toBeNull();
      expect(result!.stepIndex).toBe(2);
      expect(result!.stepTitle).toBe('Review and Submit');
    });

    it('returns null for an unrecognized URL', () => {
      const result = detector.detectPage(
        'https://unrelated.gov/someother/page',
        'TST',
        mockSchema,
      );
      expect(result).toBeNull();
    });

    it('matches URL with startsWith — URL with trailing path still matches', () => {
      const result = detector.detectPage(
        'https://example-portal.gov/signup?ref=home&lang=en',
        'TST',
        mockSchema,
      );
      expect(result).not.toBeNull();
      expect(result!.stepIndex).toBe(0);
    });

    it('skips steps without automation URL', () => {
      const result = detector.detectPage(
        'https://example-portal.gov/details',
        'TST',
        schemaWithMixedSteps,
      );
      expect(result).not.toBeNull();
      expect(result!.stepIndex).toBe(1);
      expect(result!.stepTitle).toBe('Fill Details');
    });

    it('includes the URL in the DetectedPage result', () => {
      const url = 'https://example-portal.gov/signup';
      const result = detector.detectPage(url, 'TST', mockSchema);
      expect(result!.url).toBe(url);
    });

    it('includes the countryCode in the DetectedPage result', () => {
      const result = detector.detectPage(
        'https://example-portal.gov/signup',
        'JPN',
        mockSchema,
      );
      expect(result!.countryCode).toBe('JPN');
    });

    it('returns null when URL is empty', () => {
      const result = detector.detectPage('', 'TST', mockSchema);
      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // isCaptchaPage
  // -------------------------------------------------------------------------

  describe('isCaptchaPage', () => {
    it('detects "captcha" keyword', () => {
      expect(detector.isCaptchaPage('<div class="captcha">solve this</div>')).toBe(true);
    });

    it('detects "recaptcha" keyword', () => {
      expect(detector.isCaptchaPage('<div class="g-recaptcha" data-sitekey="xxx"></div>')).toBe(true);
    });

    it('detects "hcaptcha" keyword', () => {
      expect(detector.isCaptchaPage('<div class="h-captcha"></div>')).toBe(true);
    });

    it('detects "cf-challenge" (Cloudflare CAPTCHA)', () => {
      expect(detector.isCaptchaPage('<form id="cf-challenge">...</form>')).toBe(true);
    });

    it('detects "challenge-form" keyword', () => {
      expect(detector.isCaptchaPage('<form class="challenge-form">...</form>')).toBe(true);
    });

    it('detects "i-am-not-a-robot" keyword', () => {
      expect(detector.isCaptchaPage('<div class="i-am-not-a-robot"></div>')).toBe(true);
    });

    it('is case-insensitive for CAPTCHA keyword', () => {
      expect(detector.isCaptchaPage('<div class="CAPTCHA">Enter here</div>')).toBe(true);
    });

    it('returns false for normal pages without CAPTCHA', () => {
      expect(
        detector.isCaptchaPage('<html><body><form><input type="text" name="name"/></form></body></html>'),
      ).toBe(false);
    });

    it('returns false for empty HTML', () => {
      expect(detector.isCaptchaPage('')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // isAuthPage
  // -------------------------------------------------------------------------

  describe('isAuthPage', () => {
    it('detects "login" keyword', () => {
      expect(detector.isAuthPage('<form class="login-form">...</form>')).toBe(true);
    });

    it('detects "signin" keyword', () => {
      expect(detector.isAuthPage('<div id="signin-container">...</div>')).toBe(true);
    });

    it('detects "sign-in" keyword', () => {
      expect(detector.isAuthPage('<h1>Sign-In to your account</h1>')).toBe(true);
    });

    it('detects "log-in" keyword', () => {
      expect(detector.isAuthPage('<a href="/log-in">Log-In</a>')).toBe(true);
    });

    it('detects "password" keyword', () => {
      expect(detector.isAuthPage('<input type="password" name="pw"/>')).toBe(true);
    });

    it('detects "authenticate" keyword', () => {
      expect(detector.isAuthPage('<p>Please authenticate to continue.</p>')).toBe(true);
    });

    it('detects "session-expired" keyword', () => {
      expect(detector.isAuthPage('<div class="session-expired">Your session has expired.</div>')).toBe(
        true,
      );
    });

    it('detects "session_expired" keyword', () => {
      expect(detector.isAuthPage('<div id="session_expired">Please log in again.</div>')).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(detector.isAuthPage('<h1>LOGIN</h1>')).toBe(true);
    });

    it('returns false for normal content pages', () => {
      expect(
        detector.isAuthPage('<html><body><h1>Welcome</h1><p>Fill out the form below.</p></body></html>'),
      ).toBe(false);
    });

    it('returns false for empty HTML', () => {
      expect(detector.isAuthPage('')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // getPortalBaseUrl
  // -------------------------------------------------------------------------

  describe('getPortalBaseUrl', () => {
    it('returns the JPN portal base URL', () => {
      expect(detector.getPortalBaseUrl('JPN')).toBe('https://vjw-lp.digital.go.jp');
    });

    it('returns the SGP portal base URL', () => {
      expect(detector.getPortalBaseUrl('SGP')).toBe('https://eservices.ica.gov.sg');
    });

    it('returns null for unknown country codes', () => {
      expect(detector.getPortalBaseUrl('ZZZ')).toBeNull();
      expect(detector.getPortalBaseUrl('')).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Shared singleton
// ---------------------------------------------------------------------------

describe('pageDetector singleton', () => {
  it('is an instance of PageDetector', () => {
    expect(pageDetector).toBeInstanceOf(PageDetector);
  });

  it('detects captcha in a recaptcha page', () => {
    expect(pageDetector.isCaptchaPage('<div class="g-recaptcha"></div>')).toBe(true);
  });

  it('identifies auth pages with password input', () => {
    expect(pageDetector.isAuthPage('<input type="password">')).toBe(true);
  });
});
