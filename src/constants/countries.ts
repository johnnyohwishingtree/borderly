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
 * Get country names for easy iteration in tests and UI
 */
export const SUPPORTED_COUNTRY_NAMES = SUPPORTED_COUNTRIES.map(country => country.name);

/**
 * Get country by code
 */
export const getCountryByCode = (code: string): SupportedCountry | undefined => {
  return SUPPORTED_COUNTRIES.find(country => country.code === code);
};