/**
 * Tests for forms/validators/formValidation
 */

import {
  validateFieldEnhanced,
  validateFormWithCrossChecks,
  createRealTimeValidator,
  isValidFormValue,
} from '@/services/forms/validators/formValidation';
import { FormField } from '@/types/schema';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeTextField(overrides?: Partial<FormField>): FormField {
  return {
    id: 'name',
    label: 'Name',
    type: 'text',
    required: true,
    countrySpecific: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// validateFieldEnhanced
// ---------------------------------------------------------------------------
describe('validateFieldEnhanced', () => {
  it('passes for valid required text field', () => {
    const result = validateFieldEnhanced(makeTextField(), 'Taro Tanaka');
    expect(result.isValid).toBe(true);
  });

  it('fails for empty required field', () => {
    const result = validateFieldEnhanced(makeTextField(), '');
    expect(result.isValid).toBe(false);
    expect(typeof result.error).toBe('string');
  });

  it('adds Japan-specific meat warning', () => {
    const field = makeTextField({ id: 'carryingMeatProducts', type: 'boolean', required: false });
    const result = validateFieldEnhanced(field, true, { countryCode: 'JPN' });
    expect(result.warnings?.some(w => w.includes('meat'))).toBe(true);
  });

  it('adds Singapore tobacco warning', () => {
    const field = makeTextField({ id: 'tobaccoProducts', type: 'boolean', required: false });
    const result = validateFieldEnhanced(field, true, { countryCode: 'SGP' });
    expect(result.warnings?.some(w => w.includes('tobacco'))).toBe(true);
  });

  it('adds currency declaration warning for USA', () => {
    const field = makeTextField({ id: 'currencyAmount', type: 'number', required: false });
    const result = validateFieldEnhanced(field, 15000, { countryCode: 'USA' });
    expect(result.warnings?.some(w => w.includes('$10,000'))).toBe(true);
  });

  it('warns about passport expiry within 6 months', () => {
    const field = makeTextField({ id: 'passportExpiry', type: 'date', required: false });
    const soonDate = new Date();
    soonDate.setMonth(soonDate.getMonth() + 3);
    const result = validateFieldEnhanced(field, soonDate.toISOString().split('T')[0], {});
    expect(result.warnings?.some(w => w.includes('6 months'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateFormWithCrossChecks
// ---------------------------------------------------------------------------
describe('validateFormWithCrossChecks', () => {
  it('passes when all fields are valid and no cross-field issues', () => {
    const fields = [makeTextField({ id: 'name' })];
    const result = validateFormWithCrossChecks(fields, { name: 'Taro' });
    expect(result.isValid).toBe(true);
    expect(result.crossFieldErrors).toHaveLength(0);
  });

  it('catches departure before arrival date', () => {
    const fields = [
      makeTextField({ id: 'arrivalDate', type: 'date', required: false }),
      makeTextField({ id: 'departureDate', type: 'date', required: false }),
    ];
    const result = validateFormWithCrossChecks(fields, {
      arrivalDate: '2026-04-10',
      departureDate: '2026-04-05',
    });
    expect(result.crossFieldErrors.some(e => e.includes('after arrival'))).toBe(true);
  });

  it('catches passport expiry before travel date', () => {
    const fields = [
      makeTextField({ id: 'arrivalDate', type: 'date', required: false }),
      makeTextField({ id: 'passportExpiry', type: 'date', required: false }),
    ];
    const result = validateFormWithCrossChecks(fields, {
      arrivalDate: '2026-04-10',
      passportExpiry: '2026-03-01',
    });
    expect(result.crossFieldErrors.some(e => e.includes('Passport expires'))).toBe(true);
  });

  it('returns field-level errors for invalid required fields', () => {
    const fields = [makeTextField({ id: 'name', required: true })];
    const result = validateFormWithCrossChecks(fields, { name: '' });
    expect(result.isValid).toBe(false);
    expect(typeof result.errors.name).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// createRealTimeValidator
// ---------------------------------------------------------------------------
describe('createRealTimeValidator', () => {
  const fields = [
    makeTextField({ id: 'name' }),
    makeTextField({ id: 'email', type: 'text', required: false }),
  ];

  it('validateField returns valid for correct values', () => {
    const validator = createRealTimeValidator(fields);
    expect(validator.validateField('name', 'Taro').isValid).toBe(true);
  });

  it('validateField returns error for unknown field', () => {
    const validator = createRealTimeValidator(fields);
    expect(validator.validateField('unknown', 'x').isValid).toBe(false);
    expect(validator.validateField('unknown', 'x').error).toContain('not found');
  });

  it('getFieldSchema returns null for unknown field', () => {
    const validator = createRealTimeValidator(fields);
    expect(validator.getFieldSchema('unknown')).toBeNull();
  });

  it('getFieldSchema returns schema for known field', () => {
    const validator = createRealTimeValidator(fields);
    expect(validator.getFieldSchema('name')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isValidFormValue
// ---------------------------------------------------------------------------
describe('isValidFormValue', () => {
  it('returns true for string, number, boolean, Date', () => {
    expect(isValidFormValue('hello')).toBe(true);
    expect(isValidFormValue(42)).toBe(true);
    expect(isValidFormValue(false)).toBe(true);
    expect(isValidFormValue(new Date())).toBe(true);
  });

  it('returns false for null, undefined, objects, arrays', () => {
    expect(isValidFormValue(null)).toBe(false);
    expect(isValidFormValue(undefined)).toBe(false);
    expect(isValidFormValue({})).toBe(false);
    expect(isValidFormValue([])).toBe(false);
  });
});
