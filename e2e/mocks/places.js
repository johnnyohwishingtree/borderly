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
 * Parse address components — minimal implementation for tests that
 * might call this directly.
 */
function parseAddressComponents(components) {
  const result = {};
  for (const component of components) {
    const types = component.types || [];
    if (types.includes('street_number') || types.includes('route')) {
      result.line1 = (result.line1 ? result.line1 + ' ' : '') + component.long_name;
    } else if (types.includes('locality')) {
      result.city = component.long_name;
    } else if (types.includes('administrative_area_level_1')) {
      result.state = component.short_name;
    } else if (types.includes('postal_code')) {
      result.postalCode = component.long_name;
    } else if (types.includes('country')) {
      result.country = component.short_name;
    }
  }
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
