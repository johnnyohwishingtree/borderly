/**
 * Unit tests for the Google Places service.
 *
 * Tests cover:
 * - parseAddressComponents: mapping Google component types to Address fields
 * - alpha2ToAlpha3: ISO country code conversion
 * - getAutocompleteSuggestions: fetch integration (mocked)
 * - getPlaceDetails: fetch integration (mocked)
 */

import {
  parseAddressComponents,
  alpha2ToAlpha3,
  getAutocompleteSuggestions,
  getPlaceDetails,
  getPlacesApiKey,
  setPlacesApiKey,
  PLACES_API_KEY_MMKV_KEY,
} from '../../src/services/places/placesService';

// Mock the mmkvService used internally by the places service
jest.mock('../../src/services/storage/mmkv', () => ({
  mmkvService: {
    getString: jest.fn(),
    setString: jest.fn(),
  },
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { mmkvService } from '../../src/services/storage/mmkv';
const mockMmkv = mmkvService as jest.Mocked<typeof mmkvService>;

describe('parseAddressComponents', () => {
  it('extracts street number and route into line1', () => {
    const components = [
      { long_name: '123', short_name: '123', types: ['street_number'] },
      { long_name: 'Main Street', short_name: 'Main St', types: ['route'] },
      { long_name: 'New York', short_name: 'New York', types: ['locality', 'political'] },
      { long_name: 'New York', short_name: 'NY', types: ['administrative_area_level_1', 'political'] },
      { long_name: '10001', short_name: '10001', types: ['postal_code'] },
      { long_name: 'United States', short_name: 'US', types: ['country', 'political'] },
    ];

    const result = parseAddressComponents(components);

    expect(result.line1).toBe('123 Main Street');
    expect(result.city).toBe('New York');
    expect(result.state).toBe('NY'); // short_name for state abbreviation
    expect(result.postalCode).toBe('10001');
    expect(result.country).toBe('USA'); // alpha2 US → alpha3 USA
  });

  it('handles missing street number (route only)', () => {
    const components = [
      { long_name: 'Baker Street', short_name: 'Baker St', types: ['route'] },
      { long_name: 'London', short_name: 'London', types: ['locality', 'political'] },
      { long_name: 'United Kingdom', short_name: 'GB', types: ['country', 'political'] },
    ];

    const result = parseAddressComponents(components);

    expect(result.line1).toBe('Baker Street');
    expect(result.city).toBe('London');
    expect(result.country).toBe('GBR');
  });

  it('falls back to sublocality_level_1 when locality is absent', () => {
    const components = [
      { long_name: '45', short_name: '45', types: ['street_number'] },
      { long_name: 'Orchard Road', short_name: 'Orchard Rd', types: ['route'] },
      {
        long_name: 'Orchard',
        short_name: 'Orchard',
        types: ['sublocality_level_1', 'sublocality', 'political'],
      },
      { long_name: 'Singapore', short_name: 'SG', types: ['country', 'political'] },
      { long_name: '238858', short_name: '238858', types: ['postal_code'] },
    ];

    const result = parseAddressComponents(components);

    expect(result.city).toBe('Orchard');
  });

  it('does not overwrite locality with sublocality when locality already set', () => {
    const components = [
      { long_name: 'Shinjuku', short_name: 'Shinjuku', types: ['locality', 'political'] },
      { long_name: 'Kabukicho', short_name: 'Kabukicho', types: ['sublocality_level_1'] },
      { long_name: 'Japan', short_name: 'JP', types: ['country', 'political'] },
    ];

    const result = parseAddressComponents(components);

    expect(result.city).toBe('Shinjuku');
  });

  it('returns empty partial for empty components array', () => {
    const result = parseAddressComponents([]);
    expect(result).toEqual({});
  });

  it('omits fields that are not present', () => {
    const components = [
      { long_name: 'New York', short_name: 'New York', types: ['locality'] },
    ];
    const result = parseAddressComponents(components);

    expect(result.line1).toBeUndefined();
    expect(result.city).toBe('New York');
    expect(result.state).toBeUndefined();
    expect(result.postalCode).toBeUndefined();
    expect(result.country).toBeUndefined();
  });
});

describe('alpha2ToAlpha3', () => {
  it('converts common alpha-2 codes to alpha-3', () => {
    expect(alpha2ToAlpha3('US')).toBe('USA');
    expect(alpha2ToAlpha3('GB')).toBe('GBR');
    expect(alpha2ToAlpha3('JP')).toBe('JPN');
    expect(alpha2ToAlpha3('SG')).toBe('SGP');
    expect(alpha2ToAlpha3('MY')).toBe('MYS');
    expect(alpha2ToAlpha3('AU')).toBe('AUS');
    expect(alpha2ToAlpha3('CA')).toBe('CAN');
    expect(alpha2ToAlpha3('DE')).toBe('DEU');
    expect(alpha2ToAlpha3('FR')).toBe('FRA');
  });

  it('handles lowercase input', () => {
    expect(alpha2ToAlpha3('us')).toBe('USA');
    expect(alpha2ToAlpha3('gb')).toBe('GBR');
  });

  it('returns input unchanged for unknown codes', () => {
    expect(alpha2ToAlpha3('XX')).toBe('XX');
    expect(alpha2ToAlpha3('ZZ')).toBe('ZZ');
  });
});

describe('getPlacesApiKey / setPlacesApiKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty string when no key is set', () => {
    mockMmkv.getString.mockReturnValue(undefined);
    expect(getPlacesApiKey()).toBe('');
  });

  it('returns the stored key', () => {
    mockMmkv.getString.mockReturnValue('my-api-key');
    expect(getPlacesApiKey()).toBe('my-api-key');
  });

  it('stores key via mmkvService', () => {
    setPlacesApiKey('test-key-123');
    expect(mockMmkv.setString).toHaveBeenCalledWith(PLACES_API_KEY_MMKV_KEY, 'test-key-123');
  });
});

describe('getAutocompleteSuggestions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  it('returns empty array when no API key is configured', async () => {
    mockMmkv.getString.mockReturnValue(undefined);
    const results = await getAutocompleteSuggestions('123 Main', 'session-1');
    expect(results).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns empty array for empty input', async () => {
    mockMmkv.getString.mockReturnValue('api-key');
    const results = await getAutocompleteSuggestions('', 'session-1');
    expect(results).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns mapped suggestions on OK response', async () => {
    mockMmkv.getString.mockReturnValue('api-key');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'OK',
        predictions: [
          {
            place_id: 'place-1',
            description: '123 Main Street, New York, USA',
            structured_formatting: {
              main_text: '123 Main Street',
              secondary_text: 'New York, USA',
            },
          },
        ],
      }),
    });

    const results = await getAutocompleteSuggestions('123 Main', 'session-1');

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      placeId: 'place-1',
      description: '123 Main Street, New York, USA',
      mainText: '123 Main Street',
      secondaryText: 'New York, USA',
    });
  });

  it('returns empty array on ZERO_RESULTS', async () => {
    mockMmkv.getString.mockReturnValue('api-key');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'ZERO_RESULTS', predictions: [] }),
    });

    const results = await getAutocompleteSuggestions('zxzxzxz', 'session-1');
    expect(results).toEqual([]);
  });

  it('returns empty array on API error status', async () => {
    mockMmkv.getString.mockReturnValue('api-key');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'REQUEST_DENIED' }),
    });

    const results = await getAutocompleteSuggestions('123 Main', 'session-1');
    expect(results).toEqual([]);
  });

  it('returns empty array on network error (offline fallback)', async () => {
    mockMmkv.getString.mockReturnValue('api-key');
    mockFetch.mockRejectedValueOnce(new TypeError('Network request failed'));

    const results = await getAutocompleteSuggestions('123 Main', 'session-1');
    expect(results).toEqual([]);
  });

  it('returns empty array when response is not ok', async () => {
    mockMmkv.getString.mockReturnValue('api-key');
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });

    const results = await getAutocompleteSuggestions('123 Main', 'session-1');
    expect(results).toEqual([]);
  });
});

