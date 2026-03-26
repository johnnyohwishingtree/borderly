/**
 * Common validators: required.
 */

/**
 * Validates that a value is not empty/null/undefined.
 */
export function isRequired(value: unknown, fieldName = 'Field'): { isValid: boolean; error?: string } {
  if (value === null || value === undefined || value === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }

  if (typeof value === 'string' && value.trim().length === 0) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  return { isValid: true };
}
