/**
 * Tests for submissionValidator/countryValidators
 */

import {
  validateJapanSpecific,
  validateMalaysiaSpecific,
  validateSingaporeSpecific,
  validateCountrySpecific,
  extractFormData,
} from '@/services/submission/submissionValidator/countryValidators';
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
    portalUrl: 'https://vjw-lp.digital.go.jp',
    sections: [
      {
        id: 'personal',
        title: 'Personal Info',
        fields: [
          { id: 'surname', label: 'Surname', type: 'text', currentValue: 'Tanaka', required: true, ...defaultFieldProps },
          { id: 'givenNames', label: 'Given Names', type: 'text', currentValue: 'Taro', required: true, ...defaultFieldProps },
        ],
      },
    ],
    stats: { totalFields: 2, autoFilled: 2, userFilled: 0, remaining: 0, completionPercentage: 100 },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// extractFormData
// ---------------------------------------------------------------------------
describe('extractFormData', () => {
  it('returns flat map of non-empty field values', () => {
    const data = extractFormData(makeFilledForm());
    expect(data).toEqual({ surname: 'Tanaka', givenNames: 'Taro' });
  });

  it('excludes empty values', () => {
    const form = makeFilledForm({
      sections: [
        {
          id: 's1',
          title: 'S1',
          fields: [
            { id: 'f1', label: 'F1', type: 'text', currentValue: '', required: false, ...defaultFieldProps },
            { id: 'f2', label: 'F2', type: 'text', currentValue: 'val', required: false, ...defaultFieldProps },
          ],
        },
      ],
    });
    const data = extractFormData(form);
    expect(data).toEqual({ f2: 'val' });
  });
});

// ---------------------------------------------------------------------------
// validateJapanSpecific
// ---------------------------------------------------------------------------
describe('validateJapanSpecific', () => {
  it('passes for valid Japan portal URL with all required fields filled', () => {
    const result = validateJapanSpecific(makeFilledForm());
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails when portal URL is not Visit Japan Web', () => {
    const form = makeFilledForm({ portalUrl: 'https://evil.example.com' });
    const result = validateJapanSpecific(form);
    expect(result.isValid).toBe(false);
    expect(result.checks.validDomain).toBe(false);
    expect(result.errors[0]).toContain('Invalid portal URL for Japan');
  });

  it('fails when a required field is empty', () => {
    const form = makeFilledForm({
      sections: [
        {
          id: 'personal',
          title: 'Personal Info',
          fields: [
            { id: 'surname', label: 'Surname', type: 'text', currentValue: '', required: true, ...defaultFieldProps },
          ],
        },
      ],
    });
    const result = validateJapanSpecific(form);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('Missing required field'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateMalaysiaSpecific
// ---------------------------------------------------------------------------
describe('validateMalaysiaSpecific', () => {
  it('passes for valid Malaysia portal URL', () => {
    const form = makeFilledForm({ portalUrl: 'https://mdac.gov.my/entry' });
    const result = validateMalaysiaSpecific(form);
    expect(result.isValid).toBe(true);
  });

  it('fails for incorrect portal URL', () => {
    const form = makeFilledForm({ portalUrl: 'https://wrong.example.com' });
    const result = validateMalaysiaSpecific(form);
    expect(result.isValid).toBe(false);
    expect(result.checks.validDomain).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateSingaporeSpecific
// ---------------------------------------------------------------------------
describe('validateSingaporeSpecific', () => {
  it('passes for valid Singapore portal URL', () => {
    const form = makeFilledForm({ portalUrl: 'https://eservices.ica.gov.sg/arrival' });
    const result = validateSingaporeSpecific(form);
    expect(result.isValid).toBe(true);
  });

  it('fails for incorrect portal URL', () => {
    const form = makeFilledForm({ portalUrl: 'https://wrong.example.com' });
    const result = validateSingaporeSpecific(form);
    expect(result.isValid).toBe(false);
    expect(result.checks.validDomain).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateCountrySpecific
// ---------------------------------------------------------------------------
describe('validateCountrySpecific', () => {
  it('dispatches to Japan validator for JPN', () => {
    const form = makeFilledForm({ portalUrl: 'https://vjw-lp.digital.go.jp/en/' });
    const result = validateCountrySpecific('JPN', form);
    expect(result.isValid).toBe(true);
  });

  it('dispatches to Malaysia validator for MYS', () => {
    const form = makeFilledForm({ portalUrl: 'https://mdac.gov.my' });
    const result = validateCountrySpecific('MYS', form);
    expect(result.isValid).toBe(true);
  });

  it('dispatches to Singapore validator for SGP', () => {
    const form = makeFilledForm({ portalUrl: 'https://eservices.ica.gov.sg' });
    const result = validateCountrySpecific('SGP', form);
    expect(result.isValid).toBe(true);
  });

  it('returns valid with a warning for unknown country codes', () => {
    const form = makeFilledForm();
    const result = validateCountrySpecific('XYZ', form);
    expect(result.isValid).toBe(true);
    expect(result.warnings.some(w => w.includes('No country-specific validation'))).toBe(true);
  });
});