describe('getPlaceDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  it('returns null when no API key is configured', async () => {
    mockMmkv.getString.mockReturnValue(undefined);
    const result = await getPlaceDetails('place-1', 'session-1');
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns null for empty placeId', async () => {
    mockMmkv.getString.mockReturnValue('api-key');
    const result = await getPlaceDetails('', 'session-1');
    expect(result).toBeNull();
  });

  it('returns parsed PlaceDetails on success', async () => {
    mockMmkv.getString.mockReturnValue('api-key');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'OK',
        result: {
          place_id: 'place-1',
          formatted_address: '123 Main Street, New York, NY 10001, USA',
          address_components: [
            { long_name: '123', short_name: '123', types: ['street_number'] },
            { long_name: 'Main Street', short_name: 'Main St', types: ['route'] },
            { long_name: 'New York', short_name: 'New York', types: ['locality'] },
            { long_name: 'New York', short_name: 'NY', types: ['administrative_area_level_1'] },
            { long_name: '10001', short_name: '10001', types: ['postal_code'] },
            { long_name: 'United States', short_name: 'US', types: ['country'] },
          ],
        },
      }),
    });

    const result = await getPlaceDetails('place-1', 'session-1');

    expect(result).not.toBeNull();
    expect(result?.placeId).toBe('place-1');
    expect(result?.formattedAddress).toBe('123 Main Street, New York, NY 10001, USA');
    expect(result?.address.line1).toBe('123 Main Street');
    expect(result?.address.city).toBe('New York');
    expect(result?.address.state).toBe('NY');
    expect(result?.address.postalCode).toBe('10001');
    expect(result?.address.country).toBe('USA');
  });

  it('returns null on NOT_FOUND status', async () => {
    mockMmkv.getString.mockReturnValue('api-key');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'NOT_FOUND' }),
    });

    const result = await getPlaceDetails('bad-place-id', 'session-1');
    expect(result).toBeNull();
  });

  it('returns null on network error (offline fallback)', async () => {
    mockMmkv.getString.mockReturnValue('api-key');
    mockFetch.mockRejectedValueOnce(new TypeError('Network request failed'));

    const result = await getPlaceDetails('place-1', 'session-1');
    expect(result).toBeNull();
  });

  it('includes session token in request URL', async () => {
    mockMmkv.getString.mockReturnValue('my-api-key');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'OK',
        result: {
          place_id: 'place-1',
          formatted_address: 'Test Address',
          address_components: [],
        },
      }),
    });

    await getPlaceDetails('place-1', 'my-session-token');

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('sessiontoken=my-session-token');
    expect(url).toContain('key=my-api-key');
    expect(url).toContain('place_id=place-1');
  });
});
