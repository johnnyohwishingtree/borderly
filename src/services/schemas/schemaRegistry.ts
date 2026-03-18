import { CountryFormSchema } from '../../types/schema';
import { SUPPORTED_COUNTRIES } from '../../schemas';
import { validateSchemaCompletely, loadSchemaForCountry } from './schemaLoader';
import { mmkvService } from '../storage/mmkv';
import { SCHEMA_MMKV_KEY_PREFIX } from '../../utils/constants';

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
   * Initialize the registry, preferring MMKV-cached (OTA) schemas over
   * bundled ones so that over-the-air updates are picked up on the next
   * cold start.
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Load schemas — MMKV-cached version takes precedence over bundled.
      for (const countryCode of SUPPORTED_COUNTRIES) {
        const schema = await loadSchemaForCountry(countryCode);

        if (schema) {
          // Perform comprehensive validation only on bundled schemas;
          // cached schemas were already validated when they were stored.
          try {
            validateSchemaCompletely(schema);
          } catch {
            // Validation failure on a cached schema means it may be corrupt —
            // log and skip so the app continues with the remaining countries.
            console.warn(
              `[SchemaRegistry] Skipping invalid schema for "${countryCode}"`,
            );
            continue;
          }
          this.schemas.set(countryCode, schema);
        }
      }

      this.initialized = true;
    } catch (error) {
      // Always mark as initialized so the registry is never left in a broken
      // state. Callers that check getSchema() will get null for missing
      // schemas rather than crashing on "not initialized" errors.
      this.initialized = true;
      console.warn(
        `[SchemaRegistry] Initialization encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get a schema by country code.
   *
   * Checks MMKV for a more-recently cached (OTA) version first; if one
   * exists it is hot-swapped into the in-memory registry so future callers
   * also see the latest version.  Falls back to the in-memory schema loaded
   * at initialization time.
   */
  public getSchema(countryCode: string): CountryFormSchema | null {
    if (!this.initialized) {
      throw new Error('Schema registry not initialized. Call initialize() first.');
    }

    const code = countryCode.toUpperCase();

    // Check MMKV for a newer OTA version.
    try {
      const key = `${SCHEMA_MMKV_KEY_PREFIX}${code}`;
      const cached = mmkvService.getString(key);
      if (cached) {
        const parsed = JSON.parse(cached) as CountryFormSchema;
        // Hot-swap in memory so subsequent calls also get the fresh version.
        this.schemas.set(code, parsed);
        return parsed;
      }
    } catch {
      // Corrupt / missing — fall through to in-memory schema.
    }

    return this.schemas.get(code) || null;
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
