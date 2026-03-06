import {
  validatePassportNumber,
  validateEmail,
  validatePhoneNumber,
  validateFlightNumber,
  validateAirlineCode,
  validateAirportCode,
  validatePostalCode,
  validateCountryCode,
  validateTravelName,
  validateOccupation,
  validateAddress,
  validateCurrencyAmount,
  sanitizeFormInput,
  isRequired,
  validateLength,
  validateRange,
  VALIDATION_PATTERNS,
} from '../../src/utils/validationUtils';

describe('Validation Utils', () => {
  describe('validatePassportNumber', () => {
    it('should validate valid passport numbers', () => {
      const result = validatePassportNumber('AB123456');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate US passport format', () => {
      const result = validatePassportNumber('123456789', 'USA');
      expect(result.isValid).toBe(true);
    });

    it('should validate UK passport format', () => {
      const result = validatePassportNumber('123456789', 'GBR');
      expect(result.isValid).toBe(true);
    });

    it('should validate Asian passport format', () => {
      const result = validatePassportNumber('A12345678', 'JPN');
      expect(result.isValid).toBe(true);
    });

    it('should reject empty passport numbers', () => {
      const result = validatePassportNumber('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject too short passport numbers', () => {
      const result = validatePassportNumber('AB123');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('6-9 characters');
    });

    it('should reject too long passport numbers', () => {
      const result = validatePassportNumber('AB1234567890');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('6-9 characters');
    });

    it('should reject invalid format for specific countries', () => {
      const result = validatePassportNumber('ABCDEFGHI', 'USA'); // USA should be 9 alphanumeric
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+label@example.org',
        'firstname.lastname@subdomain.example.com',
      ];

      validEmails.forEach(email => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        '',
        'invalid-email',
        '@example.com',
        'test@',
        'test..test@example.com',
        'test@example',
      ];

      invalidEmails.forEach(email => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should reject emails that are too long', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const result = validateEmail(longEmail);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too long');
    });
  });

  describe('validatePhoneNumber', () => {
    it('should validate international phone numbers', () => {
      const result = validatePhoneNumber('+1234567890');
      expect(result.isValid).toBe(true);
    });

    it('should validate US phone numbers', () => {
      const validUSNumbers = [
        '+1 (555) 123-4567',
        '555-123-4567',
        '(555) 123-4567',
        '5551234567',
      ];

      validUSNumbers.forEach(number => {
        const result = validatePhoneNumber(number, 'USA');
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidNumbers = [
        '',
        '123',
        'not-a-number',
        '+',
      ];

      invalidNumbers.forEach(number => {
        const result = validatePhoneNumber(number);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('validateFlightNumber', () => {
    it('should validate correct flight numbers', () => {
      const validFlightNumbers = [
        'AA123',
        'BA4567',
        'NH0001',
        'SQ25',
        'LH456A',
      ];

      validFlightNumbers.forEach(flightNumber => {
        const result = validateFlightNumber(flightNumber);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject invalid flight numbers', () => {
      const invalidFlightNumbers = [
        '',
        '123',
        'A123',
        'ABC123456789',
        'invalid',
      ];

      invalidFlightNumbers.forEach(flightNumber => {
        const result = validateFlightNumber(flightNumber);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('validateAirlineCode', () => {
    it('should validate IATA airline codes', () => {
      const validCodes = ['AA', 'BA', 'NH', 'SQ', 'LH'];

      validCodes.forEach(code => {
        const result = validateAirlineCode(code, 'iata');
        expect(result.isValid).toBe(true);
      });
    });

    it('should validate ICAO airline codes', () => {
      const validCodes = ['AAL', 'BAW', 'ANA', 'SIA', 'DLH'];

      validCodes.forEach(code => {
        const result = validateAirlineCode(code, 'icao');
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid airline codes', () => {
      const result = validateAirlineCode('A', 'iata');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('2-letter IATA code');
    });

    it('should default to IATA validation', () => {
      const result = validateAirlineCode('AA');
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateAirportCode', () => {
    it('should validate correct airport codes', () => {
      const validCodes = ['LAX', 'JFK', 'NRT', 'LHR', 'SIN'];

      validCodes.forEach(code => {
        const result = validateAirportCode(code);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid airport codes', () => {
      const invalidCodes = ['LA', 'LAXX', '123', ''];

      invalidCodes.forEach(code => {
        const result = validateAirportCode(code);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('validatePostalCode', () => {
    it('should validate US postal codes', () => {
      const validUSCodes = ['12345', '12345-6789'];

      validUSCodes.forEach(code => {
        const result = validatePostalCode(code, 'USA');
        expect(result.isValid).toBe(true);
      });
    });

    it('should validate UK postal codes', () => {
      const validUKCodes = ['SW1A 1AA', 'M1 1AA', 'B33 8TH'];

      validUKCodes.forEach(code => {
        const result = validatePostalCode(code, 'GBR');
        expect(result.isValid).toBe(true);
      });
    });

    it('should validate Canadian postal codes', () => {
      const validCANCodes = ['K1A 0A6', 'M5V 3A8'];

      validCANCodes.forEach(code => {
        const result = validatePostalCode(code, 'CAN');
        expect(result.isValid).toBe(true);
      });
    });

    it('should use general pattern for unknown countries', () => {
      const result = validatePostalCode('12345', 'XXX');
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid postal codes', () => {
      const result = validatePostalCode('invalid', 'USA');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateCountryCode', () => {
    it('should validate ISO 3166-1 alpha-3 codes', () => {
      const validCodes = ['USA', 'GBR', 'JPN', 'CAN', 'AUS'];

      validCodes.forEach(code => {
        const result = validateCountryCode(code, 'iso3');
        expect(result.isValid).toBe(true);
      });
    });

    it('should validate ISO 3166-1 alpha-2 codes', () => {
      const validCodes = ['US', 'GB', 'JP', 'CA', 'AU'];

      validCodes.forEach(code => {
        const result = validateCountryCode(code, 'iso2');
        expect(result.isValid).toBe(true);
      });
    });

    it('should default to alpha-3 format', () => {
      const result = validateCountryCode('USA');
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid country codes', () => {
      const result = validateCountryCode('INVALID');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateTravelName', () => {
    it('should validate correct names', () => {
      const validNames = [
        'John',
        'Mary-Jane',
        "O'Connor",
        'Van Der Berg',
        'José María',
        'Dr. Smith',
      ];

      validNames.forEach(name => {
        const result = validateTravelName(name);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid names', () => {
      const invalidNames = [
        '',
        '123',
        'Name123',
        'Name@Domain',
        '   ',
        'a'.repeat(101), // Too long
      ];

      invalidNames.forEach(name => {
        const result = validateTravelName(name);
        expect(result.isValid).toBe(false);
      });
    });

    it('should reject names with invalid spacing', () => {
      const result = validateTravelName('  John  ');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('invalid spacing');
    });
  });

  describe('validateOccupation', () => {
    it('should validate correct occupations', () => {
      const validOccupations = [
        'Software Engineer',
        'Doctor',
        'Teacher/Professor',
        'Sales-Manager',
      ];

      validOccupations.forEach(occupation => {
        const result = validateOccupation(occupation);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid occupations', () => {
      const invalidOccupations = [
        '',
        'A', // Too short
        'a'.repeat(51), // Too long
        'Occupation123',
        'Job@Company',
      ];

      invalidOccupations.forEach(occupation => {
        const result = validateOccupation(occupation);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('validateAddress', () => {
    it('should validate complete address', () => {
      const address = {
        line1: '123 Main Street',
        line2: 'Apt 4B',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
      };

      const result = validateAddress(address);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should validate minimal address', () => {
      const address = {
        line1: '123 Main Street',
        city: 'New York',
      };

      const result = validateAddress(address);
      expect(result.isValid).toBe(true);
    });

    it('should reject address without line1', () => {
      const address = {
        city: 'New York',
      };

      const result = validateAddress(address);
      expect(result.isValid).toBe(false);
      expect(result.errors.line1).toBeDefined();
    });

    it('should reject address without city', () => {
      const address = {
        line1: '123 Main Street',
      };

      const result = validateAddress(address);
      expect(result.isValid).toBe(false);
      expect(result.errors.city).toBeDefined();
    });

    it('should validate postal code with country', () => {
      const address = {
        line1: '123 Main Street',
        city: 'New York',
        postalCode: 'invalid',
        country: 'USA',
      };

      const result = validateAddress(address);
      expect(result.isValid).toBe(false);
      expect(result.errors.postalCode).toBeDefined();
    });
  });

  describe('validateCurrencyAmount', () => {
    it('should validate correct currency amounts', () => {
      const amounts = [0, 100, 1000.50, '500'];

      amounts.forEach(amount => {
        const result = validateCurrencyAmount(amount);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject invalid currency amounts', () => {
      const invalidAmounts = ['invalid', -100, NaN];

      invalidAmounts.forEach(amount => {
        const result = validateCurrencyAmount(amount);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should reject amounts exceeding maximum', () => {
      const result = validateCurrencyAmount(1000001);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('maximum limit');
    });

    it('should provide country-specific warnings', () => {
      const result = validateCurrencyAmount(1500000, 'JPY', 'JPN');
      expect(result.isValid).toBe(true);
      expect(result.warning).toContain('¥1,000,000');
    });

    it('should warn for US currency threshold', () => {
      const result = validateCurrencyAmount(15000, 'USD', 'USA');
      expect(result.isValid).toBe(true);
      expect(result.warning).toContain('$10,000');
    });

    it('should warn for Singapore currency threshold', () => {
      const result = validateCurrencyAmount(25000, 'SGD', 'SGP');
      expect(result.isValid).toBe(true);
      expect(result.warning).toContain('S$20,000');
    });
  });

  describe('sanitizeFormInput', () => {
    it('should trim whitespace', () => {
      expect(sanitizeFormInput('  hello world  ')).toBe('hello world');
    });

    it('should replace multiple spaces with single space', () => {
      expect(sanitizeFormInput('hello    world')).toBe('hello world');
    });

    it('should remove dangerous characters', () => {
      expect(sanitizeFormInput('hello<script>world')).toBe('helloscriptworld');
    });

    it('should limit length', () => {
      const longString = 'a'.repeat(1500);
      const result = sanitizeFormInput(longString);
      expect(result.length).toBe(1000);
    });

    it('should handle non-string input', () => {
      expect(sanitizeFormInput(null as any)).toBe('');
      expect(sanitizeFormInput(undefined as any)).toBe('');
    });
  });

  describe('isRequired', () => {
    it('should accept valid values', () => {
      const validValues = ['hello', 123, true, 0, false];

      validValues.forEach(value => {
        const result = isRequired(value);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid values', () => {
      const invalidValues = [null, undefined, '', '   '];

      invalidValues.forEach(value => {
        const result = isRequired(value);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('required');
      });
    });

    it('should use custom field name', () => {
      const result = isRequired(null, 'Email');
      expect(result.error).toContain('Email is required');
    });
  });

  describe('validateLength', () => {
    it('should validate correct lengths', () => {
      const result = validateLength('hello', { min: 3, max: 10 });
      expect(result.isValid).toBe(true);
    });

    it('should reject strings that are too short', () => {
      const result = validateLength('hi', { min: 3 });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least 3');
    });

    it('should reject strings that are too long', () => {
      const result = validateLength('hello world', { max: 5 });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot exceed 5');
    });

    it('should handle non-string input', () => {
      const result = validateLength(123 as any, { min: 3 });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be a string');
    });
  });

  describe('validateRange', () => {
    it('should validate correct ranges', () => {
      const result = validateRange(5, { min: 1, max: 10 });
      expect(result.isValid).toBe(true);
    });

    it('should reject numbers below minimum', () => {
      const result = validateRange(0, { min: 1 });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least 1');
    });

    it('should reject numbers above maximum', () => {
      const result = validateRange(11, { max: 10 });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot exceed 10');
    });

    it('should handle non-number input', () => {
      const result = validateRange('not a number' as any, { min: 1 });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be a number');
    });

    it('should handle NaN', () => {
      const result = validateRange(NaN, { min: 1 });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be a number');
    });
  });

  describe('VALIDATION_PATTERNS', () => {
    it('should have correct passport patterns', () => {
      expect(VALIDATION_PATTERNS.passport.default.test('AB123456')).toBe(true);
      expect(VALIDATION_PATTERNS.passport.US.test('123456789')).toBe(true);
      expect(VALIDATION_PATTERNS.passport.UK.test('123456789')).toBe(true);
    });

    it('should have correct email pattern', () => {
      expect(VALIDATION_PATTERNS.email.test('test@example.com')).toBe(true);
      expect(VALIDATION_PATTERNS.email.test('invalid')).toBe(false);
    });

    it('should have correct flight number pattern', () => {
      expect(VALIDATION_PATTERNS.flightNumber.test('AA123')).toBe(true);
      expect(VALIDATION_PATTERNS.flightNumber.test('BA4567A')).toBe(true);
      expect(VALIDATION_PATTERNS.flightNumber.test('123')).toBe(false);
    });

    it('should have correct phone patterns', () => {
      expect(VALIDATION_PATTERNS.phone.international.test('+1234567890')).toBe(true);
      expect(VALIDATION_PATTERNS.phone.us.test('(555) 123-4567')).toBe(true);
      expect(VALIDATION_PATTERNS.phone.general.test('555-123-4567')).toBe(true);
    });
  });
});