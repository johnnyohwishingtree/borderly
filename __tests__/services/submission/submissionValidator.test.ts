/**
 * Tests for SubmissionValidator — security validation for submissions
 */

import { SubmissionValidator } from '@/services/submission/submissionValidator/SubmissionValidator';
import { FilledForm } from '@/services/forms/formEngine';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const defaultFieldProps = {
  source: 'auto' as const,
  needsUserInput: false,
  countrySpecific: false,
};

function makeFilledForm(overrides?: Partial<FilledForm>): FilledForm {
  return {
    countryCode: 'JPN',
    countryName: 'Japan',
    portalName: 'Visit Japan Web',
    portalUrl: 'https://vjw-lp.digital.go.jp/en/',
    sections: [
      {
        id: 'personal',
        title: 'Personal Information',
        fields: [
          {
            id: 'surname',
            label: 'Surname',
            type: 'text',
            required: true,
            currentValue: 'Doe',
            ...defaultFieldProps,
          },
          {
            id: 'passportNumber',
            label: 'Passport Number',
            type: 'text',
            required: true,
            currentValue: 'A12345678',
            ...defaultFieldProps,
          },
        ],
      },
    ],
    stats: {
      totalFields: 2,
      autoFilled: 2,
      userFilled: 0,
      remaining: 0,
      completionPercentage: 100,
    },
    ...overrides,
  };
}

function makeEmptyForm(): FilledForm {
  return makeFilledForm({
    sections: [],
    stats: { totalFields: 0, autoFilled: 0, userFilled: 0, remaining: 0, completionPercentage: 0 },
  });
}

