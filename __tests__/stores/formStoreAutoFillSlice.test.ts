/**
 * Tests for formStoreAutoFillSlice: createAutoFillSlice
 */

const mockBatchAutoFill = jest.fn();

jest.mock('../../src/services/forms/autoFillLogic', () => ({
  batchAutoFill: (...args: unknown[]) => mockBatchAutoFill(...args),
}));

import { createAutoFillSlice } from '../../src/stores/formStoreAutoFillSlice';
import type { FormStore } from '../../src/stores/useFormStoreTypes';
import type { FilledForm, FilledFormField } from '../../src/services/forms/formEngine';
import type { TravelerProfile } from '../../src/types/profile';
import type { TripLeg } from '../../src/types/trip';

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

function createStoreState(overrides: Partial<FormStore> = {}): FormStore {
  return {
    currentForm: createForm(),
    formData: {},
    errors: {},
    warnings: {},
    crossFieldErrors: [],
    isValid: false,
    isLoading: false,
    autoFillOptions: {
      enableSmartDefaults: true,
      enableFallbacks: true,
      confidenceThreshold: 0.7,
    },
    memoryUsage: { formDataSize: 0, lastCleanup: 0, maxRetainedForms: 3 },
    generateForm: jest.fn(),
    updateField: jest.fn(),
    validateField: jest.fn(),
    validateForm: jest.fn(),
    resetForm: jest.fn(),
    clearErrors: jest.fn(),
    setError: jest.fn(),
    enableSmartAutoFill: jest.fn(),
    updateAutoFillOptions: jest.fn(),
    getAutoFillSuggestion: jest.fn().mockReturnValue(undefined),
    applyAutoFillSuggestion: jest.fn(),
    batchAutoFillForm: jest.fn(),
    getFormData: jest.fn(),
    getFieldValue: jest.fn(),
    isFieldValid: jest.fn(),
    getFormProgress: jest.fn(),
    getFieldWarnings: jest.fn(),
    getCrossFieldErrors: jest.fn(),
    getValidationSummary: jest.fn(),
    hasUnsavedChanges: jest.fn(),
    getCountrySpecificFields: jest.fn(),
    getRequiredFields: jest.fn(),
    getMissingRequiredFields: jest.fn(),
    getAutoFillableFields: jest.fn(),
    getFormCompletionDetails: jest.fn(),
    performMemoryCleanup: jest.fn(),
    getMemoryUsage: jest.fn(),
    clearFormHistory: jest.fn(),
    optimizeFormData: jest.fn(),
    ...overrides,
  } as FormStore;
}

function createProfile(): TravelerProfile {
  return {
    id: 'profile-1',
    surname: 'Doe',
    givenNames: 'John',
    nationality: 'USA',
    dateOfBirth: '1990-01-01',
    passportNumber: 'AB123456',
    passportExpiry: '2030-01-01',
    issuingCountry: 'USA',
    gender: 'M',
    defaultDeclarations: {
      hasItemsToDeclare: false,
      carryingCurrency: false,
      carryingProhibitedItems: false,
      visitedFarm: false,
      hasCriminalRecord: false,
      carryingCommercialGoods: false,
    },
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  };
}

