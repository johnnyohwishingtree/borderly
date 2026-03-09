import { MMKV } from 'react-native-mmkv';
import {
  CountryFormSchema,
  SchemaRegistry
} from '../../types/schema';
import { SUPPORTED_COUNTRY_CODES } from '../../constants/countries';
import { schemaValidator } from './schemaValidator';
import { schemaMigrator } from './schemaMigrator';

class SchemaManager {
  private storage: MMKV;
  private registry: SchemaRegistry | null = null;
  private changeDetectionInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.storage = new MMKV({ id: 'schema_storage' });
  }

  /**
   * Initialize the schema manager with bundled schemas
   */
  async initialize(): Promise<void> {
    try {
      // Load bundled schemas dynamically from supported countries
      const schemaMap: Record<string, CountryFormSchema> = {};
      const schemaLoaders: Record<string, () => CountryFormSchema> = {
        JPN: () => require('../../schemas/JPN.json') as CountryFormSchema,
        MYS: () => require('../../schemas/MYS.json') as CountryFormSchema,
        SGP: () => require('../../schemas/SGP.json') as CountryFormSchema,
        THA: () => require('../../schemas/THA.json') as CountryFormSchema,
        VNM: () => require('../../schemas/VNM.json') as CountryFormSchema,
        GBR: () => require('../../schemas/GBR.json') as CountryFormSchema,
        USA: () => require('../../schemas/USA.json') as CountryFormSchema,
        CAN: () => require('../../schemas/CAN.json') as CountryFormSchema,
      };

      for (const code of SUPPORTED_COUNTRY_CODES) {
        const loader = schemaLoaders[code];
        if (loader) {
          schemaMap[code] = loader();
        }
      }

      // Create registry if it doesn't exist
      if (!this.storage.getString('registry')) {
        const initialRegistry: SchemaRegistry = {
          schemas: schemaMap,
          migrations: {},
          metadata: {
            lastUpdated: new Date().toISOString(),
            version: '1.0.0',
            supportedCountries: [...SUPPORTED_COUNTRY_CODES],
          },
        };
        
        this.storage.set('registry', JSON.stringify(initialRegistry));
      }

      this.registry = JSON.parse(this.storage.getString('registry')!);
      
      // Start change detection monitoring
      this.startChangeDetection();
    } catch (error) {
      console.error('Failed to initialize schema manager:', error);
      throw new Error('Schema manager initialization failed');
    }
  }

  /**
   * Get schema for a country
   */
  getSchema(countryCode: string): CountryFormSchema | null {
    if (!this.registry) {
      throw new Error('Schema manager not initialized');
    }

    const schema = this.registry.schemas[countryCode];
    if (!schema) {
      return null;
    }

    // Check if schema is deprecated or invalid
    if (schema.metadata?.implementationStatus === 'deprecated') {
      console.warn(`Schema for ${countryCode} is deprecated`);
      return null;
    }

    return schema;
  }

  /**
   * Get all supported country codes
   */
  getSupportedCountries(): string[] {
    if (!this.registry) {
      throw new Error('Schema manager not initialized');
    }

    return Object.keys(this.registry.schemas).filter(
      countryCode => {
        const schema = this.registry!.schemas[countryCode];
        return schema.metadata?.implementationStatus !== 'deprecated';
      }
    );
  }

  /**
   * Add or update a country schema
   */
  async updateSchema(countryCode: string, schema: CountryFormSchema): Promise<void> {
    if (!this.registry) {
      throw new Error('Schema manager not initialized');
    }

    // Validate schema
    const validationResult = await schemaValidator.validateSchema(schema);
    if (!validationResult.valid) {
      throw new Error(`Invalid schema: ${validationResult.errors.map(e => e.message).join(', ')}`);
    }

    // Apply migrations if needed
    const currentSchema = this.registry.schemas[countryCode];
    if (currentSchema) {
      const migrations = this.registry.migrations[countryCode] || [];
      schema = await schemaMigrator.applyMigrations(currentSchema, schema, migrations);
    }

    // Update registry
    this.registry.schemas[countryCode] = schema;
    this.registry.metadata.lastUpdated = new Date().toISOString();
    
    if (!this.registry.metadata.supportedCountries.includes(countryCode)) {
      this.registry.metadata.supportedCountries.push(countryCode);
    }

    // Persist to storage
    this.storage.set('registry', JSON.stringify(this.registry));

    console.log(`Schema for ${countryCode} updated successfully`);
  }

  /**
   * Remove a country schema
   */
  async removeSchema(countryCode: string): Promise<void> {
    if (!this.registry) {
      throw new Error('Schema manager not initialized');
    }

    if (!this.registry.schemas[countryCode]) {
      throw new Error(`Schema for ${countryCode} does not exist`);
    }

    // Mark as deprecated instead of deleting
    this.registry.schemas[countryCode].metadata = {
      ...this.registry.schemas[countryCode].metadata,
      implementationStatus: 'deprecated',
    };

    // Remove from supported countries
    this.registry.metadata.supportedCountries = this.registry.metadata.supportedCountries.filter(
      code => code !== countryCode
    );

    this.registry.metadata.lastUpdated = new Date().toISOString();
    this.storage.set('registry', JSON.stringify(this.registry));

    console.log(`Schema for ${countryCode} deprecated successfully`);
  }

  /**
   * Get schema version for a country
   */
  getSchemaVersion(countryCode: string): string | null {
    const schema = this.getSchema(countryCode);
    return schema?.schemaVersion || null;
  }

  /**
   * Check if schema needs update
   */
  needsUpdate(countryCode: string): boolean {
    const schema = this.getSchema(countryCode);
    if (!schema || !schema.metadata) {
      return false;
    }

    const lastVerified = new Date(schema.metadata.lastVerified);
    const now = new Date();
    const daysSinceVerified = Math.floor((now.getTime() - lastVerified.getTime()) / (1000 * 60 * 60 * 24));

    // Check based on maintenance frequency
    const frequencyMap = {
      weekly: 7,
      monthly: 30,
      quarterly: 90,
      annually: 365,
    };

    const updateInterval = frequencyMap[schema.metadata.maintenanceFrequency] || 30;
    return daysSinceVerified >= updateInterval;
  }

  /**
   * Get country schemas by priority
   */
  getSchemasByPriority(): CountryFormSchema[] {
    if (!this.registry) {
      throw new Error('Schema manager not initialized');
    }

    return Object.values(this.registry.schemas)
      .filter(schema => schema.metadata?.implementationStatus !== 'deprecated')
      .sort((a, b) => (a.metadata?.priority || 999) - (b.metadata?.priority || 999));
  }

  /**
   * Check for portal changes that might invalidate schema
   */
  async checkPortalChanges(countryCode: string): Promise<boolean> {
    const schema = this.getSchema(countryCode);
    if (!schema || !schema.changeDetection) {
      return false;
    }

    try {
      // In a real implementation, this would fetch the portal page
      // and compare against the stored checksum and monitored selectors
      // For now, we'll simulate this check
      
      console.log(`Checking portal changes for ${countryCode}...`);
      
      // Simulate change detection
      const hasChanges = Math.random() < 0.1; // 10% chance of changes
      
      if (hasChanges) {
        schema.changeDetection.lastChangeDetected = new Date().toISOString();
        await this.updateSchema(countryCode, schema);
        
        // Execute fallback actions
        schema.changeDetection.fallbackActions.forEach(action => {
          console.warn(`Portal change detected for ${countryCode}: ${action.message || 'Unknown change'}`);
        });
      }
      
      return hasChanges;
    } catch (error) {
      console.error(`Failed to check portal changes for ${countryCode}:`, error);
      return false;
    }
  }

  /**
   * Start monitoring for portal changes
   */
  private startChangeDetection(): void {
    if (this.changeDetectionInterval) {
      clearInterval(this.changeDetectionInterval);
    }

    // Check for changes every 6 hours
    this.changeDetectionInterval = setInterval(async () => {
      const countries = this.getSupportedCountries();
      
      for (const countryCode of countries) {
        try {
          await this.checkPortalChanges(countryCode);
        } catch (error) {
          console.error(`Change detection failed for ${countryCode}:`, error);
        }
      }
    }, 6 * 60 * 60 * 1000); // 6 hours
  }

  /**
   * Stop change detection monitoring
   */
  stopChangeDetection(): void {
    if (this.changeDetectionInterval) {
      clearInterval(this.changeDetectionInterval);
      this.changeDetectionInterval = null;
    }
  }

  /**
   * Get registry metadata
   */
  getRegistryMetadata() {
    if (!this.registry) {
      throw new Error('Schema manager not initialized');
    }
    return this.registry.metadata;
  }

  /**
   * Export all schemas (for backup/sync)
   */
  exportSchemas(): SchemaRegistry {
    if (!this.registry) {
      throw new Error('Schema manager not initialized');
    }
    return { ...this.registry };
  }

  /**
   * Import schemas (for restore/sync)
   */
  async importSchemas(registry: SchemaRegistry): Promise<void> {
    // Validate all schemas in the registry
    for (const [countryCode, schema] of Object.entries(registry.schemas)) {
      const validationResult = await schemaValidator.validateSchema(schema);
      if (!validationResult.valid) {
        throw new Error(`Invalid schema for ${countryCode}: ${validationResult.errors.map(e => e.message).join(', ')}`);
      }
    }

    this.registry = registry;
    this.storage.set('registry', JSON.stringify(registry));
    console.log('Schema registry imported successfully');
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopChangeDetection();
  }
}

export const schemaManager = new SchemaManager();