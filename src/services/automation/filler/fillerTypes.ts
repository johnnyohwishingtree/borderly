/**
 * Form Filler Types — Type definitions for form filling operations
 */

import { PortalFieldMapping } from '@/types/submission';

/**
 * Configuration for form filling operations
 */
export interface FormFillConfig {
  timeout: number;
  validateAfterFill: boolean;
  captureScreenshots: boolean;
  retryFailedFields: boolean;
  maxRetries: number;
}

/**
 * Result of a form filling operation
 */
export interface FormFillResult {
  success: boolean;
  filledFields: string[];
  failedFields: Array<{ fieldId: string; error: string }>;
  screenshot?: string;
  totalFields: number;
  fillRate: number;
}

/**
 * Field filling strategy for different input types
 */
export interface FieldFillStrategy {
  inputType: string;
  fillMethod: (element: string, value: any, mapping: PortalFieldMapping) => string;
  validateMethod?: (element: string, expectedValue: any) => string;
}
