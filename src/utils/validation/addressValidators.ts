/**
 * Address validators: postal code, country code.
 */

import { VALIDATION_PATTERNS } from './patterns';

/**
 * Validates postal codes by country.
 */
export function validatePostalCode(
  postalCode: string,
  country: string
): { isValid: boolean; error?: string } {
  if (!postalCode || typeof postalCode !== 'string') {
    return { isValid: false, error: 'Postal code is required' };
  }

  const cleanCode = postalCode.trim().toUpperCase();

  let pattern = VALIDATION_PATTERNS.postalCode.general;

  switch (country.toUpperCase()) {
    case 'USA':
      pattern = VALIDATION_PATTERNS.postalCode.us;
      break;
    case 'GBR':
      pattern = VALIDATION_PATTERNS.postalCode.uk;
      break;
    case 'CAN':
      pattern = VALIDATION_PATTERNS.postalCode.canada;
      break;
  }

  if (!pattern.test(cleanCode)) {
    return { isValid: false, error: 'Invalid postal code format for this country' };
  }

  return { isValid: true };
}

/**
 * Validates country codes (ISO 3166-1).
 */
export function validateCountryCode(
  countryCode: string,
  format: 'iso2' | 'iso3' = 'iso3'
): { isValid: boolean; error?: string } {
  if (!countryCode || typeof countryCode !== 'string') {
    return { isValid: false, error: 'Country code is required' };
  }

  const cleanCode = countryCode.trim().toUpperCase();
  const pattern = format === 'iso2'
    ? VALIDATION_PATTERNS.countryCode.iso2
    : VALIDATION_PATTERNS.countryCode.iso3;

  if (!pattern.test(cleanCode)) {
    const expected = format === 'iso2' ? 'ISO 3166-1 alpha-2 (e.g., US, JP)' : 'ISO 3166-1 alpha-3 (e.g., USA, JPN)';
    return { isValid: false, error: `Invalid country code format. Expected ${expected}` };
  }

  return { isValid: true };
}

