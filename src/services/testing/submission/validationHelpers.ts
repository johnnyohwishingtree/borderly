/**
 * Submission Validation Helpers
 *
 * Field format validation, specific format testing, and country-specific
 * critical field definitions used by the SubmissionTester.
 */

import { SubmissionError } from './types';

/**
 * Validates field format based on validation rules
 */
export function validateFieldFormat(value: string, validation: any): {
  isValid: boolean;
  message?: string;
  suggestion?: string;
} {
  const patterns = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^[\+]?[\d\s\-\(\)]+$/,
    date: /^\d{4}-\d{2}-\d{2}$/,
    passport: /^[A-Z0-9]{6,12}$/,
    postalCode: /^[\w\d\s\-]{3,10}$/
  };

  if (validation.pattern && patterns[validation.pattern as keyof typeof patterns]) {
    const pattern = patterns[validation.pattern as keyof typeof patterns];
    if (!pattern.test(value)) {
      return {
        isValid: false,
        message: `Invalid ${validation.pattern} format`,
        suggestion: `Please enter a valid ${validation.pattern}`
      };
    }
  }

  return { isValid: true };
}

/**
 * Tests specific field formats by type
 */
export function testSpecificFormat(_fieldId: string, value: string, type: string): {
  valid: boolean;
  message: string;
  suggestion?: string;
  warning?: string;
} {
  switch (type) {
    case 'email': {
      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      const emailResult: { valid: boolean; message: string; suggestion?: string } = {
        valid: emailValid,
        message: emailValid ? 'Valid email format' : 'Invalid email format',
      };
      if (!emailValid) {
        emailResult.suggestion = 'Please enter a valid email address';
      }
      return emailResult;
    }

    case 'date': {
      const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(value);
      const dateResult: { valid: boolean; message: string; suggestion?: string } = {
        valid: dateValid,
        message: dateValid ? 'Valid date format' : 'Invalid date format',
      };
      if (!dateValid) {
        dateResult.suggestion = 'Please use YYYY-MM-DD format';
      }
      return dateResult;
    }

    default:
      return {
        valid: true,
        message: 'Format validation passed'
      };
  }
}

/**
 * Gets critical fields that must be present for a country
 */
export function getCriticalFieldsForCountry(countryCode: string): string[] {
  const criticalFields: Record<string, string[]> = {
    'JPN': ['surname', 'givenName', 'passportNumber', 'arrivalDate'],
    'MYS': ['fullName', 'passportNumber', 'arrivalDate', 'accommodationAddress'],
    'SGP': ['surname', 'givenName', 'passportNumber', 'arrivalDate'],
    'THA': ['surname', 'givenName', 'passportNumber', 'arrivalDate'],
    'VNM': ['fullName', 'passportNumber', 'arrivalDate'],
    'USA': ['surname', 'givenName', 'passportNumber', 'arrivalDate'],
    'GBR': ['surname', 'givenName', 'passportNumber', 'arrivalDate'],
    'CAN': ['surname', 'givenName', 'passportNumber', 'arrivalDate']
  };

  return criticalFields[countryCode] || ['surname', 'passportNumber', 'arrivalDate'];
}

/**
 * Generates mock confirmation number
 */
export function generateMockConfirmationNumber(countryCode: string): string {
  const prefix = countryCode.toUpperCase();
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

/**
 * Generates mock QR code data
 */
export function generateMockQrCode(confirmationNumber: string): string {
  return `QR_MOCK_${confirmationNumber}_${Date.now()}`;
}

/**
 * Tests data formats for all fields in a form
 */
export function testDataFormats(sections: Array<{ fields: Array<{ id: string; currentValue?: any; type: string }> }>): {
  passed: boolean;
  errors: SubmissionError[];
  warnings: string[];
} {
  const errors: SubmissionError[] = [];
  const warnings: string[] = [];

  for (const section of sections) {
    for (const field of section.fields) {
      if (field.currentValue) {
        const formatTest = testSpecificFormat(field.id, String(field.currentValue), field.type);
        if (!formatTest.valid) {
          const errorEntry: SubmissionError = {
            fieldId: field.id,
            errorType: 'invalid_format',
            message: formatTest.message,
          };
          if (formatTest.suggestion) {
            errorEntry.suggestion = formatTest.suggestion;
          }
          errors.push(errorEntry);
        } else if (formatTest.warning) {
          warnings.push(formatTest.warning);
        }
      }
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings
  };
}
