/**
 * Form Filler - JavaScript injection system for WebView form manipulation
 * 
 * Provides a secure interface for filling government portal forms through
 * controlled JavaScript injection with field validation and error handling.
 */

import { PortalFieldMapping, AutomationStepResult } from '@/types/submission';
import { FilledForm } from '@/services/forms/formEngine';
import { AutomationScriptUtils } from '@/services/submission/automationScripts';

/**
 * Configuration for form filling operations
 */
export interface FormFillConfig {
  timeout: number;
  validateAfterFill: boolean;
  captureScreenshots: boolean;
  retryFailedFields: boolean;
  maxRetries: number;
}

/**
 * Result of a form filling operation
 */
export interface FormFillResult {
  success: boolean;
  filledFields: string[];
  failedFields: Array<{ fieldId: string; error: string }>;
  screenshot?: string;
  totalFields: number;
  fillRate: number; // percentage of successfully filled fields
}

/**
 * Field filling strategy for different input types
 */
interface FieldFillStrategy {
  inputType: string;
  fillMethod: (element: string, value: any, mapping: PortalFieldMapping) => string;
  validateMethod?: (element: string, expectedValue: any) => string;
}

/**
 * Main form filler class
 */
export class FormFiller {
  private config: FormFillConfig;
  private fillStrategies: Map<string, FieldFillStrategy>;

  constructor(config?: Partial<FormFillConfig>) {
    this.config = {
      timeout: 30000,
      validateAfterFill: true,
      captureScreenshots: false,
      retryFailedFields: true,
      maxRetries: 3,
      ...config
    };

    this.fillStrategies = new Map();
    this.initializeFillStrategies();
  }

  /**
   * Fill form fields based on mapping and form data
   */
  async fillForm(
    filledForm: FilledForm,
    fieldMappings: Record<string, PortalFieldMapping>,
    executeScript: (code: string) => Promise<any>
  ): Promise<FormFillResult> {
    const formData = this.extractFormData(filledForm);
    const fillableFields = Object.entries(fieldMappings).filter(
      ([fieldId]) => formData[fieldId] !== undefined && formData[fieldId] !== ''
    );

    const result: FormFillResult = {
      success: false,
      filledFields: [],
      failedFields: [],
      totalFields: fillableFields.length,
      fillRate: 0
    };

    if (fillableFields.length === 0) {
      result.success = true;
      result.fillRate = 100;
      return result;
    }

    try {
      // Generate comprehensive form filling script
      const fillScript = this.generateFormFillScript(formData, fieldMappings);
      
      // Execute the script
      const scriptResult = await executeScript(fillScript);
      
      // Process results
      this.processScriptResults(scriptResult, fillableFields, result);

      // Retry failed fields if configured
      if (this.config.retryFailedFields && result.failedFields.length > 0) {
        await this.retryFailedFields(result, formData, fieldMappings, executeScript);
      }

      // Calculate final success rate
      result.fillRate = (result.filledFields.length / result.totalFields) * 100;
      result.success = result.fillRate >= 80; // Consider 80%+ fill rate as success

      return result;

    } catch (error) {
      result.failedFields = fillableFields.map(([fieldId]) => ({
        fieldId,
        error: `Form filling failed: ${(error as Error).message}`
      }));
      return result;
    }
  }

