/**
 * Form generation engine exports.
 * Provides the core functionality for generating, validating, and managing
 * travel declaration forms based on country schemas.
 */

// Core form engine
export {
  generateFilledForm,
  updateFormData,
  validateFormCompletion,
  getCountrySpecificFields,
  exportFormData,
  calculateFormProgress,
  type FilledForm,
  type FilledFormField,
  type FilledFormSection,
  type FormStats,
} from './formEngine';

// Field mapping and auto-fill
export {
  resolveAutoFillPath,
  validateAutoFillPath,
  getAvailablePaths,
  type FormContext,
} from './fieldMapper';

// Validation utilities
export {
  createFieldSchema,
  validateField,
  validateFields,
  createFormSchema,
  validateCountrySpecificRules,
  sanitizeFormData,
  isValidFormValue,
  VALIDATION_PATTERNS,
  TRAVEL_VALIDATORS,
} from './validators';
