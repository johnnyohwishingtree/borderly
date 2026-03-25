/**
 * Form Filler — JavaScript injection system for WebView form manipulation
 *
 * Provides a secure interface for filling government portal forms through
 * controlled JavaScript injection with field validation and error handling.
 */

import { PortalFieldMapping, AutomationStepResult } from '@/types/submission';
import { FilledForm } from '@/services/forms/formEngine';
import { AutomationScriptUtils } from '@/services/submission/automationScripts';
import type { FormFillConfig, FormFillResult, FieldFillStrategy } from './fillerTypes';
import { createDefaultFillStrategies } from './fillStrategies';

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

    this.fillStrategies = createDefaultFillStrategies();
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
      const fillScript = this.generateFormFillScript(formData, fieldMappings);
      const scriptResult = await executeScript(fillScript);

      this.processScriptResults(scriptResult, fillableFields, result);

      if (this.config.retryFailedFields && result.failedFields.length > 0) {
        await this.retryFailedFields(result, formData, fieldMappings, executeScript);
      }

      result.fillRate = (result.filledFields.length / result.totalFields) * 100;
      result.success = result.fillRate >= 80;

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
      const transformedValue = AutomationScriptUtils.applyTransform(value, mapping.transform);

      const strategy = this.fillStrategies.get(mapping.inputType);
      if (!strategy) {
        return {
          success: false,
          error: `No fill strategy for input type: ${mapping.inputType}`
        };
      }

      const fillScript = this.generateSingleFieldScript(
        mapping.selector, transformedValue, mapping, strategy
      );

      const result = await executeScript(fillScript);

      if (result.success) {
        if (this.config.validateAfterFill && mapping.validation) {
          const validationResult = await this.validateField(
            mapping, transformedValue, executeScript
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

  private generateFormFillScript(
    formData: Record<string, any>,
    fieldMappings: Record<string, PortalFieldMapping>
  ): string {
    const fillOperations = Object.entries(fieldMappings)
      .filter(([fieldId]) => formData[fieldId] !== undefined)
      .map(([fieldId, mapping]) => {
        const value = AutomationScriptUtils.applyTransform(
          formData[fieldId], mapping.transform
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

  private generateFieldOperation(
    fieldId: string,
    value: any,
    mapping: PortalFieldMapping,
    strategy: FieldFillStrategy
  ): string {
    const safeFieldId = fieldId.replace(/[^a-zA-Z0-9_]/g, '_');
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

    Object.keys(success).forEach(fieldId => {
      if (success[fieldId]) {
        result.filledFields.push(fieldId);
      }
    });

    Object.entries(failed).forEach(([fieldId, error]) => {
      result.failedFields.push({
        fieldId,
        error: String(error)
      });
    });
  }

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
            fieldId, value, mapping, executeScript
          );

          if (retryResult.success) {
            result.filledFields.push(fieldId);
            const index = fieldsToRetry.findIndex(f => f.fieldId === fieldId);
            if (index > -1) {
              fieldsToRetry.splice(index, 1);
            }
          }
        } catch {
          // Keep in failed list
        }
      }
    }

    result.failedFields.push(...fieldsToRetry);
  }

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
