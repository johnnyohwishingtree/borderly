/**
 * Places Service — platform-native place search.
 *
 * iOS: Apple MapKit MKLocalSearch (free, unlimited, no API key)
 * Android/web: Photon (OpenStreetMap) fallback (free, no API key)
 *
 * Both return the same types so components don't care which backend is used.
 */

import { Platform, NativeModules } from 'react-native';
import type { Address } from '../../types/profile';
import { photonSearch } from './photonService';

// ── Types (shared interface for all backends) ──

export interface PlaceSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface PlaceDetails {
  placeId: string;
  formattedAddress: string;
  address: Partial<Address>;
}

export interface LodgingDetails {
  placeId: string;
  name: string;
  formattedAddress: string;
  address: Partial<Address>;
}

// ── Country code conversion ──

const ALPHA2_TO_ALPHA3: Record<string, string> = {
  AF: 'AFG', AL: 'ALB', DZ: 'DZA', AU: 'AUS', AT: 'AUT',
  BD: 'BGD', BE: 'BEL', BR: 'BRA', BN: 'BRN', KH: 'KHM',
  CA: 'CAN', CN: 'CHN', CO: 'COL', HR: 'HRV', CZ: 'CZE',
  DK: 'DNK', EG: 'EGY', FI: 'FIN', FR: 'FRA', DE: 'DEU',
  GR: 'GRC', HK: 'HKG', HU: 'HUN', IN: 'IND', ID: 'IDN',
  IE: 'IRL', IL: 'ISR', IT: 'ITA', JP: 'JPN', KR: 'KOR',
  LA: 'LAO', MY: 'MYS', MV: 'MDV', MX: 'MEX', MM: 'MMR',
  NL: 'NLD', NZ: 'NZL', NO: 'NOR', PK: 'PAK', PH: 'PHL',
  PL: 'POL', PT: 'PRT', QA: 'QAT', RO: 'ROU', RU: 'RUS',
  SA: 'SAU', SG: 'SGP', ZA: 'ZAF', ES: 'ESP', LK: 'LKA',
  SE: 'SWE', CH: 'CHE', TW: 'TWN', TH: 'THA', TR: 'TUR',
  AE: 'ARE', GB: 'GBR', US: 'USA', VN: 'VNM',
};

export function alpha2ToAlpha3(alpha2: string): string {
  return ALPHA2_TO_ALPHA3[alpha2.toUpperCase()] ?? alpha2;
}

// ── Apple MapKit backend (iOS only) ──

interface ApplePlacesResult {
  placeId: string;
  name: string;
  description: string;
  mainText: string;
  secondaryText: string;
  address: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  formattedAddress: string;
}

interface ApplePlacesModuleType {
  search(query: string, type: string): Promise<ApplePlacesResult[]>;
}

const ApplePlaces: ApplePlacesModuleType | null =
  Platform.OS === 'ios' ? NativeModules.ApplePlacesModule : null;

// ── Unified search functions ──

/**
 * Search for lodging (hotels, hostels, resorts).
 * iOS uses Apple MapKit, Android/web uses Photon.
 */
export async function getLodgingSuggestions(
  input: string,
  _sessionToken?: string,
): Promise<PlaceSuggestion[]> {
  if (!input || input.trim().length < 3) return [];

  try {
    if (ApplePlaces) {
      const results = await ApplePlaces.search(input, 'lodging');
      // Cache full results so getLodgingDetails can look up address data
      _lastSearchResults = results;
      return results.map(r => ({
        placeId: r.placeId,
        description: r.description,
        mainText: r.mainText,
        secondaryText: r.secondaryText,
      }));
    }
    // Fallback: Photon
    const photonResults = await photonSearch(input, 'lodging');
    _lastSearchResults = photonResults.map(r => ({
      placeId: r.placeId,
      name: r.name,
      description: r.description,
      mainText: r.mainText,
      secondaryText: r.secondaryText,
      address: {
        line1: r.address.line1 ?? '',
        city: r.address.city ?? '',
        state: r.address.state ?? '',
        postalCode: r.address.postalCode ?? '',
        country: r.address.country ?? '',
      },
      formattedAddress: r.formattedAddress,
    }));
    return photonResults;
  } catch {
    return [];
  }
}

/**
 * Get lodging details (name + address).
 * On iOS, the search already returns full details, so we cache and look up.
 * On Android/web, Photon also returns full details in the search.
 */
