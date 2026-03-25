/**
 * Submission Testing Framework
 *
 * Provides mock-only testing capabilities for form submission workflows.
 * This service tests form validation, field mapping, and submission flows
 * WITHOUT ever submitting real data to government portals.
 */

import { FilledForm } from '../../forms/formEngine';
import { TripLeg } from '../../../types/trip';
import { CountryFormSchema } from '../../../types/schema';
import {
  MockSubmissionResult,
  SubmissionError,
  SubmissionTestConfig,
} from './types';
import {
  validateFieldFormat,
  getCriticalFieldsForCountry,
  generateMockConfirmationNumber,
  generateMockQrCode,
  testDataFormats,
} from './validationHelpers';

/**
 * Submission Testing Framework - Mock-only testing service
 *
 * Tests submission workflows without real government portal interaction.
 * All tests are performed against mock data and validation rules.
 */
export class SubmissionTester {
  private readonly config: SubmissionTestConfig;
  private readonly testResults: Map<string, MockSubmissionResult[]> = new Map();

  constructor(config: Partial<SubmissionTestConfig> = {}) {
    this.config = {
      enableFieldValidation: true,
      enableMappingValidation: true,
      enableRequiredFieldCheck: true,
      enableFormatValidation: true,
      simulateNetworkDelay: true,
      maxProcessingTimeMs: 30000,
      ...config
    };
  }

