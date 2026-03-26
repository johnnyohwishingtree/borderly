import { DataTransformer } from '../../../src/services/automation/dataTransformer';

// ---------------------------------------------------------------------------
// transformDate
// ---------------------------------------------------------------------------
describe('transformDate', () => {
  it('converts YYYY-MM-DD to DD/MM/YYYY', () => {
    const result = DataTransformer.transformDate('2024-03-15', 'YYYY-MM-DD', 'DD/MM/YYYY');
    expect(result).toBe('15/03/2024');
  });

  it('converts DD/MM/YYYY to YYYY-MM-DD', () => {
    const result = DataTransformer.transformDate('15/03/2024', 'DD/MM/YYYY', 'YYYY-MM-DD');
    expect(result).toBe('2024-03-15');
  });

  it('converts MM/DD/YYYY to DD-MM-YYYY', () => {
    const result = DataTransformer.transformDate('03/15/2024', 'MM/DD/YYYY', 'DD-MM-YYYY');
    expect(result).toBe('15-03-2024');
  });

  it('converts to YYYY/MM/DD format', () => {
    const result = DataTransformer.transformDate('2024-03-15', 'YYYY-MM-DD', 'YYYY/MM/DD');
    expect(result).toBe('2024/03/15');
  });

  it('converts to MM/DD/YYYY format', () => {
    const result = DataTransformer.transformDate('2024-03-15', 'YYYY-MM-DD', 'MM/DD/YYYY');
    expect(result).toBe('03/15/2024');
  });

  it('returns original string for invalid date', () => {
    const result = DataTransformer.transformDate('not-a-date', 'YYYY-MM-DD', 'DD/MM/YYYY');
    expect(result).toBe('not-a-date');
  });

  it('returns original string for unknown target format', () => {
    const result = DataTransformer.transformDate('2024-03-15', 'YYYY-MM-DD', 'UNKNOWN');
    expect(result).toBe('2024-03-15');
  });

  it('falls back to Date constructor for unknown source format', () => {
    // "Mar 15, 2024" is parseable by Date constructor
    const result = DataTransformer.transformDate('Mar 15, 2024', 'UNKNOWN', 'YYYY-MM-DD');
    expect(result).toBe('2024-03-15');
  });
});

// ---------------------------------------------------------------------------
// transformCountryCode
// ---------------------------------------------------------------------------
describe('transformCountryCode', () => {
  it('converts ISO2 to ISO3', () => {
    expect(DataTransformer.transformCountryCode('US', 'ISO2', 'ISO3')).toBe('USA');
  });

  it('converts ISO3 to NAME', () => {
    expect(DataTransformer.transformCountryCode('JPN', 'ISO3', 'NAME')).toBe('Japan');
  });

  it('converts NAME to ISO2 (case insensitive)', () => {
    expect(DataTransformer.transformCountryCode('united kingdom', 'NAME', 'ISO2')).toBe('GB');
  });

  it('returns original code when not found', () => {
    expect(DataTransformer.transformCountryCode('ZZ', 'ISO2', 'ISO3')).toBe('ZZ');
  });
});

// ---------------------------------------------------------------------------
// transformPhoneNumber
// ---------------------------------------------------------------------------
describe('transformPhoneNumber', () => {
  it('adds country code to phone number', () => {
    expect(DataTransformer.transformPhoneNumber('0312345678', 'JP')).toBe('+81312345678');
  });

  it('strips non-digit characters', () => {
    expect(DataTransformer.transformPhoneNumber('(03) 1234-5678', 'JP')).toBe('+81312345678');
  });

  it('returns as-is when phone already has + prefix', () => {
    expect(DataTransformer.transformPhoneNumber('+819012345678', 'JP')).toBe('+819012345678');
  });

  it('removes leading zero before adding country code', () => {
    expect(DataTransformer.transformPhoneNumber('0412345678', 'AU')).toBe('+61412345678');
  });

  it('returns original for unknown country', () => {
    expect(DataTransformer.transformPhoneNumber('12345', 'ZZ')).toBe('12345');
  });
});

// ---------------------------------------------------------------------------
// transformBoolean
// ---------------------------------------------------------------------------
describe('transformBoolean', () => {
  it('returns Yes/No for yes_no format', () => {
    expect(DataTransformer.transformBoolean(true, 'yes_no')).toBe('Yes');
    expect(DataTransformer.transformBoolean(false, 'yes_no')).toBe('No');
  });

  it('returns 1/0 for 1_0 format', () => {
    expect(DataTransformer.transformBoolean(true, '1_0')).toBe('1');
    expect(DataTransformer.transformBoolean(false, '1_0')).toBe('0');
  });

  it('returns On/Off for on_off format', () => {
    expect(DataTransformer.transformBoolean(true, 'on_off')).toBe('On');
    expect(DataTransformer.transformBoolean(false, 'on_off')).toBe('Off');
  });

  it('returns checked/unchecked for checked_unchecked format', () => {
    expect(DataTransformer.transformBoolean(true, 'checked_unchecked')).toBe('checked');
    expect(DataTransformer.transformBoolean(false, 'checked_unchecked')).toBe('unchecked');
  });
});

// ---------------------------------------------------------------------------
// normalizeText
// ---------------------------------------------------------------------------
describe('normalizeText', () => {
  it('removes extra whitespace by default', () => {
    expect(DataTransformer.normalizeText('  hello   world  ')).toBe('hello world');
  });

  it('removes special characters when requested', () => {
    expect(DataTransformer.normalizeText('hello@world!', { removeSpecialChars: true })).toBe('helloworld');
  });

  it('converts to upper case', () => {
    expect(DataTransformer.normalizeText('hello', { toUpperCase: true })).toBe('HELLO');
  });

  it('converts to lower case', () => {
    expect(DataTransformer.normalizeText('HELLO', { toLowerCase: true })).toBe('hello');
  });

  it('truncates to maxLength', () => {
    expect(DataTransformer.normalizeText('hello world', { maxLength: 5 })).toBe('hello');
  });

  it('preserves extra spaces when removeExtraSpaces is false', () => {
    expect(DataTransformer.normalizeText('  a  b  ', { removeExtraSpaces: false })).toBe('  a  b  ');
  });
});
