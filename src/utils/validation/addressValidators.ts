/**
 * Address validators: postal code, country code, full address.
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

/**
 * Validates addresses for travel documents.
 */
export function validateAddress(address: {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!address.line1 || address.line1.trim().length < 5) {
    errors.line1 = 'Address line 1 must be at least 5 characters';
  }

  if (address.line1 && address.line1.length > 100) {
    errors.line1 = 'Address line 1 is too long (maximum 100 characters)';
  }

  if (address.line2 && address.line2.length > 100) {
    errors.line2 = 'Address line 2 is too long (maximum 100 characters)';
  }

  if (!address.city || address.city.trim().length < 2) {
    errors.city = 'City must be at least 2 characters';
  }

  if (address.city && address.city.length > 50) {
    errors.city = 'City is too long (maximum 50 characters)';
  }

  if (address.postalCode && address.country) {
    const postalResult = validatePostalCode(address.postalCode, address.country);
    if (!postalResult.isValid) {
      errors.postalCode = postalResult.error || 'Invalid postal code';
    }
  }

  if (address.country) {
    const countryResult = validateCountryCode(address.country);
    if (!countryResult.isValid) {
      errors.country = countryResult.error || 'Invalid country code';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