  /**
   * Performs a complete mock submission test
   */
  async testSubmission(
    _leg: TripLeg,
    filledForm: FilledForm,
    schema: CountryFormSchema
  ): Promise<MockSubmissionResult> {
    const startTime = Date.now();
    const submissionId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const result: MockSubmissionResult = {
      success: false,
      submissionId,
      errors: [],
      warnings: [],
      processingTimeMs: 0,
      testMetadata: {
        formValidationPassed: false,
        fieldMappingCorrect: false,
        requiredFieldsPresent: false,
        dataFormatValid: false,
      }
    };

    try {
      if (this.config.simulateNetworkDelay) {
        await this.simulateProcessingDelay();
      }

      if (this.config.enableFieldValidation) {
        const fieldValidationResult = await this.testFieldValidation(filledForm, schema);
        result.testMetadata.formValidationPassed = fieldValidationResult.passed;
        result.errors.push(...fieldValidationResult.errors);
        result.warnings.push(...fieldValidationResult.warnings);
      }

      if (this.config.enableMappingValidation) {
        const mappingResult = await this.testFieldMapping(filledForm, schema);
        result.testMetadata.fieldMappingCorrect = mappingResult.passed;
        result.errors.push(...mappingResult.errors);
        result.warnings.push(...mappingResult.warnings);
      }

      if (this.config.enableRequiredFieldCheck) {
        const requiredFieldsResult = await this.testRequiredFields(filledForm, schema);
        result.testMetadata.requiredFieldsPresent = requiredFieldsResult.passed;
        result.errors.push(...requiredFieldsResult.errors);
      }

      if (this.config.enableFormatValidation) {
        const formatResult = testDataFormats(filledForm.sections);
        result.testMetadata.dataFormatValid = formatResult.passed;
        result.errors.push(...formatResult.errors);
        result.warnings.push(...formatResult.warnings);
      }

      if (result.errors.length === 0) {
        result.success = true;
        result.confirmationNumber = generateMockConfirmationNumber(schema.countryCode);
        result.qrCode = generateMockQrCode(result.confirmationNumber);
      }

    } catch (error) {
      result.errors.push({
        fieldId: 'system',
        errorType: 'validation_failed',
        message: `Test execution error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    result.processingTimeMs = Date.now() - startTime;
    this.addTestResult(schema.countryCode, result);

    return result;
  }

  /**
   * Tests field validation against schema rules
   */
  private async testFieldValidation(
    filledForm: FilledForm,
    _schema: CountryFormSchema
  ): Promise<{
    passed: boolean;
    errors: SubmissionError[];
    warnings: string[];
  }> {
    const errors: SubmissionError[] = [];
    const warnings: string[] = [];

    for (const section of filledForm.sections) {
      for (const field of section.fields) {
        if (field.required && (!field.currentValue || String(field.currentValue).trim() === '')) {
          errors.push({
            fieldId: field.id,
            errorType: 'required_missing',
            message: `Required field '${field.label}' is missing`,
            suggestion: 'Please provide a value for this required field'
          });
        }

        if (field.currentValue && field.validation) {
          const formatValid = validateFieldFormat(String(field.currentValue), field.validation);
          if (!formatValid.isValid) {
            const errorEntry: SubmissionError = {
              fieldId: field.id,
              errorType: 'invalid_format',
              message: `Invalid format for '${field.label}': ${formatValid.message}`,
            };
            if (formatValid.suggestion) {
              errorEntry.suggestion = formatValid.suggestion;
            }
            errors.push(errorEntry);
          }
        }

        if (field.countrySpecific && (!field.currentValue || String(field.currentValue).trim() === '')) {
          warnings.push(`Country-specific field '${field.label}' may require manual input`);
        }
      }
    }

    return { passed: errors.length === 0, errors, warnings };
  }

  /**
   * Tests field mapping accuracy
   */
  private async testFieldMapping(
    filledForm: FilledForm,
    schema: CountryFormSchema
  ): Promise<{
    passed: boolean;
    errors: SubmissionError[];
    warnings: string[];
  }> {
    const errors: SubmissionError[] = [];
    const warnings: string[] = [];

    const filledFieldIds = new Set();
    filledForm.sections.forEach(section => {
      section.fields.forEach(field => filledFieldIds.add(field.id));
    });

    schema.sections.forEach(schemaSection => {
      schemaSection.fields.forEach(schemaField => {
        if (!filledFieldIds.has(schemaField.id)) {
          if (schemaField.required) {
            errors.push({
              fieldId: schemaField.id,
              errorType: 'mapping_error',
              message: `Required schema field '${schemaField.id}' not found in filled form`,
              suggestion: 'Check field mapping configuration'
            });
          } else {
            warnings.push(`Optional schema field '${schemaField.id}' not mapped`);
          }
        }
      });
    });

    const schemaFieldIds = new Set();
    schema.sections.forEach(section => {
      section.fields.forEach(field => schemaFieldIds.add(field.id));
    });

    filledForm.sections.forEach(section => {
      section.fields.forEach(field => {
        if (!schemaFieldIds.has(field.id)) {
          warnings.push(`Form field '${field.id}' not found in current schema - may indicate schema version mismatch`);
        }
      });
    });

    return { passed: errors.length === 0, errors, warnings };
  }

  /**
   * Tests that all required fields are present and filled
   */
  private async testRequiredFields(
    filledForm: FilledForm,
    schema: CountryFormSchema
  ): Promise<{
    passed: boolean;
    errors: SubmissionError[];
  }> {
    const errors: SubmissionError[] = [];

    if (filledForm.stats.completionPercentage < 100) {
      const missingFields = filledForm.stats.totalFields - filledForm.stats.autoFilled - filledForm.stats.userFilled;
      errors.push({
        fieldId: 'form_completion',
        errorType: 'required_missing',
        message: `Form incomplete: ${missingFields} fields remaining`,
        suggestion: 'Complete all required fields before submission'
      });
    }

    const criticalFields = getCriticalFieldsForCountry(schema.countryCode);
    for (const fieldId of criticalFields) {
      const fieldFound = filledForm.sections.some(section =>
        section.fields.some(field => field.id === fieldId && field.currentValue)
      );

      if (!fieldFound) {
        errors.push({
          fieldId: fieldId,
          errorType: 'required_missing',
          message: `Critical field '${fieldId}' is missing for ${schema.countryCode}`,
          suggestion: `This field is required for ${schema.countryName} submissions`
        });
      }
    }

    return { passed: errors.length === 0, errors };
  }

  /**
   * Simulates processing delay for realistic testing
   */
  private async simulateProcessingDelay(): Promise<void> {
    const delay = Math.floor(Math.random() * 2000) + 500;
    await new Promise<void>(resolve => setTimeout(resolve, delay));
  }

  /**
   * Adds test result to history
   */
  private addTestResult(countryCode: string, result: MockSubmissionResult): void {
    if (!this.testResults.has(countryCode)) {
      this.testResults.set(countryCode, []);
    }

    const results = this.testResults.get(countryCode)!;
    results.push(result);

    if (results.length > 50) {
      results.shift();
    }
  }

  /**
   * Gets test results history for a country
   */
  getTestResults(countryCode: string): MockSubmissionResult[] {
    return this.testResults.get(countryCode) || [];
  }

  /**
   * Gets test success rate for a country
   */
  getTestSuccessRate(countryCode: string): number {
    const results = this.getTestResults(countryCode);
    if (results.length === 0) return 0;

    const successful = results.filter(r => r.success).length;
    return (successful / results.length) * 100;
  }

  /**
   * Gets overall test summary
   */
  getTestSummary(): {
    totalTests: number;
    successfulTests: number;
    failedTests: number;
    averageProcessingTime: number;
    countriesTested: string[];
  } {
    let totalTests = 0;
    let successfulTests = 0;
    let totalProcessingTime = 0;
    const countriesTested = Array.from(this.testResults.keys());

    for (const results of this.testResults.values()) {
      for (const result of results) {
        totalTests++;
        totalProcessingTime += result.processingTimeMs;
        if (result.success) {
          successfulTests++;
        }
      }
    }

    return {
      totalTests,
      successfulTests,
      failedTests: totalTests - successfulTests,
      averageProcessingTime: totalTests > 0 ? totalProcessingTime / totalTests : 0,
      countriesTested
    };
  }

  /**
   * Clears test results for testing purposes
   */
  clearTestResults(): void {
    this.testResults.clear();
  }
}

/**
 * Default instance for app-wide use
 */
export const submissionTester = new SubmissionTester();