  /**
   * Fill a single field with advanced error handling
   */
  async fillSingleField(
    fieldId: string,
    value: any,
    mapping: PortalFieldMapping,
    executeScript: (code: string) => Promise<any>
  ): Promise<AutomationStepResult> {
    try {
      // Apply any transformations
      const transformedValue = AutomationScriptUtils.applyTransform(value, mapping.transform);
      
      // Get fill strategy
      const strategy = this.fillStrategies.get(mapping.inputType);
      if (!strategy) {
        return {
          success: false,
          error: `No fill strategy for input type: ${mapping.inputType}`
        };
      }

      // Generate field-specific script
      const fillScript = this.generateSingleFieldScript(
        mapping.selector,
        transformedValue,
        mapping,
        strategy
      );

      // Execute script
      const result = await executeScript(fillScript);

      if (result.success) {
        // Validate if configured
        if (this.config.validateAfterFill && mapping.validation) {
          const validationResult = await this.validateField(
            mapping,
            transformedValue,
            executeScript
          );
          
          if (!validationResult.success) {
            return {
              success: false,
              error: `Field validation failed: ${validationResult.error}`
            };
          }
        }

        return {
          success: true,
          data: { fieldId, value: transformedValue, filled: true }
        };
      } else {
        return {
          success: false,
          error: result.error || 'Unknown field filling error'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: `Single field fill error: ${(error as Error).message}`
      };
    }
  }

  /**
   * Smart field detection and value extraction
   */
  async detectAndExtractFields(
    executeScript: (code: string) => Promise<any>
  ): Promise<Record<string, any>> {
    const detectionScript = `
      (function() {
        const fields = {};
        
        // Common form field selectors
        const selectors = [
          'input[type="text"]',
          'input[type="email"]', 
          'input[type="tel"]',
          'input[type="date"]',
          'input[type="number"]',
          'select',
          'textarea',
          'input[type="radio"]:checked',
          'input[type="checkbox"]:checked'
        ];
        
        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => {
            const id = element.id || element.name || element.className;
            if (id && element.value) {
              fields[id] = {
                value: element.value,
                type: element.type || element.tagName.toLowerCase(),
                selector: selector,
                required: element.required || element.hasAttribute('required')
              };
            }
          });
        });
        
        return fields;
      })();
    `;

    try {
      const result = await executeScript(detectionScript);
      return result || {};
    } catch (error) {
      console.warn('Field detection failed:', error);
      return {};
    }
  }

  /**
   * Generate comprehensive form filling script
   */
  private generateFormFillScript(
    formData: Record<string, any>,
    fieldMappings: Record<string, PortalFieldMapping>
  ): string {
    const fillOperations = Object.entries(fieldMappings)
      .filter(([fieldId]) => formData[fieldId] !== undefined)
      .map(([fieldId, mapping]) => {
        const value = AutomationScriptUtils.applyTransform(
          formData[fieldId],
          mapping.transform
        );
        const strategy = this.fillStrategies.get(mapping.inputType);
        
        if (!strategy) {
          return `results.failed['${fieldId}'] = 'No strategy for ${mapping.inputType}';`;
        }

        return this.generateFieldOperation(fieldId, value, mapping, strategy);
      })
      .join('\n        ');

    return `
      (function() {
        const results = {
          success: {},
          failed: {},
          total: ${Object.keys(fieldMappings).length}
        };
        
        try {
          ${fillOperations}
        } catch (error) {
          results.error = error.message;
        }
        
        return results;
      })();
    `;
  }

  /**
   * Generate script for a single field operation
   */
  private generateFieldOperation(
    fieldId: string,
    value: any,
    mapping: PortalFieldMapping,
    strategy: FieldFillStrategy
  ): string {
    const safeFieldId = fieldId.replace(/[^a-zA-Z0-9_]/g, '_'); // Sanitize field ID for variable name
    const fillMethod = strategy.fillMethod(
      JSON.stringify(mapping.selector),
      JSON.stringify(value),
      mapping
    );

    return `
          try {
            const element_${safeFieldId} = document.querySelector(${JSON.stringify(mapping.selector)});
            if (element_${safeFieldId}) {
              ${fillMethod}
              results.success[${JSON.stringify(fieldId)}] = true;
            } else {
              results.failed[${JSON.stringify(fieldId)}] = 'Element not found';
            }
          } catch (error) {
            results.failed[${JSON.stringify(fieldId)}] = error.message;
          }
    `;
  }

  /**
   * Generate script for single field filling
   */
  private generateSingleFieldScript(
    selector: string,
    value: any,
    mapping: PortalFieldMapping,
    strategy: FieldFillStrategy
  ): string {
    const fillMethod = strategy.fillMethod(`'${selector}'`, JSON.stringify(value), mapping);

    return `
      (function() {
        try {
          const element = document.querySelector('${selector}');
          if (!element) {
            return { success: false, error: 'Element not found: ${selector}' };
          }
          
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.focus();
          
          ${fillMethod}
          
          return { success: true, value: element.value || element.checked };
        } catch (error) {
          return { success: false, error: error.message };
        }
      })();
    `;
  }

  /**
   * Initialize field filling strategies for different input types
   */
  private initializeFillStrategies(): void {
    // Text input strategy
    this.fillStrategies.set('text', {
      inputType: 'text',
      fillMethod: (element, value, _mapping) => `
        ${element}.value = ${value};
        ${element}.dispatchEvent(new Event('input', { bubbles: true }));
        ${element}.dispatchEvent(new Event('change', { bubbles: true }));
        ${element}.blur();
      `
    });

    // Select dropdown strategy
    this.fillStrategies.set('select', {
      inputType: 'select',
      fillMethod: (element, value, _mapping) => `
        // Try exact value match first
        ${element}.value = ${value};
        
        // If that fails, try option text matching
        if (!${element}.value || ${element}.value !== ${value}) {
          const options = Array.from(${element}.options);
          const matchingOption = options.find(opt => 
            opt.text.toLowerCase().includes(${value}.toLowerCase()) ||
            opt.value.toLowerCase() === ${value}.toLowerCase()
          );
          if (matchingOption) {
            ${element}.value = matchingOption.value;
          }
        }
        
        ${element}.dispatchEvent(new Event('change', { bubbles: true }));
        ${element}.blur();
      `
    });

    // Radio button strategy
    this.fillStrategies.set('radio', {
      inputType: 'radio',
      fillMethod: (element, value, _mapping) => `
        // Get the first radio button to extract the name attribute
        const firstRadio = document.querySelector(${element});
        if (firstRadio && firstRadio.name) {
          const radioButtons = document.querySelectorAll('input[type="radio"][name="' + firstRadio.name + '"]');
          radioButtons.forEach(radio => {
            if (radio.value === ${value} || radio.value.toLowerCase() === ${value}.toLowerCase()) {
              radio.checked = true;
              radio.dispatchEvent(new Event('change', { bubbles: true }));
            }
          });
        }
      `
    });

    // Checkbox strategy
    this.fillStrategies.set('checkbox', {
      inputType: 'checkbox',
      fillMethod: (element, value, _mapping) => `
        ${element}.checked = Boolean(${value});
        ${element}.dispatchEvent(new Event('change', { bubbles: true }));
      `
    });

    // Date input strategy
    this.fillStrategies.set('date', {
      inputType: 'date',
      fillMethod: (element, value, _mapping) => `
        ${element}.value = ${value};
        ${element}.dispatchEvent(new Event('input', { bubbles: true }));
        ${element}.dispatchEvent(new Event('change', { bubbles: true }));
        ${element}.blur();
      `
    });

    // File input strategy (placeholder for upload handler integration)
    this.fillStrategies.set('file', {
      inputType: 'file',
      fillMethod: (element, _value, _mapping) => `
        // File upload requires special handling through upload handler
        console.log('File upload for element:', ${element});
        // This will be handled by the UploadHandler
      `
    });
  }

  /**
   * Process script execution results
   */
  private processScriptResults(
    scriptResult: any,
    fillableFields: Array<[string, PortalFieldMapping]>,
    result: FormFillResult
  ): void {
    if (!scriptResult || typeof scriptResult !== 'object') {
      result.failedFields = fillableFields.map(([fieldId]) => ({
        fieldId,
        error: 'Invalid script result'
      }));
      return;
    }

    const { success = {}, failed = {} } = scriptResult;

    // Process successful fields
    Object.keys(success).forEach(fieldId => {
      if (success[fieldId]) {
        result.filledFields.push(fieldId);
      }
    });

    // Process failed fields
    Object.entries(failed).forEach(([fieldId, error]) => {
      result.failedFields.push({
        fieldId,
        error: String(error)
      });
    });
  }

  /**
   * Retry failed fields with exponential backoff
   */
  private async retryFailedFields(
    result: FormFillResult,
    formData: Record<string, any>,
    fieldMappings: Record<string, PortalFieldMapping>,
    executeScript: (code: string) => Promise<any>
  ): Promise<void> {
    const fieldsToRetry = [...result.failedFields];
    result.failedFields = [];

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      if (fieldsToRetry.length === 0) break;

      // Wait before retry (exponential backoff)
      await new Promise<void>(resolve => setTimeout(() => resolve(), 1000 * attempt));

      const retryFields = fieldsToRetry.filter(field => 
        fieldMappings[field.fieldId] && formData[field.fieldId] !== undefined
      );

      if (retryFields.length === 0) break;

      for (const failedField of retryFields) {
        const fieldId = failedField.fieldId;
        const mapping = fieldMappings[fieldId];
        const value = formData[fieldId];

        try {
          const retryResult = await this.fillSingleField(
            fieldId,
            value,
            mapping,
            executeScript
          );

          if (retryResult.success) {
            result.filledFields.push(fieldId);
            // Remove from retry list
            const index = fieldsToRetry.findIndex(f => f.fieldId === fieldId);
            if (index > -1) {
              fieldsToRetry.splice(index, 1);
            }
          }
        } catch (error) {
          // Keep in failed list, will be added back at the end
        }
      }
    }

    // Add remaining failed fields back to result
    result.failedFields.push(...fieldsToRetry);
  }

