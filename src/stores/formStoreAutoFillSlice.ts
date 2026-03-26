import { batchAutoFill } from '../services/forms/autoFillLogic';
import type { AutoFillOptions } from '../services/forms/autoFillLogic';
import type { TravelerProfile } from '../types/profile';
import type { TripLeg } from '../types/trip';
import { findFieldInForm } from './formStoreHelpers';
import type { FormStore } from './useFormStoreTypes';

type Set = (
  partial:
    | Partial<FormStore>
    | ((state: FormStore) => Partial<FormStore>),
) => void;
type Get = () => FormStore;

export function createAutoFillSlice(set: Set, get: Get) {
  return {
    enableSmartAutoFill: (profile: TravelerProfile, leg: TripLeg) => {
      const state = get();
      if (!state.currentForm) return;

      const allFields = state.currentForm.sections.flatMap(section => section.fields);
      const autoFillResults = batchAutoFill(allFields, { profile, leg }, state.autoFillOptions);

      const updatedFormData = { ...state.formData };
      Object.entries(autoFillResults).forEach(([fieldId, result]) => {
        if (result.confidence >= state.autoFillOptions.confidenceThreshold) {
          updatedFormData[fieldId] = result.value;
        }
      });

      set({ formData: updatedFormData });
    },

    updateAutoFillOptions: (options: Partial<AutoFillOptions>) => {
      set(state => ({
        autoFillOptions: { ...state.autoFillOptions, ...options }
      }));
    },

    getAutoFillSuggestion: (fieldId: string) => {
      const state = get();
      if (!state.currentForm) return undefined;

      const field = findFieldInForm(state.currentForm, fieldId);
      if (!field) return undefined;

      return undefined;
    },

    applyAutoFillSuggestion: (fieldId: string) => {
      const state = get();
      const suggestion = state.getAutoFillSuggestion(fieldId);
      if (suggestion !== undefined) {
        state.updateField(fieldId, suggestion);
        return true;
      }
      return false;
    },

    batchAutoFillForm: () => {
      const state = get();
      if (!state.currentForm) return;
    },
  };
}
