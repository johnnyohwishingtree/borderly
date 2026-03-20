/**
 * Web mock for src/services/places/placesService.ts
 *
 * In E2E tests (React Native Web / Playwright), no real Google Places API
 * calls are made. This mock returns empty results for autocomplete and null
 * for place details, which triggers the offline fallback in AddressAutocomplete.
 */

const PLACES_API_KEY_MMKV_KEY = 'google_places_api_key';

/** No-op key retrieval — always returns empty string in E2E environment */
function getPlacesApiKey() {
  return '';
}

/** No-op key setter */
function setPlacesApiKey(_apiKey) {
  // no-op in web/test environment
}

/** Returns empty suggestions array — triggers offline fallback in component */
async function getAutocompleteSuggestions(_input, _sessionToken) {
  return [];
}

/** Returns null — triggers fallback behavior in component */
async function getPlaceDetails(_placeId, _sessionToken) {
  return null;
}

/** Convert ISO alpha-2 to alpha-3 (identity function for mock) */
function alpha2ToAlpha3(alpha2) {
  return alpha2;
}

/**
 * Parse address components — mirrors the logic in placesService.ts,
 * including the sublocality_level_1 fallback when locality is absent.
 */
function parseAddressComponents(components) {
  let streetNumber = '';
  let route = '';
  let city = '';
  let state = '';
  let postalCode = '';
  let country = '';

  for (const component of components) {
    const types = component.types || [];
    if (types.includes('street_number')) {
      streetNumber = component.long_name;
    } else if (types.includes('route')) {
      route = component.long_name;
    } else if (types.includes('locality') || (types.includes('sublocality_level_1') && !city)) {
      city = component.long_name;
    } else if (types.includes('administrative_area_level_1')) {
      state = component.short_name;
    } else if (types.includes('postal_code')) {
      postalCode = component.long_name;
    } else if (types.includes('country')) {
      country = alpha2ToAlpha3(component.short_name);
    }
  }

  const line1 = [streetNumber, route].filter(Boolean).join(' ');
  const result = {};
  if (line1) result.line1 = line1;
  if (city) result.city = city;
  if (state) result.state = state;
  if (postalCode) result.postalCode = postalCode;
  if (country) result.country = country;
  return result;
}

module.exports = {
  PLACES_API_KEY_MMKV_KEY,
  getPlacesApiKey,
  setPlacesApiKey,
  getAutocompleteSuggestions,
  getPlaceDetails,
  alpha2ToAlpha3,
  parseAddressComponents,
};
