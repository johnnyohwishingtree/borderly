import { CountryFormSchema } from '../../../src/types/schema';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetString = jest.fn<string | undefined, [string]>();
const mockSetString = jest.fn<void, [string, string]>();

jest.mock('../../../src/services/storage/mmkv', () => ({
  mmkvService: {
    getString: mockGetString,
    setString: mockSetString,
  },
}));

const mockLoadSchemaForCountry = jest.fn<Promise<CountryFormSchema | null>, [string]>();
const mockValidateSchemaCompletely = jest.fn<boolean, [CountryFormSchema]>();

jest.mock('../../../src/services/schemas/schemaLoader', () => ({
  loadSchemaForCountry: mockLoadSchemaForCountry,
  validateSchemaCompletely: mockValidateSchemaCompletely,
}));

jest.mock('../../../src/utils/constants', () => ({
  SCHEMA_MMKV_KEY_PREFIX: 'schema:',
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

const MOCK_COUNTRIES = ['JPN', 'MYS', 'SGP'];

jest.mock('../../../src/schemas', () => ({
  SUPPORTED_COUNTRIES: ['JPN', 'MYS', 'SGP'],
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SchemaRegistry', () => {
  let SchemaRegistryClass: typeof import('../../../src/services/schemas/schemaRegistry').SchemaRegistry;
  let schemaRegistry: ReturnType<typeof SchemaRegistryClass.getInstance>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-import to get a fresh module with clean singleton state
    jest.resetModules();
  });

  async function loadModule() {
    const mod = await import('../../../src/services/schemas/schemaRegistry');
    SchemaRegistryClass = mod.SchemaRegistry;
    // Get a fresh instance via getInstance then reset it
    schemaRegistry = SchemaRegistryClass.getInstance();
    schemaRegistry.reset();
    return mod;
  }

  describe('getInstance', () => {
    it('returns the same singleton instance', async () => {
      await loadModule();
      const instance1 = SchemaRegistryClass.getInstance();
      const instance2 = SchemaRegistryClass.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('loads schemas for all supported countries', async () => {
      mockLoadSchemaForCountry.mockImplementation(async (code: string) => makeSchema(code));
      mockValidateSchemaCompletely.mockReturnValue(true);

      await loadModule();
      await schemaRegistry.initialize();

      expect(mockLoadSchemaForCountry).toHaveBeenCalledTimes(MOCK_COUNTRIES.length);
      for (const code of MOCK_COUNTRIES) {
        expect(mockLoadSchemaForCountry).toHaveBeenCalledWith(code);
      }

      const countries = schemaRegistry.getSupportedCountries();
      expect(countries).toEqual(MOCK_COUNTRIES);
    });

    it('skips schemas that fail validation', async () => {
      mockLoadSchemaForCountry.mockImplementation(async (code: string) => makeSchema(code));
      mockValidateSchemaCompletely.mockImplementation((schema: CountryFormSchema) => {
        if (schema.countryCode === 'MYS') {
          throw new Error('Validation failed');
        }
        return true;
      });

      await loadModule();
      await schemaRegistry.initialize();

      const countries = schemaRegistry.getSupportedCountries();
      expect(countries).toContain('JPN');
      expect(countries).toContain('SGP');
      expect(countries).not.toContain('MYS');
    });

    it('skips countries where loader returns null', async () => {
      mockLoadSchemaForCountry.mockImplementation(async (code: string) => {
        if (code === 'SGP') return null;
        return makeSchema(code);
      });
      mockValidateSchemaCompletely.mockReturnValue(true);

      await loadModule();
      await schemaRegistry.initialize();

      const countries = schemaRegistry.getSupportedCountries();
      expect(countries).toContain('JPN');
      expect(countries).toContain('MYS');
      expect(countries).not.toContain('SGP');
    });

    it('is idempotent — second call is a no-op', async () => {
      mockLoadSchemaForCountry.mockImplementation(async (code: string) => makeSchema(code));
      mockValidateSchemaCompletely.mockReturnValue(true);

      await loadModule();
      await schemaRegistry.initialize();
      await schemaRegistry.initialize();

      // loadSchemaForCountry should only be called during the first init
      expect(mockLoadSchemaForCountry).toHaveBeenCalledTimes(MOCK_COUNTRIES.length);
    });

    it('marks as initialized even if loader throws', async () => {
      mockLoadSchemaForCountry.mockRejectedValue(new Error('Network error'));

      await loadModule();
      await schemaRegistry.initialize();

      // Should not throw — initialized is set to true in the catch block
      const countries = schemaRegistry.getSupportedCountries();
      expect(countries).toEqual([]);
    });
  });

  describe('getSchema', () => {
    it('returns schema for valid country code', async () => {
      mockLoadSchemaForCountry.mockImplementation(async (code: string) => makeSchema(code));
      mockValidateSchemaCompletely.mockReturnValue(true);
      mockGetString.mockReturnValue(undefined);

      await loadModule();
      await schemaRegistry.initialize();

      const schema = schemaRegistry.getSchema('JPN');
      expect(schema).not.toBeNull();
      expect(schema!.countryCode).toBe('JPN');
    });

    it('returns null for unsupported country code', async () => {
      mockLoadSchemaForCountry.mockImplementation(async (code: string) => makeSchema(code));
      mockValidateSchemaCompletely.mockReturnValue(true);
      mockGetString.mockReturnValue(undefined);

      await loadModule();
      await schemaRegistry.initialize();

      const schema = schemaRegistry.getSchema('ZZZ');
      expect(schema).toBeNull();
    });

    it('normalizes country code to uppercase', async () => {
      mockLoadSchemaForCountry.mockImplementation(async (code: string) => makeSchema(code));
      mockValidateSchemaCompletely.mockReturnValue(true);
      mockGetString.mockReturnValue(undefined);

      await loadModule();
      await schemaRegistry.initialize();

      const schema = schemaRegistry.getSchema('jpn');
      expect(schema).not.toBeNull();
      expect(schema!.countryCode).toBe('JPN');
    });

    it('hot-swaps schema from MMKV cache when available', async () => {
      mockLoadSchemaForCountry.mockImplementation(async (code: string) => makeSchema(code));
      mockValidateSchemaCompletely.mockReturnValue(true);

      const cachedSchema = makeSchema('JPN', { schemaVersion: '2.0.0' });
      mockGetString.mockImplementation((key: string) => {
        if (key === 'schema:JPN') return JSON.stringify(cachedSchema);
        return undefined;
      });

      await loadModule();
      await schemaRegistry.initialize();

      const schema = schemaRegistry.getSchema('JPN');
      expect(schema).not.toBeNull();
      expect(schema!.schemaVersion).toBe('2.0.0');
    });

    it('falls back to in-memory schema when MMKV cache is corrupt', async () => {
      mockLoadSchemaForCountry.mockImplementation(async (code: string) => makeSchema(code));
      mockValidateSchemaCompletely.mockReturnValue(true);

      mockGetString.mockImplementation((key: string) => {
        if (key === 'schema:JPN') return 'not valid json{{{';
        return undefined;
      });

      await loadModule();
      await schemaRegistry.initialize();

      const schema = schemaRegistry.getSchema('JPN');
      expect(schema).not.toBeNull();
      expect(schema!.countryCode).toBe('JPN');
      expect(schema!.schemaVersion).toBe('1.0.0');
    });

    it('throws if registry is not initialized', async () => {
      await loadModule();
      expect(() => schemaRegistry.getSchema('JPN')).toThrow(
        'Schema registry not initialized. Call initialize() first.',
      );
    });
  });

  describe('getAllSchemas', () => {
    it('returns all loaded schemas', async () => {
      mockLoadSchemaForCountry.mockImplementation(async (code: string) => makeSchema(code));
      mockValidateSchemaCompletely.mockReturnValue(true);
      mockGetString.mockReturnValue(undefined);

      await loadModule();
      await schemaRegistry.initialize();

      const schemas = schemaRegistry.getAllSchemas();
      expect(schemas).toHaveLength(MOCK_COUNTRIES.length);
      const codes = schemas.map((s: CountryFormSchema) => s.countryCode);
      expect(codes).toEqual(expect.arrayContaining(MOCK_COUNTRIES));
    });

    it('returns empty array when no schemas loaded', async () => {
      mockLoadSchemaForCountry.mockResolvedValue(null);

      await loadModule();
      await schemaRegistry.initialize();

      const schemas = schemaRegistry.getAllSchemas();
      expect(schemas).toEqual([]);
    });

    it('throws if not initialized', async () => {
      await loadModule();
      expect(() => schemaRegistry.getAllSchemas()).toThrow(
        'Schema registry not initialized. Call initialize() first.',
      );
    });
  });

  describe('getSupportedCountries', () => {
    it('returns array of country codes', async () => {
      mockLoadSchemaForCountry.mockImplementation(async (code: string) => makeSchema(code));
      mockValidateSchemaCompletely.mockReturnValue(true);

      await loadModule();
      await schemaRegistry.initialize();

      const codes = schemaRegistry.getSupportedCountries();
      expect(codes).toEqual(MOCK_COUNTRIES);
    });

    it('throws if not initialized', async () => {
      await loadModule();
      expect(() => schemaRegistry.getSupportedCountries()).toThrow(
        'Schema registry not initialized. Call initialize() first.',
      );
    });
  });

  describe('isCountrySupported', () => {
    beforeEach(async () => {
      mockLoadSchemaForCountry.mockImplementation(async (code: string) => makeSchema(code));
      mockValidateSchemaCompletely.mockReturnValue(true);
      mockGetString.mockReturnValue(undefined);
    });

    it('returns true for supported country', async () => {
      await loadModule();
      await schemaRegistry.initialize();
      expect(schemaRegistry.isCountrySupported('JPN')).toBe(true);
    });

    it('returns true for lowercase country code', async () => {
      await loadModule();
      await schemaRegistry.initialize();
      expect(schemaRegistry.isCountrySupported('jpn')).toBe(true);
    });

    it('returns false for unsupported country', async () => {
      await loadModule();
      await schemaRegistry.initialize();
      expect(schemaRegistry.isCountrySupported('ZZZ')).toBe(false);
    });

    it('throws if not initialized', async () => {
      await loadModule();
      expect(() => schemaRegistry.isCountrySupported('JPN')).toThrow(
        'Schema registry not initialized. Call initialize() first.',
      );
    });
  });

  describe('getSchemaVersion', () => {
    it('returns version for valid country', async () => {
      mockLoadSchemaForCountry.mockImplementation(async (code: string) => makeSchema(code));
      mockValidateSchemaCompletely.mockReturnValue(true);
      mockGetString.mockReturnValue(undefined);

      await loadModule();
      await schemaRegistry.initialize();

      expect(schemaRegistry.getSchemaVersion('JPN')).toBe('1.0.0');
    });

    it('returns null for unknown country', async () => {
      mockLoadSchemaForCountry.mockImplementation(async (code: string) => makeSchema(code));
      mockValidateSchemaCompletely.mockReturnValue(true);
      mockGetString.mockReturnValue(undefined);

      await loadModule();
      await schemaRegistry.initialize();

      expect(schemaRegistry.getSchemaVersion('ZZZ')).toBeNull();
    });
  });

  describe('getPortalInfo', () => {
    it('returns portal name and url for valid country', async () => {
      mockLoadSchemaForCountry.mockImplementation(async (code: string) => makeSchema(code));
      mockValidateSchemaCompletely.mockReturnValue(true);
      mockGetString.mockReturnValue(undefined);

      await loadModule();
      await schemaRegistry.initialize();

      const info = schemaRegistry.getPortalInfo('JPN');
      expect(info).toEqual({
        name: 'JPN Portal',
        url: 'https://portal.jpn.example.com',
      });
    });

    it('returns null for unknown country', async () => {
      mockLoadSchemaForCountry.mockImplementation(async (code: string) => makeSchema(code));
      mockValidateSchemaCompletely.mockReturnValue(true);
      mockGetString.mockReturnValue(undefined);

      await loadModule();
      await schemaRegistry.initialize();

      expect(schemaRegistry.getPortalInfo('ZZZ')).toBeNull();
    });
  });

  describe('getSubmissionTiming', () => {
    it('returns submission timing for valid country', async () => {
      mockLoadSchemaForCountry.mockImplementation(async (code: string) => makeSchema(code));
      mockValidateSchemaCompletely.mockReturnValue(true);
      mockGetString.mockReturnValue(undefined);

      await loadModule();
      await schemaRegistry.initialize();

      const timing = schemaRegistry.getSubmissionTiming('JPN');
      expect(timing).toEqual({
        earliestBeforeArrival: '14d',
        latestBeforeArrival: '0h',
        recommended: '72h',
      });
    });

    it('returns null for unknown country', async () => {
      mockLoadSchemaForCountry.mockImplementation(async (code: string) => makeSchema(code));
      mockValidateSchemaCompletely.mockReturnValue(true);
      mockGetString.mockReturnValue(undefined);

      await loadModule();
      await schemaRegistry.initialize();

      expect(schemaRegistry.getSubmissionTiming('ZZZ')).toBeNull();
    });
  });

  describe('getSchemaMetadata', () => {
    it('returns metadata array for all loaded schemas', async () => {
      mockLoadSchemaForCountry.mockImplementation(async (code: string) => makeSchema(code));
      mockValidateSchemaCompletely.mockReturnValue(true);
      mockGetString.mockReturnValue(undefined);

      await loadModule();
      await schemaRegistry.initialize();

      const metadata = schemaRegistry.getSchemaMetadata();
      expect(metadata).toHaveLength(MOCK_COUNTRIES.length);
      expect(metadata[0]).toEqual({
        countryCode: 'JPN',
        countryName: 'Country JPN',
        portalName: 'JPN Portal',
        portalUrl: 'https://portal.jpn.example.com',
        schemaVersion: '1.0.0',
        lastUpdated: '2025-01-01T00:00:00Z',
      });
    });

    it('throws if not initialized', async () => {
      await loadModule();
      expect(() => schemaRegistry.getSchemaMetadata()).toThrow(
        'Schema registry not initialized. Call initialize() first.',
      );
    });
  });

  describe('getUpdatedSchemasSince', () => {
    it('returns schemas updated after the given date', async () => {
      const oldSchema = makeSchema('JPN', { lastUpdated: '2024-01-01T00:00:00Z' });
      const newSchema = makeSchema('SGP', { lastUpdated: '2025-06-01T00:00:00Z' });

      mockLoadSchemaForCountry.mockImplementation(async (code: string) => {
        if (code === 'JPN') return oldSchema;
        if (code === 'SGP') return newSchema;
        return makeSchema(code);
      });
      mockValidateSchemaCompletely.mockReturnValue(true);
      mockGetString.mockReturnValue(undefined);

      await loadModule();
      await schemaRegistry.initialize();

      const since = new Date('2025-01-01T00:00:00Z');
      const updated = schemaRegistry.getUpdatedSchemasSince(since);
      const codes = updated.map((s: CountryFormSchema) => s.countryCode);
      expect(codes).toContain('SGP');
      expect(codes).not.toContain('JPN');
    });

    it('returns empty array when no schemas updated since date', async () => {
      mockLoadSchemaForCountry.mockImplementation(async (code: string) =>
        makeSchema(code, { lastUpdated: '2020-01-01T00:00:00Z' }),
      );
      mockValidateSchemaCompletely.mockReturnValue(true);
      mockGetString.mockReturnValue(undefined);

      await loadModule();
      await schemaRegistry.initialize();

      const since = new Date('2025-01-01T00:00:00Z');
      const updated = schemaRegistry.getUpdatedSchemasSince(since);
      expect(updated).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('returns aggregate statistics', async () => {
      mockLoadSchemaForCountry.mockImplementation(async (code: string) => makeSchema(code));
      mockValidateSchemaCompletely.mockReturnValue(true);
      mockGetString.mockReturnValue(undefined);

      await loadModule();
      await schemaRegistry.initialize();

      const stats = schemaRegistry.getStats();
      expect(stats.totalCountries).toBe(MOCK_COUNTRIES.length);
      expect(stats.totalSections).toBe(MOCK_COUNTRIES.length); // 1 section per schema
      expect(stats.totalFields).toBe(MOCK_COUNTRIES.length); // 1 field per section
      expect(stats.totalSubmissionSteps).toBe(MOCK_COUNTRIES.length); // 1 step per schema
      expect(stats.averageFieldsPerCountry).toBe(1);
      expect(stats.averageStepsPerCountry).toBe(1);
    });

    it('throws if not initialized', async () => {
      await loadModule();
      expect(() => schemaRegistry.getStats()).toThrow(
        'Schema registry not initialized. Call initialize() first.',
      );
    });
  });

  describe('reset', () => {
    it('clears all schemas and resets initialized state', async () => {
      mockLoadSchemaForCountry.mockImplementation(async (code: string) => makeSchema(code));
      mockValidateSchemaCompletely.mockReturnValue(true);

      await loadModule();
      await schemaRegistry.initialize();
      expect(schemaRegistry.getSupportedCountries()).toHaveLength(MOCK_COUNTRIES.length);

      schemaRegistry.reset();

      // After reset, should throw as not initialized
      expect(() => schemaRegistry.getSupportedCountries()).toThrow(
        'Schema registry not initialized. Call initialize() first.',
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Convenience functions (use singleton)
// ---------------------------------------------------------------------------

describe('Convenience functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockLoadSchemaForCountry.mockImplementation(async (code: string) => makeSchema(code));
    mockValidateSchemaCompletely.mockReturnValue(true);
    mockGetString.mockReturnValue(undefined);
  });

  it('initializeSchemaRegistry initializes the singleton', async () => {
    const { initializeSchemaRegistry, schemaRegistry: registry } = await import(
      '../../../src/services/schemas/schemaRegistry'
    );
    registry.reset();

    await initializeSchemaRegistry();

    expect(registry.getSupportedCountries()).toEqual(MOCK_COUNTRIES);
  });

  it('getSchemaByCountryCode delegates to singleton', async () => {
    const { getSchemaByCountryCode, schemaRegistry: registry } = await import(
      '../../../src/services/schemas/schemaRegistry'
    );
    registry.reset();
    await registry.initialize();

    const schema = getSchemaByCountryCode('JPN');
    expect(schema).not.toBeNull();
    expect(schema!.countryCode).toBe('JPN');
  });

  it('getAllCountrySchemas delegates to singleton', async () => {
    const { getAllCountrySchemas, schemaRegistry: registry } = await import(
      '../../../src/services/schemas/schemaRegistry'
    );
    registry.reset();
    await registry.initialize();

    const schemas = getAllCountrySchemas();
    expect(schemas).toHaveLength(MOCK_COUNTRIES.length);
  });

  it('getSupportedCountryCodes delegates to singleton', async () => {
    const { getSupportedCountryCodes, schemaRegistry: registry } = await import(
      '../../../src/services/schemas/schemaRegistry'
    );
    registry.reset();
    await registry.initialize();

    const codes = getSupportedCountryCodes();
    expect(codes).toEqual(MOCK_COUNTRIES);
  });

  it('isCountrySupported delegates to singleton', async () => {
    const { isCountrySupported, schemaRegistry: registry } = await import(
      '../../../src/services/schemas/schemaRegistry'
    );
    registry.reset();
    await registry.initialize();

    expect(isCountrySupported('JPN')).toBe(true);
    expect(isCountrySupported('ZZZ')).toBe(false);
  });
});
