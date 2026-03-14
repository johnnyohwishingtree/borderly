import { PageDetector } from '../../src/services/submission/pageDetection';
import type { DetectedPage } from '../../src/services/submission/pageDetection';

const JPN_SCHEMA = {
  submissionGuide: [
    {
      title: 'Create Account',
      automation: { url: 'https://vjw-lp.digital.go.jp/register' },
      fieldsOnThisScreen: ['email', 'password'],
    },
    {
      title: 'Passport Information',
      automation: { url: 'https://vjw-lp.digital.go.jp/passport' },
      fieldsOnThisScreen: ['passportNumber', 'dateOfBirth'],
    },
    {
      title: 'Confirmation',
      automation: { url: 'https://vjw-lp.digital.go.jp/confirm' },
    },
  ],
};

const MYS_SCHEMA = {
  submissionGuide: [
    {
      title: 'Personal Details',
      automation: { url: 'https://imigresen-online.imi.gov.my/mdac/personal' },
    },
  ],
};

const SGP_SCHEMA = {
  submissionGuide: [
    {
      title: 'Arrival Details',
      automation: { url: 'https://eservices.ica.gov.sg/sgarrivalcard' },
    },
  ],
};

describe('PageDetector', () => {
  let detector: PageDetector;

  beforeEach(() => {
    detector = new PageDetector();
  });

  // ─── detectPage ───────────────────────────────────────────────────────────

  describe('detectPage', () => {
    it('identifies the JPN portal first step', () => {
      const result = detector.detectPage(
        'https://vjw-lp.digital.go.jp/register',
        'JPN',
        JPN_SCHEMA,
      );
      expect(result).not.toBeNull();
      const page = result as DetectedPage;
      expect(page.stepIndex).toBe(0);
      expect(page.stepTitle).toBe('Create Account');
      expect(page.countryCode).toBe('JPN');
      expect(page.url).toBe('https://vjw-lp.digital.go.jp/register');
    });

    it('identifies the JPN portal second step', () => {
      const result = detector.detectPage(
        'https://vjw-lp.digital.go.jp/passport?lang=en',
        'JPN',
        JPN_SCHEMA,
      );
      expect(result).not.toBeNull();
      expect(result!.stepIndex).toBe(1);
      expect(result!.stepTitle).toBe('Passport Information');
    });

    it('identifies the JPN portal third step', () => {
      const result = detector.detectPage(
        'https://vjw-lp.digital.go.jp/confirm',
        'JPN',
        JPN_SCHEMA,
      );
      expect(result).not.toBeNull();
      expect(result!.stepIndex).toBe(2);
    });

    it('identifies the MYS portal step', () => {
      const result = detector.detectPage(
        'https://imigresen-online.imi.gov.my/mdac/personal',
        'MYS',
        MYS_SCHEMA,
      );
      expect(result).not.toBeNull();
      expect(result!.countryCode).toBe('MYS');
      expect(result!.stepTitle).toBe('Personal Details');
    });

    it('identifies the SGP portal step', () => {
      const result = detector.detectPage(
        'https://eservices.ica.gov.sg/sgarrivalcard',
        'SGP',
        SGP_SCHEMA,
      );
      expect(result).not.toBeNull();
      expect(result!.countryCode).toBe('SGP');
      expect(result!.stepTitle).toBe('Arrival Details');
    });

    it('returns null for an unknown URL', () => {
      const result = detector.detectPage('https://example.com/unknown', 'JPN', JPN_SCHEMA);
      expect(result).toBeNull();
    });

    it('returns null when schema has no submissionGuide', () => {
      const result = detector.detectPage('https://vjw-lp.digital.go.jp/register', 'JPN', {});
      expect(result).toBeNull();
    });

    it('returns null when schema has an empty submissionGuide', () => {
      const result = detector.detectPage(
        'https://vjw-lp.digital.go.jp/register',
        'JPN',
        { submissionGuide: [] },
      );
      expect(result).toBeNull();
    });

    it('returns null when steps have no automation URL', () => {
      const schema = {
        submissionGuide: [
          { title: 'Step without URL', fieldsOnThisScreen: ['email'] },
        ],
      };
      const result = detector.detectPage(
        'https://vjw-lp.digital.go.jp/register',
        'JPN',
        schema,
      );
      expect(result).toBeNull();
    });
  });

  // ─── isCaptchaPage ────────────────────────────────────────────────────────

  describe('isCaptchaPage', () => {
    it('detects "captcha" keyword in lowercase', () => {
      expect(detector.isCaptchaPage('<div class="captcha-container"></div>')).toBe(true);
    });

    it('detects "recaptcha" keyword', () => {
      expect(detector.isCaptchaPage('<script src="recaptcha/api.js"></script>')).toBe(true);
    });

    it('detects "hcaptcha" keyword', () => {
      expect(detector.isCaptchaPage('<div class="h-captcha" data-sitekey="abc"></div>')).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(detector.isCaptchaPage('<div class="CAPTCHA-box"></div>')).toBe(true);
    });

    it('returns false for a normal page', () => {
      expect(detector.isCaptchaPage('<html><body><form><input name="email"/></form></body></html>')).toBe(false);
    });

    it('returns false for an empty string', () => {
      expect(detector.isCaptchaPage('')).toBe(false);
    });
  });

  // ─── isAuthPage ───────────────────────────────────────────────────────────

  describe('isAuthPage', () => {
    it('detects "login" keyword', () => {
      expect(detector.isAuthPage('<h1>Login to your account</h1>')).toBe(true);
    });

    it('detects "signin" keyword', () => {
      expect(detector.isAuthPage('<button>signin</button>')).toBe(true);
    });

    it('detects "password" keyword', () => {
      expect(detector.isAuthPage('<input type="password" name="pwd" />')).toBe(true);
    });

    it('detects "authenticate" keyword', () => {
      expect(detector.isAuthPage('<p>Please authenticate to continue</p>')).toBe(true);
    });

    it('detects "session-expired" keyword', () => {
      expect(detector.isAuthPage('<p class="session-expired">Your session has expired</p>')).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(detector.isAuthPage('<h2>LOGIN</h2>')).toBe(true);
    });

    it('returns false for a normal form page', () => {
      expect(
        detector.isAuthPage('<form><input name="firstName"/><input name="lastName"/></form>'),
      ).toBe(false);
    });
  });

  // ─── getPortalBaseUrl ─────────────────────────────────────────────────────

  describe('getPortalBaseUrl', () => {
    it('returns the JPN portal URL', () => {
      expect(detector.getPortalBaseUrl('JPN')).toBe('https://vjw-lp.digital.go.jp');
    });

    it('returns the MYS portal URL', () => {
      expect(detector.getPortalBaseUrl('MYS')).toBe('https://imigresen-online.imi.gov.my');
    });

    it('returns the SGP portal URL', () => {
      expect(detector.getPortalBaseUrl('SGP')).toBe('https://eservices.ica.gov.sg');
    });

    it('returns null for an unknown country code', () => {
      expect(detector.getPortalBaseUrl('ZZZ')).toBeNull();
    });

    it('returns null for an empty string', () => {
      expect(detector.getPortalBaseUrl('')).toBeNull();
    });
  });
});
