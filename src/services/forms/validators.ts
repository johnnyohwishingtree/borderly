import { z } from 'zod';
import { FormField } from '../../types/schema';

/**
 * Validation utilities for form fields using Zod schemas.
 * Provides runtime validation for form data based on field definitions.
 */

/**
 * Creates a Zod schema for a form field based on its configuration.
 */
export function createFieldSchema(field: FormField): z.ZodSchema<unknown> {
  let schema: z.ZodSchema<unknown>;

  // Create base schema based on field type
  switch (field.type) {
    case 'text':
    case 'textarea':
      schema = z.string();
      
      if (field.validation?.minLength) {
        schema = (schema as z.ZodString).min(field.validation.minLength);
      }
      
      if (field.validation?.maxLength) {
        schema = (schema as z.ZodString).max(field.validation.maxLength);
      }
      
      if (field.validation?.pattern) {
        schema = (schema as z.ZodString).regex(new RegExp(field.validation.pattern));
      }
      break;

    case 'number':
      schema = z.number();
      
      if (field.validation?.min !== undefined) {
        schema = (schema as z.ZodNumber).min(field.validation.min);
      }
      
      if (field.validation?.max !== undefined) {
        schema = (schema as z.ZodNumber).max(field.validation.max);
      }
      break;

    case 'date':
      schema = z.string().refine((val) => {
        // Accept ISO 8601 date strings
        const date = new Date(val);
        return !isNaN(date.getTime());
      }, {
        message: 'Invalid date format',
      });
      break;

    case 'boolean':
      schema = z.boolean();
      break;

    case 'select':
      if (field.options && field.options.length > 0) {
        const validValues = field.options.map(opt => opt.value);
        schema = z.enum(validValues as [string, ...string[]]);
      } else {
        schema = z.string();
      }
      break;

    default:
      schema = z.unknown();
      break;
  }

  // Make optional if not required
  if (!field.required) {
    schema = schema.optional();
  }

  return schema;
}

/**
 * Validates a single field value against its configuration.
 */
export function validateField(
  field: FormField, 
  value: unknown
): { isValid: boolean; error?: string } {
  try {
    const schema = createFieldSchema(field);
    schema.parse(value);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        isValid: false, 
        error: error.errors[0]?.message || 'Validation failed'
      };
    }
    return { 
      isValid: false, 
      error: 'Unknown validation error'
    };
  }
}

/**
 * Validates multiple field values at once.
 */
export function validateFields(
  fields: FormField[],
  values: Record<string, unknown>
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  fields.forEach(field => {
    const value = values[field.id];
    const result = validateField(field, value);
    
    if (!result.isValid && result.error) {
      errors[field.id] = result.error;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Built-in validation patterns for common field types.
 */
export const VALIDATION_PATTERNS = {
  passport: /^[A-Z0-9]{6,9}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s()-]{7,15}$/,
  flightNumber: /^[A-Z]{2,3}\s?\d{1,4}$/,
  airlineCode: /^[A-Z]{2,3}$/,
  airportCode: /^[A-Z]{3}$/,
  postalCode: /^[\d\w\s-]{3,10}$/,
  countryCode: /^[A-Z]{3}$/,
} as const;

/**
 * Specialized validators for travel-related fields.
 */
export const TRAVEL_VALIDATORS = {
  /**
   * Validates passport number format.
   */
  passportNumber: (value: string): boolean => {
    return VALIDATION_PATTERNS.passport.test(value);
  },

  /**
   * Validates flight number format.
   */
  flightNumber: (value: string): boolean => {
    return VALIDATION_PATTERNS.flightNumber.test(value);
  },

  /**
   * Validates airline code format (IATA 2-letter).
   */
  airlineCode: (value: string): boolean => {
    return VALIDATION_PATTERNS.airlineCode.test(value);
  },

  /**
   * Validates airport code format (IATA 3-letter).
   */
  airportCode: (value: string): boolean => {
    return VALIDATION_PATTERNS.airportCode.test(value);
  },

  /**
   * Validates that a date is in the future.
   */
  futureDate: (value: string): boolean => {
    const date = new Date(value);
    return date > new Date();
  },

  /**
   * Validates that a date is within a reasonable travel window.
   */
  travelDate: (value: string): boolean => {
    const date = new Date(value);
    const now = new Date();
    const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    
    return date >= now && date <= oneYearFromNow;
  },

  /**
   * Validates duration of stay (reasonable range).
   */
  stayDuration: (value: number): boolean => {
    return value > 0 && value <= 365; // 1 day to 1 year
  },
} as const;

/**
 * Creates a validation schema for an entire form based on its field definitions.
 */
export function createFormSchema(fields: FormField[]): z.ZodObject<Record<string, z.ZodSchema<unknown>>> {
  const schemaShape: Record<string, z.ZodSchema<unknown>> = {};

  fields.forEach(field => {
    schemaShape[field.id] = createFieldSchema(field);
  });

  return z.object(schemaShape);
}

/**
 * Validates form data against country-specific business rules.
 */
export function validateCountrySpecificRules(
  countryCode: string,
  formData: Record<string, unknown>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  switch (countryCode) {
    case 'JPN':
      // Japan-specific validations
      if (formData.currencyOver1M === true && !formData.currencyDeclarationForm) {
        errors.push('Currency declaration form required when carrying over ¥1,000,000');
      }
      
      if (formData.meatProducts === true) {
        errors.push('All meat products are prohibited in Japan');
      }
      break;

    case 'MYS':
      // Malaysia-specific validations
      if (formData.currencyOver10K === true && !formData.currencyDeclarationDetails) {
        errors.push('Currency declaration details required when carrying over RM10,000');
      }
      break;

    case 'SGP':
      // Singapore-specific validations
      if (formData.tobaccoProducts === true && !formData.tobaccoDutyPaid) {
        errors.push('Duty payment required for tobacco products in Singapore');
      }
      break;

    default:
      // No country-specific rules
      break;
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitizes form data to ensure security and consistency.
 */
export function sanitizeFormData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (typeof value === 'string') {
        // Trim whitespace and normalize
        sanitized[key] = value.trim();
      } else {
        sanitized[key] = value;
      }
    }
  });

  return sanitized;
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