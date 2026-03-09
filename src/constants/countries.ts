/**
 * Centralized country data for Borderly.
 * Single source of truth for all supported countries.
 */

export interface SupportedCountry {
  code: string;
  name: string;
  fullName: string;
  colors: string[];
}

export const SUPPORTED_COUNTRIES: SupportedCountry[] = [
  {
    code: 'JPN',
    name: 'Japan',
    fullName: 'Japan',
    colors: ['#FFFFFF', '#E60012'],
  },
  {
    code: 'MYS',
    name: 'Malaysia',
    fullName: 'Malaysia',
    colors: ['#CE1126', '#FFFFFF', '#010E96', '#FFCC00'],
  },
  {
    code: 'SGP',
    name: 'Singapore',
    fullName: 'Singapore',
    colors: ['#EE2436', '#FFFFFF'],
  },
  {
    code: 'THA',
    name: 'Thailand',
    fullName: 'Thailand',
    colors: ['#A51931', '#F4F5F8', '#2D2A4A'],
  },
  {
    code: 'VNM',
    name: 'Vietnam',
    fullName: 'Vietnam',
    colors: ['#DA251D', '#FFCD00'],
  },
  {
    code: 'GBR',
    name: 'UK',
    fullName: 'United Kingdom',
    colors: ['#012169', '#C8102E', '#FFFFFF'],
  },
  {
    code: 'USA',
    name: 'USA',
    fullName: 'United States',
    colors: ['#B22234', '#FFFFFF', '#3C3B6E'],
  },
  {
    code: 'CAN',
    name: 'Canada',
    fullName: 'Canada',
    colors: ['#FF0000', '#FFFFFF'],
  },
];

/**
 * ISO country codes for all supported countries.
 * Use this when you need just the codes (e.g., validation, schema loading).
 */
export const SUPPORTED_COUNTRY_CODES = SUPPORTED_COUNTRIES.map(country => country.code);

/**
 * Get country names for easy iteration in tests and UI
 */
export const SUPPORTED_COUNTRY_NAMES = SUPPORTED_COUNTRIES.map(country => country.name);

/**
 * Get country by code
 */
export const getCountryByCode = (code: string): SupportedCountry | undefined => {
  return SUPPORTED_COUNTRIES.find(country => country.code === code);
};

/**
 * Get display name for a country code.
 * Returns the code itself if not found in supported countries.
 */
export const getCountryName = (code: string): string => {
  return SUPPORTED_COUNTRIES.find(c => c.code === code)?.name ?? code;
};

/**
 * Get full/formal name for a country code (e.g., "United Kingdom" instead of "UK").
 * Returns the code itself if not found.
 */
export const getCountryFullName = (code: string): string => {
  return SUPPORTED_COUNTRIES.find(c => c.code === code)?.fullName ?? code;
};

/**
 * Generate a human-readable list of supported country names.
 * e.g., "Japan, Malaysia, Singapore, and 5 more"
 */
export const formatSupportedCountryList = (): string => {
  const names = SUPPORTED_COUNTRIES.map(c => c.name);
  if (names.length <= 3) {
    return names.join(', ');
  }
  return `${names.slice(0, 3).join(', ')}, and ${names.length - 3} more`;
};