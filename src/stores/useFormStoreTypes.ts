import type { FilledForm } from '../services/forms/formEngine';
import type { AutoFillOptions } from '../services/forms/autoFillLogic';
import type { CountryFormSchema } from '../types/schema';
import type { TravelerProfile } from '../types/profile';
import type { TripLeg } from '../types/trip';

export interface FormStore {
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
