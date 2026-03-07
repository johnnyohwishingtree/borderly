import { create } from 'zustand';
import { FilledForm, generateFilledForm, updateFormData, validateFormCompletion } from '../services/forms/formEngine';
import { batchAutoFill, AutoFillOptions } from '../services/forms/autoFillLogic';
import { validateFormWithCrossChecks } from '../services/forms/validators';
import { CountryFormSchema } from '../types/schema';
import { TravelerProfile } from '../types/profile';
import { TripLeg } from '../types/trip';

interface FormStore {
  // Current form state
  currentForm: FilledForm | null;
  formData: Record<string, unknown>;
  errors: Record<string, string>;
  warnings: Record<string, string[]>;
  crossFieldErrors: string[];
  isValid: boolean;
  isLoading: boolean;
  autoFillOptions: AutoFillOptions;
  
  // Memory management
  memoryUsage: {
    formDataSize: number;
    lastCleanup: number;
    maxRetainedForms: number;
  };

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

  // Enhanced auto-fill operations
  enableSmartAutoFill: (profile: TravelerProfile, leg: TripLeg) => void;
  updateAutoFillOptions: (options: Partial<AutoFillOptions>) => void;
  getAutoFillSuggestion: (fieldId: string) => unknown;
  applyAutoFillSuggestion: (fieldId: string) => boolean;
  batchAutoFillForm: () => void;

  // Form data management
  getFormData: () => Record<string, unknown>;
  getFieldValue: (fieldId: string) => unknown;
  isFieldValid: (fieldId: string) => boolean;
  getFormProgress: () => {
    completed: number;
    total: number;
    percentage: number;
  };

  // Enhanced validation
  getFieldWarnings: (fieldId: string) => string[];
  getCrossFieldErrors: () => string[];
  getValidationSummary: () => {
    hasErrors: boolean;
    hasWarnings: boolean;
    errorCount: number;
    warningCount: number;
  };

  // Form state queries
  hasUnsavedChanges: () => boolean;
  getCountrySpecificFields: () => string[];
  getRequiredFields: () => string[];
  getMissingRequiredFields: () => string[];
  getAutoFillableFields: () => string[];
  getFormCompletionDetails: () => {
    totalFields: number;
    completedFields: number;
    autoFilledFields: number;
    userFilledFields: number;
    remainingFields: number;
  };

  // Memory management operations
  performMemoryCleanup: () => void;
  getMemoryUsage: () => {
    formDataSize: number;
    lastCleanup: number;
    maxRetainedForms: number;
  };
  clearFormHistory: () => void;
  optimizeFormData: () => void;
}

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

    try {
      const state = get();
      
      // Perform memory cleanup if needed before generating new form
      if (Date.now() - state.memoryUsage.lastCleanup > 300000) { // 5 minutes
        state.performMemoryCleanup();
      }

      const form = generateFilledForm(profile, leg, schema, existingData);
      
      // Apply intelligent auto-fill if enabled
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

      // Validate with enhanced validation
      const allFields = form.sections.flatMap(section => section.fields);
      const validationResult = validateFormWithCrossChecks(allFields, enhancedFormData, {
        countryCode: schema.countryCode,
        profileData: profile,
      });

      // Calculate memory usage
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
    
    // Enhanced validation with cross-field checks
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

  // Enhanced auto-fill operations
  enableSmartAutoFill: (profile, leg) => {
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

  updateAutoFillOptions: (options) => {
    set(state => ({
      autoFillOptions: { ...state.autoFillOptions, ...options }
    }));
  },

  getAutoFillSuggestion: (fieldId) => {
    const state = get();
    if (!state.currentForm) return undefined;

    const field = findFieldInForm(state.currentForm, fieldId);
    if (!field) return undefined;

    // This would need profile and leg context - simplified for now
    return undefined;
  },

  applyAutoFillSuggestion: (fieldId) => {
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

    // This would need profile and leg context - could be stored in state
    // For now, just a placeholder
  },

  // Enhanced validation methods
  getFieldWarnings: (fieldId) => {
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

  // Memory management operations
  performMemoryCleanup: () => {
    const state = get();
    
    // Clear old validation errors and warnings that may accumulate
    const cleanedErrors: Record<string, string> = {};
    const cleanedWarnings: Record<string, string[]> = {};

    // Only keep errors/warnings for fields that still exist in current form
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
      errors: cleanedErrors,
      warnings: cleanedWarnings,
      memoryUsage: {
        ...state.memoryUsage,
        lastCleanup: Date.now(),
      },
    });

    // Force garbage collection in dev mode
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

    // Remove undefined/null values
    const optimizedData: Record<string, unknown> = {};
    Object.entries(state.formData).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        optimizedData[key] = value;
      }
    });

    // Update memory usage tracking
    const newSize = JSON.stringify(optimizedData).length;

    set({
      formData: optimizedData,
      memoryUsage: {
        ...state.memoryUsage,
        formDataSize: newSize,
      },
    });
  },
}));

// Helper functions
function findFieldInForm(form: FilledForm, fieldId: string) {
  for (const section of form.sections) {
    const field = section.fields.find(f => f.id === fieldId);
    if (field) {return field;}
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
