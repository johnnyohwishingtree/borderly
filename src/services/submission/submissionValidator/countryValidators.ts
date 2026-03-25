/**
 * Country-specific validation logic for SubmissionValidator
 */

import { SecurityValidationResult } from '@/types/submission';
import { FilledForm } from '@/services/forms/formEngine';

/**
 * Build a clean passing SecurityValidationResult template
 */
function emptyResult(): SecurityValidationResult {
  return {
    isValid: true,
    warnings: [],
    errors: [],
    checks: {
      noPIILeakage: true,
      validDomain: true,
      secureConnection: true,
      dataWithinLimits: true
    }
  };
}

/**
 * Extract filled form data as a flat key→value map
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
 * Japan-specific validation (Visit Japan Web)
 */
export function validateJapanSpecific(filledForm: FilledForm): SecurityValidationResult {
  const result = emptyResult();

  if (!filledForm.portalUrl.includes('vjw-lp.digital.go.jp')) {
    result.errors.push('Invalid portal URL for Japan submission');
    result.checks.validDomain = false;
  }

  const formData = extractFormData(filledForm);

  const requiredFields: string[] = [];
  filledForm.sections.forEach(section => {
    section.fields.forEach(field => {
      if (field.required) {
        requiredFields.push(field.id);
      }
    });
  });

  for (const fieldId of requiredFields) {
    if (!formData[fieldId] || formData[fieldId] === '') {
      result.errors.push(`Missing required field for Japan: ${fieldId}`);
    }
  }

  result.isValid = result.errors.length === 0;
  return result;
}

/**
 * Malaysia-specific validation (MDAC)
 */
export function validateMalaysiaSpecific(filledForm: FilledForm): SecurityValidationResult {
  const result = emptyResult();

  if (!filledForm.portalUrl.includes('mdac.gov.my')) {
    result.errors.push('Invalid portal URL for Malaysia submission');
    result.checks.validDomain = false;
  }

  result.isValid = result.errors.length === 0;
  return result;
}

/**
 * Singapore-specific validation (ICA)
 */
export function validateSingaporeSpecific(filledForm: FilledForm): SecurityValidationResult {
  const result = emptyResult();

  if (!filledForm.portalUrl.includes('eservices.ica.gov.sg')) {
    result.errors.push('Invalid portal URL for Singapore submission');
    result.checks.validDomain = false;
  }

  result.isValid = result.errors.length === 0;
  return result;
}

/**
 * Dispatch country-specific validation
 */
export function validateCountrySpecific(
  countryCode: string,
  filledForm: FilledForm
): SecurityValidationResult {
  const result = emptyResult();

  switch (countryCode) {
    case 'JPN':
      return validateJapanSpecific(filledForm);
    case 'MYS':
      return validateMalaysiaSpecific(filledForm);
    case 'SGP':
      return validateSingaporeSpecific(filledForm);
    default:
      result.warnings.push(`No country-specific validation available for: ${countryCode}`);
      return result;
  }
}
