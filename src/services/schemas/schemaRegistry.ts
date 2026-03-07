import { CountryFormSchema } from '../../types/schema';
import { SUPPORTED_COUNTRIES, getSchemaByCountryCode as loadSchemaByCode } from '../../schemas';
import { validateSchemaCompletely } from './schemaLoader';

export interface SchemaMetadata {
  countryCode: string;
  countryName: string;
  portalName: string;
  portalUrl: string;
  schemaVersion: string;
  lastUpdated: string;
}

export class SchemaRegistry {
  private static instance: SchemaRegistry;
  private schemas: Map<string, CountryFormSchema> = new Map();
  private initialized = false;

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): SchemaRegistry {
    if (!SchemaRegistry.instance) {
      SchemaRegistry.instance = new SchemaRegistry();
    }
    return SchemaRegistry.instance;
  }

  /**
   * Initialize the registry with all bundled schemas
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Load and validate all bundled schemas
      for (const countryCode of SUPPORTED_COUNTRIES) {
        const validatedSchema = await loadSchemaByCode(countryCode);
        
        if (validatedSchema) {
          // Perform comprehensive validation
          validateSchemaCompletely(validatedSchema);
          this.schemas.set(countryCode, validatedSchema);
        }
      }

      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize schema registry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a schema by country code
   */
  public getSchema(countryCode: string): CountryFormSchema | null {
    if (!this.initialized) {
      throw new Error('Schema registry not initialized. Call initialize() first.');
    }

    return this.schemas.get(countryCode.toUpperCase()) || null;
  }

  /**
   * Get all available schemas
   */
  public getAllSchemas(): CountryFormSchema[] {
    if (!this.initialized) {
      throw new Error('Schema registry not initialized. Call initialize() first.');
    }

    return Array.from(this.schemas.values());
  }

  /**
   * Get metadata for all schemas (without full schema details)
   */
  public getSchemaMetadata(): SchemaMetadata[] {
    if (!this.initialized) {
      throw new Error('Schema registry not initialized. Call initialize() first.');
    }

    return Array.from(this.schemas.values()).map(schema => ({
      countryCode: schema.countryCode,
      countryName: schema.countryName,
      portalName: schema.portalName,
      portalUrl: schema.portalUrl,
      schemaVersion: schema.schemaVersion,
      lastUpdated: schema.lastUpdated,
    }));
  }

  /**
   * Get supported country codes
   */
  public getSupportedCountries(): string[] {
    if (!this.initialized) {
      throw new Error('Schema registry not initialized. Call initialize() first.');
    }

    return Array.from(this.schemas.keys());
  }

  /**
   * Check if a country is supported
   */
  public isCountrySupported(countryCode: string): boolean {
    if (!this.initialized) {
      throw new Error('Schema registry not initialized. Call initialize() first.');
    }

    return this.schemas.has(countryCode.toUpperCase());
  }

  /**
   * Get the latest schema version for a country
   */
  public getSchemaVersion(countryCode: string): string | null {
    const schema = this.getSchema(countryCode);
    return schema?.schemaVersion || null;
  }

  /**
   * Get portal information for a country
   */
  public getPortalInfo(countryCode: string): { name: string; url: string } | null {
    const schema = this.getSchema(countryCode);
    if (!schema) {return null;}

    return {
      name: schema.portalName,
      url: schema.portalUrl,
    };
  }

  /**
   * Get submission timing requirements for a country
   */
  public getSubmissionTiming(countryCode: string) {
    const schema = this.getSchema(countryCode);
    return schema?.submission || null;
  }

  /**
   * Find schemas that have been updated since a given date
   */
  public getUpdatedSchemasSince(since: Date): CountryFormSchema[] {
    if (!this.initialized) {
      throw new Error('Schema registry not initialized. Call initialize() first.');
    }

    return Array.from(this.schemas.values()).filter(schema => {
      const lastUpdated = new Date(schema.lastUpdated);
      return lastUpdated > since;
    });
  }

  /**
   * Get statistics about the schema registry
   */
  public getStats() {
    if (!this.initialized) {
      throw new Error('Schema registry not initialized. Call initialize() first.');
    }

    let totalFields = 0;
    let totalSections = 0;
    let totalSteps = 0;

    for (const schema of this.schemas.values()) {
      totalSections += schema.sections.length;
      totalSteps += schema.submissionGuide.length;

      for (const section of schema.sections) {
        totalFields += section.fields.length;
      }
    }

    return {
      totalCountries: this.schemas.size,
      totalSections,
      totalFields,
      totalSubmissionSteps: totalSteps,
      averageFieldsPerCountry: Math.round(totalFields / this.schemas.size),
      averageStepsPerCountry: Math.round(totalSteps / this.schemas.size),
    };
  }

  /**
   * Reset the registry (useful for testing)
   */
  public reset(): void {
    this.schemas.clear();
    this.initialized = false;
  }
}

// Export convenience functions that use the singleton instance
export const schemaRegistry = SchemaRegistry.getInstance();

export async function initializeSchemaRegistry(): Promise<void> {
  return schemaRegistry.initialize();
}

export function getSchemaByCountryCode(countryCode: string): CountryFormSchema | null {
  return schemaRegistry.getSchema(countryCode);
}

export function getAllCountrySchemas(): CountryFormSchema[] {
  return schemaRegistry.getAllSchemas();
}

export function getSupportedCountryCodes(): string[] {
  return schemaRegistry.getSupportedCountries();
}

export function isCountrySupported(countryCode: string): boolean {
  return schemaRegistry.isCountrySupported(countryCode);
}
