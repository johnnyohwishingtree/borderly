/**
 * Google Places Autocomplete Service
 *
 * Uses the Google Places Autocomplete API (session-based billing) to suggest
 * addresses as the user types, then fetches Place Details to parse structured
 * address components.
 *
 * Security note: The API key is a public key restricted by bundle ID — it is
 * intentionally stored in app config (MMKV), NOT in the OS Keychain.
 */

import { Address } from '../../types/profile';
import { mmkvService } from '../storage/mmkv';

/** MMKV key for the Google Places API key */
export const PLACES_API_KEY_MMKV_KEY = 'google_places_api_key';

const AUTOCOMPLETE_URL =
  'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const PLACE_DETAILS_URL =
  'https://maps.googleapis.com/maps/api/place/details/json';

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

/**
 * ISO 3166-1 alpha-2 to alpha-3 country code mapping for common countries.
 * Google Places returns alpha-2 codes; Borderly uses alpha-3.
 */
const ALPHA2_TO_ALPHA3: Record<string, string> = {
  AF: 'AFG', AL: 'ALB', DZ: 'DZA', AD: 'AND', AO: 'AGO',
  AG: 'ATG', AR: 'ARG', AM: 'ARM', AU: 'AUS', AT: 'AUT',
  AZ: 'AZE', BS: 'BHS', BH: 'BHR', BD: 'BGD', BB: 'BRB',
  BY: 'BLR', BE: 'BEL', BZ: 'BLZ', BJ: 'BEN', BT: 'BTN',
  BO: 'BOL', BA: 'BIH', BW: 'BWA', BR: 'BRA', BN: 'BRN',
  BG: 'BGR', BF: 'BFA', BI: 'BDI', CV: 'CPV', KH: 'KHM',
  CM: 'CMR', CA: 'CAN', CF: 'CAF', TD: 'TCD', CL: 'CHL',
  CN: 'CHN', CO: 'COL', KM: 'COM', CG: 'COG', CD: 'COD',
  CR: 'CRI', CI: 'CIV', HR: 'HRV', CU: 'CUB', CY: 'CYP',
  CZ: 'CZE', DK: 'DNK', DJ: 'DJI', DM: 'DMA', DO: 'DOM',
  EC: 'ECU', EG: 'EGY', SV: 'SLV', GQ: 'GNQ', ER: 'ERI',
  EE: 'EST', SZ: 'SWZ', ET: 'ETH', FJ: 'FJI', FI: 'FIN',
  FR: 'FRA', GA: 'GAB', GM: 'GMB', GE: 'GEO', DE: 'DEU',
  GH: 'GHA', GR: 'GRC', GD: 'GRD', GT: 'GTM', GN: 'GIN',
  GW: 'GNB', GY: 'GUY', HT: 'HTI', HN: 'HND', HU: 'HUN',
  IS: 'ISL', IN: 'IND', ID: 'IDN', IR: 'IRN', IQ: 'IRQ',
  IE: 'IRL', IL: 'ISR', IT: 'ITA', JM: 'JAM', JP: 'JPN',
  JO: 'JOR', KZ: 'KAZ', KE: 'KEN', KI: 'KIR', KP: 'PRK',
  KR: 'KOR', KW: 'KWT', KG: 'KGZ', LA: 'LAO', LV: 'LVA',
  LB: 'LBN', LS: 'LSO', LR: 'LBR', LY: 'LBY', LI: 'LIE',
  LT: 'LTU', LU: 'LUX', MG: 'MDG', MW: 'MWI', MY: 'MYS',
  MV: 'MDV', ML: 'MLI', MT: 'MLT', MH: 'MHL', MR: 'MRT',
  MU: 'MUS', MX: 'MEX', FM: 'FSM', MD: 'MDA', MC: 'MCO',
  MN: 'MNG', ME: 'MNE', MA: 'MAR', MZ: 'MOZ', MM: 'MMR',
  NA: 'NAM', NR: 'NRU', NP: 'NPL', NL: 'NLD', NZ: 'NZL',
  NI: 'NIC', NE: 'NER', NG: 'NGA', NO: 'NOR', OM: 'OMN',
  PK: 'PAK', PW: 'PLW', PA: 'PAN', PG: 'PNG', PY: 'PRY',
  PE: 'PER', PH: 'PHL', PL: 'POL', PT: 'PRT', QA: 'QAT',
  RO: 'ROU', RU: 'RUS', RW: 'RWA', KN: 'KNA', LC: 'LCA',
  VC: 'VCT', WS: 'WSM', SM: 'SMR', ST: 'STP', SA: 'SAU',
  SN: 'SEN', RS: 'SRB', SC: 'SYC', SL: 'SLE', SG: 'SGP',
  SK: 'SVK', SI: 'SVN', SB: 'SLB', SO: 'SOM', ZA: 'ZAF',
  SS: 'SSD', ES: 'ESP', LK: 'LKA', SD: 'SDN', SR: 'SUR',
  SE: 'SWE', CH: 'CHE', SY: 'SYR', TW: 'TWN', TJ: 'TJK',
  TZ: 'TZA', TH: 'THA', TL: 'TLS', TG: 'TGO', TO: 'TON',
  TT: 'TTO', TN: 'TUN', TR: 'TUR', TM: 'TKM', TV: 'TUV',
  UG: 'UGA', UA: 'UKR', AE: 'ARE', GB: 'GBR', US: 'USA',
  UY: 'URY', UZ: 'UZB', VU: 'VUT', VE: 'VEN', VN: 'VNM',
  YE: 'YEM', ZM: 'ZMB', ZW: 'ZWE',
};

