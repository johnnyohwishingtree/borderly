/**
 * Schema services barrel
 *
 * Exports all schema-related services so consumers can import from a single
 * stable path: `../../services/schemas` (or `@/services/schemas`).
 */

export { validateSchema, loadSchema, validateFieldIds, validateSubmissionGuideFields, validateSchemaCompletely, clearExpiredSchemaCache, clearSchemaCache, getSchemaCacheStats, SchemaValidationError } from './schemaLoader';

export { SchemaRegistry, schemaRegistry, initializeSchemaRegistry, getSchemaByCountryCode, getAllCountrySchemas, getSupportedCountryCodes, isCountrySupported } from './schemaRegistry';

export type { SchemaMetadata } from './schemaRegistry';

export { SchemaUpdateService, schemaUpdateService } from './schemaUpdateService';
export type { SchemaUpdateResult } from './schemaUpdateService';
