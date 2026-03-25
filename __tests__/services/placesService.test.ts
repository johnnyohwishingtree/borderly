/**
 * Unit tests for the places service.
 *
 * Tests cover:
 * - parseAddressComponents: mapping component types to Address fields
 * - alpha2ToAlpha3: ISO country code conversion
 * - getPlacesApiKey: always returns 'native' (no API key needed)
 * - getLodgingSuggestions: country code passed to native module, results cached
 * - getLodgingDetails: returns cached address data from previous search
 * - getAutocompleteSuggestions: returns empty when input too short
 */

import { NativeModules } from 'react-native';
import {
  parseAddressComponents,
  alpha2ToAlpha3,
  getPlacesApiKey,
  setPlacesApiKey,
  getLodgingSuggestions,
  getLodgingDetails,
  getAutocompleteSuggestions,
} from '../../src/services/places/placesService';

// ── Stable mock data ──

const MOCK_APPLE_RESULTS = [
  {
    placeId: 'hotel-1',
    name: 'Park Hyatt Tokyo',
    description: 'Park Hyatt Tokyo, Shinjuku, Japan',
    mainText: 'Park Hyatt Tokyo',
    secondaryText: 'Shinjuku, Japan',
    address: {
      line1: '3-7-1-2 Nishi-Shinjuku',
      city: 'Shinjuku',
      state: 'Tokyo',
      postalCode: '163-1055',
      country: 'JP',
    },
    formattedAddress: '3-7-1-2 Nishi-Shinjuku, Shinjuku, Tokyo, 163-1055, Japan',
  },
];

beforeEach(() => {
  jest.clearAllMocks();
});

// ── parseAddressComponents ──

describe('parseAddressComponents', () => {
  it('parses a full address with all component types', () => {
    const components = [
      { long_name: '123', short_name: '123', types: ['street_number'] },
      { long_name: 'Main Street', short_name: 'Main St', types: ['route'] },
      { long_name: 'Tokyo', short_name: 'Tokyo', types: ['locality'] },
      { long_name: 'Tokyo', short_name: 'TK', types: ['administrative_area_level_1'] },
      { long_name: '100-0001', short_name: '100-0001', types: ['postal_code'] },
      { long_name: 'Japan', short_name: 'JP', types: ['country'] },
    ];

    const result = parseAddressComponents(components);
    expect(result.line1).toBe('123 Main Street');
    expect(result.city).toBe('Tokyo');
    expect(result.state).toBe('TK');
    expect(result.postalCode).toBe('100-0001');
    expect(result.country).toBe('JPN');
  });

  it('handles missing components gracefully', () => {
    const result = parseAddressComponents([]);
    expect(result).toEqual({});
  });

  it('uses sublocality when locality is missing', () => {
    const components = [
      { long_name: 'Shinjuku', short_name: 'Shinjuku', types: ['sublocality_level_1'] },
    ];
    const result = parseAddressComponents(components);
    expect(result.city).toBe('Shinjuku');
  });

  it('prefers locality over sublocality', () => {
    const components = [
      { long_name: 'Tokyo', short_name: 'Tokyo', types: ['locality'] },
      { long_name: 'Shinjuku', short_name: 'Shinjuku', types: ['sublocality_level_1'] },
    ];
    const result = parseAddressComponents(components);
    expect(result.city).toBe('Tokyo');
  });
});

// ── alpha2ToAlpha3 ──

describe('alpha2ToAlpha3', () => {
  it('converts known country codes', () => {
    expect(alpha2ToAlpha3('JP')).toBe('JPN');
    expect(alpha2ToAlpha3('US')).toBe('USA');
    expect(alpha2ToAlpha3('GB')).toBe('GBR');
    expect(alpha2ToAlpha3('SG')).toBe('SGP');
    expect(alpha2ToAlpha3('MY')).toBe('MYS');
  });

  it('handles lowercase input', () => {
    expect(alpha2ToAlpha3('jp')).toBe('JPN');
  });

  it('returns input unchanged for unknown codes', () => {
    expect(alpha2ToAlpha3('ZZ')).toBe('ZZ');
  });
});

// ── getPlacesApiKey ──

describe('getPlacesApiKey', () => {
  it('returns "native" — no API key needed', () => {
    expect(getPlacesApiKey()).toBe('native');
  });
});

describe('setPlacesApiKey', () => {
  it('is a no-op', () => {
    expect(() => setPlacesApiKey('anything')).not.toThrow();
  });
});

// ── getLodgingSuggestions ──

describe('getLodgingSuggestions', () => {
  it('returns empty for short input', async () => {
    const result = await getLodgingSuggestions('ab');
    expect(result).toEqual([]);
  });

  it('returns empty for empty input', async () => {
    const result = await getLodgingSuggestions('');
    expect(result).toEqual([]);
  });

  it('passes countryCode to the native module', async () => {
    const mockSearch = NativeModules.ApplePlacesModule.search as jest.Mock;
    mockSearch.mockResolvedValueOnce(MOCK_APPLE_RESULTS);

    await getLodgingSuggestions('Park Hyatt', undefined, 'JPN');

    expect(mockSearch).toHaveBeenCalledWith('Park Hyatt', 'lodging', 'JPN');
  });

  it('passes empty string when no countryCode provided', async () => {
    const mockSearch = NativeModules.ApplePlacesModule.search as jest.Mock;
    mockSearch.mockResolvedValueOnce([]);

    await getLodgingSuggestions('Park Hyatt');

    expect(mockSearch).toHaveBeenCalledWith('Park Hyatt', 'lodging', '');
  });

  it('caches results for getLodgingDetails lookup', async () => {
    const mockSearch = NativeModules.ApplePlacesModule.search as jest.Mock;
    mockSearch.mockResolvedValueOnce(MOCK_APPLE_RESULTS);

    await getLodgingSuggestions('Park Hyatt', undefined, 'JPN');

    const details = await getLodgingDetails('hotel-1');
    expect(details).not.toBeNull();
    expect(details!.name).toBe('Park Hyatt Tokyo');
    expect(details!.address.line1).toBe('3-7-1-2 Nishi-Shinjuku');
    expect(details!.address.city).toBe('Shinjuku');
    expect(details!.address.postalCode).toBe('163-1055');
    expect(details!.address.country).toBe('JPN');
  });
});

// ── getLodgingDetails ──

describe('getLodgingDetails', () => {
  it('returns null for unknown placeId', async () => {
    const result = await getLodgingDetails('nonexistent');
    expect(result).toBeNull();
  });

  it('converts alpha-2 country code to alpha-3 in address', async () => {
    const mockSearch = NativeModules.ApplePlacesModule.search as jest.Mock;
    mockSearch.mockResolvedValueOnce(MOCK_APPLE_RESULTS);

    await getLodgingSuggestions('Park Hyatt', undefined, 'JPN');
    const details = await getLodgingDetails('hotel-1');

    // Source has 'JP' (alpha-2), result should have 'JPN' (alpha-3)
    expect(details!.address.country).toBe('JPN');
  });
});

// ── getAutocompleteSuggestions ──

describe('getAutocompleteSuggestions', () => {
  it('returns empty for short input', async () => {
    const result = await getAutocompleteSuggestions('ab');
    expect(result).toEqual([]);
  });

  it('passes empty countryCode for address search', async () => {
    const mockSearch = NativeModules.ApplePlacesModule.search as jest.Mock;
    mockSearch.mockResolvedValueOnce([]);

    await getAutocompleteSuggestions('123 Main St');

    expect(mockSearch).toHaveBeenCalledWith('123 Main St', 'address', '');
  });
});
