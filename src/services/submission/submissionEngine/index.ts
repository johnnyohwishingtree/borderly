/**
 * Submission Engine barrel export
 */

export { SubmissionEngine } from './SubmissionEngine';
export { DEFAULT_CONFIG } from './engineTypes';
export type {
  SubmissionSession,
  SubmissionResult,
  SubmissionStatus,
  SubmissionMethod,
  SubmissionError,
  SubmissionMetrics,
  AutomationStepResult,
} from './engineTypes';
export {
  generateSessionId,
  extractFormData,
  prepareStepData,
  injectFormData,
  categorizeOutcome,
} from './engineHelpers';
