/**
 * Travel-related validators: passport, flight, airline, airport, name, occupation.
 */

import { VALIDATION_PATTERNS } from './patterns';

/**
 * Validates passport numbers based on issuing country.
 */
export function validatePassportNumber(
  passportNumber: string,
  issuingCountry?: string
): { isValid: boolean; error?: string } {
  if (!passportNumber || typeof passportNumber !== 'string') {
    return { isValid: false, error: 'Passport number is required' };
  }

  const cleanNumber = passportNumber.trim().toUpperCase().replace(/\s/g, '');

  if (cleanNumber.length < 6 || cleanNumber.length > 9) {
    return { isValid: false, error: 'Passport number must be 6-9 characters' };
  }

  let pattern = VALIDATION_PATTERNS.passport.default;

  // Use country-specific patterns if available
  switch (issuingCountry) {
    case 'USA':
      pattern = VALIDATION_PATTERNS.passport.US;
      break;
    case 'GBR':
      pattern = VALIDATION_PATTERNS.passport.UK;
      break;
    case 'JPN':
    case 'KOR':
    case 'CHN':
    case 'SGP':
    case 'MYS':
      pattern = VALIDATION_PATTERNS.passport.asia;
      break;
    default:
      if (['DEU', 'FRA', 'ESP', 'ITA', 'NLD'].includes(issuingCountry || '')) {
        pattern = VALIDATION_PATTERNS.passport.EU;
      }
      break;
  }

  if (!pattern.test(cleanNumber)) {
    return { isValid: false, error: 'Invalid passport number format' };
  }

  return { isValid: true };
}

/**
 * Validates flight numbers.
 */
export function validateFlightNumber(flightNumber: string): { isValid: boolean; error?: string } {
  if (!flightNumber || typeof flightNumber !== 'string') {
    return { isValid: false, error: 'Flight number is required' };
  }

  const cleanFlight = flightNumber.trim().toUpperCase().replace(/\s/g, '');

  if (!VALIDATION_PATTERNS.flightNumber.test(cleanFlight)) {
    return { isValid: false, error: 'Invalid flight number format (e.g., AA123, BA4567)' };
  }

  return { isValid: true };
}

/**
 * Validates airline codes (IATA 2-letter or ICAO 3-letter).
 */
export function validateAirlineCode(
  airlineCode: string,
  type: 'iata' | 'icao' = 'iata'
): { isValid: boolean; error?: string } {
  if (!airlineCode || typeof airlineCode !== 'string') {
    return { isValid: false, error: 'Airline code is required' };
  }

  const cleanCode = airlineCode.trim().toUpperCase();
  const pattern = type === 'iata'
    ? VALIDATION_PATTERNS.airlineCode.iata
    : VALIDATION_PATTERNS.airlineCode.icao;

  if (!pattern.test(cleanCode)) {
    const expected = type === 'iata' ? '2-letter IATA code (e.g., AA, BA)' : '3-letter ICAO code';
    return { isValid: false, error: `Invalid airline code format. Expected ${expected}` };
  }

  return { isValid: true };
}

/**
 * Validates airport codes (IATA 3-letter).
 */
export function validateAirportCode(airportCode: string): { isValid: boolean; error?: string } {
  if (!airportCode || typeof airportCode !== 'string') {
    return { isValid: false, error: 'Airport code is required' };
  }

  const cleanCode = airportCode.trim().toUpperCase();

  if (!VALIDATION_PATTERNS.airportCode.test(cleanCode)) {
    return { isValid: false, error: 'Invalid airport code format (e.g., LAX, JFK, NRT)' };
  }

  return { isValid: true };
}

/**
 * Validates names (surname, given names) for travel documents.
 */
export function validateTravelName(name: string): { isValid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Name is required' };
  }

  // Check for invalid spacing BEFORE trimming
  if (/\s{2,}/.test(name) || name.startsWith(' ') || name.endsWith(' ')) {
    return { isValid: false, error: 'Name has invalid spacing' };
  }

  const trimmedName = name.trim();

  if (trimmedName.length < 1) {
    return { isValid: false, error: 'Name cannot be empty' };
  }

  if (trimmedName.length > 100) {
    return { isValid: false, error: 'Name is too long (maximum 100 characters)' };
  }

  // Allow letters (including accented), spaces, hyphens, apostrophes, periods
  const namePattern = /^[a-zA-ZÀ-ÿ\s\-'\.]+$/;
  if (!namePattern.test(trimmedName)) {
    return { isValid: false, error: 'Name contains invalid characters' };
  }

  return { isValid: true };
}

/**
 * Validates occupation strings.
 */
export function validateOccupation(occupation: string): { isValid: boolean; error?: string } {
  if (!occupation || typeof occupation !== 'string') {
    return { isValid: false, error: 'Occupation is required' };
  }

  const trimmedOccupation = occupation.trim();

  if (trimmedOccupation.length < 2) {
    return { isValid: false, error: 'Occupation must be at least 2 characters' };
  }

  if (trimmedOccupation.length > 50) {
    return { isValid: false, error: 'Occupation is too long (maximum 50 characters)' };
  }

  // Allow letters, spaces, hyphens, slashes for compound occupations
  const occupationPattern = /^[a-zA-Z\s\-\/]+$/;
  if (!occupationPattern.test(trimmedOccupation)) {
    return { isValid: false, error: 'Occupation contains invalid characters' };
  }

  return { isValid: true };
}
