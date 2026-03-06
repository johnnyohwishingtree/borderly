import {
  createFieldSchema,
  validateField,
  validateFields,
  validateFieldEnhanced,
  validateFormWithCrossChecks,
  createRealTimeValidator,
  VALIDATION_PATTERNS,
  TRAVEL_VALIDATORS,
  validateCountrySpecificRules,
  sanitizeFormData,
  isValidFormValue,
} from '../../src/services/forms/validators';
import { FormField } from '../../src/types/schema';

describe('Form Validators', () => {
  describe('createFieldSchema', () => {
    it('should create text schema with validation rules', () => {
      const field: FormField = {
        id: 'test',
        label: 'Test Field',
        type: 'text',
        required: true,
        countrySpecific: false,
        validation: {
          minLength: 3,
          maxLength: 10,
          pattern: '^[A-Z]+$',
        },
      };

      const schema = createFieldSchema(field);
      
      expect(() => schema.parse('ABC')).not.toThrow();
      expect(() => schema.parse('ab')).toThrow(); // too short
      expect(() => schema.parse('ABCDEFGHIJK')).toThrow(); // too long
      expect(() => schema.parse('abc')).toThrow(); // wrong pattern
    });

    it('should create number schema with range validation', () => {
      const field: FormField = {
        id: 'age',
        label: 'Age',
        type: 'number',
        required: true,
        countrySpecific: false,
        validation: {
          min: 18,
          max: 100,
        },
      };

      const schema = createFieldSchema(field);
      
      expect(() => schema.parse(25)).not.toThrow();
      expect(() => schema.parse(17)).toThrow(); // too young
      expect(() => schema.parse(101)).toThrow(); // too old
    });

    it('should create date schema for birth dates', () => {
      const field: FormField = {
        id: 'dateOfBirth',
        label: 'Date of Birth',
        type: 'date',
        required: true,
        countrySpecific: false,
      };

      const schema = createFieldSchema(field);
      
      expect(() => schema.parse('1990-01-01')).not.toThrow();
      expect(() => schema.parse('invalid-date')).toThrow();
      expect(() => schema.parse('2020-01-01')).toThrow(); // too recent for birth
    });

    it('should create boolean schema', () => {
      const field: FormField = {
        id: 'agreed',
        label: 'Agreed',
        type: 'boolean',
        required: true,
        countrySpecific: false,
      };

      const schema = createFieldSchema(field);
      
      expect(() => schema.parse(true)).not.toThrow();
      expect(() => schema.parse(false)).not.toThrow();
      expect(() => schema.parse('true')).toThrow();
    });

    it('should create select schema with options', () => {
      const field: FormField = {
        id: 'country',
        label: 'Country',
        type: 'select',
        required: true,
        countrySpecific: false,
        options: [
          { value: 'USA', label: 'United States' },
          { value: 'JPN', label: 'Japan' },
        ],
      };

      const schema = createFieldSchema(field);
      
      expect(() => schema.parse('USA')).not.toThrow();
      expect(() => schema.parse('JPN')).not.toThrow();
      expect(() => schema.parse('GBR')).toThrow(); // not in options
    });

    it('should make field optional when not required', () => {
      const field: FormField = {
        id: 'optional',
        label: 'Optional Field',
        type: 'text',
        required: false,
        countrySpecific: false,
      };

      const schema = createFieldSchema(field);
      
      expect(() => schema.parse(undefined)).not.toThrow();
      expect(() => schema.parse('value')).not.toThrow();
    });
  });

  describe('validateField', () => {
    const textField: FormField = {
      id: 'description',
      label: 'Description',
      type: 'text',
      required: true,
      countrySpecific: false,
      validation: { minLength: 2 },
    };

    it('should validate valid field value', () => {
      const result = validateField(textField, 'John');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid field value', () => {
      const result = validateField(textField, 'J');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateFieldEnhanced', () => {
    it('should provide enhanced validation with warnings', () => {
      const passportField: FormField = {
        id: 'passportExpiry',
        label: 'Passport Expiry',
        type: 'date',
        required: true,
        countrySpecific: false,
      };

      // Date that expires within 6 months
      const nearExpiryDate = new Date();
      nearExpiryDate.setMonth(nearExpiryDate.getMonth() + 3);
      const nearExpiryISO = nearExpiryDate.toISOString().split('T')[0];

      const result = validateFieldEnhanced(passportField, nearExpiryISO, {
        countryCode: 'JPN',
      });

      expect(result.isValid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('6 months');
    });

    it('should provide country-specific warnings', () => {
      const meatField: FormField = {
        id: 'meatProducts',
        label: 'Meat Products',
        type: 'boolean',
        required: true,
        countrySpecific: true,
      };

      const result = validateFieldEnhanced(meatField, true, {
        countryCode: 'JPN',
      });

      expect(result.isValid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('prohibited in Japan');
    });
  });

  describe('validateFormWithCrossChecks', () => {
    const fields: FormField[] = [
      {
        id: 'arrivalDate',
        label: 'Arrival Date',
        type: 'date',
        required: true,
        countrySpecific: false,
      },
      {
        id: 'departureDate',
        label: 'Departure Date',
        type: 'date',
        required: true,
        countrySpecific: false,
      },
      {
        id: 'dateOfBirth',
        label: 'Date of Birth',
        type: 'date',
        required: true,
        countrySpecific: false,
      },
    ];

    it('should validate cross-field relationships', () => {
      const values = {
        arrivalDate: '2026-07-01',
        departureDate: '2026-07-10',
        dateOfBirth: '1990-01-01',
      };

      const result = validateFormWithCrossChecks(fields, values);
      
      expect(result.isValid).toBe(true);
      expect(result.crossFieldErrors).toHaveLength(0);
    });

    it('should catch departure before arrival error', () => {
      const values = {
        arrivalDate: '2026-07-10',
        departureDate: '2026-07-01', // Before arrival
        dateOfBirth: '1990-01-01',
      };

      const result = validateFormWithCrossChecks(fields, values);
      
      expect(result.isValid).toBe(false);
      expect(result.crossFieldErrors).toContain('Departure date must be after arrival date');
    });

    it('should catch underage traveler error', () => {
      const values = {
        arrivalDate: '2026-07-01',
        departureDate: '2026-07-10',
        dateOfBirth: '2010-01-01', // Too young
      };

      const result = validateFormWithCrossChecks(fields, values);
      
      expect(result.isValid).toBe(false);
      expect(result.crossFieldErrors).toContain('Traveler must be at least 18 years old');
    });
  });

  describe('createRealTimeValidator', () => {
    const fields: FormField[] = [
      {
        id: 'email',
        label: 'Email',
        type: 'text',
        required: true,
        countrySpecific: false,
      },
    ];

    it('should create real-time validator', () => {
      const validator = createRealTimeValidator(fields);
      
      expect(validator.validateField).toBeDefined();
      expect(validator.validatePartial).toBeDefined();
      expect(validator.getFieldSchema).toBeDefined();
    });

    it('should validate individual fields', () => {
      const validator = createRealTimeValidator(fields);
      
      const result = validator.validateField('email', 'test@example.com');
      expect(result.isValid).toBe(true);
    });

    it('should validate partial form', () => {
      const validator = createRealTimeValidator(fields);
      
      const result = validator.validatePartial({ email: 'test@example.com' });
      expect(result.isValid).toBe(true);
    });
  });

  describe('VALIDATION_PATTERNS', () => {
    it('should validate passport numbers', () => {
      expect(VALIDATION_PATTERNS.passport.test('AB123456')).toBe(true);
      expect(VALIDATION_PATTERNS.passport.test('123')).toBe(false);
    });

    it('should validate email addresses', () => {
      expect(VALIDATION_PATTERNS.email.test('test@example.com')).toBe(true);
      expect(VALIDATION_PATTERNS.email.test('invalid-email')).toBe(false);
    });

    it('should validate flight numbers', () => {
      expect(VALIDATION_PATTERNS.flightNumber.test('AA123')).toBe(true);
      expect(VALIDATION_PATTERNS.flightNumber.test('BA4567')).toBe(true);
      expect(VALIDATION_PATTERNS.flightNumber.test('123')).toBe(false);
    });
  });

  describe('TRAVEL_VALIDATORS', () => {
    it('should validate passport numbers', () => {
      expect(TRAVEL_VALIDATORS.passportNumber('AB123456')).toBe(true);
      expect(TRAVEL_VALIDATORS.passportNumber('123')).toBe(false);
    });

    it('should validate flight numbers', () => {
      expect(TRAVEL_VALIDATORS.flightNumber('AA123')).toBe(true);
      expect(TRAVEL_VALIDATORS.flightNumber('invalid')).toBe(false);
    });

    it('should validate future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateString = futureDate.toISOString().split('T')[0];
      
      expect(TRAVEL_VALIDATORS.futureDate(futureDateString)).toBe(true);
      expect(TRAVEL_VALIDATORS.futureDate('2020-01-01')).toBe(false);
    });

    it('should validate travel dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const futureDateString = futureDate.toISOString().split('T')[0];
      
      expect(TRAVEL_VALIDATORS.travelDate(futureDateString)).toBe(true);
      
      // Date too far in future (more than 1 year)
      const farFutureDate = new Date();
      farFutureDate.setFullYear(farFutureDate.getFullYear() + 2);
      const farFutureDateString = farFutureDate.toISOString().split('T')[0];
      
      expect(TRAVEL_VALIDATORS.travelDate(farFutureDateString)).toBe(false);
    });

    it('should validate stay duration', () => {
      expect(TRAVEL_VALIDATORS.stayDuration(7)).toBe(true);
      expect(TRAVEL_VALIDATORS.stayDuration(365)).toBe(true);
      expect(TRAVEL_VALIDATORS.stayDuration(0)).toBe(false);
      expect(TRAVEL_VALIDATORS.stayDuration(366)).toBe(false);
    });
  });

  describe('validateCountrySpecificRules', () => {
    it('should validate Japan-specific rules', () => {
      const formData = {
        currencyOver1M: true,
        meatProducts: true,
      };

      const result = validateCountrySpecificRules('JPN', formData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('All meat products are prohibited in Japan');
    });

    it('should validate Malaysia-specific rules', () => {
      const formData = {
        currencyOver10K: true,
      };

      const result = validateCountrySpecificRules('MYS', formData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Currency declaration details required when carrying over RM10,000');
    });

    it('should validate Singapore-specific rules', () => {
      const formData = {
        tobaccoProducts: true,
      };

      const result = validateCountrySpecificRules('SGP', formData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Duty payment required for tobacco products in Singapore');
    });

    it('should pass validation for unknown countries', () => {
      const formData = {
        someField: 'value',
      };

      const result = validateCountrySpecificRules('UNKNOWN', formData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('sanitizeFormData', () => {
    it('should trim whitespace from string values', () => {
      const data = {
        name: '  John Doe  ',
        email: 'john@example.com   ',
        age: 25,
        active: true,
      };

      const sanitized = sanitizeFormData(data);
      
      expect(sanitized.name).toBe('John Doe');
      expect(sanitized.email).toBe('john@example.com');
      expect(sanitized.age).toBe(25);
      expect(sanitized.active).toBe(true);
    });

    it('should remove undefined and null values', () => {
      const data = {
        name: 'John',
        empty: undefined,
        nothing: null,
        zero: 0,
      };

      const sanitized = sanitizeFormData(data);
      
      expect(sanitized.name).toBe('John');
      expect(sanitized.zero).toBe(0);
      expect('empty' in sanitized).toBe(false);
      expect('nothing' in sanitized).toBe(false);
    });
  });

  describe('isValidFormValue', () => {
    it('should accept valid form value types', () => {
      expect(isValidFormValue('string')).toBe(true);
      expect(isValidFormValue(123)).toBe(true);
      expect(isValidFormValue(true)).toBe(true);
      expect(isValidFormValue(new Date())).toBe(true);
    });

    it('should reject invalid form value types', () => {
      expect(isValidFormValue(null)).toBe(false);
      expect(isValidFormValue(undefined)).toBe(false);
      expect(isValidFormValue([])).toBe(false);
      expect(isValidFormValue({})).toBe(false);
    });
  });

  describe('Specialized field validation', () => {
    it('should validate passport field with specialized schema', () => {
      const passportField: FormField = {
        id: 'passportNumber',
        label: 'Passport Number',
        type: 'text',
        required: true,
        countrySpecific: false,
      };

      const schema = createFieldSchema(passportField);
      
      expect(() => schema.parse('AB123456')).not.toThrow();
      expect(() => schema.parse('123')).toThrow(); // Invalid format
    });

    it('should validate email field with specialized schema', () => {
      const emailField: FormField = {
        id: 'emailAddress',
        label: 'Email Address',
        type: 'text',
        required: true,
        countrySpecific: false,
      };

      const schema = createFieldSchema(emailField);
      
      expect(() => schema.parse('test@example.com')).not.toThrow();
      expect(() => schema.parse('invalid-email')).toThrow();
    });

    it('should validate flight field with specialized schema', () => {
      const flightField: FormField = {
        id: 'flightNumber',
        label: 'Flight Number',
        type: 'text',
        required: true,
        countrySpecific: false,
      };

      const schema = createFieldSchema(flightField);
      
      expect(() => schema.parse('AA123')).not.toThrow();
      expect(() => schema.parse('invalid')).toThrow();
    });

    it('should validate name fields with specialized schema', () => {
      const nameField: FormField = {
        id: 'surname',
        label: 'Surname',
        type: 'text',
        required: true,
        countrySpecific: false,
      };

      const schema = createFieldSchema(nameField);
      
      expect(() => schema.parse('Johnson')).not.toThrow();
      expect(() => schema.parse('O\'Connor')).not.toThrow(); // Apostrophe allowed
      expect(() => schema.parse('123')).toThrow(); // Numbers not allowed
    });
  });
});