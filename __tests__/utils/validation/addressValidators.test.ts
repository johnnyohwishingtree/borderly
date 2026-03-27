import {
  validatePostalCode,
  validateCountryCode,
} from '../../../src/utils/validation/addressValidators';

// ---------------------------------------------------------------------------
// validatePostalCode
// ---------------------------------------------------------------------------
describe('validatePostalCode', () => {
  // USA formats
  it('accepts valid US 5-digit zip', () => {
    const result = validatePostalCode('90210', 'USA');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('accepts valid US ZIP+4 format', () => {
    const result = validatePostalCode('90210-1234', 'USA');
    expect(result.isValid).toBe(true);
  });

  it('rejects invalid US zip with letters', () => {
    const result = validatePostalCode('9021A', 'USA');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid postal code format for this country');
  });

  it('rejects US zip with wrong length', () => {
    const result = validatePostalCode('902', 'USA');
    expect(result.isValid).toBe(false);
  });

  // GBR formats
  it('accepts valid UK postcode (A9 9AA)', () => {
    const result = validatePostalCode('M1 1AA', 'GBR');
    expect(result.isValid).toBe(true);
  });

  it('accepts valid UK postcode (AA9A 9AA)', () => {
    const result = validatePostalCode('SW1A 1AA', 'GBR');
    expect(result.isValid).toBe(true);
  });

  it('rejects invalid UK postcode', () => {
    const result = validatePostalCode('12345', 'GBR');
    expect(result.isValid).toBe(false);
  });

  // CAN formats
  it('accepts valid Canadian postal code', () => {
    const result = validatePostalCode('K1A 0B1', 'CAN');
    expect(result.isValid).toBe(true);
  });

  it('accepts Canadian postal code without space', () => {
    const result = validatePostalCode('K1A0B1', 'CAN');
    expect(result.isValid).toBe(true);
  });

  it('rejects invalid Canadian postal code', () => {
    const result = validatePostalCode('123456', 'CAN');
    expect(result.isValid).toBe(false);
  });

  // JPN / general format
  it('accepts valid Japanese postal code via general pattern', () => {
    const result = validatePostalCode('100-0001', 'JPN');
    expect(result.isValid).toBe(true);
  });

  // Edge cases
  it('rejects empty input', () => {
    const result = validatePostalCode('', 'USA');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Postal code is required');
  });

  it('trims and uppercases input', () => {
    const result = validatePostalCode('  m1 1aa  ', 'GBR');
    expect(result.isValid).toBe(true);
  });

  it('handles case-insensitive country', () => {
    const result = validatePostalCode('90210', 'usa');
    expect(result.isValid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateCountryCode
// ---------------------------------------------------------------------------
describe('validateCountryCode', () => {
  // ISO 3166-1 alpha-3 (default)
  it('accepts valid alpha-3 code (USA)', () => {
    const result = validateCountryCode('USA');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('accepts valid alpha-3 code (JPN)', () => {
    const result = validateCountryCode('JPN', 'iso3');
    expect(result.isValid).toBe(true);
  });

  it('rejects 2-letter code as alpha-3', () => {
    const result = validateCountryCode('US', 'iso3');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('ISO 3166-1 alpha-3');
  });

  it('rejects numbers as alpha-3', () => {
    const result = validateCountryCode('123');
    expect(result.isValid).toBe(false);
  });

  // ISO 3166-1 alpha-2
  it('accepts valid alpha-2 code (US)', () => {
    const result = validateCountryCode('US', 'iso2');
    expect(result.isValid).toBe(true);
  });

  it('accepts valid alpha-2 code (JP)', () => {
    const result = validateCountryCode('JP', 'iso2');
    expect(result.isValid).toBe(true);
  });

  it('rejects 3-letter code as alpha-2', () => {
    const result = validateCountryCode('USA', 'iso2');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('ISO 3166-1 alpha-2');
  });

  // Edge cases
  it('rejects empty input', () => {
    const result = validateCountryCode('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Country code is required');
  });

  it('trims and uppercases input', () => {
    const result = validateCountryCode('  usa  ');
    expect(result.isValid).toBe(true);
  });
});
