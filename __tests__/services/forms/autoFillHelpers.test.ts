/**
 * Tests for forms/autoFillLogic/autoFillHelpers
 */

import {
  isValidFieldValue,
  predictPurposeOfVisit,
  getCommonStayDuration,
  convertNationalityToDisplayName,
  formatAddressForCountry,
  getCurrencyThreshold,
  extractAirlineFromFlight,
  expandAirlineName,
  getSmartDeclarationDefault,
} from '@/services/forms/autoFillLogic/autoFillHelpers';
import { FormContext } from '@/services/forms/fieldMapper';
import { Address } from '@/types/profile';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeContext(overrides?: Partial<FormContext>): FormContext {
  return {
    profile: {
      id: 'p1',
      surname: 'Tanaka',
      givenNames: 'Taro',
      nationality: 'JPN',
      gender: 'male',
      dateOfBirth: '1990-01-01',
      passportNumber: 'AB1234567',
      passportExpiry: '2030-12-31',
      passportIssuingCountry: 'JPN',
      defaultDeclarations: {
        carryingProhibitedItems: false,
        carryingCurrency: false,
        carryingCommercialGoods: false,
        visitedFarm: false,
        hasCriminalRecord: false,
        hasItemsToDeclare: false,
      },
    } as unknown as FormContext['profile'],
    leg: {
      arrivalDate: '2026-04-01',
      departureDate: '2026-04-10',
      destinationCountry: 'JPN',
      accommodation: { name: 'Hotel Tokyo', address: { line1: '1-1', city: 'Tokyo', postalCode: '100-0001', country: 'JPN' } },
    } as FormContext['leg'],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// isValidFieldValue
// ---------------------------------------------------------------------------
describe('isValidFieldValue', () => {
  it('returns false for null/undefined/empty', () => {
    expect(isValidFieldValue(null, 'text')).toBe(false);
    expect(isValidFieldValue(undefined, 'text')).toBe(false);
    expect(isValidFieldValue('', 'text')).toBe(false);
  });

  it('validates text fields', () => {
    expect(isValidFieldValue('hello', 'text')).toBe(true);
    expect(isValidFieldValue('  ', 'text')).toBe(false);
  });

  it('validates number fields', () => {
    expect(isValidFieldValue(42, 'number')).toBe(true);
    expect(isValidFieldValue(NaN, 'number')).toBe(false);
    expect(isValidFieldValue('42', 'number')).toBe(false);
  });

  it('validates date fields', () => {
    expect(isValidFieldValue('2026-01-01', 'date')).toBe(true);
    expect(isValidFieldValue('not-a-date', 'date')).toBe(false);
  });

  it('validates boolean fields', () => {
    expect(isValidFieldValue(true, 'boolean')).toBe(true);
    expect(isValidFieldValue(false, 'boolean')).toBe(true);
    expect(isValidFieldValue('true', 'boolean')).toBe(false);
  });

  it('validates select fields', () => {
    expect(isValidFieldValue('option1', 'select')).toBe(true);
    expect(isValidFieldValue('', 'select')).toBe(false);
  });

  it('validates address fields', () => {
    expect(isValidFieldValue({ line1: 'x' }, 'address')).toBe(true);
    expect(isValidFieldValue('string', 'address')).toBe(false);
  });

  it('returns false for unknown field types', () => {
    expect(isValidFieldValue('x', 'unknown')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// predictPurposeOfVisit
// ---------------------------------------------------------------------------
describe('predictPurposeOfVisit', () => {
  it('returns transit for 1-2 day stays', () => {
    const ctx = makeContext({
      leg: { arrivalDate: '2026-04-01', departureDate: '2026-04-02' } as FormContext['leg'],
    });
    expect(predictPurposeOfVisit(ctx)).toBe('transit');
  });

  it('returns visiting_relatives for stays over 30 days', () => {
    const ctx = makeContext({
      leg: { arrivalDate: '2026-04-01', departureDate: '2026-06-01' } as FormContext['leg'],
    });
    expect(predictPurposeOfVisit(ctx)).toBe('visiting_relatives');
  });

  it('returns tourism for hotel accommodation', () => {
    const ctx = makeContext();
    expect(predictPurposeOfVisit(ctx)).toBe('tourism');
  });
});

// ---------------------------------------------------------------------------
// getCommonStayDuration
// ---------------------------------------------------------------------------
describe('getCommonStayDuration', () => {
  it('returns 14 for Japan', () => {
    expect(getCommonStayDuration('JPN')).toBe(14);
  });

  it('returns 5 for Singapore', () => {
    expect(getCommonStayDuration('SGP')).toBe(5);
  });

  it('returns 10 as default', () => {
    expect(getCommonStayDuration('XYZ')).toBe(10);
    expect(getCommonStayDuration()).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// convertNationalityToDisplayName
// ---------------------------------------------------------------------------
describe('convertNationalityToDisplayName', () => {
  it('converts known codes to display names', () => {
    expect(convertNationalityToDisplayName('USA')).toBe('United States');
    expect(convertNationalityToDisplayName('JPN')).toBe('Japan');
    expect(convertNationalityToDisplayName('GBR')).toBe('United Kingdom');
  });

  it('returns the code itself for unknown countries', () => {
    expect(convertNationalityToDisplayName('XYZ')).toBe('XYZ');
  });
});

// ---------------------------------------------------------------------------
// formatAddressForCountry
// ---------------------------------------------------------------------------
describe('formatAddressForCountry', () => {
  const address: Address = { line1: '1-1 Chiyoda', city: 'Tokyo', postalCode: '100-0001', country: 'JPN' };

  it('formats Japanese addresses with postal code first', () => {
    const result = formatAddressForCountry(address, 'JPN');
    expect(result.startsWith('100-0001')).toBe(true);
  });

  it('formats other addresses with comma separation', () => {
    const result = formatAddressForCountry(address, 'USA');
    expect(result).toContain(', ');
  });
});

// ---------------------------------------------------------------------------
// getCurrencyThreshold
// ---------------------------------------------------------------------------
describe('getCurrencyThreshold', () => {
  it('returns country-specific thresholds', () => {
    expect(getCurrencyThreshold('JPN')).toBe(1000000);
    expect(getCurrencyThreshold('USA')).toBe(10000);
  });

  it('returns null for unknown countries', () => {
    expect(getCurrencyThreshold('XYZ')).toBeNull();
    expect(getCurrencyThreshold()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// extractAirlineFromFlight
// ---------------------------------------------------------------------------
describe('extractAirlineFromFlight', () => {
  it('extracts 2-letter airline codes', () => {
    expect(extractAirlineFromFlight('JL001')).toBe('JL');
    expect(extractAirlineFromFlight('NH123')).toBe('NH');
  });

  it('extracts 3-letter codes', () => {
    expect(extractAirlineFromFlight('ANA456')).toBe('ANA');
  });

  it('returns null for invalid flight numbers', () => {
    expect(extractAirlineFromFlight('123')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// expandAirlineName
// ---------------------------------------------------------------------------
describe('expandAirlineName', () => {
  it('expands known airline codes', () => {
    expect(expandAirlineName('JL')).toBe('Japan Airlines');
    expect(expandAirlineName('SQ')).toBe('Singapore Airlines');
  });

  it('returns the code for unknown airlines', () => {
    expect(expandAirlineName('ZZ')).toBe('ZZ');
  });
});

// ---------------------------------------------------------------------------
// getSmartDeclarationDefault
// ---------------------------------------------------------------------------
describe('getSmartDeclarationDefault', () => {
  it('returns false for prohibited items when profile declares none', () => {
    const ctx = makeContext();
    const field = { id: 'carryingProhibitedItems' } as never;
    expect(getSmartDeclarationDefault(field, ctx)).toBe(false);
  });

  it('returns false for currency when profile has no currency to declare', () => {
    const ctx = makeContext();
    const field = { id: 'excessCurrency' } as never;
    expect(getSmartDeclarationDefault(field, ctx)).toBe(false);
  });

  it('returns null when field does not match any declaration category', () => {
    const ctx = makeContext();
    const field = { id: 'someRandomField' } as never;
    expect(getSmartDeclarationDefault(field, ctx)).toBeNull();
  });

  it('returns null when profile has no defaultDeclarations', () => {
    const ctx = makeContext({
      profile: { ...makeContext().profile, defaultDeclarations: undefined } as unknown as FormContext['profile'],
    });
    const field = { id: 'carryingProhibitedItems' } as never;
    expect(getSmartDeclarationDefault(field, ctx)).toBeNull();
  });
});
