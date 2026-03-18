/**
 * Unit tests for SchemaUpdateService
 *
 * Key design decisions:
 * - Jest runs in Node.js environment so `crypto.subtle` is NOT available via
 *   the react-native-get-random-values mock (it only sets `getRandomValues`).
 *   Before each test we add a real `subtle` from Node's Web Crypto API so the
 *   SHA-256 path exercises real hashing.
 * - `fetch` is mocked globally so no real network calls are made.
 * - The MMKV service is mocked via the `@/services/storage` mock in jest.setup.js.
 */

import { createHash } from 'crypto';
import { SchemaUpdateService } from '../../../src/services/schemas/schemaUpdateService';
import { mmkvService } from '../../../src/services/storage/mmkv';
import { SCHEMA_CDN_BASE_URL, SCHEMA_MMKV_KEY_PREFIX, SCHEMA_MANIFEST_CACHE_KEY } from '../../../src/utils/constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal valid CountryFormSchema JSON string. */
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

/** Compute real SHA-256 using Node.js (test environment). */
function sha256(content: string): string {
  return 'sha256:' + createHash('sha256').update(content, 'utf-8').digest('hex');
}

// ---------------------------------------------------------------------------
// Global setup – provide crypto.subtle from Node's Web Crypto API so the
// SubtleCrypto branch in computeSHA256 is exercised.
// ---------------------------------------------------------------------------

