import { schemaManager } from '../../src/services/schemas/schemaManager';
import { schemaValidator } from '../../src/services/schemas/schemaValidator';
import { schemaMigrator } from '../../src/services/schemas/schemaMigrator';
import { CountryFormSchema, SchemaRegistry } from '../../src/types/schema';

// Mock dependencies
jest.mock('react-native-mmkv');
jest.mock('../../src/services/schemas/schemaValidator');
jest.mock('../../src/services/schemas/schemaMigrator');

// Mock MMKV
const mockMMKV = {
  getString: jest.fn(),
  set: jest.fn(),
};

const { MMKV } = require('react-native-mmkv');
MMKV.mockImplementation(() => mockMMKV);

// Mock schema files
const mockJPNSchema: CountryFormSchema = {
  countryCode: 'JPN',
  countryName: 'Japan',
  formName: 'Visit Japan Web',
  schemaVersion: '1.0.0',
  sections: [],
  metadata: {
    implementationStatus: 'stable',
    lastVerified: '2023-12-01T00:00:00Z',
    priority: 1,
    maintenanceFrequency: 'monthly',
  },
  changeDetection: {
    portalUrl: 'https://www.visitjapan.gov.jp',
    fallbackActions: [],
    lastChangeDetected: '2023-12-01T00:00:00Z',
  },
};

const mockMYSSchema: CountryFormSchema = {
  countryCode: 'MYS',
  countryName: 'Malaysia',
  formName: 'Malaysia Digital Arrival Card',
  schemaVersion: '1.0.0',
  sections: [],
  metadata: {
    implementationStatus: 'stable',
    lastVerified: '2023-12-01T00:00:00Z',
    priority: 2,
    maintenanceFrequency: 'quarterly',
  },
};

const mockSGPSchema: CountryFormSchema = {
  countryCode: 'SGP',
  countryName: 'Singapore',
  formName: 'SG Arrival Card',
  schemaVersion: '1.0.0',
  sections: [],
  metadata: {
    implementationStatus: 'stable',
    lastVerified: '2023-12-01T00:00:00Z',
    priority: 3,
    maintenanceFrequency: 'weekly',
  },
};

// Mock require calls for schema files
jest.mock('../../src/schemas/JPN.json', () => mockJPNSchema, { virtual: true });
jest.mock('../../src/schemas/MYS.json', () => mockMYSSchema, { virtual: true });
jest.mock('../../src/schemas/SGP.json', () => mockSGPSchema, { virtual: true });

const mockSchemaValidator = schemaValidator as jest.Mocked<typeof schemaValidator>;
const mockSchemaMigrator = schemaMigrator as jest.Mocked<typeof schemaMigrator>;

