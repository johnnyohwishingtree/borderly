import { z } from 'zod';
import { FormField } from '../../types/schema';
import { 
  isValidISODate, 
  isFutureDate, 
  isPastDate, 
  isValidTravelDate, 
  isValidPassportExpiry, 
  isValidBirthDate,
  calculateAge 
} from '../../utils/dateUtils';
import { 
  validatePassportNumber, 
  validateEmail, 
  validatePhoneNumber, 
  validateFlightNumber, 
  validateAirlineCode, 
  validateAirportCode, 
  validateCountryCode, 
  validateTravelName, 
  validateOccupation 
} from '../../utils/validationUtils';

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
      schema = createTextSchema(field);
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
      schema = createDateSchema(field);
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
        error: error.errors[0]?.message || 'Validation failed',
      };
    }
    return {
      isValid: false,
      error: 'Unknown validation error',
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
 * Creates specialized date schemas based on field context.
 */
function createDateSchema(field: FormField): z.ZodSchema<unknown> {
  const fieldId = field.id.toLowerCase();
  
  if (fieldId.includes('birth') || fieldId.includes('dob')) {
    return z.string().refine(isValidBirthDate, {
      message: 'Invalid birth date. Must be between 18-100 years ago',
    });
  }
  
  if (fieldId.includes('expiry') || fieldId.includes('expire')) {
    return z.string().refine(isValidPassportExpiry, {
      message: 'Invalid expiry date. Must be a future date within 10 years',
    });
  }
  
  if (fieldId.includes('arrival') || fieldId.includes('departure') || fieldId.includes('travel')) {
    return z.string().refine(isValidTravelDate, {
      message: 'Invalid travel date. Must be within the next year',
    });
  }
  
  // Default date validation
  return z.string().refine(isValidISODate, {
    message: 'Invalid date format. Please use YYYY-MM-DD',
  });
}

/**
 * Creates specialized text schemas based on field context.
 */
function createTextSchema(field: FormField): z.ZodSchema<unknown> {
  const fieldId = field.id.toLowerCase();
  let schema = z.string();
  
  // Apply field-specific validations
  if (fieldId.includes('passport')) {
    schema = schema.refine((val) => validatePassportNumber(val).isValid, {
      message: 'Invalid passport number format',
    });
  } else if (fieldId.includes('email')) {
    schema = schema.refine((val) => validateEmail(val).isValid, {
      message: 'Invalid email address',
    });
  } else if (fieldId.includes('phone')) {
    schema = schema.refine((val) => validatePhoneNumber(val).isValid, {
      message: 'Invalid phone number format',
    });
  } else if (fieldId.includes('flight')) {
    schema = schema.refine((val) => validateFlightNumber(val).isValid, {
      message: 'Invalid flight number format',
    });
  } else if (fieldId.includes('airline')) {
    schema = schema.refine((val) => validateAirlineCode(val).isValid, {
      message: 'Invalid airline code format',
    });
  } else if (fieldId.includes('airport')) {
    schema = schema.refine((val) => validateAirportCode(val).isValid, {
      message: 'Invalid airport code format',
    });
  } else if (fieldId.includes('country') && !fieldId.includes('name')) {
    schema = schema.refine((val) => validateCountryCode(val).isValid, {
      message: 'Invalid country code format',
    });
  } else if (fieldId.includes('name') || fieldId.includes('surname') || fieldId.includes('given')) {
    schema = schema.refine((val) => validateTravelName(val).isValid, {
      message: 'Invalid name format',
    });
  } else if (fieldId.includes('occupation')) {
    schema = schema.refine((val) => validateOccupation(val).isValid, {
      message: 'Invalid occupation format',
    });
  }
  
  // Apply length validations
  if (field.validation?.minLength) {
    schema = schema.min(field.validation.minLength);
  }
  
  if (field.validation?.maxLength) {
    schema = schema.max(field.validation.maxLength);
  }
  
  // Apply pattern validation
  if (field.validation?.pattern) {
    schema = schema.regex(new RegExp(field.validation.pattern));
  }
  
  return schema;
}

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
    
    return { isValid: true, warnings: warnings.length > 0 ? warnings : undefined };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        error: error.errors[0]?.message || 'Validation failed',
        warnings: warnings.length > 0 ? warnings : undefined,
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
  context: { countryCode?: string; profileData?: any }
): string[] {
  const warnings: string[] = [];
  const fieldId = field.id.toLowerCase();
  const stringValue = String(value);
  
  // Country-specific warnings
  if (context.countryCode) {
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
    const age = calculateAge(birthDate, arrivalDate);
    if (age === null || age < 18) {
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
