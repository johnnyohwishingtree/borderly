/**
 * Submission Testing Framework
 * 
 * Provides mock-only testing capabilities for form submission workflows.
 * This service tests form validation, field mapping, and submission flows
 * WITHOUT ever submitting real data to government portals.
 */

import { FilledForm } from '../forms/formEngine';
import { TripLeg } from '../../types/trip';
import { CountryFormSchema } from '../../types/schema';

export interface MockSubmissionResult {
  success: boolean;
  submissionId: string;
  confirmationNumber?: string;
  qrCode?: string;
  errors: SubmissionError[];
  warnings: string[];
  processingTimeMs: number;
  testMetadata: {
    formValidationPassed: boolean;
    fieldMappingCorrect: boolean;
    requiredFieldsPresent: boolean;
    dataFormatValid: boolean;
  };
}

export interface SubmissionError {
  fieldId: string;
  errorType: 'required_missing' | 'invalid_format' | 'validation_failed' | 'mapping_error';
  message: string;
  suggestion?: string;
}

export interface SubmissionTestConfig {
  enableFieldValidation: boolean;
  enableMappingValidation: boolean;
  enableRequiredFieldCheck: boolean;
  enableFormatValidation: boolean;
  simulateNetworkDelay: boolean;
  maxProcessingTimeMs: number;
}

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
      maxProcessingTimeMs: 30000, // 30 seconds
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
      // Simulate network delay if enabled
      if (this.config.simulateNetworkDelay) {
        await this.simulateProcessingDelay();
      }

      // 1. Field validation test
      if (this.config.enableFieldValidation) {
        const fieldValidationResult = await this.testFieldValidation(filledForm, schema);
        result.testMetadata.formValidationPassed = fieldValidationResult.passed;
        result.errors.push(...fieldValidationResult.errors);
        result.warnings.push(...fieldValidationResult.warnings);
      }

      // 2. Field mapping test
      if (this.config.enableMappingValidation) {
        const mappingResult = await this.testFieldMapping(filledForm, schema);
        result.testMetadata.fieldMappingCorrect = mappingResult.passed;
        result.errors.push(...mappingResult.errors);
        result.warnings.push(...mappingResult.warnings);
      }

      // 3. Required fields test
      if (this.config.enableRequiredFieldCheck) {
        const requiredFieldsResult = await this.testRequiredFields(filledForm, schema);
        result.testMetadata.requiredFieldsPresent = requiredFieldsResult.passed;
        result.errors.push(...requiredFieldsResult.errors);
      }

      // 4. Data format validation test
      if (this.config.enableFormatValidation) {
        const formatResult = await this.testDataFormats(filledForm);
        result.testMetadata.dataFormatValid = formatResult.passed;
        result.errors.push(...formatResult.errors);
        result.warnings.push(...formatResult.warnings);
      }

      // 5. Generate mock results if all tests passed
      if (result.errors.length === 0) {
        result.success = true;
        result.confirmationNumber = this.generateMockConfirmationNumber(schema.countryCode);
        result.qrCode = this.generateMockQrCode(result.confirmationNumber);
      }

    } catch (error) {
      result.errors.push({
        fieldId: 'system',
        errorType: 'validation_failed',
        message: `Test execution error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    result.processingTimeMs = Date.now() - startTime;

    // Store test result
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
        // Test required field validation
        if (field.required && (!field.currentValue || String(field.currentValue).trim() === '')) {
          errors.push({
            fieldId: field.id,
            errorType: 'required_missing',
            message: `Required field '${field.label}' is missing`,
            suggestion: 'Please provide a value for this required field'
          });
        }

        // Test field format validation
        if (field.currentValue && field.validation) {
          const formatValid = this.validateFieldFormat(String(field.currentValue), field.validation);
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

        // Test country-specific validation
        if (field.countrySpecific && (!field.currentValue || String(field.currentValue).trim() === '')) {
          warnings.push(`Country-specific field '${field.label}' may require manual input`);
        }
      }
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings
    };
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

    // Check if all schema fields are mapped in the filled form
    const filledFieldIds = new Set();
    filledForm.sections.forEach(section => {
      section.fields.forEach(field => filledFieldIds.add(field.id));
    });

    // Validate mapping completeness (mock schema check)
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

    // Check for form fields not in schema (reverse check for schema compatibility)
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

    return {
      passed: errors.length === 0,
      errors,
      warnings
    };
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

    // Check completion percentage
    if (filledForm.stats.completionPercentage < 100) {
      const missingFields = filledForm.stats.totalFields - filledForm.stats.autoFilled - filledForm.stats.userFilled;
      errors.push({
        fieldId: 'form_completion',
        errorType: 'required_missing',
        message: `Form incomplete: ${missingFields} fields remaining`,
        suggestion: 'Complete all required fields before submission'
      });
    }

    // Validate critical fields based on country
    const criticalFields = this.getCriticalFieldsForCountry(schema.countryCode);
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

    return {
      passed: errors.length === 0,
      errors
    };
  }

  /**
   * Tests data format validation
   */
  private async testDataFormats(filledForm: FilledForm): Promise<{
    passed: boolean;
    errors: SubmissionError[];
    warnings: string[];
  }> {
    const errors: SubmissionError[] = [];
    const warnings: string[] = [];

    for (const section of filledForm.sections) {
      for (const field of section.fields) {
        if (field.currentValue) {
          const formatTest = this.testSpecificFormat(field.id, String(field.currentValue), field.type);
          if (!formatTest.valid) {
            const errorEntry: SubmissionError = {
              fieldId: field.id,
              errorType: 'invalid_format',
              message: formatTest.message,
            };
            if (formatTest.suggestion) {
              errorEntry.suggestion = formatTest.suggestion;
            }
            errors.push(errorEntry);
          } else if (formatTest.warning) {
            warnings.push(formatTest.warning);
          }
        }
      }
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates field format based on field type
   */
  private validateFieldFormat(value: string, validation: any): {
    isValid: boolean;
    message?: string;
    suggestion?: string;
  } {
    // Basic validation patterns
    const patterns = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^[\+]?[\d\s\-\(\)]+$/,
      date: /^\d{4}-\d{2}-\d{2}$/,
      passport: /^[A-Z0-9]{6,12}$/,
      postalCode: /^[\w\d\s\-]{3,10}$/
    };

    if (validation.pattern && patterns[validation.pattern as keyof typeof patterns]) {
      const pattern = patterns[validation.pattern as keyof typeof patterns];
      if (!pattern.test(value)) {
        return {
          isValid: false,
          message: `Invalid ${validation.pattern} format`,
          suggestion: `Please enter a valid ${validation.pattern}`
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Tests specific field formats
   */
  private testSpecificFormat(_fieldId: string, value: string, type: string): {
    valid: boolean;
    message: string;
    suggestion?: string;
    warning?: string;
  } {
    switch (type) {
      case 'email': {
        const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        const emailResult: { valid: boolean; message: string; suggestion?: string } = {
          valid: emailValid,
          message: emailValid ? 'Valid email format' : 'Invalid email format',
        };
        if (!emailValid) {
          emailResult.suggestion = 'Please enter a valid email address';
        }
        return emailResult;
      }

      case 'date': {
        const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(value);
        const dateResult: { valid: boolean; message: string; suggestion?: string } = {
          valid: dateValid,
          message: dateValid ? 'Valid date format' : 'Invalid date format',
        };
        if (!dateValid) {
          dateResult.suggestion = 'Please use YYYY-MM-DD format';
        }
        return dateResult;
      }

      default:
        return {
          valid: true,
          message: 'Format validation passed'
        };
    }
  }

  /**
   * Gets critical fields that must be present for a country
   */
  private getCriticalFieldsForCountry(countryCode: string): string[] {
    const criticalFields: Record<string, string[]> = {
      'JPN': ['surname', 'givenName', 'passportNumber', 'arrivalDate'],
      'MYS': ['fullName', 'passportNumber', 'arrivalDate', 'accommodationAddress'],
      'SGP': ['surname', 'givenName', 'passportNumber', 'arrivalDate'],
      'THA': ['surname', 'givenName', 'passportNumber', 'arrivalDate'],
      'VNM': ['fullName', 'passportNumber', 'arrivalDate'],
      'USA': ['surname', 'givenName', 'passportNumber', 'arrivalDate'],
      'GBR': ['surname', 'givenName', 'passportNumber', 'arrivalDate'],
      'CAN': ['surname', 'givenName', 'passportNumber', 'arrivalDate']
    };

    return criticalFields[countryCode] || ['surname', 'passportNumber', 'arrivalDate'];
  }

  /**
   * Simulates processing delay for realistic testing
   */
  private async simulateProcessingDelay(): Promise<void> {
    const delay = Math.floor(Math.random() * 2000) + 500; // 500ms - 2.5s
    await new Promise<void>(resolve => setTimeout(resolve, delay));
  }

  /**
   * Generates mock confirmation number
   */
  private generateMockConfirmationNumber(countryCode: string): string {
    const prefix = countryCode.toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * Generates mock QR code data
   */
  private generateMockQrCode(confirmationNumber: string): string {
    return `QR_MOCK_${confirmationNumber}_${Date.now()}`;
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

    // Keep only last 50 test results per country
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