import { create } from 'zustand';
import { generateFilledForm, updateFormData } from '../services/forms/formEngine';
import { batchAutoFill } from '../services/forms/autoFillLogic';
import { validateFormWithCrossChecks } from '../services/forms/validators';
import { findFieldInForm, validateFieldValue } from './formStoreHelpers';
import { schemaUpdateService } from '../services/schemas/schemaUpdateService';
import type { FormStore } from './useFormStoreTypes';
import { createAutoFillSlice } from './formStoreAutoFillSlice';
import { createMemorySlice } from './formStoreMemorySlice';
import { createValidationSlice } from './formStoreValidationSlice';

export type { FormStore } from './useFormStoreTypes';

export const useFormStore = create<FormStore>((set, get) => ({
  // Initial state
  currentForm: null,
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
  memoryUsage: {
    formDataSize: 0,
    lastCleanup: Date.now(),
    maxRetainedForms: 3,
  },

  generateForm: (profile, leg, schema, existingData = {}) => {
    set({ isLoading: true });

    schemaUpdateService.checkForUpdates().catch(() => {});

    try {
      const state = get();

      if (Date.now() - state.memoryUsage.lastCleanup > 300000) {
        state.performMemoryCleanup();
      }

      const form = generateFilledForm(profile, leg, schema, existingData);

      let enhancedFormData = { ...existingData };
      if (state.autoFillOptions.enableSmartDefaults) {
        const allFields = form.sections.flatMap(section => section.fields);
        const autoFillResults = batchAutoFill(allFields, { profile, leg }, state.autoFillOptions);

        Object.entries(autoFillResults).forEach(([fieldId, result]) => {
          if (!enhancedFormData[fieldId] && result.value !== undefined) {
            enhancedFormData[fieldId] = result.value;
          }
        });
      }

      const allFields = form.sections.flatMap(section => section.fields);
      const validationResult = validateFormWithCrossChecks(allFields, enhancedFormData, {
        countryCode: schema.countryCode,
        profileData: profile,
      });

      const formDataSize = JSON.stringify(enhancedFormData).length;

      set({
        currentForm: form,
        formData: enhancedFormData,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        crossFieldErrors: validationResult.crossFieldErrors,
        isValid: validationResult.isValid,
        isLoading: false,
        memoryUsage: {
          ...state.memoryUsage,
          formDataSize,
        },
      });
    } catch (error) {
      console.error('Failed to generate form:', error);
      set({
        currentForm: null,
        formData: {},
        errors: {},
        warnings: {},
        crossFieldErrors: [],
        isValid: false,
        isLoading: false,
      });
    }
  },

  updateField: (fieldId, value) => {
    const state = get();
    if (!state.currentForm) {return;}

    const updatedData = updateFormData(state.formData, fieldId, value);

    const allFields = state.currentForm.sections.flatMap(section => section.fields);
    const validationResult = validateFormWithCrossChecks(allFields, updatedData, {
      countryCode: state.currentForm.countryCode,
    });

    set({
      formData: updatedData,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      crossFieldErrors: validationResult.crossFieldErrors,
      isValid: validationResult.isValid,
    });
  },

  validateField: (fieldId) => {
    const state = get();
    if (!state.currentForm) {return undefined;}

    const field = findFieldInForm(state.currentForm, fieldId);
    if (!field) {return undefined;}

    const value = state.formData[fieldId] ?? field.currentValue;
    return validateFieldValue(field, value);
  },

  validateForm: () => {
    const state = get();
    if (!state.currentForm) {return false;}

    const allFields = state.currentForm.sections.flatMap(section => section.fields);
    const validationResult = validateFormWithCrossChecks(allFields, state.formData, {
      countryCode: state.currentForm.countryCode,
    });

    set({
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      crossFieldErrors: validationResult.crossFieldErrors,
      isValid: validationResult.isValid,
    });

    return validationResult.isValid;
  },

  resetForm: () => {
    set({
      currentForm: null,
      formData: {},
      errors: {},
      warnings: {},
      crossFieldErrors: [],
      isValid: false,
      isLoading: false,
    });
  },

  clearErrors: () => {
    set({ errors: {}, warnings: {}, crossFieldErrors: [] });
  },

  setError: (fieldId, error) => {
    set(state => ({
      errors: { ...state.errors, [fieldId]: error },
      isValid: false,
    }));
  },

  getFormData: () => {
    return get().formData;
  },

  getFieldValue: (fieldId) => {
    const state = get();
    if (state.formData[fieldId] !== undefined) {
      return state.formData[fieldId];
    }

    if (state.currentForm) {
      const field = findFieldInForm(state.currentForm, fieldId);
      return field?.currentValue;
    }

    return undefined;
  },

  isFieldValid: (fieldId) => {
    const state = get();
    return !state.errors[fieldId];
  },

  getFormProgress: () => {
    const state = get();
    if (!state.currentForm) {
      return { completed: 0, total: 0, percentage: 0 };
    }

    const stats = state.currentForm.stats;
    return {
      completed: stats.autoFilled + stats.userFilled,
      total: stats.totalFields,
      percentage: stats.completionPercentage,
    };
  },

  hasUnsavedChanges: () => {
    const state = get();
    return Object.keys(state.formData).length > 0;
  },

  // Auto-fill operations (delegated to slice)
  ...createAutoFillSlice(set, get),

  // Memory management (delegated to slice)
  ...createMemorySlice(set, get),

  // Validation reporting (delegated to slice)
  ...createValidationSlice(set, get),
}));
