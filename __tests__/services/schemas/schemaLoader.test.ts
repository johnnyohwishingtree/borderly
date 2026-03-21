/**
 * Tests for schemaLoader's MMKV-first loading behaviour introduced in
 * the "Background schema update checks" story.
 */

import { loadSchemaForCountry } from '../../../src/services/schemas/schemaLoader';
import { mmkvService } from '../../../src/services/storage/mmkv';
import { SCHEMA_MMKV_KEY_PREFIX } from '../../../src/utils/constants';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

jest.mock('../../../src/services/storage/mmkv', () => ({
  mmkvService: {
    getString: jest.fn(),
    setString: jest.fn(),
  },
}));

const mockGetSchemaByCountryCode = jest.fn();
jest.mock('../../../src/schemas', () => ({
  SUPPORTED_COUNTRIES: ['JPN', 'MYS', 'SGP'],
  getSchemaByCountryCode: (...args: unknown[]) => mockGetSchemaByCountryCode(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSchema(countryCode: string, version: string) {
  return {
    countryCode,
    countryName: `Country ${countryCode}`,
    schemaVersion: version,
    lastUpdated: '2026-01-01T00:00:00Z',
    portalUrl: `https://portal.example.com/${countryCode}`,
    portalName: `${countryCode} Portal`,
    submissionDeadlineHours: 24,
    recommendedLeadTimeHours: 72,
    submissionWindowNote: `Submit before arrival in ${countryCode}`,
    submission: {
      earliestBeforeArrival: '14d',
      latestBeforeArrival: '0h',
      recommended: '72h',
    },
    sections: [],
    submissionGuide: [],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const mockMmkv = mmkvService as jest.Mocked<typeof mmkvService>;

beforeEach(() => {
  jest.clearAllMocks();
  mockMmkv.getString.mockReturnValue(undefined);
  mockGetSchemaByCountryCode.mockResolvedValue(null);
});

describe('loadSchemaForCountry()', () => {
  it('returns MMKV-cached schema when one exists (preferred over bundled)', async () => {
    const cachedSchema = makeSchema('JPN', '2.0.0');
    mockMmkv.getString.mockImplementation((key: string) => {
      if (key === `${SCHEMA_MMKV_KEY_PREFIX}JPN`) {
        return JSON.stringify(cachedSchema);
      }
      return undefined;
    });

    const bundledSchema = makeSchema('JPN', '1.0.0');
    mockGetSchemaByCountryCode.mockResolvedValue(bundledSchema);

    const result = await loadSchemaForCountry('JPN');

    expect(result).not.toBeNull();
    expect(result?.schemaVersion).toBe('2.0.0');
    // Bundled schema loader should NOT have been called
    expect(mockGetSchemaByCountryCode).not.toHaveBeenCalled();
  });

  it('falls back to bundled schema when MMKV has no entry', async () => {
    mockMmkv.getString.mockReturnValue(undefined);
    const bundledSchema = makeSchema('MYS', '1.0.0');
    mockGetSchemaByCountryCode.mockResolvedValue(bundledSchema);

    const result = await loadSchemaForCountry('MYS');

    expect(result).toEqual(bundledSchema);
    expect(mockGetSchemaByCountryCode).toHaveBeenCalledWith('MYS');
  });

  it('falls back to bundled schema when MMKV value is corrupted JSON', async () => {
    mockMmkv.getString.mockImplementation((key: string) => {
      if (key === `${SCHEMA_MMKV_KEY_PREFIX}SGP`) return '{broken json';
      return undefined;
    });
    const bundledSchema = makeSchema('SGP', '1.0.0');
    mockGetSchemaByCountryCode.mockResolvedValue(bundledSchema);

    const result = await loadSchemaForCountry('SGP');

    expect(result).toEqual(bundledSchema);
  });

  it('returns null when neither MMKV nor bundled schema exists', async () => {
    mockMmkv.getString.mockReturnValue(undefined);
    mockGetSchemaByCountryCode.mockResolvedValue(null);

    const result = await loadSchemaForCountry('UNKNOWN');

    expect(result).toBeNull();
  });

  it('returns null and does not throw when bundled schema loader throws', async () => {
    mockMmkv.getString.mockReturnValue(undefined);
    mockGetSchemaByCountryCode.mockRejectedValue(new Error('Module not found'));

    await expect(loadSchemaForCountry('JPN')).resolves.toBeNull();
  });
});
