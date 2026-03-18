/**
 * Acceptance tests for SchemaUpdateService — OTA schema update system.
 *
 * Covers all five acceptance criteria:
 *  1. Fetch success — schemas downloaded, checksum validated, cached in MMKV
 *  2. Network failure fallback — graceful degradation, never throws
 *  3. Checksum validation failure — tampered schemas rejected, not stored
 *  4. Version comparison — skip-if-current, download-if-outdated
 *  5. MMKV cache read/write — OTA schemas stored and retrieved from cache
 *
 * Design notes:
 * - Uses the global fetch mock established in jest.setup.js (overridden per test
 *   via mockFetch.mockResolvedValueOnce / mockFetch.mockRejectedValueOnce).
 * - Uses real SHA-256 hashing via Node.js webcrypto (crypto.subtle is patched
 *   in beforeAll to satisfy the SubtleCrypto branch in computeSHA256).
 * - MMKV is mocked inline so no real storage is touched.
 */

import { createHash } from 'crypto';
import { SchemaUpdateService } from '../../src/services/schemas/schemaUpdateService';
import { mmkvService } from '../../src/services/storage/mmkv';
import {
  SCHEMA_MMKV_KEY_PREFIX,
  SCHEMA_MANIFEST_CACHE_KEY,
} from '../../src/utils/constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal valid CountryFormSchema JSON string for a given country/version. */
function makeSchemaJson(countryCode: string, version: string): string {
  return JSON.stringify({
    countryCode,
    countryName: `Country ${countryCode}`,
    schemaVersion: version,
    lastUpdated: '2026-01-01T00:00:00Z',
    portalUrl: `https://portal.example.com/${countryCode}`,
    portalName: `${countryCode} Portal`,
    metadata: {
      priority: 1,
      complexity: 'low',
      popularity: 80,
      lastVerified: '2026-01-01T00:00:00Z',
      supportedLanguages: ['en'],
      implementationStatus: 'complete',
      maintenanceFrequency: 'monthly',
    },
    changeDetection: {
      monitoredSelectors: [],
      changeThreshold: 10,
      fallbackActions: [],
    },
    submission: {
      earliestBeforeArrival: '14d',
      latestBeforeArrival: '0h',
      recommended: '72h',
    },
    portalFlow: {
      requiresAccount: false,
      multiStep: false,
      canSaveProgress: false,
    },
    sections: [],
    submissionGuide: [],
  });
}

/** Compute a real SHA-256 checksum using Node.js (test environment only). */
function sha256(content: string): string {
  return 'sha256:' + createHash('sha256').update(content, 'utf-8').digest('hex');
}

// ---------------------------------------------------------------------------
// Setup: patch globalThis.crypto with real SubtleCrypto so the service's
// computeSHA256 function works correctly in Jest (Node.js environment).
// ---------------------------------------------------------------------------

beforeAll(() => {
  const { webcrypto } = require('crypto') as { webcrypto: Crypto };
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      getRandomValues: (globalThis as any).crypto?.getRandomValues,
      subtle: webcrypto.subtle,
    },
    writable: true,
    configurable: true,
  });
});

afterAll(() => {
  // Restore minimal mock (no subtle) so other test files aren't affected.
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
        return arr;
      },
    },
    writable: true,
    configurable: true,
  });
});

// ---------------------------------------------------------------------------
// Override the global fetch mock (defined in jest.setup.js) for this file.
// Individual tests further configure it with mockResolvedValueOnce.
// ---------------------------------------------------------------------------

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

jest.mock('../../src/services/storage/mmkv', () => ({
  mmkvService: {
    getString: jest.fn(),
    setString: jest.fn(),
    delete: jest.fn(),
    getAllKeys: jest.fn().mockReturnValue([]),
    clearAll: jest.fn(),
  },
}));

