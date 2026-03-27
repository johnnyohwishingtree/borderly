/**
 * Tests for formStoreMemorySlice: createMemorySlice
 */

import { createMemorySlice } from '../../src/stores/formStoreMemorySlice';
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
    isLoading: false,
    memoryUsage: { formDataSize: 0, lastCleanup: 0, maxRetainedForms: 3 },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createMemorySlice', () => {
  let set: jest.Mock;
  let get: jest.Mock;
  let storeState: Partial<FormStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    storeState = createStoreState();

    set = jest.fn((partial) => {
      if (typeof partial === 'function') {
        const updates = partial(storeState as FormStore);
        Object.assign(storeState, updates);
      } else {
        Object.assign(storeState, partial);
      }
    });

    get = jest.fn(() => storeState as FormStore);
  });

  // -----------------------------------------------------------------------
  // performMemoryCleanup
  // -----------------------------------------------------------------------

  describe('performMemoryCleanup', () => {
    it('truncates string values longer than 1000 characters', () => {
      const longValue = 'x'.repeat(1500);
      storeState = createStoreState({ formData: { field1: longValue } });
      get.mockReturnValue(storeState);

      const slice = createMemorySlice(set, get);
      slice.performMemoryCleanup();

      expect(set).toHaveBeenCalledTimes(1);
      const setArg = set.mock.calls[0][0];
      expect(setArg.formData.field1).toBe('x'.repeat(100) + '...');
    });

    it('preserves short string values unchanged', () => {
      storeState = createStoreState({ formData: { field1: 'short' } });
      get.mockReturnValue(storeState);

      const slice = createMemorySlice(set, get);
      slice.performMemoryCleanup();

      const setArg = set.mock.calls[0][0];
      expect(setArg.formData.field1).toBe('short');
    });

    it('cleans errors and warnings to only include current form fields', () => {
      const fields = [createField({ id: 'f1' }), createField({ id: 'f2' })];
      storeState = createStoreState({
        currentForm: createForm(fields),
        errors: { f1: 'error1', orphan: 'stale error' },
        warnings: { f1: ['warn1'], orphan: ['stale warning'] },
      });
      get.mockReturnValue(storeState);

      const slice = createMemorySlice(set, get);
      slice.performMemoryCleanup();

      const setArg = set.mock.calls[0][0];
      expect(setArg.errors).toEqual({ f1: 'error1' });
      expect(setArg.warnings).toEqual({ f1: ['warn1'] });
    });

    it('sets empty errors/warnings when no currentForm', () => {
      storeState = createStoreState({
        currentForm: null,
        errors: { old: 'err' },
        warnings: { old: ['warn'] },
      });
      get.mockReturnValue(storeState);

      const slice = createMemorySlice(set, get);
      slice.performMemoryCleanup();

      const setArg = set.mock.calls[0][0];
      expect(setArg.errors).toEqual({});
      expect(setArg.warnings).toEqual({});
    });

    it('updates memoryUsage with lastCleanup timestamp and formDataSize', () => {
      const before = Date.now();
      storeState = createStoreState({ formData: { a: 'value' } });
      get.mockReturnValue(storeState);

      const slice = createMemorySlice(set, get);
      slice.performMemoryCleanup();

      const setArg = set.mock.calls[0][0];
      expect(setArg.memoryUsage.lastCleanup).toBeGreaterThanOrEqual(before);
      expect(setArg.memoryUsage.formDataSize).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------------
  // getMemoryUsage
  // -----------------------------------------------------------------------

  describe('getMemoryUsage', () => {
    it('returns a copy of memoryUsage state', () => {
      const slice = createMemorySlice(set, get);
      const result = slice.getMemoryUsage();

      expect(result).toEqual({ formDataSize: 0, lastCleanup: 0, maxRetainedForms: 3 });
      // Should be a copy, not the same reference
      expect(result).not.toBe(storeState.memoryUsage);
    });
  });

  // -----------------------------------------------------------------------
  // clearFormHistory
  // -----------------------------------------------------------------------

  describe('clearFormHistory', () => {
    it('resets all form state to initial values', () => {
      storeState = createStoreState({
        currentForm: createForm(),
        formData: { field1: 'value' },
        errors: { field1: 'error' },
        warnings: { field1: ['warn'] },
        crossFieldErrors: ['cross-error'],
        isValid: true,
      });
      get.mockReturnValue(storeState);

      const slice = createMemorySlice(set, get);
      slice.clearFormHistory();

      expect(set).toHaveBeenCalledWith(expect.objectContaining({
        currentForm: null,
        formData: {},
        errors: {},
        warnings: {},
        crossFieldErrors: [],
        isValid: false,
      }));
    });

    it('resets memoryUsage with zero formDataSize', () => {
      const slice = createMemorySlice(set, get);
      slice.clearFormHistory();

      const setArg = set.mock.calls[0][0];
      expect(setArg.memoryUsage.formDataSize).toBe(0);
      expect(setArg.memoryUsage.maxRetainedForms).toBe(3);
    });
  });

  // -----------------------------------------------------------------------
  // optimizeFormData
  // -----------------------------------------------------------------------

  describe('optimizeFormData', () => {
    it('removes empty, null, and undefined values from formData', () => {
      storeState = createStoreState({
        formData: { a: 'value', b: '', c: null, d: undefined, e: 42 },
      });
      get.mockReturnValue(storeState);

      const slice = createMemorySlice(set, get);
      slice.optimizeFormData();

      const setArg = set.mock.calls[0][0];
      expect(setArg.formData).toEqual({ a: 'value', e: 42 });
    });

    it('leaves formData and memoryUsage unchanged when currentForm is null', () => {
      storeState = createStoreState({ currentForm: null, formData: { a: 'val' } });
      get.mockReturnValue(storeState);
      const originalFormData = { ...storeState.formData };
      const originalMemoryUsage = { ...storeState.memoryUsage };

      const slice = createMemorySlice(set, get);
      slice.optimizeFormData();

      expect(storeState.formData).toEqual(originalFormData);
      expect(storeState.memoryUsage).toEqual(originalMemoryUsage);
    });

    it('leaves formData and memoryUsage unchanged when formData is empty', () => {
      storeState = createStoreState({ formData: {} });
      get.mockReturnValue(storeState);
      const originalMemoryUsage = { ...storeState.memoryUsage };

      const slice = createMemorySlice(set, get);
      slice.optimizeFormData();

      expect(storeState.formData).toEqual({});
      expect(storeState.memoryUsage).toEqual(originalMemoryUsage);
    });

    it('updates memoryUsage.formDataSize after optimization', () => {
      storeState = createStoreState({ formData: { a: 'hello' } });
      get.mockReturnValue(storeState);

      const slice = createMemorySlice(set, get);
      slice.optimizeFormData();

      const setArg = set.mock.calls[0][0];
      expect(setArg.memoryUsage.formDataSize).toBe(JSON.stringify({ a: 'hello' }).length);
    });
  });
});
