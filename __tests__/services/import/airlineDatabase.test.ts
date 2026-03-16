import {
  lookupAirline,
  extractAirlineCode,
  extractFlightNumeric,
  AIRLINE_DATABASE,
} from '../../../src/services/import/airlineDatabase';

describe('lookupAirline', () => {
  it('finds ANA by code', () => {
    const airline = lookupAirline('NH');
    expect(airline).toMatchObject({
      code: 'NH',
      name: 'All Nippon Airways',
      country: 'JPN',
    });
  });

  it('is case-insensitive', () => {
    expect(lookupAirline('sq')?.name).toBe('Singapore Airlines');
  });

  it('returns null for unknown code', () => {
    expect(lookupAirline('ZZ')).toBeNull();
  });

  it('covers all supported destination airlines', () => {
    // Japan
    expect(lookupAirline('NH')).not.toBeNull();
    expect(lookupAirline('JL')).not.toBeNull();
    // Malaysia
    expect(lookupAirline('MH')).not.toBeNull();
    expect(lookupAirline('AK')).not.toBeNull();
    // Singapore
    expect(lookupAirline('SQ')).not.toBeNull();
    expect(lookupAirline('TR')).not.toBeNull();
  });

  it('has consistent code fields', () => {
    for (const [key, airline] of Object.entries(AIRLINE_DATABASE)) {
      expect(airline.code).toBe(key);
    }
  });
});

describe('extractAirlineCode', () => {
  it('extracts from "NH101"', () => {
    expect(extractAirlineCode('NH101')).toBe('NH');
  });

  it('extracts from "JL 723" (with space)', () => {
    expect(extractAirlineCode('JL 723')).toBe('JL');
  });

  it('extracts from lowercase "sq12"', () => {
    expect(extractAirlineCode('sq12')).toBe('SQ');
  });

  it('returns null for "12345" (no letters)', () => {
    expect(extractAirlineCode('12345')).toBeNull();
  });

  it('returns null for "ABC" (no digits)', () => {
    expect(extractAirlineCode('ABC')).toBeNull();
  });
});

describe('extractFlightNumeric', () => {
  it('extracts "101" from "NH101"', () => {
    expect(extractFlightNumeric('NH101')).toBe('101');
  });

  it('extracts "723" from "JL 723"', () => {
    expect(extractFlightNumeric('JL 723')).toBe('723');
  });

  it('returns null for invalid input', () => {
    expect(extractFlightNumeric('hello')).toBeNull();
  });
});
