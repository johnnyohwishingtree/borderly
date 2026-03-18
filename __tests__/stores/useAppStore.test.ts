/**
 * Tests for the schema-check additions in useAppStore:
 *   - lastSchemaCheck / schemasUpToDate initial state
 *   - triggerSchemaUpdateCheck() updates those fields correctly
 *   - triggerSchemaUpdateCheck() never throws even when checkForUpdates fails
 */

import { useAppStore } from '../../src/stores/useAppStore';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

const mockCheckForUpdates = jest.fn();
const mockReset = jest.fn();
const mockInitialize = jest.fn();
const mockGetSchema = jest.fn();

jest.mock('../../src/services/schemas/schemaUpdateService', () => ({
  schemaUpdateService: {
    checkForUpdates: (...args: unknown[]) => mockCheckForUpdates(...args),
  },
}));

jest.mock('../../src/services/schemas/schemaRegistry', () => ({
  schemaRegistry: {
    reset: (...args: unknown[]) => mockReset(...args),
    initialize: (...args: unknown[]) => mockInitialize(...args),
    getSchema: (...args: unknown[]) => mockGetSchema(...args),
  },
}));

jest.mock('@/services/storage', () => ({
  mmkvService: {
    getPreferences: jest.fn(() => ({
      theme: 'auto',
      language: 'en',
      onboardingComplete: false,
      biometricEnabled: false,
      lastSchemaUpdateCheck: '',
      analyticsEnabled: false,
      crashReportingEnabled: false,
      family_profiles: '',
      current_profile_id: '',
    })),
    setPreference: jest.fn(),
    getString: jest.fn(),
    setString: jest.fn(),
    getBoolean: jest.fn(),
    setBoolean: jest.fn(),
    getNumber: jest.fn(),
    setNumber: jest.fn(),
    delete: jest.fn(),
    getAllKeys: jest.fn(() => []),
    clearAll: jest.fn(),
    clearCache: jest.fn(),
    setFeatureFlag: jest.fn(),
    getFeatureFlag: jest.fn(() => false),
    clearPreferences: jest.fn(),
    getCacheItem: jest.fn(() => null),
    setCacheItem: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useAppStore — schema update tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the store to initial state between tests
    useAppStore.setState({
      lastSchemaCheck: null,
      schemasUpToDate: false,
      lastSchemaRefreshTime: null,
      schemaRefreshCountries: [],
      schemaBannerDismissedAt: null,
    });
    mockCheckForUpdates.mockResolvedValue({ updated: [], failed: [] });
    mockInitialize.mockResolvedValue(undefined);
    mockGetSchema.mockReturnValue({ countryName: 'Japan' });
  });

  it('has null lastSchemaCheck and false schemasUpToDate in initial state', () => {
    const { lastSchemaCheck, schemasUpToDate } = useAppStore.getState();
    expect(lastSchemaCheck).toBeNull();
    expect(schemasUpToDate).toBe(false);
  });

  it('sets lastSchemaCheck to a timestamp after a successful check', async () => {
    const before = Date.now();
    await useAppStore.getState().triggerSchemaUpdateCheck();
    const after = Date.now();

    const { lastSchemaCheck } = useAppStore.getState();
    expect(lastSchemaCheck).not.toBeNull();
    expect(lastSchemaCheck).toBeGreaterThanOrEqual(before);
    expect(lastSchemaCheck).toBeLessThanOrEqual(after);
  });

  it('sets schemasUpToDate to true when no schemas failed', async () => {
    mockCheckForUpdates.mockResolvedValue({ updated: ['JPN'], failed: [] });

    await useAppStore.getState().triggerSchemaUpdateCheck();

    expect(useAppStore.getState().schemasUpToDate).toBe(true);
  });

  it('sets schemasUpToDate to false when some schemas failed', async () => {
    mockCheckForUpdates.mockResolvedValue({ updated: [], failed: ['JPN'] });

    await useAppStore.getState().triggerSchemaUpdateCheck();

    expect(useAppStore.getState().schemasUpToDate).toBe(false);
  });

  it('resets and reinitializes the registry when schemas were updated', async () => {
    mockCheckForUpdates.mockResolvedValue({ updated: ['JPN', 'MYS'], failed: [] });

    await useAppStore.getState().triggerSchemaUpdateCheck();

    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });

  it('does NOT reinitialize the registry when no schemas were updated', async () => {
    mockCheckForUpdates.mockResolvedValue({ updated: [], failed: [] });

    await useAppStore.getState().triggerSchemaUpdateCheck();

    expect(mockReset).not.toHaveBeenCalled();
    expect(mockInitialize).not.toHaveBeenCalled();
  });

  it('never throws even when checkForUpdates rejects (e.g. offline)', async () => {
    mockCheckForUpdates.mockRejectedValue(new Error('Network error'));

    await expect(
      useAppStore.getState().triggerSchemaUpdateCheck(),
    ).resolves.toBeUndefined();

    // Should still record the timestamp so we don't retry immediately
    expect(useAppStore.getState().lastSchemaCheck).not.toBeNull();
    expect(useAppStore.getState().schemasUpToDate).toBe(false);
  });
});
