/**
 * Utility helpers for the Submission Engine
 */

import { FilledForm } from '@/services/forms/formEngine';
import { AutomationScript, SubmissionResult, SubmissionMetrics } from '@/types/submission';

/**
 * Generate a unique submission session ID
 */
export function generateSessionId(): string {
  return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract all filled form field values into a flat key→value map
 */
export function extractFormData(filledForm: FilledForm): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  filledForm.sections.forEach(section => {
    section.fields.forEach(field => {
      if (field.currentValue !== undefined && field.currentValue !== '') {
        data[field.id] = field.currentValue;
      }
    });
  });

  return data;
}

/**
 * Build the data object for a single automation step by mapping form fields
 * to the script's fieldMappings
 */
export function prepareStepData(
  _step: unknown,
  filledForm: FilledForm,
  script: AutomationScript
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  const formData = extractFormData(filledForm);

  Object.entries(script.fieldMappings).forEach(([fieldId]) => {
    if (formData[fieldId] !== undefined) {
      data[fieldId] = formData[fieldId];
    }
  });

  return data;
}

/**
 * Replace `{{fieldId}}` placeholders in a script template with actual form data
 */
export function injectFormData(
  scriptCode: string,
  data: Record<string, unknown>
): string {
  let injectedCode = scriptCode;

  Object.entries(data).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    const safeValue = JSON.stringify(value);
    injectedCode = injectedCode.replace(new RegExp(placeholder, 'g'), safeValue);
  });

  return injectedCode;
}

/**
 * Map a SubmissionResult status to a SubmissionMetrics outcome label
 */
export function categorizeOutcome(result: SubmissionResult): SubmissionMetrics['outcome'] {
  if (result.status === 'completed') return 'success';
  if (result.status === 'manual_fallback') return 'partial_success';
  if (result.status === 'failed') return 'failure';
  return 'user_abandoned';
}