beforeAll(() => {
  // Node.js 18+ exposes webcrypto at require('crypto').webcrypto
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
  // Restore minimal mock (no subtle) to avoid leaking into other test files.
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
// Mock fetch globally
// ---------------------------------------------------------------------------

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// ---------------------------------------------------------------------------
// Re-use the mmkvService mock provided by jest.setup.js
// ---------------------------------------------------------------------------
jest.mock('../../../src/services/storage/mmkv', () => ({
  mmkvService: {
    getString: jest.fn(),
    setString: jest.fn(),
    delete: jest.fn(),
    getAllKeys: jest.fn().mockReturnValue([]),
    clearAll: jest.fn(),
  },
}));

// Mock bundled schemas index
jest.mock('../../../src/schemas', () => ({
  SUPPORTED_COUNTRIES: ['JPN', 'MYS', 'SGP'],
  getSchemaByCountryCode: jest.fn().mockResolvedValue(null),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SchemaUpdateService', () => {
  let service: SchemaUpdateService;
  const mockMmkv = mmkvService as jest.Mocked<typeof mmkvService>;
  const CDN = 'https://test-cdn.example.com';

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: nothing cached
    mockMmkv.getString.mockReturnValue(undefined);
    service = new SchemaUpdateService(CDN);
  });

  // -------------------------------------------------------------------------
  // checkForUpdates
  // -------------------------------------------------------------------------

  describe('checkForUpdates()', () => {
    it('returns empty arrays when fetch fails (offline graceful degradation)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.checkForUpdates();

      expect(result).toEqual({ updated: [], failed: [] });
    });

    it('returns empty arrays when manifest endpoint returns non-ok status', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 503, statusText: 'Service Unavailable' } as Response);

      const result = await service.checkForUpdates();

      expect(result).toEqual({ updated: [], failed: [] });
    });

    it('caches the manifest in MMKV after a successful fetch', async () => {
      const manifest = {
        version: '1.0.0',
        updatedAt: '2026-01-01T00:00:00Z',
        schemas: {},
      };
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

    it('skips countries whose cached version matches the manifest version', async () => {
      const schemaJson = makeSchemaJson('JPN', '1.0.0');
      const manifest = {
        version: '1.0.0',
        updatedAt: '2026-01-01T00:00:00Z',
        schemas: {
          JPN: { version: '1.0.0', checksum: sha256(schemaJson), url: `${CDN}/JPN.json` },
        },
      };

      // Simulate a cached JPN schema at version 1.0.0
      mockMmkv.getString.mockImplementation((key: string) => {
        if (key === `${SCHEMA_MMKV_KEY_PREFIX}JPN`) return schemaJson;
        return undefined;
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(manifest),
      } as Response);

      const result = await service.checkForUpdates();

      // No download needed
      expect(result.updated).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
    });

    it('downloads a schema when the cached version is outdated', async () => {
      const schemaJson = makeSchemaJson('JPN', '2.0.0');
      const checksum = sha256(schemaJson);
      const manifest = {
        version: '1.0.0',
        updatedAt: '2026-01-01T00:00:00Z',
        schemas: {
          JPN: { version: '2.0.0', checksum, url: `${CDN}/JPN.json` },
        },
      };

      // Cached at old version 1.0.0
      mockMmkv.getString.mockImplementation((key: string) => {
        if (key === `${SCHEMA_MMKV_KEY_PREFIX}JPN`) return makeSchemaJson('JPN', '1.0.0');
        return undefined;
      });

      mockFetch
        // 1st call: manifest
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(manifest),
        } as Response)
        // 2nd call: schema download
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(schemaJson),
        } as Response);

      const result = await service.checkForUpdates();

      expect(result.updated).toContain('JPN');
      expect(result.failed).toHaveLength(0);
    });

    it('adds country to failed when schema download gives non-ok status', async () => {
      const manifest = {
        version: '1.0.0',
        updatedAt: '2026-01-01T00:00:00Z',
        schemas: {
          MYS: { version: '2.0.0', checksum: 'sha256:abc', url: `${CDN}/MYS.json` },
        },
      };

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(manifest) } as Response)
        .mockResolvedValueOnce({ ok: false, status: 404 } as Response);

      const result = await service.checkForUpdates();

      expect(result.failed).toContain('MYS');
    });

    it('adds country to failed when checksum does not match', async () => {
      const schemaJson = makeSchemaJson('SGP', '2.0.0');
      const manifest = {
        version: '1.0.0',
        updatedAt: '2026-01-01T00:00:00Z',
        schemas: {
          SGP: { version: '2.0.0', checksum: 'sha256:deadbeef', url: `${CDN}/SGP.json` },
        },
      };

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(manifest) } as Response)
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(schemaJson) } as Response);

      const result = await service.checkForUpdates();

      expect(result.failed).toContain('SGP');
    });
  });

  // -------------------------------------------------------------------------
  // fetchSchema
  // -------------------------------------------------------------------------

  describe('fetchSchema()', () => {
    it('returns null (gracefully) when network fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.fetchSchema('JPN');

      expect(result).toBeNull();
    });

    it('returns null when the manifest has no entry for the country', async () => {
      const manifest = {
        version: '1.0.0',
        updatedAt: '2026-01-01T00:00:00Z',
        schemas: {},
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(manifest),
      } as Response);

      const result = await service.fetchSchema('ZZZ');

      expect(result).toBeNull();
    });

    it('stores validated schema in MMKV under schema:<countryCode>', async () => {
      const schemaJson = makeSchemaJson('JPN', '1.0.0');
      const checksum = sha256(schemaJson);
      const manifest = {
        version: '1.0.0',
        updatedAt: '2026-01-01T00:00:00Z',
        schemas: {
          JPN: { version: '1.0.0', checksum, url: `${CDN}/JPN.json` },
        },
      };

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(manifest) } as Response)
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(schemaJson) } as Response);

      const result = await service.fetchSchema('JPN');

      expect(result).not.toBeNull();
      expect(result?.countryCode).toBe('JPN');
      expect(mockMmkv.setString).toHaveBeenCalledWith(
        `${SCHEMA_MMKV_KEY_PREFIX}JPN`,
        schemaJson,
      );
    });

    it('returns null and does NOT store schema when checksum is wrong', async () => {
      const schemaJson = makeSchemaJson('MYS', '1.0.0');
      const manifest = {
        version: '1.0.0',
        updatedAt: '2026-01-01T00:00:00Z',
        schemas: {
          MYS: { version: '1.0.0', checksum: 'sha256:badhash', url: `${CDN}/MYS.json` },
        },
      };

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(manifest) } as Response)
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(schemaJson) } as Response);

      const result = await service.fetchSchema('MYS');

      expect(result).toBeNull();
      // MMKV must NOT have been written for the schema key
      const schemaWrites = (mockMmkv.setString as jest.Mock).mock.calls.filter(
        ([key]: string[]) => key === `${SCHEMA_MMKV_KEY_PREFIX}MYS`,
      );
      expect(schemaWrites).toHaveLength(0);
    });

    it('uses cached manifest when one is stored in MMKV (avoids extra fetch)', async () => {
      const schemaJson = makeSchemaJson('SGP', '1.0.0');
      const checksum = sha256(schemaJson);
      const manifest = {
        version: '1.0.0',
        updatedAt: '2026-01-01T00:00:00Z',
        schemas: {
          SGP: { version: '1.0.0', checksum, url: `${CDN}/SGP.json` },
        },
      };

      // Pre-seed MMKV with a cached manifest
      mockMmkv.getString.mockImplementation((key: string) => {
        if (key === SCHEMA_MANIFEST_CACHE_KEY) return JSON.stringify(manifest);
        return undefined;
      });

      // Only the schema download fetch should happen (no manifest fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(schemaJson),
      } as Response);

      const result = await service.fetchSchema('SGP');

      expect(result).not.toBeNull();
      // fetch should have been called exactly once (for the schema, not manifest)
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(`${CDN}/SGP.json`);
    });
  });

  // -------------------------------------------------------------------------
  // getSchema
  // -------------------------------------------------------------------------

  describe('getSchema()', () => {
    it('returns the MMKV-cached schema when one exists', async () => {
      const schemaJson = makeSchemaJson('JPN', '2.0.0');
      mockMmkv.getString.mockImplementation((key: string) => {
        if (key === `${SCHEMA_MMKV_KEY_PREFIX}JPN`) return schemaJson;
        return undefined;
      });

      const result = await service.getSchema('JPN');

      expect(result).not.toBeNull();
      expect(result?.schemaVersion).toBe('2.0.0');
      // fetch should NOT have been called
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('falls back to bundled schema when MMKV has no entry', async () => {
      const { getSchemaByCountryCode } = require('../../../src/schemas') as {
        getSchemaByCountryCode: jest.Mock;
      };
      const bundledSchema = JSON.parse(makeSchemaJson('MYS', '1.0.0'));
      getSchemaByCountryCode.mockResolvedValueOnce(bundledSchema);

      mockMmkv.getString.mockReturnValue(undefined);

      const result = await service.getSchema('MYS');

      expect(result).toEqual(bundledSchema);
    });

    it('returns null when neither cache nor bundled schema exists', async () => {
      const { getSchemaByCountryCode } = require('../../../src/schemas') as {
        getSchemaByCountryCode: jest.Mock;
      };
      getSchemaByCountryCode.mockResolvedValueOnce(null);
      mockMmkv.getString.mockReturnValue(undefined);

      const result = await service.getSchema('UNKNOWN');

      expect(result).toBeNull();
    });

    it('falls back to bundled schema when MMKV value is corrupted JSON', async () => {
      const { getSchemaByCountryCode } = require('../../../src/schemas') as {
        getSchemaByCountryCode: jest.Mock;
      };
      const bundledSchema = JSON.parse(makeSchemaJson('SGP', '1.0.0'));
      getSchemaByCountryCode.mockResolvedValueOnce(bundledSchema);

      mockMmkv.getString.mockImplementation((key: string) => {
        if (key === `${SCHEMA_MMKV_KEY_PREFIX}SGP`) return '{broken json';
        return undefined;
      });

      const result = await service.getSchema('SGP');

      // Should fall back without throwing
      expect(result).toEqual(bundledSchema);
    });
  });

  // -------------------------------------------------------------------------
  // CDN URL configuration
  // -------------------------------------------------------------------------

  describe('CDN URL configuration', () => {
    it('defaults to SCHEMA_CDN_BASE_URL when no argument is given', async () => {
      const defaultService = new SchemaUpdateService();
      mockFetch.mockRejectedValueOnce(new Error('offline'));

      await defaultService.checkForUpdates();

      // The manifest fetch should use the default CDN URL
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(SCHEMA_CDN_BASE_URL),
      );
    });

    it('uses the custom CDN base URL when provided', async () => {
      const customCdn = 'https://my-custom-cdn.example.com/schemas';
      const customService = new SchemaUpdateService(customCdn);
      mockFetch.mockRejectedValueOnce(new Error('offline'));

      await customService.checkForUpdates();

      expect(mockFetch).toHaveBeenCalledWith(`${customCdn}/manifest.json`);
    });
  });
});