function createLeg(): TripLeg {
  return {
    id: 'leg-1',
    tripId: 'trip-1',
    destinationCountry: 'JPN',
    arrivalDate: '2025-07-01',
    accommodation: {
      name: 'Hotel',
      address: { line1: '1-1', city: 'Tokyo', postalCode: '100', country: 'JPN' },
    },
    formStatus: 'not_started',
    submissionStatus: 'not_started',
    order: 0,
    assignedTravelers: [],
    travelerFormsData: [],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createAutoFillSlice', () => {
  let set: jest.Mock;
  let get: jest.Mock;
  let storeState: FormStore;

  beforeEach(() => {
    jest.clearAllMocks();
    storeState = createStoreState();
    set = jest.fn((partial) => {
      if (typeof partial === 'function') {
        const updates = partial(storeState);
        Object.assign(storeState, updates);
      } else {
        Object.assign(storeState, partial);
      }
    });
    get = jest.fn(() => storeState);
  });

  // -----------------------------------------------------------------------
  // enableSmartAutoFill
  // -----------------------------------------------------------------------

  describe('enableSmartAutoFill', () => {
    it('calls batchAutoFill and updates formData with high-confidence results', () => {
      mockBatchAutoFill.mockReturnValue({
        field1: { value: 'John', confidence: 0.9 },
      });

      const slice = createAutoFillSlice(set, get);
      slice.enableSmartAutoFill(createProfile(), createLeg());

      expect(mockBatchAutoFill).toHaveBeenCalledTimes(1);
      expect(set).toHaveBeenCalledWith({ formData: { field1: 'John' } });
    });

    it('skips fields below confidence threshold', () => {
      mockBatchAutoFill.mockReturnValue({
        field1: { value: 'John', confidence: 0.3 },
      });

      const slice = createAutoFillSlice(set, get);
      slice.enableSmartAutoFill(createProfile(), createLeg());

      expect(set).toHaveBeenCalledWith({ formData: {} });
    });

    it('does nothing if currentForm is null', () => {
      storeState = createStoreState({ currentForm: null });
      get.mockReturnValue(storeState);

      const slice = createAutoFillSlice(set, get);
      slice.enableSmartAutoFill(createProfile(), createLeg());

      expect(mockBatchAutoFill).not.toHaveBeenCalled();
      expect(set).not.toHaveBeenCalled();
    });

    it('preserves existing formData and adds auto-filled values', () => {
      storeState = createStoreState({ formData: { existing: 'value' } });
      get.mockReturnValue(storeState);

      mockBatchAutoFill.mockReturnValue({
        field1: { value: 'auto', confidence: 0.9 },
      });

      const slice = createAutoFillSlice(set, get);
      slice.enableSmartAutoFill(createProfile(), createLeg());

      expect(set).toHaveBeenCalledWith({
        formData: { existing: 'value', field1: 'auto' },
      });
    });
  });

  // -----------------------------------------------------------------------
  // updateAutoFillOptions
  // -----------------------------------------------------------------------

  describe('updateAutoFillOptions', () => {
    it('merges partial options into existing autoFillOptions', () => {
      const slice = createAutoFillSlice(set, get);
      slice.updateAutoFillOptions({ confidenceThreshold: 0.5 });

      expect(set).toHaveBeenCalledWith(expect.any(Function));
      // Execute the functional updater to verify merge
      const updater = set.mock.calls[0][0];
      const result = updater(storeState);
      expect(result.autoFillOptions).toEqual({
        enableSmartDefaults: true,
        enableFallbacks: true,
        confidenceThreshold: 0.5,
      });
    });

    it('does not overwrite unrelated options', () => {
      const slice = createAutoFillSlice(set, get);
      slice.updateAutoFillOptions({ enableFallbacks: false });

      const updater = set.mock.calls[0][0];
      const result = updater(storeState);
      expect(result.autoFillOptions.enableSmartDefaults).toBe(true);
      expect(result.autoFillOptions.confidenceThreshold).toBe(0.7);
    });
  });

  // -----------------------------------------------------------------------
  // getAutoFillSuggestion
  // -----------------------------------------------------------------------

  describe('getAutoFillSuggestion', () => {
    it('returns undefined when currentForm is null', () => {
      storeState = createStoreState({ currentForm: null });
      get.mockReturnValue(storeState);

      const slice = createAutoFillSlice(set, get);
      expect(slice.getAutoFillSuggestion('field1')).toBeUndefined();
    });

    it('returns undefined when field does not exist', () => {
      const slice = createAutoFillSlice(set, get);
      expect(slice.getAutoFillSuggestion('nonexistent')).toBeUndefined();
    });

    it('returns undefined for existing field (placeholder implementation)', () => {
      const slice = createAutoFillSlice(set, get);
      expect(slice.getAutoFillSuggestion('field1')).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // applyAutoFillSuggestion
  // -----------------------------------------------------------------------

  describe('applyAutoFillSuggestion', () => {
    it('returns false when no suggestion is available', () => {
      storeState.getAutoFillSuggestion = jest.fn().mockReturnValue(undefined);
      get.mockReturnValue(storeState);

      const slice = createAutoFillSlice(set, get);
      expect(slice.applyAutoFillSuggestion('field1')).toBe(false);
    });

    it('applies suggestion and returns true when suggestion exists', () => {
      const mockUpdateField = jest.fn();
      storeState.getAutoFillSuggestion = jest.fn().mockReturnValue('suggested-value');
      storeState.updateField = mockUpdateField;
      get.mockReturnValue(storeState);

      const slice = createAutoFillSlice(set, get);
      expect(slice.applyAutoFillSuggestion('field1')).toBe(true);
      expect(mockUpdateField).toHaveBeenCalledWith('field1', 'suggested-value');
    });
  });

  // -----------------------------------------------------------------------
  // batchAutoFillForm
  // -----------------------------------------------------------------------

  describe('batchAutoFillForm', () => {
    it('does nothing when currentForm is null', () => {
      storeState = createStoreState({ currentForm: null });
      get.mockReturnValue(storeState);

      const slice = createAutoFillSlice(set, get);
      slice.batchAutoFillForm();

      expect(set).not.toHaveBeenCalled();
    });

    it('does not throw when currentForm exists', () => {
      const slice = createAutoFillSlice(set, get);
      expect(() => slice.batchAutoFillForm()).not.toThrow();
    });
  });
});
