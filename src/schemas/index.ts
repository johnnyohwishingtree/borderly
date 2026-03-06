import { CountryFormSchema } from '../types/schema';

// Import the JSON schemas
import JPN from './JPN.json';
import MYS from './MYS.json';
import SGP from './SGP.json';

// Type the imported schemas
const japanSchema = JPN as CountryFormSchema;
const malaysiaSchema = MYS as CountryFormSchema;
const singaporeSchema = SGP as CountryFormSchema;

// Schema registry
export const SCHEMAS = {
  JPN: japanSchema,
  MYS: malaysiaSchema,
  SGP: singaporeSchema,
} as const;

// Available country codes
export const SUPPORTED_COUNTRIES = Object.keys(SCHEMAS) as Array<keyof typeof SCHEMAS>;

// Get schema by country code
export function getSchemaByCountryCode(countryCode: string): CountryFormSchema | null {
  const schema = SCHEMAS[countryCode as keyof typeof SCHEMAS];
  return schema || null;
}

// Get all schemas as an array
export function getAllSchemas(): CountryFormSchema[] {
  return Object.values(SCHEMAS);
}

// Get schema metadata (without full schema details)
export function getSchemaMetadata() {
  return SUPPORTED_COUNTRIES.map(countryCode => {
    const schema = SCHEMAS[countryCode];
    return {
      countryCode: schema.countryCode,
      countryName: schema.countryName,
      portalName: schema.portalName,
      portalUrl: schema.portalUrl,
      schemaVersion: schema.schemaVersion,
      lastUpdated: schema.lastUpdated,
    };
  });
}

export default SCHEMAS;
