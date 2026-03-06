import { create } from 'zustand';
import { FilledForm, generateFilledForm, updateFormData, validateFormCompletion } from '../services/forms/formEngine';
import { CountryFormSchema } from '../types/schema';
import { TravelerProfile } from '../types/profile';
import { TripLeg } from '../types/trip';

interface FormStore {
  // Current form state
  currentForm: FilledForm | null;
  formData: Record<string, unknown>;
  errors: Record<string, string>;
  isValid: boolean;
  isLoading: boolean;
  
  // Form operations
  generateForm: (
    profile: TravelerProfile,
    leg: TripLeg,
    schema: CountryFormSchema,
    existingData?: Record<string, unknown>
  ) => void;
  
  updateField: (fieldId: string, value: unknown) => void;
  validateField: (fieldId: string) => string | undefined;
  validateForm: () => boolean;
  resetForm: () => void;
  clearErrors: () => void;
  setError: (fieldId: string, error: string) => void;
  
  // Form data management
  getFormData: () => Record<string, unknown>;
  getFieldValue: (fieldId: string) => unknown;
  isFieldValid: (fieldId: string) => boolean;
  getFormProgress: () => {
    completed: number;
    total: number;
    percentage: number;
  };
  
  // Form state queries
  hasUnsavedChanges: () => boolean;
  getCountrySpecificFields: () => string[];
  getRequiredFields: () => string[];
  getMissingRequiredFields: () => string[];
}

export const useFormStore = create<FormStore>((set, get) => ({
  // Initial state
  currentForm: null,
  formData: {},
  errors: {},
  isValid: false,
  isLoading: false,
  
  generateForm: (profile, leg, schema, existingData = {}) => {
    set({ isLoading: true });
    
    try {
      const form = generateFilledForm(profile, leg, schema, existingData);
      const validationResult = validateFormCompletion(form);
      
      set({
        currentForm: form,
        formData: existingData,
        errors: {},
        isValid: validationResult.isComplete,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to generate form:', error);
      set({
        currentForm: null,
        formData: {},
        errors: {},
        isValid: false,
        isLoading: false,
      });
    }
  },
  
  updateField: (fieldId, value) => {
    const state = get();
    if (!state.currentForm) return;
    
    const updatedData = updateFormData(state.formData, fieldId, value);
    const field = findFieldInForm(state.currentForm, fieldId);
    
    // Clear existing error for this field if it's now valid
    let updatedErrors = { ...state.errors };
    if (field && value !== undefined && value !== '' && value !== null) {
      const error = validateFieldValue(field, value);
      if (error) {
        updatedErrors[fieldId] = error;
      } else {
        delete updatedErrors[fieldId];
      }
    }
    
    // Re-validate form completion
    const validationResult = validateFormCompletion(state.currentForm);
    const isFormValid = validationResult.isComplete && Object.keys(updatedErrors).length === 0;
    
    set({
      formData: updatedData,
      errors: updatedErrors,
      isValid: isFormValid,
    });
  },
  
  validateField: (fieldId) => {
    const state = get();
    if (!state.currentForm) return undefined;
    
    const field = findFieldInForm(state.currentForm, fieldId);
    if (!field) return undefined;
    
    const value = state.formData[fieldId] ?? field.currentValue;
    return validateFieldValue(field, value);
  },
  
  validateForm: () => {
    const state = get();
    if (!state.currentForm) return false;
    
    const newErrors: Record<string, string> = {};
    
    // Validate all fields
    state.currentForm.sections.forEach(section => {
      section.fields.forEach(field => {
        const value = state.formData[field.id] ?? field.currentValue;
        const error = validateFieldValue(field, value);
        if (error) {
          newErrors[field.id] = error;
        }
      });
    });
    
    const validationResult = validateFormCompletion(state.currentForm);
    const isValid = validationResult.isComplete && Object.keys(newErrors).length === 0;
    
    set({
      errors: newErrors,
      isValid,
    });
    
    return isValid;
  },
  
  resetForm: () => {
    set({
      currentForm: null,
      formData: {},
      errors: {},
      isValid: false,
      isLoading: false,
    });
  },
  
  clearErrors: () => {
    set({ errors: {} });
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
  
  getCountrySpecificFields: () => {
    const state = get();
    if (!state.currentForm) return [];
    
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
    if (!state.currentForm) return [];
    
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
    if (!state.currentForm) return [];
    
    const validationResult = validateFormCompletion(state.currentForm);
    return validationResult.missingFields;
  },
}));

// Helper functions
function findFieldInForm(form: FilledForm, fieldId: string) {
  for (const section of form.sections) {
    const field = section.fields.find(f => f.id === fieldId);
    if (field) return field;
  }
  return undefined;
}

function validateFieldValue(field: any, value: unknown): string | undefined {
  // Check if required field is empty
  if (field.required && (value === undefined || value === '' || value === null)) {
    return `${field.label} is required`;
  }

  // Validate against field validation rules
  if (field.validation && value !== undefined && value !== '' && value !== null) {
    const validation = field.validation;
    const stringValue = String(value);
    const numericValue = Number(value);

    if (validation.pattern) {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(stringValue)) {
        return `${field.label} format is invalid`;
      }
    }

    if (validation.minLength && stringValue.length < validation.minLength) {
      return `${field.label} must be at least ${validation.minLength} characters`;
    }

    if (validation.maxLength && stringValue.length > validation.maxLength) {
      return `${field.label} cannot exceed ${validation.maxLength} characters`;
    }

    if (validation.min !== undefined && !isNaN(numericValue) && numericValue < validation.min) {
      return `${field.label} must be at least ${validation.min}`;
    }

    if (validation.max !== undefined && !isNaN(numericValue) && numericValue > validation.max) {
      return `${field.label} cannot exceed ${validation.max}`;
    }
  }

  return undefined;
}