/** Convert ISO 3166-1 alpha-2 to alpha-3, returning input unchanged if not found. */
export function alpha2ToAlpha3(alpha2: string): string {
  return ALPHA2_TO_ALPHA3[alpha2.toUpperCase()] ?? alpha2;
}

/** Retrieve the configured API key from MMKV app config. */
export function getPlacesApiKey(): string {
  return mmkvService.getString(PLACES_API_KEY_MMKV_KEY) ?? '';
}

/** Persist the Google Places API key to app config (MMKV). */
export function setPlacesApiKey(apiKey: string): void {
  mmkvService.setString(PLACES_API_KEY_MMKV_KEY, apiKey);
}

/**
 * Fetch lodging autocomplete suggestions from the Google Places Autocomplete API.
 *
 * Filters results to lodging types (hotels, hostels, resorts, etc.) using the
 * `types=lodging` parameter. The session token is shared with `getLodgingDetails`
 * for billing purposes.
 *
 * @param input - Partial hotel/accommodation name typed by the user
 * @param sessionToken - Session token for billing grouping (one per user session)
 * @returns Array of lodging place suggestions, or empty array on error/offline
 */
export async function getLodgingSuggestions(
  input: string,
  sessionToken: string,
): Promise<PlaceSuggestion[]> {
  const apiKey = getPlacesApiKey();
  if (!apiKey || !input.trim()) {
    return [];
  }

  const params = new URLSearchParams({
    input: input.trim(),
    types: 'lodging',
    sessiontoken: sessionToken,
    key: apiKey,
  });

  try {
    const response = await fetch(`${AUTOCOMPLETE_URL}?${params.toString()}`);
    if (!response.ok) {
      return [];
    }
    const data = await response.json() as {
      status: string;
      predictions?: Array<{
        place_id: string;
        description: string;
        structured_formatting: {
          main_text: string;
          secondary_text: string;
        };
      }>;
    };

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.warn('[PlacesService] Lodging autocomplete error:', data.status);
      return [];
    }

    return (data.predictions ?? []).map((p) => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting.main_text,
      secondaryText: p.structured_formatting.secondary_text,
    }));
  } catch (error) {
    // Network error / offline — return empty gracefully
    console.warn('[PlacesService] Network error in lodging autocomplete:', error);
    return [];
  }
}

/**
 * Fetch structured place details for a lodging place, including the
 * establishment name (hotel/hostel/resort name from Google's database).
 *
 * @param placeId - Google Places place_id from a lodging suggestion
 * @param sessionToken - Same session token used for autocomplete (ends the session)
 * @returns Parsed LodgingDetails including name, or null on error
 */
