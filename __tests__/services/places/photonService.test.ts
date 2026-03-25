/**
 * Tests for Photon (OpenStreetMap) geocoding service.
 */

import { photonSearch } from '../../../src/services/places/photonService';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
});

const MOCK_PHOTON_RESPONSE = {
  features: [
    {
      properties: {
        osm_id: 12345,
        name: 'Park Hyatt Tokyo',
        street: 'Nishi-Shinjuku',
        housenumber: '3-7-1-2',
        city: 'Shinjuku',
        state: 'Tokyo',
        postcode: '163-1055',
        country: 'Japan',
        countrycode: 'JP',
        type: 'hotel',
      },
    },
    {
      properties: {
        osm_id: 67890,
        name: 'Park Hyatt Kyoto',
        street: 'Masuyacho',
        housenumber: '360',
        city: 'Kyoto',
        state: 'Kyoto',
        postcode: '605-0911',
        country: 'Japan',
        countrycode: 'JP',
      },
    },
  ],
};

describe('photonSearch', () => {
  it('returns empty for short input', async () => {
    const result = await photonSearch('ab', 'lodging');
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns parsed suggestions for lodging search', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_PHOTON_RESPONSE),
    });

    const results = await photonSearch('Park Hyatt', 'lodging');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('photon.komoot.io'),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('osm_tag=tourism%3Ahotel'),
    );
    expect(results).toHaveLength(2);
    expect(results[0].mainText).toBe('Park Hyatt Tokyo');
    expect(results[0].address.line1).toBe('3-7-1-2 Nishi-Shinjuku');
    expect(results[0].address.city).toBe('Shinjuku');
    expect(results[0].address.postalCode).toBe('163-1055');
    expect(results[0].address.country).toBe('JP');
  });

  it('returns parsed suggestions for address search', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_PHOTON_RESPONSE),
    });

    const results = await photonSearch('Nishi Shinjuku', 'address');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.not.stringContaining('osm_tag'),
    );
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns empty on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const results = await photonSearch('Park Hyatt', 'lodging');
    expect(results).toEqual([]);
  });

  it('returns empty on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    const results = await photonSearch('Park Hyatt', 'lodging');
    expect(results).toEqual([]);
  });

  it('builds formatted address from components', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_PHOTON_RESPONSE),
    });

    const results = await photonSearch('Park Hyatt', 'lodging');
    expect(results[0].formattedAddress).toContain('Shinjuku');
    expect(results[0].formattedAddress).toContain('163-1055');
  });
});
