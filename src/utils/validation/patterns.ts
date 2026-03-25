/**
 * Regular expression patterns for various travel-related validations.
 */

export const VALIDATION_PATTERNS = {
  // Passport patterns by issuing country/region
  passport: {
    default: /^[A-Z0-9]{6,9}$/,
    US: /^[0-9]{9}$/,  // US passports are typically 9 digits only
    UK: /^[0-9]{9}$/,
    EU: /^[A-Z]{2}[A-Z0-9]{6,7}$/,
    asia: /^[A-Z]{1,2}[0-9]{7,8}$/,
  },

  // Contact information
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
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