export async function getLodgingDetails(
  placeId: string,
  sessionToken: string,
): Promise<LodgingDetails | null> {
  const apiKey = getPlacesApiKey();
  if (!apiKey || !placeId) {
    return null;
  }

  const params = new URLSearchParams({
    place_id: placeId,
    fields: 'place_id,name,formatted_address,address_components',
    sessiontoken: sessionToken,
    key: apiKey,
  });

  try {
    const response = await fetch(`${PLACE_DETAILS_URL}?${params.toString()}`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json() as {
      status: string;
      result?: {
        place_id: string;
        name: string;
        formatted_address: string;
        address_components: Array<{
          long_name: string;
          short_name: string;
          types: string[];
        }>;
      };
    };

    if (data.status !== 'OK' || !data.result) {
      console.warn('[PlacesService] Lodging Details error:', data.status);
      return null;
    }

    return {
      placeId: data.result.place_id,
      name: data.result.name,
      formattedAddress: data.result.formatted_address,
      address: parseAddressComponents(data.result.address_components),
    };
  } catch (error) {
    console.warn('[PlacesService] Network error in lodging details:', error);
    return null;
  }
}

/**
 * Fetch autocomplete suggestions from the Google Places Autocomplete API.
 *
 * @param input - Partial address string typed by the user
 * @param sessionToken - Session token for billing grouping (one per user session)
 * @returns Array of place suggestions, or empty array on error/offline
 */
export async function getAutocompleteSuggestions(
  input: string,
  sessionToken: string,
): Promise<PlaceSuggestion[]> {
  const apiKey = getPlacesApiKey();
  if (!apiKey || !input.trim()) {
    return [];
  }

  const params = new URLSearchParams({
    input: input.trim(),
    types: 'address',
    sessiontoken: sessionToken,
    key: apiKey,
  });

  try {
    const response = await fetch(`${AUTOCOMPLETE_URL}?${params.toString()}`);
    if (!response.ok) {
      return [];
    }
    const data = await response.json() as {
      status: string;
      predictions?: Array<{
        place_id: string;
        description: string;
        structured_formatting: {
          main_text: string;
          secondary_text: string;
        };
      }>;
    };

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.warn('[PlacesService] Autocomplete error:', data.status);
      return [];
    }

    return (data.predictions ?? []).map((p) => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting.main_text,
      secondaryText: p.structured_formatting.secondary_text,
    }));
  } catch (error) {
    // Network error / offline — return empty gracefully
    console.warn('[PlacesService] Network error in autocomplete:', error);
    return [];
  }
}

/**
 * Fetch structured place details for a given placeId and parse into an Address.
 *
 * @param placeId - Google Places place_id from a suggestion
 * @param sessionToken - Same session token used for autocomplete (ends the session)
 * @returns Parsed PlaceDetails, or null on error
 */
export async function getPlaceDetails(
  placeId: string,
  sessionToken: string,
): Promise<PlaceDetails | null> {
  const apiKey = getPlacesApiKey();
  if (!apiKey || !placeId) {
    return null;
  }

  const params = new URLSearchParams({
    place_id: placeId,
    fields: 'place_id,formatted_address,address_components',
    sessiontoken: sessionToken,
    key: apiKey,
  });

  try {
    const response = await fetch(`${PLACE_DETAILS_URL}?${params.toString()}`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json() as {
      status: string;
      result?: {
        place_id: string;
        formatted_address: string;
        address_components: Array<{
          long_name: string;
          short_name: string;
          types: string[];
        }>;
      };
    };

    if (data.status !== 'OK' || !data.result) {
      console.warn('[PlacesService] Place Details error:', data.status);
      return null;
    }

    return {
      placeId: data.result.place_id,
      formattedAddress: data.result.formatted_address,
      address: parseAddressComponents(data.result.address_components),
    };
  } catch (error) {
    console.warn('[PlacesService] Network error in place details:', error);
    return null;
  }
}

/**
 * Parse Google Places address_components array into a partial Address object.
 *
 * Component type mapping:
 * - street_number + route → line1
 * - locality / sublocality_level_1 → city
 * - administrative_area_level_1 → state (short_name for abbreviations like "CA")
 * - postal_code → postalCode
 * - country → country (converted to alpha-3)
 */
export function parseAddressComponents(
  components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>,
): Partial<Address> {
  let streetNumber = '';
  let route = '';
  let city = '';
  let state = '';
  let postalCode = '';
  let country = '';

  for (const component of components) {
    const types = component.types;

    if (types.includes('street_number')) {
      streetNumber = component.long_name;
    } else if (types.includes('route')) {
      route = component.long_name;
    } else if (
      types.includes('locality') ||
      (types.includes('sublocality_level_1') && !city)
    ) {
      city = component.long_name;
    } else if (types.includes('administrative_area_level_1')) {
      // Use short_name for state abbreviations (e.g., "CA" instead of "California")
      state = component.short_name;
    } else if (types.includes('postal_code')) {
      postalCode = component.long_name;
    } else if (types.includes('country')) {
      // Convert alpha-2 to alpha-3 for Borderly's Address type
      country = alpha2ToAlpha3(component.short_name);
    }
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
