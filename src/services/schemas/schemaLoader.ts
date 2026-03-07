import { z } from 'zod';
import { CountryFormSchema } from '../../types/schema';

// Schema parsing cache to avoid re-validation
const schemaCache = new Map<string, { schema: CountryFormSchema; timestamp: number }>();
const SCHEMA_CACHE_TTL = 10 * 60 * 1000; // 10 minutes - schemas change infrequently

// Automatic cache cleanup interval
let schemaCacheCleanupInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Initializes automatic cache cleanup timer
 */
function initializeSchemaCacheCleanup(): void {
  if (!schemaCacheCleanupInterval) {
    schemaCacheCleanupInterval = setInterval(clearExpiredSchemaCache, SCHEMA_CACHE_TTL);
  }
}

/**
 * Stops automatic cache cleanup timer
 */
function stopSchemaCacheCleanup(): void {
  if (schemaCacheCleanupInterval) {
    clearInterval(schemaCacheCleanupInterval);
    schemaCacheCleanupInterval = null;
  }
}

// Initialize cleanup on module load
initializeSchemaCacheCleanup();

// Zod schema for validation
const FormFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(['text', 'date', 'select', 'boolean', 'number', 'textarea']),
  required: z.boolean(),
  autoFillSource: z.string().optional(),
  countrySpecific: z.boolean(),
  options: z.array(z.object({
    value: z.string(),
    label: z.string(),
  })).optional(),
  validation: z.object({
    pattern: z.string().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
  }).optional(),
  helpText: z.string().optional(),
  portalFieldName: z.string().optional(),
  portalScreenshot: z.string().optional(),
}).strict();

const FormSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  fields: z.array(FormFieldSchema),
});

const SubmissionStepSchema = z.object({
  order: z.number(),
  title: z.string(),
  description: z.string(),
  screenshotAsset: z.string().optional(),
  fieldsOnThisScreen: z.array(z.string()),
  tips: z.array(z.string()).optional(),
});

const CountryFormSchemaValidator = z.object({
  countryCode: z.string(),
  countryName: z.string(),
  schemaVersion: z.string(),
  lastUpdated: z.string(),
  portalUrl: z.string().url(),
  portalName: z.string(),
  submission: z.object({
    earliestBeforeArrival: z.string(),
    latestBeforeArrival: z.string(),
    recommended: z.string(),
  }),
  sections: z.array(FormSectionSchema),
  submissionGuide: z.array(SubmissionStepSchema),
});

export class SchemaValidationError extends Error {
  constructor(
    message: string,
    public readonly countryCode: string,
    public readonly validationErrors: z.ZodError
  ) {
    super(message);
    this.name = 'SchemaValidationError';
  }
}

/**
 * Converts a Zod-parsed schema to our strict TypeScript type
 */
function convertToStrictSchema(parsed: any): CountryFormSchema {
  // Handle optional fields that might be undefined
  const cleanField = (field: any) => {
    const cleaned: any = {
      id: field.id,
      label: field.label,
      type: field.type,
      required: field.required,
      countrySpecific: field.countrySpecific,
    };

    if (field.autoFillSource) {cleaned.autoFillSource = field.autoFillSource;}
    if (field.options) {cleaned.options = field.options;}
    if (field.validation) {cleaned.validation = field.validation;}
    if (field.helpText) {cleaned.helpText = field.helpText;}
    if (field.portalFieldName) {cleaned.portalFieldName = field.portalFieldName;}
    if (field.portalScreenshot) {cleaned.portalScreenshot = field.portalScreenshot;}

    return cleaned;
  };

  const cleanSection = (section: any) => ({
    id: section.id,
    title: section.title,
    fields: section.fields.map(cleanField),
  });

  const cleanStep = (step: any) => {
    const cleaned: any = {
      order: step.order,
      title: step.title,
      description: step.description,
      fieldsOnThisScreen: step.fieldsOnThisScreen,
    };

    if (step.screenshotAsset) {cleaned.screenshotAsset = step.screenshotAsset;}
    if (step.tips) {cleaned.tips = step.tips;}

    return cleaned;
  };

  return {
    countryCode: parsed.countryCode,
    countryName: parsed.countryName,
    schemaVersion: parsed.schemaVersion,
    lastUpdated: parsed.lastUpdated,
    portalUrl: parsed.portalUrl,
    portalName: parsed.portalName,
    submission: parsed.submission,
    sections: parsed.sections.map(cleanSection),
    submissionGuide: parsed.submissionGuide.map(cleanStep),
  };
}

/**
 * Creates a simple hash of a string to avoid storing large data in cache keys
 */
function createSimpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generates a secure cache key for schema validation based on content and country code
 */
function generateSchemaCacheKey(schema: unknown, countryCode: string): string {
  // Safely hash schema content to prevent DoS attacks
  const schemaStr = JSON.stringify(schema);
  // Limit schema size to prevent DoS attacks while allowing legitimate schemas
  if (schemaStr.length > 500000) { // 500KB limit for schemas
    throw new Error('Schema too large for caching');
  }
  
  const schemaHash = createSimpleHash(schemaStr);
  return `${countryCode}:${schemaHash}`;
}

