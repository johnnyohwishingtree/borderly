/**
 * Submission Testing Types
 *
 * Interfaces and types for the mock submission testing framework.
 */

export interface MockSubmissionResult {
  success: boolean;
  submissionId: string;
  confirmationNumber?: string;
  qrCode?: string;
  errors: SubmissionError[];
  warnings: string[];
  processingTimeMs: number;
  testMetadata: {
    formValidationPassed: boolean;
    fieldMappingCorrect: boolean;
    requiredFieldsPresent: boolean;
    dataFormatValid: boolean;
  };
}

export interface SubmissionError {
  fieldId: string;
  errorType: 'required_missing' | 'invalid_format' | 'validation_failed' | 'mapping_error';
  message: string;
  suggestion?: string;
}

export interface SubmissionTestConfig {
  enableFieldValidation: boolean;
  enableMappingValidation: boolean;
  enableRequiredFieldCheck: boolean;
  enableFormatValidation: boolean;
  simulateNetworkDelay: boolean;
  maxProcessingTimeMs: number;
}
