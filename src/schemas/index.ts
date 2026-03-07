import { CountryFormSchema } from '../types/schema';

// Import the JSON schemas
import JPN from './JPN.json';
import MYS from './MYS.json';
import SGP from './SGP.json';
import THA from './THA.json';
import VNM from './VNM.json';
import GBR from './GBR.json';
import USA from './USA.json';
import CAN from './CAN.json';

// Type the imported schemas
const japanSchema = JPN as CountryFormSchema;
const malaysiaSchema = MYS as CountryFormSchema;
const singaporeSchema = SGP as CountryFormSchema;
const thailandSchema = THA as CountryFormSchema;
const vietnamSchema = VNM as CountryFormSchema;
const unitedKingdomSchema = GBR as CountryFormSchema;
const unitedStatesSchema = USA as CountryFormSchema;
const canadaSchema = CAN as CountryFormSchema;

// Schema registry
export const SCHEMAS = {
  JPN: japanSchema,
  MYS: malaysiaSchema,
  SGP: singaporeSchema,
  THA: thailandSchema,
  VNM: vietnamSchema,
  GBR: unitedKingdomSchema,
  USA: unitedStatesSchema,
  CAN: canadaSchema,
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
