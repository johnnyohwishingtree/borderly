/**
 * Tests for useFormStore
 *
 * Tests the Zustand store's core form operations: updateField, validateField,
 * validateForm, resetForm, clearErrors, setError, getFieldValue, isFieldValid,
 * getFormProgress, hasUnsavedChanges, generateForm.
 */

// ---------------------------------------------------------------------------
// Mock dependencies — must be declared before importing the store
// ---------------------------------------------------------------------------

const mockGenerateFilledForm = jest.fn();
const mockUpdateFormData = jest.fn();
const mockBatchAutoFill = jest.fn();
const mockValidateFormWithCrossChecks = jest.fn();
const mockValidateFormCompletion = jest.fn();
const mockSchemaCheckForUpdates = jest.fn();

jest.mock('../../src/services/forms/formEngine', () => ({
  generateFilledForm: (...args: unknown[]) => mockGenerateFilledForm(...args),
  updateFormData: (...args: unknown[]) => mockUpdateFormData(...args),
  validateFormCompletion: (...args: unknown[]) => mockValidateFormCompletion(...args),
}));

jest.mock('../../src/services/forms/autoFillLogic', () => ({
  batchAutoFill: (...args: unknown[]) => mockBatchAutoFill(...args),
}));

jest.mock('../../src/services/forms/validators', () => ({
  validateFormWithCrossChecks: (...args: unknown[]) => mockValidateFormWithCrossChecks(...args),
}));

jest.mock('../../src/services/schemas/schemaUpdateService', () => ({
  schemaUpdateService: {
    checkForUpdates: (...args: unknown[]) => mockSchemaCheckForUpdates(...args),
  },
}));

