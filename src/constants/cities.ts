/**
 * Bundled city database for Borderly, derived from the airports database.
 *
 * Each entry uses the SearchableSelect format:
 *   value = city name (lowercase, for matching)
 *   label = city name (display format)
 *
 * Cities are extracted from airport labels ("City AirportName (CODE)").
 * Deduplicated and sorted alphabetically.
 */
import { ALL_AIRPORTS } from './airports';

function extractCityFromLabel(label: string): string {
  // Airport labels: "City Name AirportName (CODE)" or "City Name (CODE)"
  // Extract everything before the parenthetical code, then take the first word(s)
  // that form the city name (before the airport-specific suffix).
  const beforeCode = label.replace(/\s*\([A-Z]{3}\)\s*$/, '').trim();

  // Common patterns:
  // "San Francisco International" → "San Francisco"
  // "Tokyo Narita" → "Tokyo"
  // "New York John F Kennedy" → "New York"
  // "Aberdeen" → "Aberdeen"

  // Split into words and find where the airport name starts
  // Heuristic: airport names often contain words like International, Airport,
  // or are proper nouns that follow the city name
  const cleaned = beforeCode
    .replace(/\b(International|Intl|Domestic|Regional|Metropolitan|Municipal|Memorial)\b.*$/i, '')
    .replace(/\b(Airport|Aeroporto|Aeroport|Flughafen)\b.*$/i, '')
    .trim();

  return cleaned || beforeCode;
}

// Extract unique city names from airports
const citySet = new Set<string>();
const cityEntries: { value: string; label: string }[] = [];

for (const airport of ALL_AIRPORTS) {
  const city = extractCityFromLabel(airport.label);
  const key = city.toLowerCase();
  if (!citySet.has(key)) {
    citySet.add(key);
    cityEntries.push({ value: city, label: city });
  }
}

// Sort alphabetically
cityEntries.sort((a, b) => a.label.localeCompare(b.label));

export const ALL_CITIES: { value: string; label: string }[] = cityEntries;

/**
 * Look up a city by name (case-insensitive).
 */
export const getCityByName = (
  name: string,
): { value: string; label: string } | undefined =>
  ALL_CITIES.find(c => c.value.toLowerCase() === name.toLowerCase());
