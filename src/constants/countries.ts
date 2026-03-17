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
 * All nationalities / countries for searchable dropdowns (e.g., VJW nationality picker).
 * Uses ISO 3166-1 alpha-3 codes. Covers the most common traveler nationalities first,
 * then the rest alphabetically.
 */
export const ALL_COUNTRIES: { value: string; label: string }[] = [
  { value: 'AFG', label: 'Afghanistan' },
  { value: 'ALB', label: 'Albania' },
  { value: 'DZA', label: 'Algeria' },
  { value: 'AND', label: 'Andorra' },
  { value: 'AGO', label: 'Angola' },
  { value: 'ATG', label: 'Antigua and Barbuda' },
  { value: 'ARG', label: 'Argentina' },
  { value: 'ARM', label: 'Armenia' },
  { value: 'AUS', label: 'Australia' },
  { value: 'AUT', label: 'Austria' },
  { value: 'AZE', label: 'Azerbaijan' },
  { value: 'BHS', label: 'Bahamas' },
  { value: 'BHR', label: 'Bahrain' },
  { value: 'BGD', label: 'Bangladesh' },
  { value: 'BRB', label: 'Barbados' },
  { value: 'BLR', label: 'Belarus' },
  { value: 'BEL', label: 'Belgium' },
  { value: 'BLZ', label: 'Belize' },
  { value: 'BEN', label: 'Benin' },
  { value: 'BTN', label: 'Bhutan' },
  { value: 'BOL', label: 'Bolivia' },
  { value: 'BIH', label: 'Bosnia and Herzegovina' },
  { value: 'BWA', label: 'Botswana' },
  { value: 'BRA', label: 'Brazil' },
  { value: 'BRN', label: 'Brunei' },
  { value: 'BGR', label: 'Bulgaria' },
  { value: 'BFA', label: 'Burkina Faso' },
  { value: 'BDI', label: 'Burundi' },
  { value: 'KHM', label: 'Cambodia' },
  { value: 'CMR', label: 'Cameroon' },
  { value: 'CAN', label: 'Canada' },
  { value: 'CPV', label: 'Cape Verde' },
  { value: 'CAF', label: 'Central African Republic' },
  { value: 'TCD', label: 'Chad' },
  { value: 'CHL', label: 'Chile' },
  { value: 'CHN', label: 'China' },
  { value: 'COL', label: 'Colombia' },
  { value: 'COM', label: 'Comoros' },
  { value: 'COG', label: 'Congo' },
  { value: 'COD', label: 'Congo (Democratic Republic)' },
  { value: 'CRI', label: 'Costa Rica' },
  { value: 'HRV', label: 'Croatia' },
  { value: 'CUB', label: 'Cuba' },
  { value: 'CYP', label: 'Cyprus' },
  { value: 'CZE', label: 'Czech Republic' },
  { value: 'DNK', label: 'Denmark' },
  { value: 'DJI', label: 'Djibouti' },
  { value: 'DMA', label: 'Dominica' },
  { value: 'DOM', label: 'Dominican Republic' },
  { value: 'ECU', label: 'Ecuador' },
  { value: 'EGY', label: 'Egypt' },
  { value: 'SLV', label: 'El Salvador' },
  { value: 'GNQ', label: 'Equatorial Guinea' },
  { value: 'ERI', label: 'Eritrea' },
  { value: 'EST', label: 'Estonia' },
  { value: 'SWZ', label: 'Eswatini' },
  { value: 'ETH', label: 'Ethiopia' },
  { value: 'FJI', label: 'Fiji' },
  { value: 'FIN', label: 'Finland' },
  { value: 'FRA', label: 'France' },
  { value: 'GAB', label: 'Gabon' },
  { value: 'GMB', label: 'Gambia' },
  { value: 'GEO', label: 'Georgia' },
  { value: 'DEU', label: 'Germany' },
  { value: 'GHA', label: 'Ghana' },
  { value: 'GRC', label: 'Greece' },
  { value: 'GRD', label: 'Grenada' },
  { value: 'GTM', label: 'Guatemala' },
  { value: 'GIN', label: 'Guinea' },
  { value: 'GNB', label: 'Guinea-Bissau' },
  { value: 'GUY', label: 'Guyana' },
  { value: 'HTI', label: 'Haiti' },
  { value: 'HND', label: 'Honduras' },
  { value: 'HKG', label: 'Hong Kong' },
  { value: 'HUN', label: 'Hungary' },
  { value: 'ISL', label: 'Iceland' },
  { value: 'IND', label: 'India' },
  { value: 'IDN', label: 'Indonesia' },
  { value: 'IRN', label: 'Iran' },
  { value: 'IRQ', label: 'Iraq' },
  { value: 'IRL', label: 'Ireland' },
  { value: 'ISR', label: 'Israel' },
  { value: 'ITA', label: 'Italy' },
  { value: 'CIV', label: 'Ivory Coast' },
  { value: 'JAM', label: 'Jamaica' },
  { value: 'JPN', label: 'Japan' },
  { value: 'JOR', label: 'Jordan' },
  { value: 'KAZ', label: 'Kazakhstan' },
  { value: 'KEN', label: 'Kenya' },
  { value: 'KIR', label: 'Kiribati' },
  { value: 'PRK', label: 'Korea (North)' },
  { value: 'KOR', label: 'Korea (South)' },
  { value: 'KWT', label: 'Kuwait' },
  { value: 'KGZ', label: 'Kyrgyzstan' },
  { value: 'LAO', label: 'Laos' },
  { value: 'LVA', label: 'Latvia' },
  { value: 'LBN', label: 'Lebanon' },
  { value: 'LSO', label: 'Lesotho' },
  { value: 'LBR', label: 'Liberia' },
  { value: 'LBY', label: 'Libya' },
  { value: 'LIE', label: 'Liechtenstein' },
  { value: 'LTU', label: 'Lithuania' },
  { value: 'LUX', label: 'Luxembourg' },
  { value: 'MAC', label: 'Macau' },
  { value: 'MDG', label: 'Madagascar' },
  { value: 'MWI', label: 'Malawi' },
  { value: 'MYS', label: 'Malaysia' },
  { value: 'MDV', label: 'Maldives' },
  { value: 'MLI', label: 'Mali' },
  { value: 'MLT', label: 'Malta' },
  { value: 'MHL', label: 'Marshall Islands' },
  { value: 'MRT', label: 'Mauritania' },
  { value: 'MUS', label: 'Mauritius' },
  { value: 'MEX', label: 'Mexico' },
  { value: 'FSM', label: 'Micronesia' },
  { value: 'MDA', label: 'Moldova' },
  { value: 'MCO', label: 'Monaco' },
  { value: 'MNG', label: 'Mongolia' },
  { value: 'MNE', label: 'Montenegro' },
  { value: 'MAR', label: 'Morocco' },
  { value: 'MOZ', label: 'Mozambique' },
  { value: 'MMR', label: 'Myanmar' },
  { value: 'NAM', label: 'Namibia' },
  { value: 'NRU', label: 'Nauru' },
  { value: 'NPL', label: 'Nepal' },
  { value: 'NLD', label: 'Netherlands' },
  { value: 'NZL', label: 'New Zealand' },
  { value: 'NIC', label: 'Nicaragua' },
  { value: 'NER', label: 'Niger' },
  { value: 'NGA', label: 'Nigeria' },
  { value: 'MKD', label: 'North Macedonia' },
  { value: 'NOR', label: 'Norway' },
  { value: 'OMN', label: 'Oman' },
  { value: 'PAK', label: 'Pakistan' },
  { value: 'PLW', label: 'Palau' },
  { value: 'PSE', label: 'Palestine' },
  { value: 'PAN', label: 'Panama' },
  { value: 'PNG', label: 'Papua New Guinea' },
  { value: 'PRY', label: 'Paraguay' },
  { value: 'PER', label: 'Peru' },
  { value: 'PHL', label: 'Philippines' },
  { value: 'POL', label: 'Poland' },
  { value: 'PRT', label: 'Portugal' },
  { value: 'QAT', label: 'Qatar' },
  { value: 'ROU', label: 'Romania' },
  { value: 'RUS', label: 'Russia' },
  { value: 'RWA', label: 'Rwanda' },
  { value: 'KNA', label: 'Saint Kitts and Nevis' },
  { value: 'LCA', label: 'Saint Lucia' },
  { value: 'VCT', label: 'Saint Vincent and the Grenadines' },
  { value: 'WSM', label: 'Samoa' },
  { value: 'SMR', label: 'San Marino' },
  { value: 'STP', label: 'Sao Tome and Principe' },
  { value: 'SAU', label: 'Saudi Arabia' },
  { value: 'SEN', label: 'Senegal' },
  { value: 'SRB', label: 'Serbia' },
  { value: 'SYC', label: 'Seychelles' },
  { value: 'SLE', label: 'Sierra Leone' },
  { value: 'SGP', label: 'Singapore' },
  { value: 'SVK', label: 'Slovakia' },
  { value: 'SVN', label: 'Slovenia' },
  { value: 'SLB', label: 'Solomon Islands' },
  { value: 'SOM', label: 'Somalia' },
  { value: 'ZAF', label: 'South Africa' },
  { value: 'SSD', label: 'South Sudan' },
  { value: 'ESP', label: 'Spain' },
  { value: 'LKA', label: 'Sri Lanka' },
  { value: 'SDN', label: 'Sudan' },
  { value: 'SUR', label: 'Suriname' },
  { value: 'SWE', label: 'Sweden' },
  { value: 'CHE', label: 'Switzerland' },
  { value: 'SYR', label: 'Syria' },
  { value: 'TWN', label: 'Taiwan' },
  { value: 'TJK', label: 'Tajikistan' },
  { value: 'TZA', label: 'Tanzania' },
  { value: 'THA', label: 'Thailand' },
  { value: 'TLS', label: 'Timor-Leste' },
  { value: 'TGO', label: 'Togo' },
  { value: 'TON', label: 'Tonga' },
  { value: 'TTO', label: 'Trinidad and Tobago' },
  { value: 'TUN', label: 'Tunisia' },
  { value: 'TUR', label: 'Turkey' },
  { value: 'TKM', label: 'Turkmenistan' },
  { value: 'TUV', label: 'Tuvalu' },
  { value: 'UGA', label: 'Uganda' },
  { value: 'UKR', label: 'Ukraine' },
  { value: 'ARE', label: 'United Arab Emirates' },
  { value: 'GBR', label: 'United Kingdom' },
  { value: 'USA', label: 'United States' },
  { value: 'URY', label: 'Uruguay' },
  { value: 'UZB', label: 'Uzbekistan' },
  { value: 'VUT', label: 'Vanuatu' },
  { value: 'VAT', label: 'Vatican City' },
  { value: 'VEN', label: 'Venezuela' },
  { value: 'VNM', label: 'Vietnam' },
  { value: 'YEM', label: 'Yemen' },
  { value: 'ZMB', label: 'Zambia' },
  { value: 'ZWE', label: 'Zimbabwe' },
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