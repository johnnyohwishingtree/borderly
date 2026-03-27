import {
  CAPTCHA_DETECTION_SCRIPT,
  FORM_ANALYSIS_SCRIPT,
  AUTH_CHECK_SCRIPT,
  FEATURE_DETECTION_SCRIPT,
  PAGE_INFO_SCRIPT,
  SIGNATURE_GENERATION_SCRIPT,
} from '../../../src/services/portal/portalScripts';

// ---------------------------------------------------------------------------
// Script constants — structural validation
// ---------------------------------------------------------------------------

const scripts = [
  { name: 'CAPTCHA_DETECTION_SCRIPT', value: CAPTCHA_DETECTION_SCRIPT },
  { name: 'FORM_ANALYSIS_SCRIPT', value: FORM_ANALYSIS_SCRIPT },
  { name: 'AUTH_CHECK_SCRIPT', value: AUTH_CHECK_SCRIPT },
  { name: 'FEATURE_DETECTION_SCRIPT', value: FEATURE_DETECTION_SCRIPT },
  { name: 'PAGE_INFO_SCRIPT', value: PAGE_INFO_SCRIPT },
  { name: 'SIGNATURE_GENERATION_SCRIPT', value: SIGNATURE_GENERATION_SCRIPT },
];

describe('portalScripts', () => {
  it.each(scripts)('$name is a non-empty string', ({ value }) => {
    expect(typeof value).toBe('string');
    expect(value.trim().length).toBeGreaterThan(0);
  });

  it.each(scripts)('$name contains valid JavaScript structure (IIFE or object literal)', ({ value }) => {
    const trimmed = value.trim();
    // Each script is either an IIFE `(function() { ... })()` or an object expression `({ ... })`
    expect(trimmed.startsWith('(')).toBe(true);
  });
});

describe('CAPTCHA_DETECTION_SCRIPT', () => {
  it('checks for reCAPTCHA elements', () => {
    expect(CAPTCHA_DETECTION_SCRIPT).toContain('recaptcha');
  });

  it('checks for hCaptcha elements', () => {
    expect(CAPTCHA_DETECTION_SCRIPT).toContain('hcaptcha');
  });

  it('returns a captchaInfo object', () => {
    expect(CAPTCHA_DETECTION_SCRIPT).toContain('return captchaInfo');
  });
});

describe('FORM_ANALYSIS_SCRIPT', () => {
  it('queries for form elements', () => {
    expect(FORM_ANALYSIS_SCRIPT).toContain("document.querySelectorAll('form')");
  });

  it('returns a structure object with expected fields', () => {
    expect(FORM_ANALYSIS_SCRIPT).toContain('totalSteps');
    expect(FORM_ANALYSIS_SCRIPT).toContain('requiredFields');
    expect(FORM_ANALYSIS_SCRIPT).toContain('optionalFields');
    expect(FORM_ANALYSIS_SCRIPT).toContain('uploadFields');
  });

  it('detects multi-step forms', () => {
    expect(FORM_ANALYSIS_SCRIPT).toContain('stepIndicators');
  });
});

describe('AUTH_CHECK_SCRIPT', () => {
  it('detects password inputs', () => {
    expect(AUTH_CHECK_SCRIPT).toContain('input[type="password"]');
  });

  it('checks for login-related elements', () => {
    expect(AUTH_CHECK_SCRIPT).toContain('login');
  });

  it('returns authInfo object', () => {
    expect(AUTH_CHECK_SCRIPT).toContain('return authInfo');
  });

  it('detects two-factor authentication', () => {
    expect(AUTH_CHECK_SCRIPT).toContain('twoFactorAuth');
  });
});

describe('FEATURE_DETECTION_SCRIPT', () => {
  it('detects file upload capability', () => {
    expect(FEATURE_DETECTION_SCRIPT).toContain('hasFileUpload');
    expect(FEATURE_DETECTION_SCRIPT).toContain('input[type="file"]');
  });

  it('detects captcha presence', () => {
    expect(FEATURE_DETECTION_SCRIPT).toContain('hasCaptcha');
  });

  it('detects language selection', () => {
    expect(FEATURE_DETECTION_SCRIPT).toContain('hasLanguageSelection');
  });

  it('checks mobile support', () => {
    expect(FEATURE_DETECTION_SCRIPT).toContain('supportsMobile');
  });
});

describe('PAGE_INFO_SCRIPT', () => {
  it('captures URL and domain info', () => {
    expect(PAGE_INFO_SCRIPT).toContain('window.location.href');
    expect(PAGE_INFO_SCRIPT).toContain('window.location.hostname');
    expect(PAGE_INFO_SCRIPT).toContain('window.location.pathname');
  });

  it('captures page title', () => {
    expect(PAGE_INFO_SCRIPT).toContain('document.title');
  });

  it('captures viewport dimensions', () => {
    expect(PAGE_INFO_SCRIPT).toContain('window.innerWidth');
    expect(PAGE_INFO_SCRIPT).toContain('window.innerHeight');
  });
});

describe('SIGNATURE_GENERATION_SCRIPT', () => {
  it('collects form and structural elements', () => {
    expect(SIGNATURE_GENERATION_SCRIPT).toContain('form');
    expect(SIGNATURE_GENERATION_SCRIPT).toContain('fieldset');
  });

  it('returns signature with form and input counts', () => {
    expect(SIGNATURE_GENERATION_SCRIPT).toContain('formCount');
    expect(SIGNATURE_GENERATION_SCRIPT).toContain('inputCount');
  });

  it('generates a content hash', () => {
    expect(SIGNATURE_GENERATION_SCRIPT).toContain('hash');
  });
});