describe('SchemaManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Reset schema manager state
    (schemaManager as any).registry = null;
    (schemaManager as any).changeDetectionInterval = null;
    
    // Default mock implementations
    mockSchemaValidator.validateSchema.mockResolvedValue({
      valid: true,
      errors: [],
    });
    mockSchemaMigrator.applyMigrations.mockImplementation(
      async (current, target) => target
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    schemaManager.stopChangeDetection();
  });

  describe('initialization', () => {
    it('should initialize with bundled schemas when no registry exists', async () => {
      mockMMKV.getString.mockReturnValue(null);

      await schemaManager.initialize();

      expect(mockMMKV.set).toHaveBeenCalledWith(
        'registry',
        expect.stringContaining('JPN')
      );

      // Verify the registry structure
      const setCall = mockMMKV.set.mock.calls.find(call => call[0] === 'registry');
      const registry = JSON.parse(setCall[1]);
      
      expect(registry.schemas.JPN).toEqual(mockJPNSchema);
      expect(registry.schemas.MYS).toEqual(mockMYSSchema);
      expect(registry.schemas.SGP).toEqual(mockSGPSchema);
      expect(registry.metadata.supportedCountries).toEqual(['JPN', 'MYS', 'SGP']);
    });

    it('should load existing registry from storage', async () => {
      const existingRegistry: SchemaRegistry = {
        schemas: { JPN: mockJPNSchema },
        migrations: {},
        metadata: {
          lastUpdated: '2023-12-01T00:00:00Z',
          version: '1.0.0',
          supportedCountries: ['JPN'],
        },
      };
      mockMMKV.getString.mockReturnValue(JSON.stringify(existingRegistry));

      await schemaManager.initialize();

      expect(mockMMKV.set).not.toHaveBeenCalled();
      expect(schemaManager.getSupportedCountries()).toEqual(['JPN']);
    });

    it('should handle initialization errors', async () => {
      mockMMKV.getString.mockImplementation(() => {
        throw new Error('Storage error');
      });

      await expect(schemaManager.initialize()).rejects.toThrow(
        'Schema manager initialization failed'
      );
    });

    it('should start change detection after initialization', async () => {
      mockMMKV.getString.mockReturnValue(null);

      await schemaManager.initialize();

      expect((schemaManager as any).changeDetectionInterval).not.toBeNull();
    });
  });

  describe('schema retrieval', () => {
    beforeEach(async () => {
      mockMMKV.getString.mockReturnValue(null);
      await schemaManager.initialize();
    });

    it('should get schema by country code', () => {
      const schema = schemaManager.getSchema('JPN');
      expect(schema).toEqual(mockJPNSchema);
    });

    it('should return null for non-existent schema', () => {
      const schema = schemaManager.getSchema('DEU');
      expect(schema).toBeNull();
    });

    it('should return null for deprecated schema', () => {
      const deprecatedSchema = {
        ...mockJPNSchema,
        metadata: { ...mockJPNSchema.metadata, implementationStatus: 'deprecated' },
      };

      (schemaManager as any).registry.schemas.JPN = deprecatedSchema;

      const schema = schemaManager.getSchema('JPN');
      expect(schema).toBeNull();
    });

    it('should throw error when not initialized', () => {
      (schemaManager as any).registry = null;
      
      expect(() => schemaManager.getSchema('JPN')).toThrow(
        'Schema manager not initialized'
      );
    });

    it('should get supported countries excluding deprecated', () => {
      const countries = schemaManager.getSupportedCountries();
      expect(countries).toEqual(['JPN', 'MYS', 'SGP']);
    });

    it('should filter out deprecated schemas from supported countries', () => {
      const deprecatedSchema = {
        ...mockJPNSchema,
        metadata: { ...mockJPNSchema.metadata, implementationStatus: 'deprecated' },
      };

      (schemaManager as any).registry.schemas.JPN = deprecatedSchema;

      const countries = schemaManager.getSupportedCountries();
      expect(countries).toEqual(['MYS', 'SGP']);
    });
  });

  describe('schema updates', () => {
    beforeEach(async () => {
      mockMMKV.getString.mockReturnValue(null);
      await schemaManager.initialize();
    });

    it('should update existing schema with validation', async () => {
      const updatedSchema = { ...mockJPNSchema, schemaVersion: '1.1.0' };

      await schemaManager.updateSchema('JPN', updatedSchema);

      expect(mockSchemaValidator.validateSchema).toHaveBeenCalledWith(updatedSchema);
      expect(mockSchemaMigrator.applyMigrations).toHaveBeenCalledWith(
        mockJPNSchema,
        updatedSchema,
        []
      );
      expect(mockMMKV.set).toHaveBeenCalledWith(
        'registry',
        expect.stringContaining('"schemaVersion":"1.1.0"')
      );
    });

    it('should add new schema', async () => {
      const newSchema: CountryFormSchema = {
        countryCode: 'THA',
        countryName: 'Thailand',
        formName: 'Thailand Pass',
        schemaVersion: '1.0.0',
        sections: [],
      };

      await schemaManager.updateSchema('THA', newSchema);

      expect(mockSchemaValidator.validateSchema).toHaveBeenCalledWith(newSchema);
      expect(mockSchemaMigrator.applyMigrations).not.toHaveBeenCalled();
      
      const countries = schemaManager.getSupportedCountries();
      expect(countries).toContain('THA');
    });

    it('should reject invalid schema', async () => {
      const invalidSchema = { ...mockJPNSchema };
      mockSchemaValidator.validateSchema.mockResolvedValue({
        valid: false,
        errors: [{ message: 'Invalid field', path: 'test' }],
      });

      await expect(
        schemaManager.updateSchema('JPN', invalidSchema)
      ).rejects.toThrow('Invalid schema: Invalid field');
    });

    it('should throw error when not initialized', async () => {
      (schemaManager as any).registry = null;
      
      await expect(
        schemaManager.updateSchema('JPN', mockJPNSchema)
      ).rejects.toThrow('Schema manager not initialized');
    });
  });

  describe('schema removal', () => {
    beforeEach(async () => {
      mockMMKV.getString.mockReturnValue(null);
      await schemaManager.initialize();
    });

    it('should deprecate schema instead of deleting', async () => {
      await schemaManager.removeSchema('JPN');

      const schema = schemaManager.getSchema('JPN');
      expect(schema).toBeNull(); // Should return null because it's deprecated

      // But it should still exist in the registry
      const registry = (schemaManager as any).registry;
      expect(registry.schemas.JPN.metadata.implementationStatus).toBe('deprecated');
      expect(registry.metadata.supportedCountries).not.toContain('JPN');
    });

    it('should throw error for non-existent schema', async () => {
      await expect(schemaManager.removeSchema('DEU')).rejects.toThrow(
        'Schema for DEU does not exist'
      );
    });

    it('should throw error when not initialized', async () => {
      (schemaManager as any).registry = null;
      
      await expect(schemaManager.removeSchema('JPN')).rejects.toThrow(
        'Schema manager not initialized'
      );
    });
  });

  describe('schema versioning and updates', () => {
    beforeEach(async () => {
      mockMMKV.getString.mockReturnValue(null);
      await schemaManager.initialize();
    });

    it('should get schema version', () => {
      const version = schemaManager.getSchemaVersion('JPN');
      expect(version).toBe('1.0.0');
    });

    it('should return null for non-existent schema version', () => {
      const version = schemaManager.getSchemaVersion('DEU');
      expect(version).toBeNull();
    });

    it('should detect when schema needs update based on maintenance frequency', () => {
      // Set lastVerified to 35 days ago for monthly maintenance
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35);
      
      const oldSchema = {
        ...mockJPNSchema,
        metadata: {
          ...mockJPNSchema.metadata,
          lastVerified: oldDate.toISOString(),
          maintenanceFrequency: 'monthly' as const,
        },
      };

      (schemaManager as any).registry.schemas.JPN = oldSchema;

      const needsUpdate = schemaManager.needsUpdate('JPN');
      expect(needsUpdate).toBe(true);
    });

    it('should not need update when recently verified', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 5); // 5 days ago
      
      const recentSchema = {
        ...mockJPNSchema,
        metadata: {
          ...mockJPNSchema.metadata,
          lastVerified: recentDate.toISOString(),
          maintenanceFrequency: 'monthly' as const,
        },
      };

      (schemaManager as any).registry.schemas.JPN = recentSchema;

      const needsUpdate = schemaManager.needsUpdate('JPN');
      expect(needsUpdate).toBe(false);
    });

    it('should handle different maintenance frequencies', () => {
      const testCases = [
        { frequency: 'weekly', days: 8, expected: true },
        { frequency: 'monthly', days: 31, expected: true },
        { frequency: 'quarterly', days: 91, expected: true },
        { frequency: 'annually', days: 366, expected: true },
      ];

      testCases.forEach(({ frequency, days, expected }) => {
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - days);
        
        const schema = {
          ...mockJPNSchema,
          metadata: {
            ...mockJPNSchema.metadata,
            lastVerified: oldDate.toISOString(),
            maintenanceFrequency: frequency as any,
          },
        };

        (schemaManager as any).registry.schemas.JPN = schema;

        const needsUpdate = schemaManager.needsUpdate('JPN');
        expect(needsUpdate).toBe(expected);
      });
    });

    it('should return false for schema without metadata', () => {
      const schemaWithoutMetadata = { ...mockJPNSchema };
      delete schemaWithoutMetadata.metadata;

      (schemaManager as any).registry.schemas.JPN = schemaWithoutMetadata;

      const needsUpdate = schemaManager.needsUpdate('JPN');
      expect(needsUpdate).toBe(false);
    });
  });

  describe('schema organization', () => {
    beforeEach(async () => {
      mockMMKV.getString.mockReturnValue(null);
      await schemaManager.initialize();
    });

    it('should get schemas sorted by priority', () => {
      const schemas = schemaManager.getSchemasByPriority();
      
      expect(schemas).toHaveLength(3);
      expect(schemas[0].countryCode).toBe('JPN'); // priority 1
      expect(schemas[1].countryCode).toBe('MYS'); // priority 2
      expect(schemas[2].countryCode).toBe('SGP'); // priority 3
    });

    it('should handle schemas without priority metadata', () => {
      const schemaWithoutPriority = { ...mockJPNSchema };
      delete schemaWithoutPriority.metadata?.priority;

      (schemaManager as any).registry.schemas.JPN = schemaWithoutPriority;

      const schemas = schemaManager.getSchemasByPriority();
      expect(schemas).toHaveLength(3);
      // Schema without priority should be last (default 999)
    });

    it('should exclude deprecated schemas from priority list', () => {
      const deprecatedSchema = {
        ...mockJPNSchema,
        metadata: { ...mockJPNSchema.metadata, implementationStatus: 'deprecated' },
      };

      (schemaManager as any).registry.schemas.JPN = deprecatedSchema;

      const schemas = schemaManager.getSchemasByPriority();
      expect(schemas).toHaveLength(2);
      expect(schemas.every(s => s.countryCode !== 'JPN')).toBe(true);
    });
  });

  describe('change detection', () => {
    beforeEach(async () => {
      mockMMKV.getString.mockReturnValue(null);
      await schemaManager.initialize();
    });

    it('should check portal changes and update schema', async () => {
      const mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.05); // Force change detection

      const hasChanges = await schemaManager.checkPortalChanges('JPN');

      expect(hasChanges).toBe(true);
      expect(mockSchemaValidator.validateSchema).toHaveBeenCalled();
      
      mathRandomSpy.mockRestore();
    });

    it('should return false when no changes detected', async () => {
      const mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5); // No changes

      const hasChanges = await schemaManager.checkPortalChanges('JPN');

      expect(hasChanges).toBe(false);
      
      mathRandomSpy.mockRestore();
    });

    it('should handle schema without change detection config', async () => {
      const schemaWithoutChangeDetection = { ...mockMYSSchema };
      delete schemaWithoutChangeDetection.changeDetection;

      (schemaManager as any).registry.schemas.MYS = schemaWithoutChangeDetection;

      const hasChanges = await schemaManager.checkPortalChanges('MYS');
      expect(hasChanges).toBe(false);
    });

    it('should handle errors during change detection gracefully', async () => {
      mockSchemaValidator.validateSchema.mockRejectedValue(new Error('Validation error'));

      const hasChanges = await schemaManager.checkPortalChanges('JPN');
      expect(hasChanges).toBe(false);
    });

    it('should start and stop change detection monitoring', async () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      schemaManager.stopChangeDetection();
      expect(clearIntervalSpy).toHaveBeenCalled();
      expect((schemaManager as any).changeDetectionInterval).toBeNull();
      
      clearIntervalSpy.mockRestore();
    });

    it('should periodically check for changes', async () => {
      const checkSpy = jest.spyOn(schemaManager, 'checkPortalChanges').mockResolvedValue(false);
      
      // Fast forward 6 hours
      jest.advanceTimersByTime(6 * 60 * 60 * 1000);

      expect(checkSpy).toHaveBeenCalledTimes(3); // JPN, MYS, SGP
      
      checkSpy.mockRestore();
    });
  });

  describe('registry operations', () => {
    beforeEach(async () => {
      mockMMKV.getString.mockReturnValue(null);
      await schemaManager.initialize();
    });

    it('should get registry metadata', () => {
      const metadata = schemaManager.getRegistryMetadata();
      
      expect(metadata).toEqual(
        expect.objectContaining({
          version: '1.0.0',
          supportedCountries: ['JPN', 'MYS', 'SGP'],
          lastUpdated: expect.any(String),
        })
      );
    });

    it('should export schemas', () => {
      const exported = schemaManager.exportSchemas();
      
      expect(exported).toEqual(
        expect.objectContaining({
          schemas: expect.objectContaining({
            JPN: mockJPNSchema,
            MYS: mockMYSSchema,
            SGP: mockSGPSchema,
          }),
          metadata: expect.any(Object),
          migrations: expect.any(Object),
        })
      );
    });

    it('should import valid schemas', async () => {
      const importRegistry: SchemaRegistry = {
        schemas: { JPN: mockJPNSchema },
        migrations: {},
        metadata: {
          lastUpdated: '2024-01-01T00:00:00Z',
          version: '2.0.0',
          supportedCountries: ['JPN'],
        },
      };

      await schemaManager.importSchemas(importRegistry);

      expect(mockSchemaValidator.validateSchema).toHaveBeenCalledWith(mockJPNSchema);
      expect(mockMMKV.set).toHaveBeenCalledWith(
        'registry',
        JSON.stringify(importRegistry)
      );
    });

    it('should reject import with invalid schemas', async () => {
      const invalidRegistry: SchemaRegistry = {
        schemas: { JPN: mockJPNSchema },
        migrations: {},
        metadata: {
          lastUpdated: '2024-01-01T00:00:00Z',
          version: '2.0.0',
          supportedCountries: ['JPN'],
        },
      };

      mockSchemaValidator.validateSchema.mockResolvedValue({
        valid: false,
        errors: [{ message: 'Invalid schema', path: 'test' }],
      });

      await expect(schemaManager.importSchemas(invalidRegistry)).rejects.toThrow(
        'Invalid schema for JPN'
      );
    });

    it('should throw errors when not initialized for metadata operations', () => {
      (schemaManager as any).registry = null;
      
      expect(() => schemaManager.getRegistryMetadata()).toThrow(
        'Schema manager not initialized'
      );
      expect(() => schemaManager.exportSchemas()).toThrow(
        'Schema manager not initialized'
      );
    });
  });

  describe('cleanup', () => {
    beforeEach(async () => {
      mockMMKV.getString.mockReturnValue(null);
      await schemaManager.initialize();
    });

    it('should clean up resources on destroy', () => {
      const stopSpy = jest.spyOn(schemaManager, 'stopChangeDetection');
      
      schemaManager.destroy();
      
      expect(stopSpy).toHaveBeenCalled();
    });
  });
});