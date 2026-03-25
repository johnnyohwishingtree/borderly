/**
 * Form Validation — Enhanced validators, cross-field checks, and real-time validation
 */

import { z } from 'zod';
import { FormField } from '../../../types/schema';
import { createFieldSchema, validateCountrySpecificRules } from './validators';

/**
 * Enhanced field validation with better error messages.
 */
export function validateFieldEnhanced(
  field: FormField,
  value: unknown,
  context?: { countryCode?: string; profileData?: any }
): { isValid: boolean; error?: string; warnings?: string[] } {
  const warnings: string[] = [];

  try {
    const schema = createFieldSchema(field);
    schema.parse(value);

    // Additional contextual validations and warnings
    if (context) {
      const contextualWarnings = getContextualWarnings(field, value, context);
      warnings.push(...contextualWarnings);
    }

    return { isValid: true, ...(warnings.length > 0 ? { warnings } : {}) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        error: error.errors[0]?.message || 'Validation failed',
        ...(warnings.length > 0 ? { warnings } : {}),
      };
    }
    return {
      isValid: false,
      error: 'Unknown validation error',
    };
  }
}

/**
 * Gets contextual warnings based on field value and context.
 */
function getContextualWarnings(
  field: FormField,
  value: unknown,
  context?: { countryCode?: string; profileData?: any }
): string[] {
  const warnings: string[] = [];
  const fieldId = field.id.toLowerCase();
  const stringValue = String(value);

  // Country-specific warnings
  if (context?.countryCode) {
    switch (context.countryCode) {
      case 'JPN':
        if (fieldId.includes('meat') && value === true) {
          warnings.push('All meat products are strictly prohibited in Japan');
        }
        if (fieldId.includes('currency') && typeof value === 'number' && value > 1000000) {
          warnings.push('Amounts over ¥1,000,000 require declaration');
        }
        break;

      case 'SGP':
        if (fieldId.includes('tobacco') && value === true) {
          warnings.push('Singapore has strict tobacco import duties');
        }
        if (fieldId.includes('chewing') && value === true) {
          warnings.push('Chewing gum is prohibited in Singapore');
        }
        break;

      case 'USA':
        if (fieldId.includes('currency') && typeof value === 'number' && value > 10000) {
          warnings.push('Amounts over $10,000 must be declared to customs');
        }
        break;
    }
  }

  // General travel warnings
  if (fieldId.includes('passport') && fieldId.includes('expiry')) {
    const expiryDate = new Date(stringValue);
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

    if (expiryDate < sixMonthsFromNow) {
      warnings.push('Passport expires within 6 months. Some countries require longer validity');
    }
  }

  if (fieldId.includes('duration') && typeof value === 'number' && value > 90) {
    warnings.push('Stays over 90 days may require special visas or permits');
  }

  return warnings;
}

/**
 * Comprehensive form validation with cross-field validation.
 */
export function validateFormWithCrossChecks(
  fields: FormField[],
  values: Record<string, unknown>,
  context?: { countryCode?: string; profileData?: any }
): {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string[]>;
  crossFieldErrors: string[];
} {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string[]> = {};
  const crossFieldErrors: string[] = [];

  // Validate individual fields
  fields.forEach(field => {
    const value = values[field.id];
    const result = validateFieldEnhanced(field, value, context);

    if (!result.isValid && result.error) {
      errors[field.id] = result.error;
    }

    if (result.warnings && result.warnings.length > 0) {
      warnings[field.id] = result.warnings;
    }
  });

  // Cross-field validations
  const arrivalDate = values.arrivalDate as string;
  const departureDate = values.departureDate as string;

  if (arrivalDate && departureDate) {
    if (new Date(departureDate) <= new Date(arrivalDate)) {
      crossFieldErrors.push('Departure date must be after arrival date');
    }
  }

  const birthDate = values.dateOfBirth as string;
  if (birthDate && arrivalDate) {
    const age = new Date(arrivalDate).getFullYear() - new Date(birthDate).getFullYear();
    if (age < 18) {
      crossFieldErrors.push('Traveler must be at least 18 years old');
    }
  }

  // Check passport expiry against travel date
  const passportExpiry = values.passportExpiry as string;
  if (passportExpiry && arrivalDate) {
    if (new Date(passportExpiry) <= new Date(arrivalDate)) {
      crossFieldErrors.push('Passport expires before travel date');
    }
  }

  // Country-specific business rules
  if (context?.countryCode) {
    const countryRules = validateCountrySpecificRules(context.countryCode, values);
    crossFieldErrors.push(...countryRules.errors);
  }

  return {
    isValid: Object.keys(errors).length === 0 && crossFieldErrors.length === 0,
    errors,
    warnings,
    crossFieldErrors,
  };
}

/**
 * Real-time validation for progressive form filling.
 */
export function createRealTimeValidator(
  fields: FormField[],
  context?: { countryCode?: string; profileData?: any }
) {
  return {
    validateField: (fieldId: string, value: unknown) => {
      const field = fields.find(f => f.id === fieldId);
      if (!field) {
        return { isValid: false, error: 'Field not found' };
      }
      return validateFieldEnhanced(field, value, context);
    },

    validatePartial: (values: Record<string, unknown>) => {
      const filledFields = fields.filter(f => values[f.id] !== undefined);
      return validateFormWithCrossChecks(filledFields, values, context);
    },

    getFieldSchema: (fieldId: string) => {
      const field = fields.find(f => f.id === fieldId);
      return field ? createFieldSchema(field) : null;
    },
  };
}

/**
 * Type guard to check if a value is a valid form field value.
 */
export function isValidFormValue(value: unknown): value is string | number | boolean | Date {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value instanceof Date
  );
}