jest.mock('../../src/schemas', () => ({
  SUPPORTED_COUNTRIES: ['JPN', 'MYS', 'SGP'],
  getSchemaByCountryCode: jest.fn().mockResolvedValue(null),
}));

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('SchemaUpdateService — OTA schema update system', () => {
  let service: SchemaUpdateService;
  const mockMmkv = mmkvService as jest.Mocked<typeof mmkvService>;
  const CDN = 'https://test-cdn.example.com';

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: nothing in MMKV cache
    mockMmkv.getString.mockReturnValue(undefined);
    service = new SchemaUpdateService(CDN);
  });

  // =========================================================================
  // 1. Fetch success
  // =========================================================================

  describe('1. fetch success', () => {
    it('downloads a schema, validates its checksum, and stores it in MMKV', async () => {
      const schemaJson = makeSchemaJson('JPN', '2.0.0');
      const checksum = sha256(schemaJson);
      const manifest = {
        version: '1.0.0',
        updatedAt: '2026-01-01T00:00:00Z',
        schemas: {
          JPN: { version: '2.0.0', checksum, url: `${CDN}/JPN.json` },
        },
      };

      // Simulate outdated cache (v1.0.0) so download is triggered
      mockMmkv.getString.mockImplementation((key: string) => {
        if (key === `${SCHEMA_MMKV_KEY_PREFIX}JPN`) return makeSchemaJson('JPN', '1.0.0');
        return undefined;
      });

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(manifest) } as Response)
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(schemaJson) } as Response);

      const result = await service.checkForUpdates();

      expect(result.updated).toContain('JPN');
      expect(result.failed).toHaveLength(0);
      expect(mockMmkv.setString).toHaveBeenCalledWith(
        `${SCHEMA_MMKV_KEY_PREFIX}JPN`,
        schemaJson,
      );
    });

    it('caches the remote manifest in MMKV after a successful fetch', async () => {
      const manifest = { version: '1.0.0', updatedAt: '2026-01-01T00:00:00Z', schemas: {} };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(manifest),
      } as Response);

      await service.checkForUpdates();

      expect(mockMmkv.setString).toHaveBeenCalledWith(
        SCHEMA_MANIFEST_CACHE_KEY,
        JSON.stringify(manifest),
      );
    });

    it('fetchSchema returns the parsed schema object on success', async () => {
      const schemaJson = makeSchemaJson('SGP', '1.0.0');
      const checksum = sha256(schemaJson);
      const manifest = {
        version: '1.0.0',
        updatedAt: '2026-01-01T00:00:00Z',
        schemas: {
          SGP: { version: '1.0.0', checksum, url: `${CDN}/SGP.json` },
        },
      };

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(manifest) } as Response)
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(schemaJson) } as Response);

      const result = await service.fetchSchema('SGP');

      expect(result).not.toBeNull();
      expect(result?.countryCode).toBe('SGP');
      expect(result?.schemaVersion).toBe('1.0.0');
    });
  });

  // =========================================================================
  // 2. Network failure fallback
  // =========================================================================

  describe('2. network failure fallback', () => {
    it('returns { updated: [], failed: [] } when the network is unreachable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.checkForUpdates();

      expect(result).toEqual({ updated: [], failed: [] });
    });

    it('returns { updated: [], failed: [] } when manifest endpoint returns HTTP 503', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 503 } as Response);

      const result = await service.checkForUpdates();

      expect(result).toEqual({ updated: [], failed: [] });
    });

    it('fetchSchema returns null (not throws) when network fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.fetchSchema('JPN');

      expect(result).toBeNull();
    });

    it('getSchema falls back to bundled schema when MMKV is empty and fetch is not called', async () => {
      const { getSchemaByCountryCode } = require('../../src/schemas') as {
        getSchemaByCountryCode: jest.Mock;
      };
      const bundledSchema = JSON.parse(makeSchemaJson('JPN', '1.0.0'));
      getSchemaByCountryCode.mockResolvedValueOnce(bundledSchema);
      mockMmkv.getString.mockReturnValue(undefined);

      const result = await service.getSchema('JPN');

      expect(result).toEqual(bundledSchema);
      // getSchema should not trigger a network request
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 3. Checksum validation failure
  // =========================================================================

  describe('3. checksum validation failure', () => {
    it('fetchSchema returns null and does NOT write to MMKV when checksum mismatches', async () => {
      const schemaJson = makeSchemaJson('MYS', '1.0.0');
      // Deliberately wrong checksum
      const manifest = {
        version: '1.0.0',
        updatedAt: '2026-01-01T00:00:00Z',
        schemas: {
          MYS: { version: '1.0.0', checksum: 'sha256:deadbeef', url: `${CDN}/MYS.json` },
        },
      };

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(manifest) } as Response)
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(schemaJson) } as Response);

      const result = await service.fetchSchema('MYS');

      expect(result).toBeNull();

      // Confirm the schema key was never written
      const schemaWrites = (mockMmkv.setString as jest.Mock).mock.calls.filter(
        ([key]: string[]) => key === `${SCHEMA_MMKV_KEY_PREFIX}MYS`,
      );
      expect(schemaWrites).toHaveLength(0);
    });

    it('checkForUpdates adds country to failed[] on checksum mismatch', async () => {
      const schemaJson = makeSchemaJson('SGP', '2.0.0');
      const manifest = {
        version: '1.0.0',
        updatedAt: '2026-01-01T00:00:00Z',
        schemas: {
          SGP: { version: '2.0.0', checksum: 'sha256:badhash', url: `${CDN}/SGP.json` },
        },
      };

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(manifest) } as Response)
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(schemaJson) } as Response);

      const result = await service.checkForUpdates();

      expect(result.failed).toContain('SGP');
      expect(result.updated).not.toContain('SGP');
    });

    it('a correct checksum always passes validation', async () => {
      const schemaJson = makeSchemaJson('JPN', '1.0.0');
      const correctChecksum = sha256(schemaJson); // real SHA-256
      const manifest = {
        version: '1.0.0',
        updatedAt: '2026-01-01T00:00:00Z',
        schemas: {
          JPN: { version: '1.0.0', checksum: correctChecksum, url: `${CDN}/JPN.json` },
        },
      };

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(manifest) } as Response)
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(schemaJson) } as Response);

      const result = await service.fetchSchema('JPN');

      expect(result).not.toBeNull();
      expect(mockMmkv.setString).toHaveBeenCalledWith(
        `${SCHEMA_MMKV_KEY_PREFIX}JPN`,
        schemaJson,
      );
    });
  });

  // =========================================================================
  // 4. Version comparison
  // =========================================================================

  describe('4. version comparison', () => {
    it('skips a country when its cached version equals the manifest version', async () => {
      const schemaJson = makeSchemaJson('JPN', '1.0.0');
      const manifest = {
        version: '1.0.0',
        updatedAt: '2026-01-01T00:00:00Z',
        schemas: {
          JPN: { version: '1.0.0', checksum: sha256(schemaJson), url: `${CDN}/JPN.json` },
        },
      };

      mockMmkv.getString.mockImplementation((key: string) => {
        if (key === `${SCHEMA_MMKV_KEY_PREFIX}JPN`) return schemaJson;
        return undefined;
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(manifest),
      } as Response);

      const result = await service.checkForUpdates();

      // Only the manifest fetch should fire — no schema download
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.updated).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
    });

    it('downloads schema when cached version is older than manifest version', async () => {
      const newSchemaJson = makeSchemaJson('JPN', '2.0.0');
      const checksum = sha256(newSchemaJson);
      const manifest = {
        version: '1.0.0',
        updatedAt: '2026-01-01T00:00:00Z',
        schemas: {
          JPN: { version: '2.0.0', checksum, url: `${CDN}/JPN.json` },
        },
      };

      // Cache has old version
      mockMmkv.getString.mockImplementation((key: string) => {
        if (key === `${SCHEMA_MMKV_KEY_PREFIX}JPN`) return makeSchemaJson('JPN', '1.0.0');
        return undefined;
      });

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(manifest) } as Response)
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(newSchemaJson) } as Response);

      const result = await service.checkForUpdates();

      expect(result.updated).toContain('JPN');
    });

    it('downloads schema when no cached version exists (first install)', async () => {
      const schemaJson = makeSchemaJson('MYS', '1.0.0');
      const checksum = sha256(schemaJson);
      const manifest = {
        version: '1.0.0',
        updatedAt: '2026-01-01T00:00:00Z',
        schemas: {
          MYS: { version: '1.0.0', checksum, url: `${CDN}/MYS.json` },
        },
      };

      // Nothing in cache (fresh install)
      mockMmkv.getString.mockReturnValue(undefined);

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(manifest) } as Response)
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(schemaJson) } as Response);

      const result = await service.checkForUpdates();

      expect(result.updated).toContain('MYS');
    });
  });

  // =========================================================================
  // 5. MMKV cache read/write
  // =========================================================================

  describe('5. MMKV cache read/write', () => {
    it('writes validated schema JSON to MMKV under "schema:<countryCode>" key', async () => {
      const schemaJson = makeSchemaJson('SGP', '1.0.0');
      const checksum = sha256(schemaJson);
      const manifest = {
        version: '1.0.0',
        updatedAt: '2026-01-01T00:00:00Z',
        schemas: {
          SGP: { version: '1.0.0', checksum, url: `${CDN}/SGP.json` },
        },
      };

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(manifest) } as Response)
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(schemaJson) } as Response);

      await service.fetchSchema('SGP');

      expect(mockMmkv.setString).toHaveBeenCalledWith(
        `${SCHEMA_MMKV_KEY_PREFIX}SGP`,
        schemaJson,
      );
    });

    it('reads schema from MMKV cache and does not call fetch', async () => {
      const schemaJson = makeSchemaJson('JPN', '2.0.0');
      mockMmkv.getString.mockImplementation((key: string) => {
        if (key === `${SCHEMA_MMKV_KEY_PREFIX}JPN`) return schemaJson;
        return undefined;
      });

      const result = await service.getSchema('JPN');

      expect(result?.schemaVersion).toBe('2.0.0');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('falls back to bundled schema when MMKV contains corrupted JSON', async () => {
      const { getSchemaByCountryCode } = require('../../src/schemas') as {
        getSchemaByCountryCode: jest.Mock;
      };
      const bundledSchema = JSON.parse(makeSchemaJson('MYS', '1.0.0'));
      getSchemaByCountryCode.mockResolvedValueOnce(bundledSchema);

      // Simulate corrupted MMKV entry
      mockMmkv.getString.mockImplementation((key: string) => {
        if (key === `${SCHEMA_MMKV_KEY_PREFIX}MYS`) return '{not valid json{{{';
        return undefined;
      });

      const result = await service.getSchema('MYS');

      expect(result).toEqual(bundledSchema);
    });

    it('uses cached manifest from MMKV to avoid a redundant network request', async () => {
      const schemaJson = makeSchemaJson('SGP', '1.0.0');
      const checksum = sha256(schemaJson);
      const cachedManifest = {
        version: '1.0.0',
        updatedAt: '2026-01-01T00:00:00Z',
        schemas: {
          SGP: { version: '1.0.0', checksum, url: `${CDN}/SGP.json` },
        },
      };

      // Pre-seed MMKV with a cached manifest
      mockMmkv.getString.mockImplementation((key: string) => {
        if (key === SCHEMA_MANIFEST_CACHE_KEY) return JSON.stringify(cachedManifest);
        return undefined;
      });

      // Only the schema download should fire (manifest comes from cache)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(schemaJson),
      } as Response);

      await service.fetchSchema('SGP');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(`${CDN}/SGP.json`);
    });

    it('getSchema returns null when neither MMKV nor bundled schema exists', async () => {
      const { getSchemaByCountryCode } = require('../../src/schemas') as {
        getSchemaByCountryCode: jest.Mock;
      };
      getSchemaByCountryCode.mockResolvedValueOnce(null);
      mockMmkv.getString.mockReturnValue(undefined);

      const result = await service.getSchema('XYZ');

      expect(result).toBeNull();
    });
  });
});
