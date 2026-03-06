import { z } from 'zod';
import { CountryFormSchema } from '../../types/schema';

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
    
    if (field.autoFillSource) cleaned.autoFillSource = field.autoFillSource;
    if (field.options) cleaned.options = field.options;
    if (field.validation) cleaned.validation = field.validation;
    if (field.helpText) cleaned.helpText = field.helpText;
    if (field.portalFieldName) cleaned.portalFieldName = field.portalFieldName;
    if (field.portalScreenshot) cleaned.portalScreenshot = field.portalScreenshot;
    
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
    
    if (step.screenshotAsset) cleaned.screenshotAsset = step.screenshotAsset;
    if (step.tips) cleaned.tips = step.tips;
    
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
 * Validates a country form schema against the expected structure
 */
export function validateSchema(schema: unknown, countryCode: string): CountryFormSchema {
  try {
    const parsed = CountryFormSchemaValidator.parse(schema);
    return convertToStrictSchema(parsed);
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
 */
export function validateFieldIds(schema: CountryFormSchema): boolean {
  const allFieldIds = new Set<string>();

  for (const section of schema.sections) {
    for (const field of section.fields) {
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

  return true;
}

/**
 * Validates that submission guide references valid field IDs
 */
export function validateSubmissionGuideFields(schema: CountryFormSchema): boolean {
  const allFieldIds = new Set<string>();

  // Collect all field IDs
  for (const section of schema.sections) {
    for (const field of section.fields) {
      allFieldIds.add(field.id);
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
 */
export function validateSchemaCompletely(schema: CountryFormSchema): boolean {
  validateFieldIds(schema);
  validateSubmissionGuideFields(schema);
  return true;
}
