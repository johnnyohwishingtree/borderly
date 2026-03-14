/**
 * countryUtils.ts
 *
 * Shared utilities for mapping country codes to human-readable portal names
 * and other country-related constants.
 */

/**
 * Maps ISO 3166-1 alpha-3 country codes to their government portal names
 * as displayed in the Borderly app.
 */
export const PORTAL_NAMES: Record<string, string> = {
  JPN: 'Visit Japan Web',
  MYS: 'Malaysia MDAC',
  SGP: 'SG Arrival Card',
};

/**
 * Returns the display name of the government portal for a given country code.
 * Falls back to the raw country code if the code is not recognised.
 */
export function getPortalName(countryCode: string): string {
  return PORTAL_NAMES[countryCode] ?? countryCode;
}
