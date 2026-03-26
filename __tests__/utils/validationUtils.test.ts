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
  isRequired,
  VALIDATION_PATTERNS,
} from '../../src/utils/validation/index';

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