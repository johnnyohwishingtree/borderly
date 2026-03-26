import { validateFormCompletion } from '../services/forms/formEngine';
import type { FormStore } from './useFormStoreTypes';

type Set = (
  partial:
    | Partial<FormStore>
    | ((state: FormStore) => Partial<FormStore>),
) => void;
type Get = () => FormStore;

export function createValidationSlice(_set: Set, get: Get) {
  return {
    getFieldWarnings: (fieldId: string) => {
      const state = get();
      return state.warnings[fieldId] || [];
    },

    getCrossFieldErrors: () => {
      const state = get();
      return state.crossFieldErrors;
    },

    getValidationSummary: () => {
      const state = get();
      const errorCount = Object.keys(state.errors).length;
      const warningCount = Object.values(state.warnings).reduce((count, warnings) => count + warnings.length, 0);
      const crossFieldErrorCount = state.crossFieldErrors.length;

      return {
        hasErrors: errorCount > 0 || crossFieldErrorCount > 0,
        hasWarnings: warningCount > 0,
        errorCount: errorCount + crossFieldErrorCount,
        warningCount,
      };
    },

    getCountrySpecificFields: () => {
      const state = get();
      if (!state.currentForm) {return [];}

      const countrySpecificFields: string[] = [];
      state.currentForm.sections.forEach(section => {
        section.fields.forEach(field => {
          if (field.countrySpecific) {
            countrySpecificFields.push(field.id);
          }
        });
      });

      return countrySpecificFields;
    },

    getRequiredFields: () => {
      const state = get();
      if (!state.currentForm) {return [];}

      const requiredFields: string[] = [];
      state.currentForm.sections.forEach(section => {
        section.fields.forEach(field => {
          if (field.required) {
            requiredFields.push(field.id);
          }
        });
      });

      return requiredFields;
    },

    getMissingRequiredFields: () => {
      const state = get();
      if (!state.currentForm) {return [];}

      const validationResult = validateFormCompletion(state.currentForm);
      return validationResult.missingFields;
    },

    getAutoFillableFields: () => {
      const state = get();
      if (!state.currentForm) return [];

      const autoFillableFields: string[] = [];
      state.currentForm.sections.forEach(section => {
        section.fields.forEach(field => {
          if (field.autoFillSource || field.countrySpecific === false) {
            autoFillableFields.push(field.id);
          }
        });
      });

      return autoFillableFields;
    },

    getFormCompletionDetails: () => {
      const state = get();
      if (!state.currentForm) {
        return {
          totalFields: 0,
          completedFields: 0,
          autoFilledFields: 0,
          userFilledFields: 0,
          remainingFields: 0,
        };
      }

      const stats = state.currentForm.stats;
      const completedFields = stats.autoFilled + stats.userFilled;

      return {
        totalFields: stats.totalFields,
        completedFields,
        autoFilledFields: stats.autoFilled,
        userFilledFields: stats.userFilled,
        remainingFields: stats.remaining,
      };
    },
  };
}
