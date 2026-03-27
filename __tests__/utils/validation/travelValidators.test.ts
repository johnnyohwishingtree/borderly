import {
  validatePassportNumber,
  validateFlightNumber,
  validateAirlineCode,
  validateAirportCode,
  validateTravelName,
  validateOccupation,
} from '../../../src/utils/validation/travelValidators';

// ---------------------------------------------------------------------------
// validatePassportNumber
// ---------------------------------------------------------------------------
describe('validatePassportNumber', () => {
  it('accepts valid USA passport (9 digits)', () => {
    const result = validatePassportNumber('123456789', 'USA');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('accepts valid GBR passport (9 digits)', () => {
    const result = validatePassportNumber('987654321', 'GBR');
    expect(result.isValid).toBe(true);
  });

  it('accepts valid JPN passport (letter + 7 digits)', () => {
    const result = validatePassportNumber('TK1234567', 'JPN');
    expect(result.isValid).toBe(true);
  });

  it('accepts valid default passport (alphanumeric 6-9 chars)', () => {
    const result = validatePassportNumber('AB123456');
    expect(result.isValid).toBe(true);
  });

  it('accepts valid EU passport (2 letters + 6-7 alphanumeric)', () => {
    const result = validatePassportNumber('DE1234567', 'DEU');
    expect(result.isValid).toBe(true);
  });

  it('rejects empty input', () => {
    const result = validatePassportNumber('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Passport number is required');
  });

  it('rejects too short passport number', () => {
    const result = validatePassportNumber('AB12');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Passport number must be 6-9 characters');
  });

  it('rejects too long passport number', () => {
    const result = validatePassportNumber('AB12345678');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Passport number must be 6-9 characters');
  });

  it('rejects USA passport with letters', () => {
    const result = validatePassportNumber('12345678A', 'USA');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid passport number format');
  });

  it('trims and uppercases input', () => {
    const result = validatePassportNumber('  ab123456  ');
    expect(result.isValid).toBe(true);
  });

  it('strips internal spaces', () => {
    const result = validatePassportNumber('AB 123 456');
    expect(result.isValid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateFlightNumber
// ---------------------------------------------------------------------------
describe('validateFlightNumber', () => {
  it('accepts valid 2-letter + digits (NH123)', () => {
    const result = validateFlightNumber('NH123');
    expect(result.isValid).toBe(true);
  });

  it('accepts valid 2-letter + 4 digits (AA1234)', () => {
    const result = validateFlightNumber('AA1234');
    expect(result.isValid).toBe(true);
  });

  it('accepts 3-letter airline code + digits (ANA12)', () => {
    const result = validateFlightNumber('ANA12');
    expect(result.isValid).toBe(true);
  });

  it('accepts flight with trailing letter suffix (BA123A)', () => {
    const result = validateFlightNumber('BA123A');
    expect(result.isValid).toBe(true);
  });

  it('rejects empty input', () => {
    const result = validateFlightNumber('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Flight number is required');
  });

  it('rejects no digits (ABCD)', () => {
    const result = validateFlightNumber('ABCD');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid flight number format (e.g., AA123, BA4567)');
  });

  it('rejects digits only (12345)', () => {
    const result = validateFlightNumber('12345');
    expect(result.isValid).toBe(false);
  });

  it('rejects too many digits (AA12345)', () => {
    const result = validateFlightNumber('AA12345');
    expect(result.isValid).toBe(false);
  });

  it('trims and uppercases input', () => {
    const result = validateFlightNumber('  nh123  ');
    expect(result.isValid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateAirlineCode
// ---------------------------------------------------------------------------
describe('validateAirlineCode', () => {
  it('accepts valid IATA code (AA)', () => {
    const result = validateAirlineCode('AA');
    expect(result.isValid).toBe(true);
  });

  it('accepts valid IATA code (BA)', () => {
    const result = validateAirlineCode('BA', 'iata');
    expect(result.isValid).toBe(true);
  });

  it('accepts valid ICAO code (ANA)', () => {
    const result = validateAirlineCode('ANA', 'icao');
    expect(result.isValid).toBe(true);
  });

  it('rejects empty input', () => {
    const result = validateAirlineCode('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Airline code is required');
  });

  it('rejects 3-letter code as IATA', () => {
    const result = validateAirlineCode('ANA', 'iata');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('2-letter IATA code');
  });

  it('rejects 2-letter code as ICAO', () => {
    const result = validateAirlineCode('AA', 'icao');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('3-letter ICAO code');
  });

  it('rejects numbers in code', () => {
    const result = validateAirlineCode('A1');
    expect(result.isValid).toBe(false);
  });

  it('trims and uppercases input', () => {
    const result = validateAirlineCode('  aa  ');
    expect(result.isValid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateAirportCode
// ---------------------------------------------------------------------------
describe('validateAirportCode', () => {
  it('accepts valid code (LAX)', () => {
    const result = validateAirportCode('LAX');
    expect(result.isValid).toBe(true);
  });

  it('accepts valid code (NRT)', () => {
    const result = validateAirportCode('NRT');
    expect(result.isValid).toBe(true);
  });

  it('rejects empty input', () => {
    const result = validateAirportCode('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Airport code is required');
  });

  it('rejects 2-letter code', () => {
    const result = validateAirportCode('LA');
    expect(result.isValid).toBe(false);
  });

  it('rejects 4-letter code', () => {
    const result = validateAirportCode('RJTT');
    expect(result.isValid).toBe(false);
  });

  it('rejects numbers', () => {
    const result = validateAirportCode('L4X');
    expect(result.isValid).toBe(false);
  });

  it('trims and uppercases input', () => {
    const result = validateAirportCode('  jfk  ');
    expect(result.isValid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateTravelName
// ---------------------------------------------------------------------------
describe('validateTravelName', () => {
  it('accepts simple name', () => {
    const result = validateTravelName('John');
    expect(result.isValid).toBe(true);
  });

  it('accepts name with spaces', () => {
    const result = validateTravelName('John Doe');
    expect(result.isValid).toBe(true);
  });

  it('accepts hyphenated name', () => {
    const result = validateTravelName('Mary-Jane');
    expect(result.isValid).toBe(true);
  });

  it('accepts name with apostrophe', () => {
    const result = validateTravelName("O'Brien");
    expect(result.isValid).toBe(true);
  });

  it('accepts accented characters', () => {
    const result = validateTravelName('José García');
    expect(result.isValid).toBe(true);
  });

  it('accepts name with period', () => {
    const result = validateTravelName('Dr. Smith');
    expect(result.isValid).toBe(true);
  });

  it('rejects empty input', () => {
    const result = validateTravelName('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Name is required');
  });

  it('rejects name with double spaces', () => {
    const result = validateTravelName('John  Doe');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Name has invalid spacing');
  });

  it('rejects name with leading space', () => {
    const result = validateTravelName(' John');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Name has invalid spacing');
  });

  it('rejects name with trailing space', () => {
    const result = validateTravelName('John ');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Name has invalid spacing');
  });

  it('rejects name with numbers', () => {
    const result = validateTravelName('John123');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Name contains invalid characters');
  });

  it('rejects name over 100 characters', () => {
    const longName = 'A'.repeat(101);
    const result = validateTravelName(longName);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Name is too long (maximum 100 characters)');
  });

  it('accepts name at exactly 100 characters', () => {
    const maxName = 'A'.repeat(100);
    const result = validateTravelName(maxName);
    expect(result.isValid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateOccupation
// ---------------------------------------------------------------------------
describe('validateOccupation', () => {
  it('accepts valid occupation', () => {
    const result = validateOccupation('Engineer');
    expect(result.isValid).toBe(true);
  });

  it('accepts compound occupation with hyphen', () => {
    const result = validateOccupation('Self-Employed');
    expect(result.isValid).toBe(true);
  });

  it('accepts occupation with slash', () => {
    const result = validateOccupation('Writer/Editor');
    expect(result.isValid).toBe(true);
  });

  it('accepts multi-word occupation', () => {
    const result = validateOccupation('Software Engineer');
    expect(result.isValid).toBe(true);
  });

  it('rejects empty input', () => {
    const result = validateOccupation('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Occupation is required');
  });

  it('rejects single character (too short)', () => {
    const result = validateOccupation('A');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Occupation must be at least 2 characters');
  });

  it('accepts exactly 2 characters', () => {
    const result = validateOccupation('IT');
    expect(result.isValid).toBe(true);
  });

  it('rejects over 50 characters', () => {
    const longOccupation = 'A'.repeat(51);
    const result = validateOccupation(longOccupation);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Occupation is too long (maximum 50 characters)');
  });

  it('accepts exactly 50 characters', () => {
    const maxOccupation = 'A'.repeat(50);
    const result = validateOccupation(maxOccupation);
    expect(result.isValid).toBe(true);
  });

  it('rejects occupation with numbers', () => {
    const result = validateOccupation('Engineer123');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Occupation contains invalid characters');
  });

  it('rejects occupation with special characters', () => {
    const result = validateOccupation('Engineer@Company');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Occupation contains invalid characters');
  });
});
