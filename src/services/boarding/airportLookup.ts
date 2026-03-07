/**
 * Airport code to country mapping for supported countries
 * 
 * Maps IATA 3-letter airport codes to ISO 3166-1 alpha-3 country codes
 * Only includes airports in supported countries (JPN, MYS, SGP) plus
 * common departure airports for travelers to these regions.
 */

export interface AirportInfo {
  code: string;
  name: string;
  city: string;
  country: string; // ISO 3166-1 alpha-3
}

/**
 * Airport database for supported countries and common departure points
 */
export const AIRPORT_DATABASE: Record<string, AirportInfo> = {
  // Japan (JPN) - Destination airports
  NRT: {
    code: 'NRT',
    name: 'Narita International Airport',
    city: 'Tokyo',
    country: 'JPN',
  },
  HND: {
    code: 'HND',
    name: 'Haneda Airport',
    city: 'Tokyo',
    country: 'JPN',
  },
  KIX: {
    code: 'KIX',
    name: 'Kansai International Airport',
    city: 'Osaka',
    country: 'JPN',
  },
  FUK: {
    code: 'FUK',
    name: 'Fukuoka Airport',
    city: 'Fukuoka',
    country: 'JPN',
  },
  CTS: {
    code: 'CTS',
    name: 'New Chitose Airport',
    city: 'Sapporo',
    country: 'JPN',
  },
  ITM: {
    code: 'ITM',
    name: 'Osaka International Airport (Itami)',
    city: 'Osaka',
    country: 'JPN',
  },

  // Malaysia (MYS) - Destination airports
  KUL: {
    code: 'KUL',
    name: 'Kuala Lumpur International Airport',
    city: 'Kuala Lumpur',
    country: 'MYS',
  },
  PEN: {
    code: 'PEN',
    name: 'Penang International Airport',
    city: 'Penang',
    country: 'MYS',
  },
  BKI: {
    code: 'BKI',
    name: 'Kota Kinabalu International Airport',
    city: 'Kota Kinabalu',
    country: 'MYS',
  },
  KCH: {
    code: 'KCH',
    name: 'Kuching International Airport',
    city: 'Kuching',
    country: 'MYS',
  },
  LGK: {
    code: 'LGK',
    name: 'Langkawi International Airport',
    city: 'Langkawi',
    country: 'MYS',
  },

  // Singapore (SGP) - Destination airports
  SIN: {
    code: 'SIN',
    name: 'Singapore Changi Airport',
    city: 'Singapore',
    country: 'SGP',
  },

  // Common departure airports - USA
  LAX: {
    code: 'LAX',
    name: 'Los Angeles International Airport',
    city: 'Los Angeles',
    country: 'USA',
  },
  SFO: {
    code: 'SFO',
    name: 'San Francisco International Airport',
    city: 'San Francisco',
    country: 'USA',
  },
  SEA: {
    code: 'SEA',
    name: 'Seattle-Tacoma International Airport',
    city: 'Seattle',
    country: 'USA',
  },
  JFK: {
    code: 'JFK',
    name: 'John F. Kennedy International Airport',
    city: 'New York',
    country: 'USA',
  },
  EWR: {
    code: 'EWR',
    name: 'Newark Liberty International Airport',
    city: 'Newark',
    country: 'USA',
  },
  LGA: {
    code: 'LGA',
    name: 'LaGuardia Airport',
    city: 'New York',
    country: 'USA',
  },
  ORD: {
    code: 'ORD',
    name: 'O\'Hare International Airport',
    city: 'Chicago',
    country: 'USA',
  },
  DFW: {
    code: 'DFW',
    name: 'Dallas/Fort Worth International Airport',
    city: 'Dallas',
    country: 'USA',
  },

  // Common departure airports - Canada
  YVR: {
    code: 'YVR',
    name: 'Vancouver International Airport',
    city: 'Vancouver',
    country: 'CAN',
  },
  YYZ: {
    code: 'YYZ',
    name: 'Toronto Pearson International Airport',
    city: 'Toronto',
    country: 'CAN',
  },

  // Common departure airports - Europe
  LHR: {
    code: 'LHR',
    name: 'Heathrow Airport',
    city: 'London',
    country: 'GBR',
  },
  CDG: {
    code: 'CDG',
    name: 'Charles de Gaulle Airport',
    city: 'Paris',
    country: 'FRA',
  },
  FRA: {
    code: 'FRA',
    name: 'Frankfurt Airport',
    city: 'Frankfurt',
    country: 'DEU',
  },
  AMS: {
    code: 'AMS',
    name: 'Amsterdam Airport Schiphol',
    city: 'Amsterdam',
    country: 'NLD',
  },

  // Common departure airports - Asia Pacific
  ICN: {
    code: 'ICN',
    name: 'Incheon International Airport',
    city: 'Seoul',
    country: 'KOR',
  },
  HKG: {
    code: 'HKG',
    name: 'Hong Kong International Airport',
    city: 'Hong Kong',
    country: 'HKG',
  },
  TPE: {
    code: 'TPE',
    name: 'Taiwan Taoyuan International Airport',
    city: 'Taipei',
    country: 'TWN',
  },
  BKK: {
    code: 'BKK',
    name: 'Suvarnabhumi Airport',
    city: 'Bangkok',
    country: 'THA',
  },
  CGK: {
    code: 'CGK',
    name: 'Soekarno-Hatta International Airport',
    city: 'Jakarta',
    country: 'IDN',
  },
  MNL: {
    code: 'MNL',
    name: 'Ninoy Aquino International Airport',
    city: 'Manila',
    country: 'PHL',
  },

  // Common departure airports - Australia/New Zealand
  SYD: {
    code: 'SYD',
    name: 'Sydney Kingsford Smith Airport',
    city: 'Sydney',
    country: 'AUS',
  },
  MEL: {
    code: 'MEL',
    name: 'Melbourne Airport',
    city: 'Melbourne',
    country: 'AUS',
  },
  AKL: {
    code: 'AKL',
    name: 'Auckland Airport',
    city: 'Auckland',
    country: 'NZL',
  },
};

/**
 * Supported destination countries for the app
 */
export const SUPPORTED_COUNTRIES = ['JPN', 'MYS', 'SGP'] as const;

export type SupportedCountry = typeof SUPPORTED_COUNTRIES[number];

/**
 * Lookup airport information by IATA code
 */
export function lookupAirport(code: string): AirportInfo | null {
  const upperCode = code.toUpperCase();
  return AIRPORT_DATABASE[upperCode] || null;
}

/**
 * Get country code from airport IATA code
 */
export function getCountryFromAirport(airportCode: string): string | null {
  const airport = lookupAirport(airportCode);
  return airport ? airport.country : null;
}

/**
 * Check if an airport is in a supported destination country
 */
export function isSupportedDestination(airportCode: string): boolean {
  const country = getCountryFromAirport(airportCode);
  return country ? SUPPORTED_COUNTRIES.includes(country as SupportedCountry) : false;
}

/**
 * Get all airports for a given country
 */
export function getAirportsByCountry(countryCode: string): AirportInfo[] {
  return Object.values(AIRPORT_DATABASE).filter(
    airport => airport.country === countryCode
  );
}

/**
 * Get all supported destination airports
 */
export function getSupportedDestinationAirports(): AirportInfo[] {
  const supportedCountriesSet = new Set<string>(SUPPORTED_COUNTRIES);
  return Object.values(AIRPORT_DATABASE).filter(airport =>
    supportedCountriesSet.has(airport.country)
  );
}