function makePartialForm(): FilledForm {
  return makeFilledForm({
    sections: [
      {
        id: 'personal',
        title: 'Personal Information',
        fields: [
          {
            id: 'surname',
            label: 'Surname',
            type: 'text',
            required: true,
            currentValue: 'Doe',
            ...defaultFieldProps,
          },
          {
            id: 'givenNames',
            label: 'Given Names',
            type: 'text',
            required: true,
            currentValue: '', // Missing required
            source: 'empty' as const,
            needsUserInput: true,
            countrySpecific: false,
          },
        ],
      },
    ],
    stats: { totalFields: 2, autoFilled: 1, userFilled: 0, remaining: 1, completionPercentage: 50 },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SubmissionValidator', () => {
  let validator: SubmissionValidator;

  beforeEach(() => {
    validator = new SubmissionValidator();
  });

  // -------------------------------------------------------------------------
  // constructor
  // -------------------------------------------------------------------------
  describe('constructor', () => {
    it('creates instance with default config', () => {
      const config = validator.getConfig();
      expect(config.allowedDomains).toContain('vjw-lp.digital.go.jp');
      expect(config.maxDataSize).toBe(1024 * 1024);
      expect(config.maxScriptSize).toBe(50000);
    });

    it('merges custom config with defaults', () => {
      const custom = new SubmissionValidator({ maxDataSize: 500 });
      const config = custom.getConfig();
      expect(config.maxDataSize).toBe(500);
      expect(config.allowedDomains).toContain('vjw-lp.digital.go.jp'); // Default preserved
    });
  });

  // -------------------------------------------------------------------------
  // validateSubmission — happy path
  // -------------------------------------------------------------------------
  describe('validateSubmission — happy path', () => {
    it('passes for valid JPN form with all required fields', async () => {
      const result = await validator.validateSubmission(makeFilledForm(), 'JPN');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.checks.noPIILeakage).toBe(true);
      expect(result.checks.validDomain).toBe(true);
      expect(result.checks.secureConnection).toBe(true);
      expect(result.checks.dataWithinLimits).toBe(true);
    });

    it('passes for valid MYS form', async () => {
      const form = makeFilledForm({ portalUrl: 'https://mdac.gov.my/entry' });
      const result = await validator.validateSubmission(form, 'MYS');

      expect(result.isValid).toBe(true);
    });

    it('passes for valid SGP form', async () => {
      const form = makeFilledForm({ portalUrl: 'https://eservices.ica.gov.sg/arrival' });
      const result = await validator.validateSubmission(form, 'SGP');

      expect(result.isValid).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // validateSubmission — error: missing required fields
  // -------------------------------------------------------------------------
  describe('validateSubmission — missing required fields', () => {
    it('rejects JPN form with empty required field', async () => {
      const result = await validator.validateSubmission(makePartialForm(), 'JPN');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Missing required field for Japan'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // validateSubmission — error: invalid domain
  // -------------------------------------------------------------------------
  describe('validateSubmission — invalid domain', () => {
    it('rejects form with non-allowlisted portal URL', async () => {
      const form = makeFilledForm({ portalUrl: 'https://evil-site.com/' });
      const result = await validator.validateSubmission(form, 'JPN');

      expect(result.isValid).toBe(false);
      expect(result.checks.validDomain).toBe(false);
    });

    it('rejects form with HTTP portal URL', async () => {
      const form = makeFilledForm({ portalUrl: 'http://vjw-lp.digital.go.jp/en/' });
      const result = await validator.validateSubmission(form, 'JPN');

      expect(result.isValid).toBe(false);
      expect(result.checks.secureConnection).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // validateSubmission — error: data exceeds size limit
  // -------------------------------------------------------------------------
  describe('validateSubmission — data size limit', () => {
    it('rejects form data exceeding maxDataSize', async () => {
      const smallValidator = new SubmissionValidator({ maxDataSize: 10 });
      const result = await smallValidator.validateSubmission(makeFilledForm(), 'JPN');

      expect(result.isValid).toBe(false);
      expect(result.checks.dataWithinLimits).toBe(false);
      expect(result.errors.some(e => e.includes('exceeds maximum size limit'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // validateSubmission — edge cases
  // -------------------------------------------------------------------------
  describe('validateSubmission — edge cases', () => {
    it('handles empty form (no sections)', async () => {
      const result = await validator.validateSubmission(makeEmptyForm(), 'JPN');

      // Empty form is valid from PII/size perspective; country validation may warn
      expect(result.checks.noPIILeakage).toBe(true);
      expect(result.checks.dataWithinLimits).toBe(true);
    });

    it('handles unknown country code gracefully', async () => {
      const result = await validator.validateSubmission(makeFilledForm(), 'XYZ');

      // Domain validation fails (vjw-lp.digital.go.jp doesn't match XYZ expectations)
      // but country-specific validation just warns
      expect(result.warnings.some(w => w.includes('No country-specific validation'))).toBe(true);
    });

    it('detects blocked patterns in non-PII-allowed fields', async () => {
      const form = makeFilledForm({
        sections: [
          {
            id: 'extra',
            title: 'Extra',
            fields: [
              {
                id: 'notes',
                label: 'Notes',
                type: 'text',
                required: false,
                currentValue: 'my password is secret',
                ...defaultFieldProps,
              },
            ],
          },
        ],
      });

      const result = await validator.validateSubmission(form, 'JPN');

      expect(result.isValid).toBe(false);
      expect(result.checks.noPIILeakage).toBe(false);
      expect(result.errors.some(e => e.includes('Blocked pattern'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // validateURL
  // -------------------------------------------------------------------------
  describe('validateURL', () => {
    it('accepts valid HTTPS government portal URLs', () => {
      const result = validator.validateURL('https://vjw-lp.digital.go.jp/en/');

      expect(result.isValid).toBe(true);
      expect(result.checks.secureConnection).toBe(true);
      expect(result.checks.validDomain).toBe(true);
    });

    it('rejects HTTP URLs (except localhost)', () => {
      const result = validator.validateURL('http://example.com/');

      expect(result.isValid).toBe(false);
      expect(result.checks.secureConnection).toBe(false);
      expect(result.errors).toContain('Only HTTPS URLs are allowed for government portals');
    });

    it('accepts HTTP localhost for development', () => {
      const result = validator.validateURL('http://localhost:3000/');

      expect(result.isValid).toBe(true);
      expect(result.checks.secureConnection).toBe(true);
      expect(result.warnings).toContain('Using HTTP on localhost (development only)');
    });

    it('accepts HTTP 127.0.0.1 for development', () => {
      const result = validator.validateURL('http://127.0.0.1:8080/');

      expect(result.isValid).toBe(true);
      expect(result.checks.secureConnection).toBe(true);
    });

    it('rejects non-allowlisted domains', () => {
      const result = validator.validateURL('https://evil-site.com/');

      expect(result.isValid).toBe(false);
      expect(result.checks.validDomain).toBe(false);
      expect(result.errors).toContain('Domain not in allowlist: evil-site.com');
    });

    it('accepts subdomains of allowlisted domains', () => {
      const result = validator.validateURL('https://sub.vjw-lp.digital.go.jp/');

      expect(result.isValid).toBe(true);
      expect(result.checks.validDomain).toBe(true);
    });

    it('detects PII in URL parameters', () => {
      const result = validator.validateURL('https://vjw-lp.digital.go.jp/en/?ssn=123-45-6789');

      expect(result.isValid).toBe(false);
      expect(result.checks.noPIILeakage).toBe(false);
      expect(result.errors).toContain('PII detected in URL parameters');
    });

    it('handles invalid URL gracefully', () => {
      const result = validator.validateURL('not-a-url');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid URL'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // validateJavaScript
  // -------------------------------------------------------------------------
  describe('validateJavaScript', () => {
    it('accepts safe JavaScript code', () => {
      const safeCode = "document.querySelector('#name').value = 'John Doe';";
      const result = validator.validateJavaScript(safeCode);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects eval()', () => {
      const result = validator.validateJavaScript('eval("malicious code")');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('eval()'))).toBe(true);
    });

    it('rejects Function()', () => {
      const result = validator.validateJavaScript('new Function("alert(1)")');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Function()'))).toBe(true);
    });

    it('rejects fetch()', () => {
      const result = validator.validateJavaScript('fetch("https://evil.com")');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('fetch()'))).toBe(true);
    });

    it('rejects XMLHttpRequest', () => {
      const result = validator.validateJavaScript('new XMLHttpRequest()');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('XMLHttpRequest'))).toBe(true);
    });

    it('rejects window.open()', () => {
      const result = validator.validateJavaScript('window.open("https://evil.com")');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('window.open()'))).toBe(true);
    });

    it('rejects location manipulation', () => {
      const result = validator.validateJavaScript('window.location = "https://evil.com"');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Unauthorized navigation'))).toBe(true);
    });

    it('rejects localStorage/sessionStorage', () => {
      const result = validator.validateJavaScript('localStorage.setItem("key", "val")');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Persistent data storage'))).toBe(true);
    });

    it('rejects document.write with script', () => {
      const result = validator.validateJavaScript('document.write("<script>alert(1)</script>")');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('write()'))).toBe(true);
    });

    it('rejects oversized JavaScript', () => {
      const largeCode = 'a'.repeat(100000); // 100KB > 50KB limit
      const result = validator.validateJavaScript(largeCode);

      expect(result.isValid).toBe(false);
      expect(result.checks.dataWithinLimits).toBe(false);
      expect(result.errors.some(e => e.includes('maximum size limit'))).toBe(true);
    });

    it('warns about PII patterns in code', () => {
      const codeWithPII = 'const ssn = "123-45-6789";';
      const result = validator.validateJavaScript(codeWithPII);

      expect(result.warnings.some(w => w.includes('PII pattern'))).toBe(true);
    });

    it('sets noPIILeakage to false when dangerous patterns detected', () => {
      const result = validator.validateJavaScript('eval("x")');

      expect(result.checks.noPIILeakage).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // validateSessionData
  // -------------------------------------------------------------------------
  describe('validateSessionData', () => {
    it('accepts valid session data with allowed PII fields', () => {
      const result = validator.validateSessionData({
        surname: 'Doe',
        givenNames: 'John',
      });

      expect(result.isValid).toBe(true);
      expect(result.checks.noPIILeakage).toBe(true);
    });

    it('rejects session data with unauthorized PII key', () => {
      const result = validator.validateSessionData({
        creditCard: '4111-1111-1111-1111',
      });

      expect(result.isValid).toBe(false);
      expect(result.checks.noPIILeakage).toBe(false);
      expect(result.errors.some(e => e.includes('Unauthorized PII'))).toBe(true);
    });

    it('rejects session data exceeding size limit', () => {
      const smallValidator = new SubmissionValidator({ maxDataSize: 10 });
      const result = smallValidator.validateSessionData({
        largeField: 'x'.repeat(100),
      });

      expect(result.isValid).toBe(false);
      expect(result.checks.dataWithinLimits).toBe(false);
      expect(result.errors).toContain('Session data exceeds maximum size limit');
    });

    it('accepts empty session data', () => {
      const result = validator.validateSessionData({});

      expect(result.isValid).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // getAllowedDomains
  // -------------------------------------------------------------------------
  describe('getAllowedDomains', () => {
    it('returns Japan-specific domains for JPN', () => {
      const domains = validator.getAllowedDomains('JPN');
      expect(domains).toContain('vjw-lp.digital.go.jp');
    });

    it('returns Malaysia-specific domains for MYS', () => {
      const domains = validator.getAllowedDomains('MYS');
      expect(domains).toContain('mdac.gov.my');
    });

    it('returns Singapore-specific domains for SGP', () => {
      const domains = validator.getAllowedDomains('SGP');
      expect(domains).toContain('eservices.ica.gov.sg');
    });

    it('returns empty array for unknown country', () => {
      const domains = validator.getAllowedDomains('XYZ');
      expect(domains).toEqual([]);
    });

    it('returns all configured domains when no country specified', () => {
      const domains = validator.getAllowedDomains();
      expect(domains.length).toBeGreaterThan(0);
      expect(domains).toContain('vjw-lp.digital.go.jp');
    });
  });

  // -------------------------------------------------------------------------
  // isAllowedPIIField
  // -------------------------------------------------------------------------
  describe('isAllowedPIIField', () => {
    it('returns true for allowed PII fields', () => {
      expect(validator.isAllowedPIIField('surname')).toBe(true);
      expect(validator.isAllowedPIIField('passportNumber')).toBe(true);
      expect(validator.isAllowedPIIField('dateOfBirth')).toBe(true);
    });

    it('returns false for non-allowed fields', () => {
      expect(validator.isAllowedPIIField('creditCard')).toBe(false);
      expect(validator.isAllowedPIIField('bankAccount')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // getConfig / updateConfig
  // -------------------------------------------------------------------------
  describe('getConfig / updateConfig', () => {
    it('returns a copy of config (not a reference)', () => {
      const c1 = validator.getConfig();
      const c2 = validator.getConfig();
      expect(c1).not.toBe(c2);
      expect(c1).toEqual(c2);
    });

    it('updates config with partial values', () => {
      validator.updateConfig({ maxDataSize: 999 });
      expect(validator.getConfig().maxDataSize).toBe(999);
      // Other fields preserved
      expect(validator.getConfig().requireSSL).toBe(true);
    });
  });
});
