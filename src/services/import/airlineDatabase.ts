/**
 * Bundled airline database — IATA 2-letter codes to airline names
 *
 * Covers major airlines that fly to supported destinations (JPN, MYS, SGP)
 * plus common international carriers.
 */

export interface AirlineInfo {
  code: string;
  name: string;
  country: string; // Airline's home country (ISO 3166-1 alpha-3)
}

export const AIRLINE_DATABASE: Record<string, AirlineInfo> = {
  // Japan
  NH: { code: 'NH', name: 'All Nippon Airways', country: 'JPN' },
  JL: { code: 'JL', name: 'Japan Airlines', country: 'JPN' },
  GK: { code: 'GK', name: 'Jetstar Japan', country: 'JPN' },
  MM: { code: 'MM', name: 'Peach Aviation', country: 'JPN' },
  BC: { code: 'BC', name: 'Skymark Airlines', country: 'JPN' },

  // Malaysia
  MH: { code: 'MH', name: 'Malaysia Airlines', country: 'MYS' },
  AK: { code: 'AK', name: 'AirAsia', country: 'MYS' },
  D7: { code: 'D7', name: 'AirAsia X', country: 'MYS' },
  OD: { code: 'OD', name: 'Batik Air Malaysia', country: 'MYS' },

  // Singapore
  SQ: { code: 'SQ', name: 'Singapore Airlines', country: 'SGP' },
  TR: { code: 'TR', name: 'Scoot', country: 'SGP' },
  MI: { code: 'MI', name: 'SilkAir', country: 'SGP' },

  // USA
  AA: { code: 'AA', name: 'American Airlines', country: 'USA' },
  DL: { code: 'DL', name: 'Delta Air Lines', country: 'USA' },
  UA: { code: 'UA', name: 'United Airlines', country: 'USA' },
  HA: { code: 'HA', name: 'Hawaiian Airlines', country: 'USA' },

  // Canada
  AC: { code: 'AC', name: 'Air Canada', country: 'CAN' },
  WS: { code: 'WS', name: 'WestJet', country: 'CAN' },

  // Europe
  BA: { code: 'BA', name: 'British Airways', country: 'GBR' },
  LH: { code: 'LH', name: 'Lufthansa', country: 'DEU' },
  AF: { code: 'AF', name: 'Air France', country: 'FRA' },
  KL: { code: 'KL', name: 'KLM Royal Dutch Airlines', country: 'NLD' },
  LX: { code: 'LX', name: 'Swiss International Air Lines', country: 'CHE' },
  TK: { code: 'TK', name: 'Turkish Airlines', country: 'TUR' },
  FI: { code: 'FI', name: 'Icelandair', country: 'ISL' },
  AY: { code: 'AY', name: 'Finnair', country: 'FIN' },

  // Asia Pacific
  CX: { code: 'CX', name: 'Cathay Pacific', country: 'HKG' },
  KE: { code: 'KE', name: 'Korean Air', country: 'KOR' },
  OZ: { code: 'OZ', name: 'Asiana Airlines', country: 'KOR' },
  CI: { code: 'CI', name: 'China Airlines', country: 'TWN' },
  BR: { code: 'BR', name: 'EVA Air', country: 'TWN' },
  TG: { code: 'TG', name: 'Thai Airways', country: 'THA' },
  GA: { code: 'GA', name: 'Garuda Indonesia', country: 'IDN' },
  PR: { code: 'PR', name: 'Philippine Airlines', country: 'PHL' },
  VN: { code: 'VN', name: 'Vietnam Airlines', country: 'VNM' },
  CA: { code: 'CA', name: 'Air China', country: 'CHN' },
  CZ: { code: 'CZ', name: 'China Southern Airlines', country: 'CHN' },
  MU: { code: 'MU', name: 'China Eastern Airlines', country: 'CHN' },
  QF: { code: 'QF', name: 'Qantas', country: 'AUS' },
  JQ: { code: 'JQ', name: 'Jetstar Airways', country: 'AUS' },
  NZ: { code: 'NZ', name: 'Air New Zealand', country: 'NZL' },

  // Middle East
  EK: { code: 'EK', name: 'Emirates', country: 'ARE' },
  QR: { code: 'QR', name: 'Qatar Airways', country: 'QAT' },
  EY: { code: 'EY', name: 'Etihad Airways', country: 'ARE' },
};

/**
 * Look up airline by IATA 2-letter code
 */
export function lookupAirline(code: string): AirlineInfo | null {
  return AIRLINE_DATABASE[code.toUpperCase()] || null;
}

/**
 * Extract airline code from a flight number string
 * e.g., "NH101" → "NH", "JL 723" → "JL", "SQ12" → "SQ"
 */
export function extractAirlineCode(flightNumber: string): string | null {
  const match = flightNumber.trim().match(/^([A-Z]{2})\s*\d/i);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Extract numeric part from a flight number string
 * e.g., "NH101" → "101", "JL 723" → "723"
 */
export function extractFlightNumeric(flightNumber: string): string | null {
  const match = flightNumber.trim().match(/^[A-Z]{2}\s*(\d+)/i);
  return match ? match[1] : null;
}
