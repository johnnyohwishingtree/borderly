import { CountryFormSchema } from '../../../src/types/schema';
import { SchemaRegistry as SchemaRegistryType } from '../../../src/types/schema';

// ---------------------------------------------------------------------------
// Mocks — these must be declared before jest.mock() hoisting
// ---------------------------------------------------------------------------

const mockGetString = jest.fn<string | undefined, [string]>();
const mockSetString = jest.fn<void, [string, string]>();

jest.mock('../../../src/services/storage', () => ({
  mmkvService: {
    getString: mockGetString,
    setString: mockSetString,
  },
}));

const mockValidateSchema = jest.fn();
jest.mock('../../../src/services/schemas/validation', () => ({
  schemaValidator: {
    validateSchema: mockValidateSchema,
  },
}));

const mockApplyMigrations = jest.fn();
jest.mock('../../../src/services/schemas/migration', () => ({
  schemaMigrator: {
    applyMigrations: mockApplyMigrations,
  },
}));

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeSchema(countryCode: string, overrides?: Partial<CountryFormSchema>): CountryFormSchema {
  return {
    countryCode,
    countryName: `Country ${countryCode}`,
    schemaVersion: '1.0.0',
    lastUpdated: '2025-01-01T00:00:00Z',
    portalUrl: `https://portal.${countryCode.toLowerCase()}.example.com`,
    portalName: `${countryCode} Portal`,
    submissionDeadlineHours: 24,
    recommendedLeadTimeHours: 48,
    submissionWindowNote: 'Submit 24 hours before arrival',
    passportValidityMonths: 6,
    metadata: {
      priority: 1,
      complexity: 'low' as const,
      popularity: 80,
      lastVerified: '2025-01-01T00:00:00Z',
      supportedLanguages: ['en'],
      implementationStatus: 'complete' as const,
      maintenanceFrequency: 'monthly' as const,
    },
    changeDetection: {
      checksum: 'abc123',
      monitoredSelectors: ['.form-container'],
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
    sections: [
      {
        id: 'personal',
        title: 'Personal Information',
        fields: [
          {
            id: 'name',
            label: 'Full Name',
            type: 'text',
            required: true,
            countrySpecific: false,
          },
        ],
      },
    ],
    submissionGuide: [
      {
        order: 1,
        title: 'Step 1',
        description: 'Fill out the form',
        fieldsOnThisScreen: ['name'],
      },
    ],
    ...overrides,
  };
}

function makeRegistryJson(schemas: Record<string, CountryFormSchema>): string {
  const registry: SchemaRegistryType = {
    schemas,
    migrations: {},
    metadata: {
      lastUpdated: '2025-01-01T00:00:00Z',
      version: '1.0.0',
      supportedCountries: Object.keys(schemas),
    },
  };
  return JSON.stringify(registry);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SchemaManager', () => {
  let schemaManager: typeof import('../../../src/services/schemas/schemaManager').schemaManager;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockGetString.mockReturnValue(undefined);
  });

  async function loadSchemaManager() {
    const mod = await import('../../../src/services/schemas/schemaManager');
    schemaManager = mod.schemaManager;
    return schemaManager;
  }

  describe('initialize', () => {
    it('loads bundled schemas and creates registry in storage', async () => {
      // Make mockSetString feed values back to mockGetString
      const storage = new Map<string, string>();
      mockSetString.mockImplementation((key: string, value: string) => {
        storage.set(key, value);
      });
      mockGetString.mockImplementation((key: string) => storage.get(key));

      const mgr = await loadSchemaManager();
      await mgr.initialize();

      // Should have written the registry to storage
      expect(mockSetString).toHaveBeenCalledWith(
        'schema_registry',
        expect.any(String),
      );

      const storedJson = mockSetString.mock.calls[0][1];
      const stored = JSON.parse(storedJson);
      expect(typeof stored.schemas).toBe('object');
      expect(stored.schemas).not.toBeNull();
      expect(stored.metadata.version).toBe('1.0.0');
      expect(stored.metadata.supportedCountries.length).toBeGreaterThan(0);

      mgr.destroy();
    });

    it('uses existing registry from storage if present', async () => {
      const registryJson = makeRegistryJson({ JPN: makeSchema('JPN') });
      mockGetString.mockImplementation((key: string) => {
        if (key === 'schema_registry') return registryJson;
        return undefined;
      });

      const mgr = await loadSchemaManager();
      await mgr.initialize();

      // Should NOT have written a new registry
      expect(mockSetString).not.toHaveBeenCalled();
      const schema = mgr.getSchema('JPN');
      expect(schema).not.toBeNull();
      expect(schema!.countryCode).toBe('JPN');

      mgr.destroy();
    });

    it('throws when storage fails during initialization', async () => {
      mockGetString.mockImplementation(() => {
        throw new Error('Storage unavailable');
      });

      const mgr = await loadSchemaManager();
      await expect(mgr.initialize()).rejects.toThrow('Schema manager initialization failed');
      mgr.destroy();
    });
  });

  describe('getSchema', () => {
    it('returns schema for a valid country code', async () => {
      const registryJson = makeRegistryJson({
        JPN: makeSchema('JPN'),
        SGP: makeSchema('SGP'),
      });
      mockGetString.mockReturnValue(registryJson);

      const mgr = await loadSchemaManager();
      await mgr.initialize();

      const schema = mgr.getSchema('JPN');
      expect(schema).not.toBeNull();
      expect(schema!.countryCode).toBe('JPN');

      mgr.destroy();
    });

    it('returns null for an unsupported country code', async () => {
      const registryJson = makeRegistryJson({ JPN: makeSchema('JPN') });
      mockGetString.mockReturnValue(registryJson);

      const mgr = await loadSchemaManager();
      await mgr.initialize();

      expect(mgr.getSchema('ZZZ')).toBeNull();

      mgr.destroy();
    });

    it('returns null for deprecated schemas', async () => {
      const registryJson = makeRegistryJson({
        JPN: makeSchema('JPN', {
          metadata: {
            ...makeSchema('JPN').metadata,
            implementationStatus: 'deprecated' as const,
          },
        }),
      });
      mockGetString.mockReturnValue(registryJson);

      const mgr = await loadSchemaManager();
      await mgr.initialize();

      expect(mgr.getSchema('JPN')).toBeNull();

      mgr.destroy();
    });

    it('throws if schema manager is not initialized', async () => {
      const mgr = await loadSchemaManager();
      expect(() => mgr.getSchema('JPN')).toThrow('Schema manager not initialized');
      mgr.destroy();
    });
  });

  describe('getSupportedCountries', () => {
    it('returns country codes excluding deprecated schemas', async () => {
      const registryJson = makeRegistryJson({
        JPN: makeSchema('JPN'),
        USA: makeSchema('USA', {
          metadata: {
            ...makeSchema('USA').metadata,
            implementationStatus: 'deprecated' as const,
          },
        }),
        SGP: makeSchema('SGP'),
      });
      mockGetString.mockReturnValue(registryJson);

      const mgr = await loadSchemaManager();
      await mgr.initialize();

      const countries = mgr.getSupportedCountries();
      expect(countries).toContain('JPN');
      expect(countries).toContain('SGP');
      expect(countries).not.toContain('USA');

      mgr.destroy();
    });

    it('throws if not initialized', async () => {
      const mgr = await loadSchemaManager();
      expect(() => mgr.getSupportedCountries()).toThrow('Schema manager not initialized');
      mgr.destroy();
    });
  });

  describe('getSchemaVersion', () => {
    it('returns version string for valid country', async () => {
      const registryJson = makeRegistryJson({ JPN: makeSchema('JPN') });
      mockGetString.mockReturnValue(registryJson);

      const mgr = await loadSchemaManager();
      await mgr.initialize();

      expect(mgr.getSchemaVersion('JPN')).toBe('1.0.0');

      mgr.destroy();
    });

    it('returns null for unknown country', async () => {
      const registryJson = makeRegistryJson({ JPN: makeSchema('JPN') });
      mockGetString.mockReturnValue(registryJson);

      const mgr = await loadSchemaManager();
      await mgr.initialize();

      expect(mgr.getSchemaVersion('ZZZ')).toBeNull();

      mgr.destroy();
    });
  });

  describe('getSchemasByPriority', () => {
    it('returns schemas sorted by priority, excluding deprecated', async () => {
      const registryJson = makeRegistryJson({
        JPN: makeSchema('JPN', { metadata: { ...makeSchema('JPN').metadata, priority: 2 } }),
        SGP: makeSchema('SGP', { metadata: { ...makeSchema('SGP').metadata, priority: 1 } }),
        USA: makeSchema('USA', {
          metadata: { ...makeSchema('USA').metadata, priority: 3, implementationStatus: 'deprecated' as const },
        }),
      });
      mockGetString.mockReturnValue(registryJson);

      const mgr = await loadSchemaManager();
      await mgr.initialize();

      const schemas = mgr.getSchemasByPriority();
      expect(schemas).toHaveLength(2);
      expect(schemas[0].countryCode).toBe('SGP');
      expect(schemas[1].countryCode).toBe('JPN');

      mgr.destroy();
    });

    it('throws if not initialized', async () => {
      const mgr = await loadSchemaManager();
      expect(() => mgr.getSchemasByPriority()).toThrow('Schema manager not initialized');
      mgr.destroy();
    });
  });

  describe('getRegistryMetadata', () => {
    it('returns metadata object', async () => {
      const registryJson = makeRegistryJson({ JPN: makeSchema('JPN') });
      mockGetString.mockReturnValue(registryJson);

      const mgr = await loadSchemaManager();
      await mgr.initialize();

      const metadata = mgr.getRegistryMetadata();
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.supportedCountries).toContain('JPN');
      expect(metadata.lastUpdated).toBe('2025-01-01T00:00:00Z');

      mgr.destroy();
    });

    it('throws if not initialized', async () => {
      const mgr = await loadSchemaManager();
      expect(() => mgr.getRegistryMetadata()).toThrow('Schema manager not initialized');
      mgr.destroy();
    });
  });

  describe('exportSchemas', () => {
    it('returns a copy of the registry', async () => {
      const registryJson = makeRegistryJson({ JPN: makeSchema('JPN') });
      mockGetString.mockReturnValue(registryJson);

      const mgr = await loadSchemaManager();
      await mgr.initialize();

      const exported = mgr.exportSchemas();
      expect(typeof exported.schemas).toBe('object');
      expect(exported.schemas).not.toBeNull();
      expect(typeof exported.metadata).toBe('object');
      expect(exported.metadata).not.toBeNull();
      expect(typeof exported.migrations).toBe('object');
      expect(exported.migrations).not.toBeNull();

      mgr.destroy();
    });

    it('throws if not initialized', async () => {
      const mgr = await loadSchemaManager();
      expect(() => mgr.exportSchemas()).toThrow('Schema manager not initialized');
      mgr.destroy();
    });
  });

  describe('stopChangeDetection / destroy', () => {
    it('clears interval without error', async () => {
      const registryJson = makeRegistryJson({ JPN: makeSchema('JPN') });
      mockGetString.mockReturnValue(registryJson);

      const mgr = await loadSchemaManager();
      await mgr.initialize();

      mgr.stopChangeDetection();
      mgr.destroy();
    });

    it('destroy can be called without initialization', async () => {
      const mgr = await loadSchemaManager();
      expect(() => mgr.destroy()).not.toThrow();
    });
  });

  describe('needsUpdate', () => {
    it('returns false when schema does not exist', async () => {
      const registryJson = makeRegistryJson({ JPN: makeSchema('JPN') });
      mockGetString.mockReturnValue(registryJson);

      const mgr = await loadSchemaManager();
      await mgr.initialize();

      expect(mgr.needsUpdate('ZZZ')).toBe(false);

      mgr.destroy();
    });

    it('returns true when lastVerified is past the maintenance frequency', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);

      const registryJson = makeRegistryJson({
        JPN: makeSchema('JPN', {
          metadata: {
            ...makeSchema('JPN').metadata,
            lastVerified: oldDate.toISOString(),
            maintenanceFrequency: 'monthly' as const,
          },
        }),
      });
      mockGetString.mockReturnValue(registryJson);

      const mgr = await loadSchemaManager();
      await mgr.initialize();

      expect(mgr.needsUpdate('JPN')).toBe(true);

      mgr.destroy();
    });

    it('returns false when recently verified', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 1);

      const registryJson = makeRegistryJson({
        JPN: makeSchema('JPN', {
          metadata: {
            ...makeSchema('JPN').metadata,
            lastVerified: recentDate.toISOString(),
            maintenanceFrequency: 'monthly' as const,
          },
        }),
      });
      mockGetString.mockReturnValue(registryJson);

      const mgr = await loadSchemaManager();
      await mgr.initialize();

      expect(mgr.needsUpdate('JPN')).toBe(false);

      mgr.destroy();
    });
  });
});
