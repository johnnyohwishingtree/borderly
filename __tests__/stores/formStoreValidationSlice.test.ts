/**
 * Tests for formStoreValidationSlice: createValidationSlice
 */

const mockValidateFormCompletion = jest.fn();

jest.mock('../../src/services/forms/formEngine', () => ({
  validateFormCompletion: (...args: unknown[]) => mockValidateFormCompletion(...args),
}));

import { createValidationSlice } from '../../src/stores/formStoreValidationSlice';
import type { FormStore } from '../../src/stores/useFormStoreTypes';
import type { FilledForm, FilledFormField } from '../../src/services/forms/formEngine';

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function createField(overrides: Partial<FilledFormField> = {}): FilledFormField {
  return {
    id: 'field1',
    label: 'Field 1',
    type: 'text',
    required: false,
    countrySpecific: false,
    currentValue: undefined,
    source: 'empty',
    needsUserInput: true,
    ...overrides,
  };
}

function createForm(fields: FilledFormField[] = [createField()]): FilledForm {
  return {
    countryCode: 'JPN',
    countryName: 'Japan',
    portalName: 'Visit Japan Web',
    portalUrl: 'https://vjw.digital.go.jp',
    sections: [{ id: 'section1', title: 'Section 1', fields }],
    stats: {
      totalFields: fields.length,
      autoFilled: 0,
      userFilled: 0,
      remaining: fields.length,
      completionPercentage: 0,
    },
  };
}

