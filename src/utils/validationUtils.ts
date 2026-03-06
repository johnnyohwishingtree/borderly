/**
 * Comprehensive validation utilities for travel-related data.
 * Provides validators for passports, flights, addresses, and other travel documents.
 */

/**
 * Regular expression patterns for various travel-related validations.
 */
export const VALIDATION_PATTERNS = {
  // Passport patterns by issuing country/region
  passport: {
    default: /^[A-Z0-9]{6,9}$/,
    US: /^[0-9]{9}$/,  // US passports are numeric
    UK: /^[0-9]{9}$/,
    EU: /^[A-Z]{2}[A-Z0-9]{6,7}$/,
    asia: /^[A-Z]{1,2}[0-9]{7,8}$/,
  },

  // Contact information
  email: /^[a-zA-Z0-9]([a-zA-Z0-9]*[._+%-]?[a-zA-Z0-9]+)*@[a-zA-Z0-9]([a-zA-Z0-9]*[.-]?[a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/,
  phone: {
    international: /^\+[1-9]\d{1,14}$/,
    us: /^(\+1)?[\s-]?\(?[0-9]{3}\)?[\s-]?[0-9]{3}[\s-]?[0-9]{4}$/,
    general: /^[\+]?[0-9\s\-\(\)]{7,15}$/,
  },

  // Flight and travel
  flightNumber: /^[A-Z]{2,3}[0-9]{1,4}[A-Z]?$/,
  airlineCode: {
    iata: /^[A-Z]{2}$/,
    icao: /^[A-Z]{3}$/,
  },
  airportCode: /^[A-Z]{3}$/,

  // Address and location
  postalCode: {
    us: /^[0-9]{5}(-[0-9]{4})?$/,
    uk: /^[A-Z]{1,2}[0-9]{1,2}[A-Z]?\s?[0-9][A-Z]{2}$/,
    canada: /^[A-Z][0-9][A-Z]\s?[0-9][A-Z][0-9]$/,
    general: /^[A-Z0-9\s\-]{3,10}$/,
  },

  // Country and currency codes
  countryCode: {
    iso2: /^[A-Z]{2}$/,
    iso3: /^[A-Z]{3}$/,
  },
  currencyCode: /^[A-Z]{3}$/,

  // Special identifiers
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  creditCard: /^[0-9]{13,19}$/,
} as const;

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
 * Validates email addresses.
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }

  const cleanEmail = email.trim().toLowerCase();

  if (cleanEmail.length > 254) {
    return { isValid: false, error: 'Email address is too long' };
  }

  if (!VALIDATION_PATTERNS.email.test(cleanEmail)) {
    return { isValid: false, error: 'Invalid email address format' };
  }

  return { isValid: true };
}

/**
 * Validates phone numbers with optional country-specific formatting.
 */
export function validatePhoneNumber(
  phone: string,
  country?: string
): { isValid: boolean; error?: string } {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, error: 'Phone number is required' };
  }

  const cleanPhone = phone.trim().replace(/\s/g, '');

  let pattern = VALIDATION_PATTERNS.phone.general;

  switch (country) {
    case 'USA':
    case 'CAN':
      pattern = VALIDATION_PATTERNS.phone.us;
      break;
    default:
      if (cleanPhone.startsWith('+')) {
        pattern = VALIDATION_PATTERNS.phone.international;
      }
      break;
  }

  if (!pattern.test(cleanPhone)) {
    return { isValid: false, error: 'Invalid phone number format' };
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
 * Validates names (surname, given names) for travel documents.
 */
export function validateTravelName(name: string): { isValid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Name is required' };
  }

  // Check for invalid spacing before trimming
  if (/^\s|\s$|\s{2,}/.test(name)) {
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
  const namePattern = /^[\p{L}\s\-'\.]+$/u;
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

/**
 * Validates currency amounts with optional country-specific limits.
 */
export function validateCurrencyAmount(
  amount: string | number,
  currencyCode?: string,
  country?: string
): { isValid: boolean; error?: string; warning?: string } {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numericAmount)) {
    return { isValid: false, error: 'Invalid currency amount' };
  }

  if (numericAmount < 0) {
    return { isValid: false, error: 'Currency amount cannot be negative' };
  }

  if (numericAmount > 10000000) {  // Increased to 10M to allow for different currencies
    return { isValid: false, error: 'Currency amount exceeds maximum limit' };
  }

  // Country-specific warnings for declaration thresholds
  let warning: string | undefined;

  if (country && numericAmount > 0) {
    switch (country.toUpperCase()) {
      case 'JPN':
        if (currencyCode === 'JPY' && numericAmount > 1000000) {
          warning = 'Amounts over ¥1,000,000 must be declared in Japan';
        }
        break;
      case 'USA':
        if (currencyCode === 'USD' && numericAmount > 10000) {
          warning = 'Amounts over $10,000 must be declared in the USA';
        }
        break;
      case 'SGP':
        if (currencyCode === 'SGD' && numericAmount > 20000) {
          warning = 'Amounts over S$20,000 must be declared in Singapore';
        }
        break;
    }
  }

  return { isValid: true, warning };
}

/**
 * Sanitizes and normalizes string input for forms.
 */
export function sanitizeFormInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[<>]/g, '') // Remove potentially dangerous characters
    .substring(0, 1000); // Limit length to prevent abuse
}

/**
 * Validates that a value is not empty/null/undefined.
 */
export function isRequired(value: unknown, fieldName = 'Field'): { isValid: boolean; error?: string } {
  if (value === null || value === undefined || value === '' || 
      (typeof value === 'string' && value.trim().length === 0)) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  return { isValid: true };
}

/**
 * Validates string length constraints.
 */
export function validateLength(
  value: string,
  options: { min?: number; max?: number; fieldName?: string }
): { isValid: boolean; error?: string } {
  const { min, max, fieldName = 'Field' } = options;

  if (!value || typeof value !== 'string') {
    return { isValid: false, error: `${fieldName} must be a string` };
  }

  const length = value.trim().length;

  if (min !== undefined && length < min) {
    return { isValid: false, error: `${fieldName} must be at least ${min} characters` };
  }

  if (max !== undefined && length > max) {
    return { isValid: false, error: `${fieldName} cannot exceed ${max} characters` };
  }

  return { isValid: true };
}

/**
 * Validates numeric ranges.
 */
export function validateRange(
  value: number,
  options: { min?: number; max?: number; fieldName?: string }
): { isValid: boolean; error?: string } {
  const { min, max, fieldName = 'Value' } = options;

  if (typeof value !== 'number' || isNaN(value)) {
    return { isValid: false, error: `${fieldName} must be a number` };
  }

  if (min !== undefined && value < min) {
    return { isValid: false, error: `${fieldName} must be at least ${min}` };
  }

  if (max !== undefined && value > max) {
    return { isValid: false, error: `${fieldName} cannot exceed ${max}` };
  }

  return { isValid: true };
}