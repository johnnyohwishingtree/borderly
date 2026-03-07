import {
  formatFieldValue,
  formatCurrencyValue,
  formatDuration,
  formatPhoneNumber,
  formatAddress,
  formatPassportNumber,
  formatCountryName,
  formatGender,
} from '../../src/utils/fieldFormatters';

describe('Field Formatters', () => {
  describe('formatFieldValue', () => {
    it('formats boolean values correctly', () => {
      expect(formatFieldValue(true, 'boolean')).toBe('Yes');
      expect(formatFieldValue(false, 'boolean')).toBe('No');
    });

    it('formats date values correctly', () => {
      const dateString = '2025-12-31';
      const formatted = formatFieldValue(dateString, 'date');
      expect(formatted).toBe('December 31, 2025');
    });

    it('handles invalid date strings', () => {
      const invalidDate = 'invalid-date';
      expect(formatFieldValue(invalidDate, 'date')).toBe('invalid-date');
    });

    it('formats number values correctly', () => {
      expect(formatFieldValue(42, 'number')).toBe('42');
      expect(formatFieldValue(3.14, 'number')).toBe('3.14');
    });

    it('formats string values correctly', () => {
      expect(formatFieldValue('Hello World', 'text')).toBe('Hello World');
      expect(formatFieldValue('Test', 'select')).toBe('Test');
      expect(formatFieldValue('Long text...', 'textarea')).toBe('Long text...');
    });

    it('handles null and undefined values', () => {
      expect(formatFieldValue(null, 'text')).toBe('');
      expect(formatFieldValue(undefined, 'text')).toBe('');
      expect(formatFieldValue('', 'text')).toBe('');
    });

    it('handles unknown field types', () => {
      expect(formatFieldValue('value', 'unknown')).toBe('value');
    });
  });

  describe('formatCurrencyValue', () => {
    it('formats USD currency correctly', () => {
      expect(formatCurrencyValue(1000)).toBe('$1,000.00');
      expect(formatCurrencyValue(1234.56)).toBe('$1,234.56');
    });

    it('formats other currencies correctly', () => {
      expect(formatCurrencyValue(1000, 'EUR')).toBe('€1,000.00');
      expect(formatCurrencyValue(1000, 'JPY')).toBe('¥1,000');
    });

    it('handles invalid currency codes gracefully', () => {
      const result = formatCurrencyValue(1000, 'INVALID');
      expect(result).toBe('INVALID 1000.00');
    });

    it('handles decimal values correctly', () => {
      expect(formatCurrencyValue(99.99)).toBe('$99.99');
      expect(formatCurrencyValue(0.01)).toBe('$0.01');
    });
  });

  describe('formatDuration', () => {
    it('formats single day correctly', () => {
      expect(formatDuration(1)).toBe('1 day');
    });

    it('formats multiple days correctly', () => {
      expect(formatDuration(5)).toBe('5 days');
    });

    it('formats single week correctly', () => {
      expect(formatDuration(7)).toBe('1 week');
    });

    it('formats multiple weeks correctly', () => {
      expect(formatDuration(14)).toBe('2 weeks');
    });

    it('formats weeks with remaining days correctly', () => {
      expect(formatDuration(8)).toBe('1 week, 1 day');
      expect(formatDuration(16)).toBe('2 weeks, 2 days');
    });

    it('handles zero duration', () => {
      expect(formatDuration(0)).toBe('0 days');
    });
  });

  describe('formatPhoneNumber', () => {
    it('formats 10-digit US numbers correctly', () => {
      expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890');
      expect(formatPhoneNumber('123-456-7890')).toBe('(123) 456-7890');
      expect(formatPhoneNumber('(123) 456-7890')).toBe('(123) 456-7890');
    });

    it('formats 11-digit US numbers with country code correctly', () => {
      expect(formatPhoneNumber('11234567890')).toBe('+1 (123) 456-7890');
      expect(formatPhoneNumber('+1-123-456-7890')).toBe('+1 (123) 456-7890');
    });

    it('formats international numbers correctly', () => {
      expect(formatPhoneNumber('+44123456789')).toBe('+44123456789');
      expect(formatPhoneNumber('447890123456')).toBe('+447890123456');
    });

    it('handles short numbers gracefully', () => {
      expect(formatPhoneNumber('123456')).toBe('123456');
      expect(formatPhoneNumber('911')).toBe('911');
    });

    it('handles empty or invalid numbers', () => {
      expect(formatPhoneNumber('')).toBe('');
      expect(formatPhoneNumber('abc')).toBe('abc');
    });
  });

  describe('formatAddress', () => {
    it('formats complete address correctly', () => {
      const address = {
        line1: '123 Main St',
        line2: 'Apt 4B',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
      };

      expect(formatAddress(address)).toBe('123 Main St, Apt 4B, New York, NY, 10001, USA');
    });

    it('formats address without optional fields correctly', () => {
      const address = {
        line1: '456 Oak Ave',
        city: 'Los Angeles',
        postalCode: '90210',
        country: 'USA',
      };

      expect(formatAddress(address)).toBe('456 Oak Ave, Los Angeles, 90210, USA');
    });

    it('handles empty address fields correctly', () => {
      const address = {
        line1: '789 Pine St',
        line2: '',
        city: 'Chicago',
        state: '',
        postalCode: '60601',
        country: 'USA',
      };

      expect(formatAddress(address)).toBe('789 Pine St, Chicago, 60601, USA');
    });
  });

  describe('formatPassportNumber', () => {
    it('formats passport number correctly', () => {
      expect(formatPassportNumber('abc123456')).toBe('ABC123456');
      expect(formatPassportNumber('  xyz789  ')).toBe('XYZ789');
    });

    it('handles mixed case and spaces', () => {
      expect(formatPassportNumber('Ab C 123 456')).toBe('ABC123456');
    });

    it('handles empty passport number', () => {
      expect(formatPassportNumber('')).toBe('');
    });
  });

  describe('formatCountryName', () => {
    it('formats known country codes correctly', () => {
      expect(formatCountryName('JPN')).toBe('Japan');
      expect(formatCountryName('MYS')).toBe('Malaysia');
      expect(formatCountryName('SGP')).toBe('Singapore');
      expect(formatCountryName('USA')).toBe('United States');
      expect(formatCountryName('GBR')).toBe('United Kingdom');
    });

    it('handles unknown country codes', () => {
      expect(formatCountryName('XYZ')).toBe('XYZ');
      expect(formatCountryName('')).toBe('');
    });

    it('handles various Asian countries', () => {
      expect(formatCountryName('CHN')).toBe('China');
      expect(formatCountryName('KOR')).toBe('South Korea');
      expect(formatCountryName('THA')).toBe('Thailand');
      expect(formatCountryName('VNM')).toBe('Vietnam');
    });

    it('handles European countries', () => {
      expect(formatCountryName('DEU')).toBe('Germany');
      expect(formatCountryName('FRA')).toBe('France');
      expect(formatCountryName('ITA')).toBe('Italy');
      expect(formatCountryName('ESP')).toBe('Spain');
    });
  });

  describe('formatGender', () => {
    it('formats gender codes correctly', () => {
      expect(formatGender('M')).toBe('Male');
      expect(formatGender('F')).toBe('Female');
      expect(formatGender('X')).toBe('Other');
    });

    it('handles invalid gender codes', () => {
      // TypeScript would prevent this, but testing runtime behavior
      expect(formatGender('Z' as any)).toBe('Z');
      expect(formatGender('' as any)).toBe('');
    });
  });
});