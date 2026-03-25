/**
 * Common validators: currency, sanitization, required, length, range.
 */

/**
 * Validates currency amounts with optional country-specific limits.
 */
export function validateCurrencyAmount(
  amount: string | number,
  currencyCode?: string,
  country?: string
): { isValid: boolean; error?: string; warning?: string } {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numericAmount)) {
    return { isValid: false, error: 'Invalid currency amount' };
  }

  if (numericAmount < 0) {
    return { isValid: false, error: 'Currency amount cannot be negative' };
  }

  // Different maximum limits based on currency
  let maxLimit = 1000000; // Default limit
  if (currencyCode === 'JPY') {
    maxLimit = 10000000; // Higher limit for Japanese Yen
  } else if (currencyCode === 'KRW' || currencyCode === 'IDR') {
    maxLimit = 50000000; // Higher limits for currencies with smaller denominations
  }

  if (numericAmount > maxLimit) {
    return { isValid: false, error: 'Currency amount exceeds maximum limit' };
  }

  // Country-specific warnings for declaration thresholds
  let warning: string | undefined;

  if (country && numericAmount > 0) {
    switch (country.toUpperCase()) {
      case 'JPN':
        if (currencyCode === 'JPY' && numericAmount > 1000000) {
          warning = 'Amounts over ¥1,000,000 must be declared in Japan';
        }
        break;
      case 'USA':
        if (currencyCode === 'USD' && numericAmount > 10000) {
          warning = 'Amounts over $10,000 must be declared in the USA';
        }
        break;
      case 'SGP':
        if (currencyCode === 'SGD' && numericAmount > 20000) {
          warning = 'Amounts over S$20,000 must be declared in Singapore';
        }
        break;
    }
  }

  return { isValid: true, ...(warning ? { warning } : {}) };
}

/**
 * Sanitizes and normalizes string input for forms.
 */
export function sanitizeFormInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[<>]/g, '') // Remove potentially dangerous characters
    .substring(0, 1000); // Limit length to prevent abuse
}

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

/**
 * Validates string length constraints.
 */
export function validateLength(
  value: string,
  options: { min?: number; max?: number; fieldName?: string }
): { isValid: boolean; error?: string } {
  const { min, max, fieldName = 'Field' } = options;

  if (!value || typeof value !== 'string') {
    return { isValid: false, error: `${fieldName} must be a string` };
  }

  const length = value.trim().length;

  if (min !== undefined && length < min) {
    return { isValid: false, error: `${fieldName} must be at least ${min} characters` };
  }

  if (max !== undefined && length > max) {
    return { isValid: false, error: `${fieldName} cannot exceed ${max} characters` };
  }

  return { isValid: true };
}

/**
 * Validates numeric ranges.
 */
export function validateRange(
  value: number,
  options: { min?: number; max?: number; fieldName?: string }
): { isValid: boolean; error?: string } {
  const { min, max, fieldName = 'Value' } = options;

  if (typeof value !== 'number' || isNaN(value)) {
    return { isValid: false, error: `${fieldName} must be a number` };
  }

  if (min !== undefined && value < min) {
    return { isValid: false, error: `${fieldName} must be at least ${min}` };
  }

  if (max !== undefined && value > max) {
    return { isValid: false, error: `${fieldName} cannot exceed ${max}` };
  }

  return { isValid: true };
}
