/**
 * Portal Registry — single source of truth for government portal configuration.
 *
 * Reads `portalUrl` and `portalName` directly from the bundled JSON schemas so
 * that adding a new country only requires a new JSON schema file and a mapping
 * config — no changes to core code.
 *
 * Replaces hardcoded lists in:
 *   - PortalWebView.tsx      (ALLOWED_DOMAINS)
 *   - countryUtils.ts        (PORTAL_NAMES)
 *   - pageDetection.ts       (PORTAL_BASE_URLS)
 */

import JPNSchema from '@/schemas/JPN.json';
import MYSSchema from '@/schemas/MYS.json';
import SGPSchema from '@/schemas/SGP.json';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PortalInfo {
  countryCode: string;
  portalName: string;
  /** Full portal URL as defined in the JSON schema. */
  portalUrl: string;
  /**
   * Hostname extracted from `portalUrl`.
   * Used for WebView domain allowlisting.
   */
  allowedDomain: string;
  /**
   * Origin (scheme + host) extracted from `portalUrl`.
   * Used for page detection base-URL matching.
   */
  baseUrl: string;
}

// ---------------------------------------------------------------------------
// Internal helpers — avoids a runtime dependency on the URL class, which
// may not be polyfilled in all RN environments at module initialisation time.
// ---------------------------------------------------------------------------

function extractHostname(url: string): string {
  const match = url.match(/^https?:\/\/([^/:]+)/);
  return match?.[1] ?? '';
}

function extractOrigin(url: string): string {
  const match = url.match(/^(https?:\/\/[^/?#:]+)/);
  return match?.[1] ?? url;
}

function buildPortalInfo(schema: {
  countryCode: string;
  portalName: string;
  portalUrl: string;
}): PortalInfo {
  return {
    countryCode: schema.countryCode,
    portalName: schema.portalName,
    portalUrl: schema.portalUrl,
    allowedDomain: extractHostname(schema.portalUrl),
    baseUrl: extractOrigin(schema.portalUrl),
  };
}

// ---------------------------------------------------------------------------
// Registry — add new countries here by importing their schema.
// ---------------------------------------------------------------------------

const PORTAL_REGISTRY: PortalInfo[] = [
  buildPortalInfo(JPNSchema),
  buildPortalInfo(MYSSchema),
  buildPortalInfo(SGPSchema),
];

/** O(1) country-code → PortalInfo lookup map. */
const PORTAL_MAP: Record<string, PortalInfo> = Object.fromEntries(
  PORTAL_REGISTRY.map((p) => [p.countryCode, p]),
);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Returns the PortalInfo for a country, or undefined if not registered. */
export function getPortalInfo(countryCode: string): PortalInfo | undefined {
  return PORTAL_MAP[countryCode];
}

/** Returns all registered portals. */
export function getAllPortals(): PortalInfo[] {
  return PORTAL_REGISTRY;
}

/**
 * Returns all allowed domains for WebView domain allowlisting.
 * Always includes `localhost` and `127.0.0.1` for development / E2E testing.
 */
export function getAllowedDomains(): string[] {
  const schemaDomains = PORTAL_REGISTRY.map((p) => p.allowedDomain);
  return [...schemaDomains, 'localhost', '127.0.0.1'];
}

/**
 * Returns the display name of the government portal for a given country code.
 * Falls back to the raw country code if the code is not registered.
 */
export function getPortalName(countryCode: string): string {
  return PORTAL_MAP[countryCode]?.portalName ?? countryCode;
}

/**
 * Returns the base URL (origin) for a country's portal, or null if unknown.
 * Used by PageDetector to match URLs during step detection.
 */
export function getPortalBaseUrl(countryCode: string): string | null {
  return PORTAL_MAP[countryCode]?.baseUrl ?? null;
}
