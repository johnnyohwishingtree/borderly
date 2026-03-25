/**
 * Schema Validation Service
 *
 * Validates country form schemas for correctness, completeness,
 * and consistency. Delegates sub-section validation to subValidators.
 */

import { CountryFormSchema, FormField, SchemaValidationResult } from '../../../types/schema';
import {
  REQUIRED_SCHEMA_FIELDS,
  SEMVER_REGEX,
  DURATION_REGEX,
} from './validationRules';
import {
  validateSections,
  validateSubmissionGuide,
  validateMetadata,
  validateChangeDetection,
  validatePortalFlow,
  validateAutomation,
  validateFields,
} from './subValidators';

class SchemaValidator {
  /**
   * Validate a complete country form schema
   */
  async validateSchema(schema: CountryFormSchema): Promise<SchemaValidationResult> {
    const result: SchemaValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    try {
      this.validateRequiredFields(schema, result);
      this.validateCountryCode(schema, result);
      this.validateSchemaVersion(schema, result);
      this.validateTimestamps(schema, result);
      this.validateSubmissionTiming(schema, result);

      validateSections(schema.sections, result, this.isValidDotNotation);
      validateSubmissionGuide(schema.submissionGuide, result, this.isSequential);

      if (schema.metadata) {
        validateMetadata(schema.metadata, result);
      }

      if (schema.changeDetection) {
        validateChangeDetection(schema.changeDetection, result);
      }

      if (schema.portalFlow) {
        validatePortalFlow(schema.portalFlow, result);
      }

      if (schema.automation) {
        validateAutomation(schema.automation, result);
      }

      this.validateCrossReferences(schema, result);

    } catch (error) {
      result.errors.push({
        path: 'schema',
        message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      });
    }

    result.valid = result.errors.filter(e => e.severity === 'error').length === 0;
    return result;
  }

  /**
   * Validate required top-level fields
   */
  private validateRequiredFields(schema: CountryFormSchema, result: SchemaValidationResult): void {
    for (const field of REQUIRED_SCHEMA_FIELDS) {
      if (!(field in schema) || schema[field as keyof CountryFormSchema] === undefined) {
        result.errors.push({
          path: field,
          message: `Required field '${field}' is missing`,
          severity: 'error',
        });
      }
    }
  }

  /**
   * Validate country code format (ISO 3166-1 alpha-3)
   */
  private validateCountryCode(schema: CountryFormSchema, result: SchemaValidationResult): void {
    if (schema.countryCode) {
      if (!/^[A-Z]{3}$/.test(schema.countryCode)) {
        result.errors.push({
          path: 'countryCode',
          message: 'Country code must be a 3-letter ISO 3166-1 alpha-3 code',
          severity: 'error',
        });
      }
    }
  }

  /**
   * Validate schema version (semver format)
   */
  private validateSchemaVersion(schema: CountryFormSchema, result: SchemaValidationResult): void {
    if (schema.schemaVersion) {
      if (!SEMVER_REGEX.test(schema.schemaVersion)) {
        result.errors.push({
          path: 'schemaVersion',
          message: 'Schema version must be in semantic versioning format (e.g., 1.0.0)',
          severity: 'error',
        });
      }
    }
  }

  /**
   * Validate ISO 8601 timestamps
   */
  private validateTimestamps(schema: CountryFormSchema, result: SchemaValidationResult): void {
    const timestampFields = ['lastUpdated'];

    for (const field of timestampFields) {
      const value = schema[field as keyof CountryFormSchema] as string;
      if (value && !this.isValidISO8601(value)) {
        result.errors.push({
          path: field,
          message: `${field} must be a valid ISO 8601 timestamp`,
          severity: 'error',
        });
      }
    }

    if (schema.metadata) {
      if (schema.metadata.lastVerified && !this.isValidISO8601(schema.metadata.lastVerified)) {
        result.errors.push({
          path: 'metadata.lastVerified',
          message: 'lastVerified must be a valid ISO 8601 timestamp',
          severity: 'error',
        });
      }
    }
  }

  /**
   * Validate submission timing configuration
   */
  private validateSubmissionTiming(schema: CountryFormSchema, result: SchemaValidationResult): void {
    if (!schema.submission) return;

    const timingFields = ['earliestBeforeArrival', 'latestBeforeArrival', 'recommended'];
    for (const field of timingFields) {
      const value = schema.submission[field as keyof typeof schema.submission] as string;
      if (value && !DURATION_REGEX.test(value)) {
        result.errors.push({
          path: `submission.${field}`,
          message: `${field} must be in format like '14d', '72h', '1w'`,
          severity: 'error',
        });
      }
    }

    if (schema.submission.processingTime && !DURATION_REGEX.test(schema.submission.processingTime)) {
      result.errors.push({
        path: 'submission.processingTime',
        message: 'processingTime must be in format like "24h", "3d"',
        severity: 'error',
      });
    }
  }

  /**
   * Cross-validation checks
   */
  private validateCrossReferences(schema: CountryFormSchema, result: SchemaValidationResult): void {
    const allFieldIds = new Set<string>();
    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        allFieldIds.add(field.id);
      });
    });

    schema.submissionGuide.forEach((step, stepIndex) => {
      step.fieldsOnThisScreen.forEach((fieldId, fieldIndex) => {
        if (!allFieldIds.has(fieldId)) {
          result.warnings.push({
            path: `submissionGuide[${stepIndex}].fieldsOnThisScreen[${fieldIndex}]`,
            message: `Referenced field ID '${fieldId}' not found in schema`,
          });
        }
      });
    });

    schema.sections.forEach((section, sectionIndex) => {
      section.fields.forEach((field, fieldIndex) => {
        if (field.automation?.dependencies) {
          field.automation.dependencies.forEach((depId, depIndex) => {
            if (!allFieldIds.has(depId)) {
              result.warnings.push({
                path: `sections[${sectionIndex}].fields[${fieldIndex}].automation.dependencies[${depIndex}]`,
                message: `Referenced dependency field ID '${depId}' not found in schema`,
              });
            }
          });
        }
      });
    });
  }

  /**
   * Helper: Check if string is valid ISO 8601 timestamp
   */
  private isValidISO8601(timestamp: string): boolean {
    try {
      const date = new Date(timestamp);
      return date.toISOString() === timestamp;
    } catch {
      return false;
    }
  }

  /**
   * Helper: Check if string uses valid dot notation
   */
  private isValidDotNotation(path: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/.test(path);
  }

  /**
   * Helper: Check if array of numbers is sequential
   */
  private isSequential(numbers: number[]): boolean {
    for (let i = 1; i < numbers.length; i++) {
      if (numbers[i] !== numbers[i - 1] + 1) {
        return false;
      }
    }
    return true;
  }

  /**
   * Validate a single field
   */
  async validateField(field: FormField): Promise<SchemaValidationResult> {
    const result: SchemaValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    validateFields([field], 'field', result, this.isValidDotNotation);
    result.valid = result.errors.filter(e => e.severity === 'error').length === 0;

    return result;
  }
}

export const schemaValidator = new SchemaValidator();