import { useFormStore } from '../../src/stores/useFormStore';
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useFormStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store to initial state
    useFormStore.getState().resetForm();

    mockValidateFormWithCrossChecks.mockReturnValue({
      errors: {},
      warnings: {},
      crossFieldErrors: [],
      isValid: true,
    });
    mockBatchAutoFill.mockReturnValue({});
    mockSchemaCheckForUpdates.mockResolvedValue(undefined);
  });

  // -----------------------------------------------------------------------
  // Initial state
  // -----------------------------------------------------------------------

  describe('initial state', () => {
    it('starts with null form and empty data', () => {
      const state = useFormStore.getState();
      expect(state.currentForm).toBeNull();
      expect(state.formData).toEqual({});
      expect(state.errors).toEqual({});
      expect(state.isValid).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // resetForm
  // -----------------------------------------------------------------------

  describe('resetForm', () => {
    it('clears all form state', () => {
      // Manually set some state first
      useFormStore.setState({
        currentForm: createForm(),
        formData: { field1: 'value' },
        errors: { field1: 'error' },
        isValid: true,
        isLoading: true,
      });

      useFormStore.getState().resetForm();
      const state = useFormStore.getState();

      expect(state.currentForm).toBeNull();
      expect(state.formData).toEqual({});
      expect(state.errors).toEqual({});
      expect(state.isValid).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // updateField
  // -----------------------------------------------------------------------

  describe('updateField', () => {
    it('does nothing when no current form', () => {
      useFormStore.getState().updateField('field1', 'value');

      expect(mockUpdateFormData).not.toHaveBeenCalled();
    });

    it('updates form data and validates', () => {
      const form = createForm();
      useFormStore.setState({ currentForm: form, formData: {} });

      mockUpdateFormData.mockReturnValue({ field1: 'new-value' });
      mockValidateFormWithCrossChecks.mockReturnValue({
        errors: {},
        warnings: {},
        crossFieldErrors: [],
        isValid: true,
      });

      useFormStore.getState().updateField('field1', 'new-value');

      expect(mockUpdateFormData).toHaveBeenCalledWith({}, 'field1', 'new-value');
      const state = useFormStore.getState();
      expect(state.formData).toEqual({ field1: 'new-value' });
      expect(state.isValid).toBe(true);
    });

    it('sets errors from validation result', () => {
      const form = createForm();
      useFormStore.setState({ currentForm: form, formData: {} });

      mockUpdateFormData.mockReturnValue({ field1: '' });
      mockValidateFormWithCrossChecks.mockReturnValue({
        errors: { field1: 'Required' },
        warnings: {},
        crossFieldErrors: [],
        isValid: false,
      });

      useFormStore.getState().updateField('field1', '');

      const state = useFormStore.getState();
      expect(state.errors).toEqual({ field1: 'Required' });
      expect(state.isValid).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // validateField
  // -----------------------------------------------------------------------

  describe('validateField', () => {
    it('returns undefined when no current form', () => {
      const result = useFormStore.getState().validateField('field1');
      expect(result).toBeUndefined();
    });

    it('returns undefined when field not found', () => {
      useFormStore.setState({ currentForm: createForm() });
      const result = useFormStore.getState().validateField('nonexistent');
      expect(result).toBeUndefined();
    });

    it('validates field value from formData', () => {
      const field = createField({ id: 'name', required: true, label: 'Name' });
      const form = createForm([field]);
      useFormStore.setState({ currentForm: form, formData: { name: '' } });

      const result = useFormStore.getState().validateField('name');
      expect(result).toBe('Name is required');
    });

    it('falls back to currentValue when formData has no entry', () => {
      const field = createField({ id: 'name', required: true, label: 'Name', currentValue: 'Auto' });
      const form = createForm([field]);
      useFormStore.setState({ currentForm: form, formData: {} });

      const result = useFormStore.getState().validateField('name');
      // 'Auto' is a non-empty value so validation passes
      expect(result).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // validateForm
  // -----------------------------------------------------------------------

  describe('validateForm', () => {
    it('returns false when no current form', () => {
      expect(useFormStore.getState().validateForm()).toBe(false);
    });

    it('delegates to validateFormWithCrossChecks and updates state', () => {
      const form = createForm();
      useFormStore.setState({ currentForm: form, formData: { field1: 'v' } });

      mockValidateFormWithCrossChecks.mockReturnValue({
        errors: { field1: 'bad' },
        warnings: {},
        crossFieldErrors: ['cross error'],
        isValid: false,
      });

      const result = useFormStore.getState().validateForm();
      expect(result).toBe(false);

      const state = useFormStore.getState();
      expect(state.errors).toEqual({ field1: 'bad' });
      expect(state.crossFieldErrors).toEqual(['cross error']);
    });
  });

  // -----------------------------------------------------------------------
  // clearErrors
  // -----------------------------------------------------------------------

  describe('clearErrors', () => {
    it('clears errors, warnings, and crossFieldErrors', () => {
      useFormStore.setState({
        errors: { f: 'e' },
        warnings: { f: ['w'] },
        crossFieldErrors: ['c'],
      });

      useFormStore.getState().clearErrors();
      const state = useFormStore.getState();

      expect(state.errors).toEqual({});
      expect(state.warnings).toEqual({});
      expect(state.crossFieldErrors).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // setError
  // -----------------------------------------------------------------------

  describe('setError', () => {
    it('sets error for a specific field and marks form as invalid', () => {
      useFormStore.setState({ isValid: true, errors: {} });

      useFormStore.getState().setError('field1', 'Something wrong');

      const state = useFormStore.getState();
      expect(state.errors.field1).toBe('Something wrong');
      expect(state.isValid).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // getFieldValue
  // -----------------------------------------------------------------------

  describe('getFieldValue', () => {
    it('returns value from formData if present', () => {
      useFormStore.setState({ formData: { field1: 'hello' } });
      expect(useFormStore.getState().getFieldValue('field1')).toBe('hello');
    });

    it('falls back to currentValue from form', () => {
      const field = createField({ id: 'field1', currentValue: 'auto-filled' });
      useFormStore.setState({ currentForm: createForm([field]), formData: {} });

      expect(useFormStore.getState().getFieldValue('field1')).toBe('auto-filled');
    });

    it('returns undefined when no form and no data', () => {
      useFormStore.setState({ currentForm: null, formData: {} });
      expect(useFormStore.getState().getFieldValue('field1')).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // isFieldValid
  // -----------------------------------------------------------------------

  describe('isFieldValid', () => {
    it('returns true when field has no error', () => {
      useFormStore.setState({ errors: {} });
      expect(useFormStore.getState().isFieldValid('field1')).toBe(true);
    });

    it('returns false when field has an error', () => {
      useFormStore.setState({ errors: { field1: 'bad' } });
      expect(useFormStore.getState().isFieldValid('field1')).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // getFormProgress
  // -----------------------------------------------------------------------

  describe('getFormProgress', () => {
    it('returns zeros when no form', () => {
      expect(useFormStore.getState().getFormProgress()).toEqual({
        completed: 0,
        total: 0,
        percentage: 0,
      });
    });

    it('computes progress from form stats', () => {
      const form = createForm();
      form.stats = { totalFields: 10, autoFilled: 5, userFilled: 2, remaining: 3, completionPercentage: 70 };
      useFormStore.setState({ currentForm: form });

      expect(useFormStore.getState().getFormProgress()).toEqual({
        completed: 7,
        total: 10,
        percentage: 70,
      });
    });
  });

  // -----------------------------------------------------------------------
  // hasUnsavedChanges
  // -----------------------------------------------------------------------

  describe('hasUnsavedChanges', () => {
    it('returns false when formData is empty', () => {
      useFormStore.setState({ formData: {} });
      expect(useFormStore.getState().hasUnsavedChanges()).toBe(false);
    });

    it('returns true when formData has entries', () => {
      useFormStore.setState({ formData: { field1: 'x' } });
      expect(useFormStore.getState().hasUnsavedChanges()).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // generateForm
  // -----------------------------------------------------------------------

  describe('generateForm', () => {
    const mockProfile = { id: 'p1' } as any;
    const mockLeg = { id: 'l1' } as any;
    const mockSchema = { countryCode: 'JPN' } as any;

    it('generates form and sets state', () => {
      const form = createForm();
      mockGenerateFilledForm.mockReturnValue(form);

      useFormStore.getState().generateForm(mockProfile, mockLeg, mockSchema);

      const state = useFormStore.getState();
      expect(state.currentForm).toBe(form);
      expect(state.isLoading).toBe(false);
      expect(mockGenerateFilledForm).toHaveBeenCalledWith(mockProfile, mockLeg, mockSchema, {});
    });

    it('uses existing data when provided', () => {
      const form = createForm();
      mockGenerateFilledForm.mockReturnValue(form);

      useFormStore.getState().generateForm(mockProfile, mockLeg, mockSchema, { field1: 'existing' });

      expect(mockGenerateFilledForm).toHaveBeenCalledWith(mockProfile, mockLeg, mockSchema, { field1: 'existing' });
    });

    it('resets state on error', () => {
      mockGenerateFilledForm.mockImplementation(() => { throw new Error('fail'); });

      useFormStore.getState().generateForm(mockProfile, mockLeg, mockSchema);

      const state = useFormStore.getState();
      expect(state.currentForm).toBeNull();
      expect(state.formData).toEqual({});
      expect(state.isLoading).toBe(false);
    });

    it('applies auto-fill when enabled', () => {
      const field = createField({ id: 'f1' });
      const form = createForm([field]);
      mockGenerateFilledForm.mockReturnValue(form);
      mockBatchAutoFill.mockReturnValue({
        f1: { value: 'auto-value', confidence: 1 },
      });

      useFormStore.getState().generateForm(mockProfile, mockLeg, mockSchema);

      const state = useFormStore.getState();
      expect(state.formData).toHaveProperty('f1', 'auto-value');
    });

    it('does not overwrite existing data with auto-fill', () => {
      const field = createField({ id: 'f1' });
      const form = createForm([field]);
      mockGenerateFilledForm.mockReturnValue(form);
      mockBatchAutoFill.mockReturnValue({
        f1: { value: 'auto-value', confidence: 1 },
      });

      useFormStore.getState().generateForm(mockProfile, mockLeg, mockSchema, { f1: 'user-value' });

      const state = useFormStore.getState();
      expect(state.formData).toHaveProperty('f1', 'user-value');
    });
  });
});
