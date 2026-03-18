/**
 * SchemaUpdateService
 *
 * Fetches country-form schemas from a CDN, validates their SHA-256 checksums,
 * and stores them in MMKV.  On every subsequent read the service returns:
 *   1. The MMKV-cached (OTA) schema when one exists, OR
 *   2. The bundled (shipped-with-app) schema as a fallback.
 *
 * The service never throws to callers: any network or validation error is caught
 * internally so the app keeps working offline.
 */

import { CountryFormSchema, SchemaManifest, SchemaManifestEntry } from '../../types/schema';
import { mmkvService } from '../storage/mmkv';
import { getSchemaByCountryCode } from '../../schemas';
import {
  SCHEMA_CDN_BASE_URL,
  SCHEMA_MANIFEST_URL,
  SCHEMA_MMKV_KEY_PREFIX,
  SCHEMA_MANIFEST_CACHE_KEY,
} from '../../utils/constants';

// ---------------------------------------------------------------------------
// SHA-256 helper
// ---------------------------------------------------------------------------

/**
 * Compute a SHA-256 hash of the given string and return it as
 * "sha256:<hex-digest>" — matching the manifest checksum format.
 *
 * Uses the Web Crypto API (available in Hermes ≥ 0.73 / all browsers).
 * In Jest (Node.js) the global crypto is polyfilled via jest.setup.js.
 */
async function computeSHA256(content: string): Promise<string> {
  const subtle = (globalThis as any).crypto?.subtle as
    | { digest: (algorithm: string, data: ArrayBuffer | ArrayBufferView) => Promise<ArrayBuffer> }
    | undefined;

  if (!subtle) {
    throw new Error('[SchemaUpdateService] SubtleCrypto not available in this environment');
  }

  const encoded: Uint8Array = Buffer.from(content, 'utf-8');
  const hashBuffer: ArrayBuffer = await subtle.digest('SHA-256', encoded);
  const hex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `sha256:${hex}`;
}

// ---------------------------------------------------------------------------
// Service result types
// ---------------------------------------------------------------------------

export interface SchemaUpdateResult {
  /** Country codes whose cached schema was successfully refreshed. */
  updated: string[];
  /** Country codes that could not be updated (network/checksum failure). */
  failed: string[];
}

// ---------------------------------------------------------------------------
// SchemaUpdateService
// ---------------------------------------------------------------------------

export class SchemaUpdateService {
  private readonly manifestUrl: string;

