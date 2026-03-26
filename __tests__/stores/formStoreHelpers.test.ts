/**
 * Tests for formStoreHelpers: findFieldInForm, validateFieldValue
 */

import { findFieldInForm, validateFieldValue } from '../../src/stores/formStoreHelpers';
import type { FilledForm, FilledFormField } from '../../src/services/forms/formEngine';

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function createField(overrides: Partial<FilledFormField> = {}): FilledFormField {
  return {
    id: 'field1',
    label: 'Test Field',
    type: 'text',
    required: false,
    countrySpecific: false,
    currentValue: undefined,
    source: 'empty',
    needsUserInput: true,
    ...overrides,
  };
}

function createForm(fields: FilledFormField[][]): FilledForm {
  return {
    countryCode: 'JPN',
    countryName: 'Japan',
    portalName: 'Visit Japan Web',
    portalUrl: 'https://vjw.digital.go.jp',
    sections: fields.map((sectionFields, i) => ({
      id: `section${i}`,
      title: `Section ${i}`,
      fields: sectionFields,
    })),
    stats: {
      totalFields: fields.flat().length,
      autoFilled: 0,
      userFilled: 0,
      remaining: fields.flat().length,
      completionPercentage: 0,
    },
  };
}

// ---------------------------------------------------------------------------
// findFieldInForm
// ---------------------------------------------------------------------------

describe('findFieldInForm', () => {
  it('finds a field in the first section', () => {
    const field = createField({ id: 'passport' });
    const form = createForm([[field]]);

    expect(findFieldInForm(form, 'passport')).toBe(field);
  });

  it('finds a field in a later section', () => {
    const field1 = createField({ id: 'name' });
    const field2 = createField({ id: 'email' });
    const form = createForm([[field1], [field2]]);

    expect(findFieldInForm(form, 'email')).toBe(field2);
  });

  it('returns undefined when field does not exist', () => {
    const form = createForm([[createField({ id: 'name' })]]);

    expect(findFieldInForm(form, 'nonexistent')).toBeUndefined();
  });

  it('returns undefined for an empty form', () => {
    const form = createForm([[]]);

    expect(findFieldInForm(form, 'anything')).toBeUndefined();
  });

  it('returns the first match when duplicate ids exist across sections', () => {
    const first = createField({ id: 'dup', label: 'First' });
    const second = createField({ id: 'dup', label: 'Second' });
    const form = createForm([[first], [second]]);

    expect(findFieldInForm(form, 'dup')).toBe(first);
  });
});

// ---------------------------------------------------------------------------
// validateFieldValue
// ---------------------------------------------------------------------------

describe('validateFieldValue', () => {
  describe('required field validation', () => {
    const requiredField = createField({ required: true, label: 'Name' });

    it('returns error for undefined value', () => {
      expect(validateFieldValue(requiredField, undefined)).toBe('Name is required');
    });

    it('returns error for empty string', () => {
      expect(validateFieldValue(requiredField, '')).toBe('Name is required');
    });

    it('returns error for null value', () => {
      expect(validateFieldValue(requiredField, null)).toBe('Name is required');
    });

    it('passes when value is provided', () => {
      expect(validateFieldValue(requiredField, 'John')).toBeUndefined();
    });
  });

  describe('non-required field validation', () => {
    const optionalField = createField({ required: false, label: 'Note' });

    it('passes for undefined value', () => {
      expect(validateFieldValue(optionalField, undefined)).toBeUndefined();
    });

    it('passes for empty string', () => {
      expect(validateFieldValue(optionalField, '')).toBeUndefined();
    });

    it('passes for null value', () => {
      expect(validateFieldValue(optionalField, null)).toBeUndefined();
    });
  });

  describe('pattern validation', () => {
    const field = createField({
      label: 'Passport',
      validation: { pattern: '^[A-Z0-9]+$' },
    });

    it('passes when value matches pattern', () => {
      expect(validateFieldValue(field, 'AB123')).toBeUndefined();
    });

    it('returns error when value does not match pattern', () => {
      expect(validateFieldValue(field, 'ab-123')).toBe('Passport format is invalid');
    });

    it('skips pattern check for empty value', () => {
      expect(validateFieldValue(field, '')).toBeUndefined();
    });
  });

  describe('minLength validation', () => {
    const field = createField({
      label: 'Code',
      validation: { minLength: 3 },
    });

    it('passes when value meets minimum length', () => {
      expect(validateFieldValue(field, 'ABC')).toBeUndefined();
    });

    it('returns error when value is too short', () => {
      expect(validateFieldValue(field, 'AB')).toBe('Code must be at least 3 characters');
    });
  });

  describe('maxLength validation', () => {
    const field = createField({
      label: 'Code',
      validation: { maxLength: 5 },
    });

    it('passes when value is within max length', () => {
      expect(validateFieldValue(field, 'ABCDE')).toBeUndefined();
    });

    it('returns error when value exceeds max length', () => {
      expect(validateFieldValue(field, 'ABCDEF')).toBe('Code cannot exceed 5 characters');
    });
  });

  describe('numeric min/max validation', () => {
    const field = createField({
      label: 'Age',
      validation: { min: 0, max: 150 },
    });

    it('passes when value is within range', () => {
      expect(validateFieldValue(field, 25)).toBeUndefined();
    });

    it('returns error when value is below min', () => {
      expect(validateFieldValue(field, -1)).toBe('Age must be at least 0');
    });

    it('returns error when value exceeds max', () => {
      expect(validateFieldValue(field, 151)).toBe('Age cannot exceed 150');
    });

    it('validates string numbers correctly', () => {
      expect(validateFieldValue(field, '200')).toBe('Age cannot exceed 150');
    });
  });

  describe('combined validations', () => {
    const field = createField({
      label: 'PIN',
      required: true,
      validation: { pattern: '^\\d+$', minLength: 4, maxLength: 6 },
    });

    it('fails required check first when empty', () => {
      expect(validateFieldValue(field, '')).toBe('PIN is required');
    });

    it('fails pattern before length', () => {
      expect(validateFieldValue(field, 'abcd')).toBe('PIN format is invalid');
    });

    it('fails minLength after pattern passes', () => {
      expect(validateFieldValue(field, '12')).toBe('PIN must be at least 4 characters');
    });

    it('passes when all validations are satisfied', () => {
      expect(validateFieldValue(field, '1234')).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('returns undefined when field has no validation rules and is not required', () => {
      const field = createField({ required: false });
      expect(validateFieldValue(field, 'anything')).toBeUndefined();
    });

    it('handles numeric zero as a valid value for required fields', () => {
      const field = createField({ required: true, label: 'Count' });
      // 0 is not empty string/null/undefined, so it should pass required check
      expect(validateFieldValue(field, 0)).toBeUndefined();
    });
  });
});
