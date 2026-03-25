/**
 * Unit tests for the places service.
 *
 * Tests cover:
 * - parseAddressComponents: mapping component types to Address fields
 * - alpha2ToAlpha3: ISO country code conversion
 * - getPlacesApiKey: always returns 'native' (no API key needed)
 * - getLodgingSuggestions / getAutocompleteSuggestions: returns empty when input too short
 */

import {
  parseAddressComponents,
  alpha2ToAlpha3,
  getPlacesApiKey,
  setPlacesApiKey,
  getLodgingSuggestions,
  getAutocompleteSuggestions,
} from '../../src/services/places/placesService';

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
    expect(alpha2ToAlpha3('XX')).toBe('XX');
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

// ── Search functions ──

describe('getLodgingSuggestions', () => {
  it('returns empty for short input', async () => {
    const result = await getLodgingSuggestions('ab');
    expect(result).toEqual([]);
  });

  it('returns empty for empty input', async () => {
    const result = await getLodgingSuggestions('');
    expect(result).toEqual([]);
  });
});

describe('getAutocompleteSuggestions', () => {
  it('returns empty for short input', async () => {
    const result = await getAutocompleteSuggestions('ab');
    expect(result).toEqual([]);
  });
});