  /**
   * @param cdnBaseUrl Override the CDN base URL (useful for testing).
   *   The manifest is expected at `<cdnBaseUrl>/manifest.json` and individual
   *   schema URLs come from the manifest entries themselves.
   */
  constructor(cdnBaseUrl: string = SCHEMA_CDN_BASE_URL) {
    this.manifestUrl = cdnBaseUrl === SCHEMA_CDN_BASE_URL
      ? SCHEMA_MANIFEST_URL
      : `${cdnBaseUrl}/manifest.json`;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Check the remote manifest for newer schema versions and download any that
   * are outdated relative to what is currently cached in MMKV.
   *
   * Never throws — returns empty arrays when offline.
   */
  async checkForUpdates(): Promise<SchemaUpdateResult> {
    const updated: string[] = [];
    const failed: string[] = [];

    try {
      const manifest = await this.fetchManifest();
      // Persist manifest so subsequent fetchSchema calls can use it offline.
      mmkvService.setString(SCHEMA_MANIFEST_CACHE_KEY, JSON.stringify(manifest));

      for (const [countryCode, entry] of Object.entries(manifest.schemas)) {
        const cachedVersion = this.getCachedSchemaVersion(countryCode);
        if (cachedVersion === entry.version) {
          // Already up to date.
          continue;
        }

        const result = await this.fetchSchema(countryCode, manifest);
        if (result !== null) {
          updated.push(countryCode);
        } else {
          failed.push(countryCode);
        }
      }
    } catch (err) {
      console.warn('[SchemaUpdateService] checkForUpdates failed (offline?):', err);
    }

    return { updated, failed };
  }

  /**
   * Download a schema for the given country code from the CDN, validate its
   * SHA-256 checksum, and store it in MMKV.
   *
   * Returns the validated schema, or `null` on any failure (never throws).
   *
   * @param countryCode  ISO 3166-1 alpha-3 country code (e.g. "JPN").
   * @param manifest     Optional pre-fetched manifest (avoids an extra request).
   */
  async fetchSchema(
    countryCode: string,
    manifest?: SchemaManifest,
  ): Promise<CountryFormSchema | null> {
    try {
      // Resolve manifest
      const resolvedManifest = manifest ?? (await this.resolveManifest());
      const entry: SchemaManifestEntry | undefined =
        resolvedManifest.schemas[countryCode];

      if (!entry) {
        console.warn(
          `[SchemaUpdateService] No manifest entry for country "${countryCode}"`,
        );
        return null;
      }

      // Download schema from the URL provided in the manifest entry.
      const response = await fetch(entry.url);
      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status} when fetching schema for ${countryCode}`,
        );
      }

      const schemaText = await response.text();

      // Validate checksum before accepting the payload.
      const computedChecksum = await computeSHA256(schemaText);
      if (computedChecksum !== entry.checksum) {
        throw new Error(
          `Checksum mismatch for ${countryCode}. ` +
            `Expected "${entry.checksum}", got "${computedChecksum}"`,
        );
      }

      // Persist validated schema under "schema:<countryCode>" in MMKV.
      const key = `${SCHEMA_MMKV_KEY_PREFIX}${countryCode}`;
      mmkvService.setString(key, schemaText);

      return JSON.parse(schemaText) as CountryFormSchema;
    } catch (err) {
      console.warn(
        `[SchemaUpdateService] fetchSchema failed for "${countryCode}":`,
        err,
      );
      return null;
    }
  }

  /**
   * Return the best available schema for `countryCode`:
   *   1. MMKV-cached (OTA) schema when present.
   *   2. Bundled (shipped) schema as fallback.
   *   3. `null` if neither is available.
   *
   * Never throws.
   */
  async getSchema(countryCode: string): Promise<CountryFormSchema | null> {
    // 1. Check MMKV cache.
    try {
      const key = `${SCHEMA_MMKV_KEY_PREFIX}${countryCode}`;
      const cached = mmkvService.getString(key);
      if (cached) {
        return JSON.parse(cached) as CountryFormSchema;
      }
    } catch (err) {
      console.warn(
        `[SchemaUpdateService] Failed to read cached schema for "${countryCode}":`,
        err,
      );
    }

    // 2. Fall back to the bundled schema.
    try {
      return await getSchemaByCountryCode(countryCode);
    } catch (err) {
      console.warn(
        `[SchemaUpdateService] Failed to load bundled schema for "${countryCode}":`,
        err,
      );
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /** Fetch the remote manifest JSON. Throws on network/parse errors. */
  private async fetchManifest(): Promise<SchemaManifest> {
    const response = await fetch(this.manifestUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch manifest from "${this.manifestUrl}": HTTP ${response.status}`,
      );
    }
    return response.json() as Promise<SchemaManifest>;
  }

  /**
   * Return a manifest: either from MMKV cache or freshly fetched.
   * Throws when neither source is available.
   */
  private async resolveManifest(): Promise<SchemaManifest> {
    // Try cached manifest first.
    try {
      const cached = mmkvService.getString(SCHEMA_MANIFEST_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached) as SchemaManifest;
      }
    } catch {
      // ignore parse errors
    }

    // Fetch fresh manifest.
    const manifest = await this.fetchManifest();
    mmkvService.setString(SCHEMA_MANIFEST_CACHE_KEY, JSON.stringify(manifest));
    return manifest;
  }

  /** Return the schemaVersion stored in the MMKV cache, or `null`. */
  private getCachedSchemaVersion(countryCode: string): string | null {
    try {
      const key = `${SCHEMA_MMKV_KEY_PREFIX}${countryCode}`;
      const cached = mmkvService.getString(key);
      if (!cached) {
        return null;
      }
      const schema = JSON.parse(cached) as { schemaVersion?: string };
      return schema.schemaVersion ?? null;
    } catch {
      return null;
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton instance (uses the default CDN URL from constants.ts)
// ---------------------------------------------------------------------------
export const schemaUpdateService = new SchemaUpdateService();