/**
 * Validates a country form schema against the expected structure with caching
 */
export function validateSchema(schema: unknown, countryCode: string): CountryFormSchema {
  // Check cache first
  const cacheKey = generateSchemaCacheKey(schema, countryCode);
  const cached = schemaCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < SCHEMA_CACHE_TTL) {
    return cached.schema;
  }
  
  try {
    const parsed = CountryFormSchemaValidator.parse(schema);
    const result = convertToStrictSchema(parsed);
    
    // Cache the validated schema
    schemaCache.set(cacheKey, {
      schema: result,
      timestamp: Date.now(),
    });
    
    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new SchemaValidationError(
        `Invalid schema for country ${countryCode}`,
        countryCode,
        error
      );
    }
    throw error;
  }
}

/**
 * Loads and validates a schema from a JSON object
 */
export function loadSchema(schemaData: unknown, countryCode: string): CountryFormSchema {
  return validateSchema(schemaData, countryCode);
}

/**
 * Validates all fields in a schema have unique IDs within their sections
 * Uses optimized Set operations for better performance
 */
export function validateFieldIds(schema: CountryFormSchema): boolean {
  const allFieldIds = new Set<string>();
  let totalFields = 0;

  for (const section of schema.sections) {
    for (const field of section.fields) {
      totalFields++;
      if (allFieldIds.has(field.id)) {
        throw new SchemaValidationError(
          `Duplicate field ID '${field.id}' found in schema for ${schema.countryCode}`,
          schema.countryCode,
          new z.ZodError([])
        );
      }
      allFieldIds.add(field.id);
    }
  }

  // Verify Set size matches field count for data integrity
  if (allFieldIds.size !== totalFields) {
    throw new SchemaValidationError(
      `Field ID validation failed: expected ${totalFields} unique IDs, found ${allFieldIds.size}`,
      schema.countryCode,
      new z.ZodError([])
    );
  }

  return true;
}

/**
 * Validates that submission guide references valid field IDs
 * Optimized to reuse field ID set when called after validateFieldIds
 */
export function validateSubmissionGuideFields(
  schema: CountryFormSchema, 
  knownFieldIds?: Set<string>
): boolean {
  let allFieldIds = knownFieldIds;
  
  if (!allFieldIds) {
    // Collect all field IDs if not provided
    allFieldIds = new Set<string>();
    for (const section of schema.sections) {
      for (const field of section.fields) {
        allFieldIds.add(field.id);
      }
    }
  }

  // Check submission guide field references
  for (const step of schema.submissionGuide) {
    for (const fieldId of step.fieldsOnThisScreen) {
      if (!allFieldIds.has(fieldId)) {
        throw new SchemaValidationError(
          `Submission guide step '${step.title}' references unknown field ID '${fieldId}' in schema for ${schema.countryCode}`,
          schema.countryCode,
          new z.ZodError([])
        );
      }
    }
  }

  return true;
}

/**
 * Performs comprehensive validation of a schema
 * Optimized to reuse field ID collection for better performance
 */
export function validateSchemaCompletely(schema: CountryFormSchema): boolean {
  // Collect field IDs once and reuse for both validations
  const allFieldIds = new Set<string>();
  let totalFields = 0;

  for (const section of schema.sections) {
    for (const field of section.fields) {
      totalFields++;
      if (allFieldIds.has(field.id)) {
        throw new SchemaValidationError(
          `Duplicate field ID '${field.id}' found in schema for ${schema.countryCode}`,
          schema.countryCode,
          new z.ZodError([])
        );
      }
      allFieldIds.add(field.id);
    }
  }

  // Verify Set size matches field count
  if (allFieldIds.size !== totalFields) {
    throw new SchemaValidationError(
      `Field ID validation failed: expected ${totalFields} unique IDs, found ${allFieldIds.size}`,
      schema.countryCode,
      new z.ZodError([])
    );
  }

  // Validate submission guide with the already-collected field IDs
  validateSubmissionGuideFields(schema, allFieldIds);
  
  return true;
}

/**
 * Clears expired entries from the schema cache
 */
export function clearExpiredSchemaCache(): void {
  const now = Date.now();
  for (const [key, entry] of schemaCache.entries()) {
    if (now - entry.timestamp >= SCHEMA_CACHE_TTL) {
      schemaCache.delete(key);
    }
  }
}

/**
 * Clears all schema cache entries
 */
export function clearSchemaCache(): void {
  schemaCache.clear();
  // Re-initialize cleanup timer after clearing
  stopSchemaCacheCleanup();
  initializeSchemaCacheCleanup();
}

/**
 * Gets schema cache statistics
 */
export function getSchemaCacheStats(): { size: number } {
  return { size: schemaCache.size };
}
