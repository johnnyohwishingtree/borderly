/**
 * countryUtils.ts
 *
 * Shared utilities for mapping country codes to human-readable portal names
 * and other country-related constants.
 *
 * All data is derived from the portal registry (which reads JSON schemas) so
 * that no hardcoded country lists need to be maintained here.
 */

import {
  getAllPortals,
  getPortalName as registryGetPortalName,
} from '@/services/submission/portalRegistry';

/**
 * Maps ISO 3166-1 alpha-3 country codes to their government portal names
 * as displayed in the Borderly app.
 *
 * Derived from the portal registry — adding a new JSON schema automatically
 * makes it appear here.
 */
export const PORTAL_NAMES: Record<string, string> = Object.fromEntries(
  getAllPortals().map((p) => [p.countryCode, p.portalName]),
);

/**
 * Returns the display name of the government portal for a given country code.
 * Falls back to the raw country code if the code is not recognised.
 */
export function getPortalName(countryCode: string): string {
  return registryGetPortalName(countryCode);
}
