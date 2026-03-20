/**
 * Bundled IATA airline database for Borderly.
 * ~200 most active international airlines, kept fully offline.
 *
 * Each entry uses the SearchableSelect format:
 *   value  = 2-letter IATA code stored in the form (e.g. "SQ")
 *   label  = human-readable display including airline name and IATA code
 *             (e.g. "Singapore Airlines (SQ)") — enables search by name or code.
 */
import airlinesData from '../assets/data/airlines.json';

export const ALL_AIRLINES: { value: string; label: string }[] = airlinesData;

/**
 * Look up a single airline by IATA code.
 */
export const getAirlineByCode = (
  code: string,
): { value: string; label: string } | undefined =>
  ALL_AIRLINES.find(a => a.value === code);

/**
 * Return the display label for an IATA code.
 * Falls back to the raw code if the airline is not in the database.
 */
export const getAirlineLabel = (code: string): string =>
  ALL_AIRLINES.find(a => a.value === code)?.label ?? code;