let _lastSearchResults: ApplePlacesResult[] = [];

export async function getLodgingDetails(
  placeId: string,
  _sessionToken?: string,
): Promise<LodgingDetails | null> {
  // Look up from cached search results (both Apple and Photon return full data)
  const cached = _lastSearchResults.find(r => r.placeId === placeId);
  if (cached) {
    const address: Partial<Address> = {};
    if (cached.address.line1) address.line1 = cached.address.line1;
    if (cached.address.city) address.city = cached.address.city;
    if (cached.address.state) address.state = cached.address.state;
    if (cached.address.postalCode) address.postalCode = cached.address.postalCode;
    if (cached.address.country) address.country = alpha2ToAlpha3(cached.address.country);
    return {
      placeId: cached.placeId,
      name: cached.name,
      formattedAddress: cached.formattedAddress,
      address,
    };
  }
  return null;
}

/**
 * Search for addresses.
 * iOS uses Apple MapKit, Android/web uses Photon.
 */
export async function getAutocompleteSuggestions(
  input: string,
  _sessionToken?: string,
): Promise<PlaceSuggestion[]> {
  if (!input || input.trim().length < 3) return [];

  try {
    if (ApplePlaces) {
      const results = await ApplePlaces.search(input, 'address');
      _lastSearchResults = results;
      return results.map(r => ({
        placeId: r.placeId,
        description: r.description,
        mainText: r.mainText,
        secondaryText: r.secondaryText,
      }));
    }
    // Fallback: Photon
    const results = await photonSearch(input, 'address');
    _lastSearchResults = results.map(r => ({
      placeId: r.placeId,
      name: r.name,
      description: r.description,
      mainText: r.mainText,
      secondaryText: r.secondaryText,
      address: {
        line1: r.address.line1 ?? '',
        city: r.address.city ?? '',
        state: r.address.state ?? '',
        postalCode: r.address.postalCode ?? '',
        country: r.address.country ?? '',
      },
      formattedAddress: r.formattedAddress,
    }));
    return results;
  } catch {
    return [];
  }
}

/**
 * Get place details for an address.
 */
export async function getPlaceDetails(
  placeId: string,
  _sessionToken?: string,
): Promise<PlaceDetails | null> {
  const cached = _lastSearchResults.find(r => r.placeId === placeId);
  if (cached) {
    const address: Partial<Address> = {};
    if (cached.address.line1) address.line1 = cached.address.line1;
    if (cached.address.city) address.city = cached.address.city;
    if (cached.address.state) address.state = cached.address.state;
    if (cached.address.postalCode) address.postalCode = cached.address.postalCode;
    if (cached.address.country) address.country = alpha2ToAlpha3(cached.address.country);
    return {
      placeId: cached.placeId,
      formattedAddress: cached.formattedAddress,
      address,
    };
  }
  return null;
}

/**
 * Check if places search is available.
 * Always returns true — we have Apple MapKit on iOS and Photon as fallback.
 */
export function getPlacesApiKey(): string {
  // No API key needed — using platform-native search
  return 'native';
}

export function setPlacesApiKey(_apiKey: string): void {
  // No-op — no API key needed
}

/**
 * Parse address components — kept for backward compatibility.
 */
export function parseAddressComponents(
  components: Array<{ long_name: string; short_name: string; types: string[] }>,
): Partial<Address> {
  let streetNumber = '';
  let route = '';
  let city = '';
  let state = '';
  let postalCode = '';
  let country = '';

  for (const component of components) {
    const types = component.types;
    if (types.includes('street_number')) streetNumber = component.long_name;
    else if (types.includes('route')) route = component.long_name;
    else if (types.includes('locality') || (types.includes('sublocality_level_1') && !city)) city = component.long_name;
    else if (types.includes('administrative_area_level_1')) state = component.short_name;
    else if (types.includes('postal_code')) postalCode = component.long_name;
    else if (types.includes('country')) country = alpha2ToAlpha3(component.short_name);
  }

  const line1 = [streetNumber, route].filter(Boolean).join(' ');
  const result: Partial<Address> = {};
  if (line1) result.line1 = line1;
  if (city) result.city = city;
  if (state) result.state = state;
  if (postalCode) result.postalCode = postalCode;
  if (country) result.country = country;
  return result;
}