function createStoreState(overrides: Partial<FormStore> = {}): Partial<FormStore> {
  return {
    currentForm: createForm(),
    formData: {},
    errors: {},
    warnings: {},
    crossFieldErrors: [],
    isValid: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createValidationSlice', () => {
  let set: jest.Mock;
  let get: jest.Mock;
  let storeState: Partial<FormStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    storeState = createStoreState();

    set = jest.fn();
    get = jest.fn(() => storeState as FormStore);
  });

  // -----------------------------------------------------------------------
  // getFieldWarnings
  // -----------------------------------------------------------------------

  describe('getFieldWarnings', () => {
    it('returns warnings for a field that has them', () => {
      storeState = createStoreState({
        warnings: { field1: ['warn1', 'warn2'] },
      });
      get.mockReturnValue(storeState);

      const slice = createValidationSlice(set, get);
      expect(slice.getFieldWarnings('field1')).toEqual(['warn1', 'warn2']);
    });

    it('returns empty array for field with no warnings', () => {
      const slice = createValidationSlice(set, get);
      expect(slice.getFieldWarnings('nonexistent')).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // getCrossFieldErrors
  // -----------------------------------------------------------------------

  describe('getCrossFieldErrors', () => {
    it('returns cross-field errors from state', () => {
      storeState = createStoreState({
        crossFieldErrors: ['Dates overlap', 'Passport expired'],
      });
      get.mockReturnValue(storeState);

      const slice = createValidationSlice(set, get);
      expect(slice.getCrossFieldErrors()).toEqual(['Dates overlap', 'Passport expired']);
    });

    it('returns empty array when no cross-field errors', () => {
      const slice = createValidationSlice(set, get);
      expect(slice.getCrossFieldErrors()).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // getValidationSummary
  // -----------------------------------------------------------------------

  describe('getValidationSummary', () => {
    it('reports no errors or warnings when state is clean', () => {
      const slice = createValidationSlice(set, get);
      const summary = slice.getValidationSummary();

      expect(summary).toEqual({
        hasErrors: false,
        hasWarnings: false,
        errorCount: 0,
        warningCount: 0,
      });
    });

    it('counts field errors and cross-field errors together', () => {
      storeState = createStoreState({
        errors: { f1: 'err1', f2: 'err2' },
        crossFieldErrors: ['cross1'],
      });
      get.mockReturnValue(storeState);

      const slice = createValidationSlice(set, get);
      const summary = slice.getValidationSummary();

      expect(summary.hasErrors).toBe(true);
      expect(summary.errorCount).toBe(3); // 2 field + 1 cross-field
    });

    it('counts total warnings across all fields', () => {
      storeState = createStoreState({
        warnings: { f1: ['w1', 'w2'], f2: ['w3'] },
      });
      get.mockReturnValue(storeState);

      const slice = createValidationSlice(set, get);
      const summary = slice.getValidationSummary();

      expect(summary.hasWarnings).toBe(true);
      expect(summary.warningCount).toBe(3);
    });

    it('treats cross-field errors alone as hasErrors', () => {
      storeState = createStoreState({
        errors: {},
        crossFieldErrors: ['cross1'],
      });
      get.mockReturnValue(storeState);

      const slice = createValidationSlice(set, get);
      expect(slice.getValidationSummary().hasErrors).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // getCountrySpecificFields
  // -----------------------------------------------------------------------

  describe('getCountrySpecificFields', () => {
    it('returns IDs of country-specific fields', () => {
      const fields = [
        createField({ id: 'f1', countrySpecific: true }),
        createField({ id: 'f2', countrySpecific: false }),
        createField({ id: 'f3', countrySpecific: true }),
      ];
      storeState = createStoreState({ currentForm: createForm(fields) });
      get.mockReturnValue(storeState);

      const slice = createValidationSlice(set, get);
      expect(slice.getCountrySpecificFields()).toEqual(['f1', 'f3']);
    });

    it('returns empty array when no currentForm', () => {
      storeState = createStoreState({ currentForm: null });
      get.mockReturnValue(storeState);

      const slice = createValidationSlice(set, get);
      expect(slice.getCountrySpecificFields()).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // getRequiredFields
  // -----------------------------------------------------------------------

  describe('getRequiredFields', () => {
    it('returns IDs of required fields', () => {
      const fields = [
        createField({ id: 'f1', required: true }),
        createField({ id: 'f2', required: false }),
        createField({ id: 'f3', required: true }),
      ];
      storeState = createStoreState({ currentForm: createForm(fields) });
      get.mockReturnValue(storeState);

      const slice = createValidationSlice(set, get);
      expect(slice.getRequiredFields()).toEqual(['f1', 'f3']);
    });

    it('returns empty array when no currentForm', () => {
      storeState = createStoreState({ currentForm: null });
      get.mockReturnValue(storeState);

      const slice = createValidationSlice(set, get);
      expect(slice.getRequiredFields()).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // getMissingRequiredFields
  // -----------------------------------------------------------------------

  describe('getMissingRequiredFields', () => {
    it('delegates to validateFormCompletion and returns missingFields', () => {
      mockValidateFormCompletion.mockReturnValue({
        isComplete: false,
        missingFields: ['f1', 'f3'],
      });

      const slice = createValidationSlice(set, get);
      expect(slice.getMissingRequiredFields()).toEqual(['f1', 'f3']);
      expect(mockValidateFormCompletion).toHaveBeenCalledWith(storeState.currentForm);
    });

    it('returns empty array when no currentForm', () => {
      storeState = createStoreState({ currentForm: null });
      get.mockReturnValue(storeState);

      const slice = createValidationSlice(set, get);
      expect(slice.getMissingRequiredFields()).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // getAutoFillableFields
  // -----------------------------------------------------------------------

  describe('getAutoFillableFields', () => {
    it('returns fields with autoFillSource', () => {
      const fields = [
        createField({ id: 'f1', autoFillSource: 'passport.number' } as any),
        createField({ id: 'f2' }),
      ];
      storeState = createStoreState({ currentForm: createForm(fields) });
      get.mockReturnValue(storeState);

      const slice = createValidationSlice(set, get);
      expect(slice.getAutoFillableFields()).toContain('f1');
    });

    it('returns fields with countrySpecific === false', () => {
      const fields = [
        createField({ id: 'f1', countrySpecific: false }),
        createField({ id: 'f2', countrySpecific: true }),
      ];
      storeState = createStoreState({ currentForm: createForm(fields) });
      get.mockReturnValue(storeState);

      const slice = createValidationSlice(set, get);
      expect(slice.getAutoFillableFields()).toContain('f1');
      expect(slice.getAutoFillableFields()).not.toContain('f2');
    });

    it('returns empty array when no currentForm', () => {
      storeState = createStoreState({ currentForm: null });
      get.mockReturnValue(storeState);

      const slice = createValidationSlice(set, get);
      expect(slice.getAutoFillableFields()).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // getFormCompletionDetails
  // -----------------------------------------------------------------------

  describe('getFormCompletionDetails', () => {
    it('returns zeros when no currentForm', () => {
      storeState = createStoreState({ currentForm: null });
      get.mockReturnValue(storeState);

      const slice = createValidationSlice(set, get);
      expect(slice.getFormCompletionDetails()).toEqual({
        totalFields: 0,
        completedFields: 0,
        autoFilledFields: 0,
        userFilledFields: 0,
        remainingFields: 0,
      });
    });

    it('computes details from form stats', () => {
      const form = createForm();
      form.stats = {
        totalFields: 10,
        autoFilled: 3,
        userFilled: 4,
        remaining: 3,
        completionPercentage: 70,
      };
      storeState = createStoreState({ currentForm: form });
      get.mockReturnValue(storeState);

      const slice = createValidationSlice(set, get);
      expect(slice.getFormCompletionDetails()).toEqual({
        totalFields: 10,
        completedFields: 7,
        autoFilledFields: 3,
        userFilledFields: 4,
        remainingFields: 3,
      });
    });
  });
});
