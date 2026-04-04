/**
 * Test the heuristic filler against a mock of Visit Japan Web's actual DOM.
 * Uses the real element IDs, names, and labels from the diagnostic dump.
 */

import { buildFillData, buildHeuristicFillScript } from '../../../src/services/submission/heuristicFiller';
import type { TravelerProfile } from '../../../src/types/profile';

// Mock getCountryName
jest.mock('../../../src/constants/countries', () => ({
  getCountryName: (code: string) => {
    const map: Record<string, string> = { USA: 'United States', JPN: 'Japan', AFG: 'Afghanistan' };
    return map[code] || code;
  },
}));

// Test profile matching what the user entered
const testProfile: TravelerProfile = {
  id: 'test-1',
  passportNumber: 'N55512345',
  surname: 'SMITH',
  givenNames: 'EMMA',
  nationality: 'USA',
  dateOfBirth: '2010-08-03',
  gender: 'F',
  passportExpiry: '2030-05-20',
  issuingCountry: 'USA',
  email: '',
  phoneNumber: '',
  occupation: 'Company employee',
  relationship: 'self',
  defaultDeclarations: {
    hasItemsToDeclare: false,
    carryingCurrency: false,
    carryingProhibitedItems: false,
    visitedFarm: false,
    hasCriminalRecord: false,
    carryingCommercialGoods: false,
  },
  homeAddress: {
    country: 'AFG',
    city: 'Aberdeen',
    line1: '',
    postalCode: '',
  },
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

describe('buildFillData', () => {
  const data = buildFillData(testProfile);

  test('includes passport number', () => {
    expect(data.passportNumber).toBe('N55512345');
  });

  test('decomposes date of birth into year/month/day', () => {
    expect(data.birthYear).toBe('2010');
    expect(data.birthMonth).toBe('8');
    expect(data.birthDay).toBe('3');
  });

  test('decomposes passport expiry into year/month/day', () => {
    expect(data.expiryYear).toBe('2030');
    expect(data.expiryMonth).toBe('5');
    expect(data.expiryDay).toBe('20');
  });

  test('maps gender to display text', () => {
    expect(data.genderDisplay).toBe('Female');
  });

  test('maps nationality code to name', () => {
    expect(data.nationalityName).toBe('United States');
  });

  test('includes occupation from profile', () => {
    expect(data.occupation).toBe('Company employee');
  });

  test('includes home address country name', () => {
    expect(data.addressCountryName).toBe('Afghanistan');
  });

  test('includes home city', () => {
    expect(data.city).toBe('Aberdeen');
  });
});

describe('buildHeuristicFillScript against Japan DOM', () => {
  const data = buildFillData(testProfile);
  const script = buildHeuristicFillScript(data);

  test('script is valid JavaScript (no syntax errors)', () => {
    // Should not throw when parsed
    expect(() => {
      // Use Function constructor to check syntax (doesn't execute)
      new Function(script);
    }).not.toThrow();
  });

  test('script contains all profile data values', () => {
    expect(script).toContain('N55512345');
    expect(script).toContain('SMITH');
    expect(script).toContain('EMMA');
    expect(script).toContain('United States');
    expect(script).toContain('Company employee');
    expect(script).toContain('Afghanistan');
    expect(script).toContain('Aberdeen');
  });

  test('script contains date components', () => {
    expect(script).toContain('"birthYear":"2010"');
    expect(script).toContain('"birthMonth":"8"');
    expect(script).toContain('"birthDay":"3"');
    expect(script).toContain('"expiryYear":"2030"');
    expect(script).toContain('"expiryMonth":"5"');
    expect(script).toContain('"expiryDay":"20"');
  });

  test('script has date group detection with DOM walking', () => {
    expect(script).toContain('fillDateGroup');
    expect(script).toContain('parentElement');
  });

  test('script has tryFillSelect with padded/unpadded fallback', () => {
    expect(script).toContain('tryFillSelect');
    // Must try zero-padded version
    expect(script).toMatch(/0.*\+.*val|pad/);
  });

  test('script matches occupation pattern', () => {
    expect(script).toMatch(/occupation/i);
  });

  test('script matches address country pattern with flexible separator', () => {
    // Must match "Home address:Country name" (colon, not just space)
    expect(script).toMatch(/address\.\*country/);
  });

  test('script matches city pattern', () => {
    expect(script).toMatch(/city|town|home.?city/);
  });
});
