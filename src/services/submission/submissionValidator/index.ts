/**
 * Submission Validator barrel export
 */

export { SubmissionValidator, extractFormData } from './SubmissionValidator';
export type { ValidationConfig } from './submissionValidatorTypes';
export { DEFAULT_CONFIG } from './submissionValidatorTypes';
export {
  validateJapanSpecific,
  validateMalaysiaSpecific,
  validateSingaporeSpecific,
  validateCountrySpecific,
} from './countryValidators';
