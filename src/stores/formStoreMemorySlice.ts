import type { FormStore } from './useFormStoreTypes';

type Set = (
  partial:
    | Partial<FormStore>
    | ((state: FormStore) => Partial<FormStore>),
) => void;
type Get = () => FormStore;

export function createMemorySlice(set: Set, get: Get) {
  return {
    performMemoryCleanup: () => {
      const state = get();

      const optimizedFormData = { ...state.formData };

      Object.keys(optimizedFormData).forEach(key => {
        const value = optimizedFormData[key];
        if (typeof value === 'string' && value.length > 1000) {
          optimizedFormData[key] = value.substring(0, 100) + '...';
        }
      });

      const cleanedErrors: Record<string, string> = {};
      const cleanedWarnings: Record<string, string[]> = {};

      if (state.currentForm) {
        const allFieldIds = state.currentForm.sections.flatMap(section =>
          section.fields.map(field => field.id)
        );

        allFieldIds.forEach(fieldId => {
          if (state.errors[fieldId]) {
            cleanedErrors[fieldId] = state.errors[fieldId];
          }
          if (state.warnings[fieldId]) {
            cleanedWarnings[fieldId] = state.warnings[fieldId];
          }
        });
      }

      set({
        formData: optimizedFormData,
        errors: cleanedErrors,
        warnings: cleanedWarnings,
        memoryUsage: {
          ...state.memoryUsage,
          lastCleanup: Date.now(),
          formDataSize: JSON.stringify(optimizedFormData).length,
        },
      });

      if (__DEV__ && (globalThis as any).gc) {
        (globalThis as any).gc();
      }
    },

    getMemoryUsage: () => {
      const state = get();
      return { ...state.memoryUsage };
    },

    clearFormHistory: () => {
      set({
        currentForm: null,
        formData: {},
        errors: {},
        warnings: {},
        crossFieldErrors: [],
        isValid: false,
        memoryUsage: {
          formDataSize: 0,
          lastCleanup: Date.now(),
          maxRetainedForms: 3,
        },
      });
    },

    optimizeFormData: () => {
      const state = get();
      if (!state.currentForm || Object.keys(state.formData).length === 0) {
        return;
      }

      const optimizedData: Record<string, unknown> = {};
      Object.entries(state.formData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          optimizedData[key] = value;
        }
      });

      const newSize = JSON.stringify(optimizedData).length;

      set({
        formData: optimizedData,
        memoryUsage: {
          ...state.memoryUsage,
          formDataSize: newSize,
        },
      });
    },
  };
}
