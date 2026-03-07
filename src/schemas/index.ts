import { CountryFormSchema } from '../types/schema';

// Schema cache for lazy-loaded schemas
const schemaCache = new Map<string, CountryFormSchema>();

// Define supported countries without loading schemas
export const SUPPORTED_COUNTRIES = ['JPN', 'MYS', 'SGP', 'THA', 'VNM', 'GBR', 'USA', 'CAN'] as const;

// Lazy schema loaders
const schemaLoaders = {
  JPN: () => import('./JPN.json').then(m => m.default as CountryFormSchema),
  MYS: () => import('./MYS.json').then(m => m.default as CountryFormSchema),
  SGP: () => import('./SGP.json').then(m => m.default as CountryFormSchema),
  THA: () => import('./THA.json').then(m => m.default as CountryFormSchema),
  VNM: () => import('./VNM.json').then(m => m.default as CountryFormSchema),
  GBR: () => import('./GBR.json').then(m => m.default as CountryFormSchema),
  USA: () => import('./USA.json').then(m => m.default as CountryFormSchema),
  CAN: () => import('./CAN.json').then(m => m.default as CountryFormSchema),
} as const;

// Get schema by country code (lazy loaded)
export async function getSchemaByCountryCode(countryCode: string): Promise<CountryFormSchema | null> {
  // Check cache first
  if (schemaCache.has(countryCode)) {
    return schemaCache.get(countryCode)!;
  }

  const loader = schemaLoaders[countryCode as keyof typeof schemaLoaders];
  if (!loader) {
    return null;
  }

  try {
    const schema = await loader();
    schemaCache.set(countryCode, schema);
    return schema;
  } catch (error) {
    console.error(`Failed to load schema for ${countryCode}:`, error);
    return null;
  }
}

// Get all schemas as an array (lazy loaded)
export async function getAllSchemas(): Promise<CountryFormSchema[]> {
  const schemas: CountryFormSchema[] = [];
  
  for (const countryCode of SUPPORTED_COUNTRIES) {
    const schema = await getSchemaByCountryCode(countryCode);
    if (schema) {
      schemas.push(schema);
    }
  }
  
  return schemas;
}

// Preload specific schemas (useful for trip creation)
export async function preloadSchemas(countryCodes: string[]): Promise<void> {
  const loadPromises = countryCodes.map(code => getSchemaByCountryCode(code));
  await Promise.all(loadPromises);
}

// Clear schema cache (useful for testing or memory management)
export function clearSchemaCache(): void {
  schemaCache.clear();
}

// Synchronous version for backwards compatibility (deprecated)
export function getSchemaByCountryCodeSync(countryCode: string): CountryFormSchema | null {
  console.warn('getSchemaByCountryCodeSync is deprecated. Use getSchemaByCountryCode instead.');
  return schemaCache.get(countryCode) || null;
}

// Get schema metadata (without full schema details)
export async function getSchemaMetadata() {
  const metadata = [];
  
  for (const countryCode of SUPPORTED_COUNTRIES) {
    const schema = await getSchemaByCountryCode(countryCode);
    if (schema) {
      metadata.push({
        countryCode: schema.countryCode,
        countryName: schema.countryName,
        portalName: schema.portalName,
        portalUrl: schema.portalUrl,
        schemaVersion: schema.schemaVersion,
        lastUpdated: schema.lastUpdated,
      });
    }
  }
  
  return metadata;
}

// For backwards compatibility, export the schema getter functions as default
export default {
  getSchemaByCountryCode,
  getAllSchemas,
  preloadSchemas,
  clearSchemaCache,
  getSchemaByCountryCodeSync,
  getSchemaMetadata,
  SUPPORTED_COUNTRIES,
};
