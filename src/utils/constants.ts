/**
 * App-wide constants for Borderly
 */

/**
 * Base URL for the schema CDN.
 * Defaults to the raw GitHub content URL for the project's bundled schemas.
 * Override this in a development/staging environment by setting a custom value.
 */
export const SCHEMA_CDN_BASE_URL =
  'https://raw.githubusercontent.com/johnnyohwishingtree/borderly/master/src/schemas';

/**
 * Full URL to the remote schema manifest.
 * The manifest lists all available schemas with their versions and checksums.
 */
export const SCHEMA_MANIFEST_URL = `${SCHEMA_CDN_BASE_URL}/manifest.json`;

/**
 * MMKV key prefix for cached (OTA-fetched) schemas.
 * Full key format: schema:<COUNTRY_CODE>  e.g. "schema:JPN"
 */
export const SCHEMA_MMKV_KEY_PREFIX = 'schema:';

/**
 * MMKV key for caching the remote manifest payload.
 */
export const SCHEMA_MANIFEST_CACHE_KEY = 'schema_manifest_cache';