  /**
   * Validate field after filling
   */
  private async validateField(
    mapping: PortalFieldMapping,
    expectedValue: any,
    executeScript: (code: string) => Promise<any>
  ): Promise<AutomationStepResult> {
    if (!mapping.validation) {
      return { success: true };
    }

    const validationScript = `
      (function() {
        try {
          const element = document.querySelector('${mapping.selector}');
          if (!element) {
            return { success: false, error: 'Element not found for validation' };
          }
          
          const actualValue = element.value || element.checked;
          const expectedValue = ${JSON.stringify(expectedValue)};
          
          // Custom validation selector if provided
          ${mapping.validation.selector ? `
            const validationElement = document.querySelector('${mapping.validation.selector}');
            if (validationElement) {
              const validationText = validationElement.textContent || validationElement.value;
              return {
                success: !validationText.toLowerCase().includes('error'),
                actualValue: actualValue,
                validationText: validationText
              };
            }
          ` : ''}
          
          return {
            success: actualValue === expectedValue,
            actualValue: actualValue,
            expectedValue: expectedValue
          };
        } catch (error) {
          return { success: false, error: error.message };
        }
      })();
    `;

    try {
      const result = await executeScript(validationScript);
      return {
        success: result.success,
        ...(result.success ? {} : { error: `Validation failed: expected ${result.expectedValue}, got ${result.actualValue}` })
      };
    } catch (error) {
      return {
        success: false,
        error: `Validation script error: ${(error as Error).message}`
      };
    }
  }

  /**
   * Extract form data from FilledForm
   */
  private extractFormData(filledForm: FilledForm): Record<string, any> {
    const data: Record<string, any> = {};
    
    filledForm.sections.forEach(section => {
      section.fields.forEach(field => {
        if (field.currentValue !== undefined && field.currentValue !== '') {
          data[field.id] = field.currentValue;
        }
      });
    });
    
    return data;
  }
}