/**
 * Bundled IATA airport database for Borderly.
 * ~500 most common international airports, kept fully offline.
 *
 * Each entry uses the SearchableSelect format:
 *   value  = 3-letter IATA code stored in the form (e.g. "NRT")
 *   label  = human-readable display including city, airport name, and IATA code
 *             (e.g. "Tokyo Narita (NRT)") — enables search by any of the three.
 */
import airportsData from '../assets/data/airports.json';

export const ALL_AIRPORTS: { value: string; label: string }[] = airportsData;

/**
 * Look up a single airport by IATA code.
 */
export const getAirportByCode = (
  code: string,
): { value: string; label: string } | undefined =>
  ALL_AIRPORTS.find(a => a.value === code);

/**
 * Return the display label for an IATA code.
 * Falls back to the raw code if the airport is not in the database.
 */
export const getAirportLabel = (code: string): string =>
  ALL_AIRPORTS.find(a => a.value === code)?.label ?? code;
