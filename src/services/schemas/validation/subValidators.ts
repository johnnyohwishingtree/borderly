/**
 * Schema Sub-Validators
 *
 * Validation functions for specific schema sub-sections: metadata,
 * change detection, portal flow, automation, submission guide, and fields.
 */

import { FormField, FormSection, SubmissionStep, SchemaValidationResult } from '../../../types/schema';
import {
  VALID_FIELD_TYPES,
  VALID_FILL_METHODS,
  VALID_ACTION_TYPES,
  VALID_COMPLEXITIES,
  VALID_STATUSES,
  VALID_FREQUENCIES,
  VALID_PREREQUISITE_TYPES,
} from './validationRules';

/**
 * Validate field automation configuration
 */
export function validateFieldAutomation(automation: any, automationPath: string, result: SchemaValidationResult): void {
  if (automation.fillMethod && !VALID_FILL_METHODS.includes(automation.fillMethod)) {
    result.errors.push({
      path: `${automationPath}.fillMethod`,
      message: `Invalid fillMethod: ${automation.fillMethod}. Must be one of: ${VALID_FILL_METHODS.join(', ')}`,
      severity: 'error',
    });
  }

  if (automation.dependencies && !Array.isArray(automation.dependencies)) {
    result.errors.push({
      path: `${automationPath}.dependencies`,
      message: 'Dependencies must be an array of field IDs',
      severity: 'error',
    });
  }
}

/**
 * Validate form fields
 */
export function validateFields(fields: FormField[], fieldsPath: string, result: SchemaValidationResult, isValidDotNotation: (path: string) => boolean): void {
  if (!Array.isArray(fields)) {
    result.errors.push({
      path: fieldsPath,
      message: 'Fields must be an array',
      severity: 'error',
    });
    return;
  }

  const fieldIds = new Set<string>();

  fields.forEach((field, fieldIndex) => {
    const fieldPath = `${fieldsPath}[${fieldIndex}]`;

    if (!field.id || !field.label || !field.type) {
      result.errors.push({
        path: fieldPath,
        message: 'Field must have id, label, and type',
        severity: 'error',
      });
      return;
    }

    if (fieldIds.has(field.id)) {
      result.errors.push({
        path: `${fieldPath}.id`,
        message: `Duplicate field ID: ${field.id}`,
        severity: 'error',
      });
    }
    fieldIds.add(field.id);

    if (!VALID_FIELD_TYPES.includes(field.type)) {
      result.errors.push({
        path: `${fieldPath}.type`,
        message: `Invalid field type: ${field.type}. Must be one of: ${VALID_FIELD_TYPES.join(', ')}`,
        severity: 'error',
      });
    }

    if (field.type === 'select' && (!field.options || !Array.isArray(field.options) || field.options.length === 0)) {
      result.errors.push({
        path: `${fieldPath}.options`,
        message: 'Select field must have non-empty options array',
        severity: 'error',
      });
    }

    if (field.autoFillSource && !isValidDotNotation(field.autoFillSource)) {
      result.warnings.push({
        path: `${fieldPath}.autoFillSource`,
        message: `AutoFillSource should use dot notation (e.g., "profile.surname"): ${field.autoFillSource}`,
      });
    }

    if (field.automation) {
      validateFieldAutomation(field.automation, `${fieldPath}.automation`, result);
    }
  });
}

/**
 * Validate form sections
 */
export function validateSections(sections: FormSection[], result: SchemaValidationResult, isValidDotNotation: (path: string) => boolean): void {
  if (!Array.isArray(sections) || sections.length === 0) {
    result.errors.push({
      path: 'sections',
      message: 'Sections must be a non-empty array',
      severity: 'error',
    });
    return;
  }

  const sectionIds = new Set<string>();

  sections.forEach((section, sectionIndex) => {
    const sectionPath = `sections[${sectionIndex}]`;

    if (!section.id || !section.title || !Array.isArray(section.fields)) {
      result.errors.push({
        path: sectionPath,
        message: 'Section must have id, title, and fields array',
        severity: 'error',
      });
      return;
    }

    if (sectionIds.has(section.id)) {
      result.errors.push({
        path: `${sectionPath}.id`,
        message: `Duplicate section ID: ${section.id}`,
        severity: 'error',
      });
    }
    sectionIds.add(section.id);

    validateFields(section.fields, `${sectionPath}.fields`, result, isValidDotNotation);
  });
}

/**
 * Validate step automation configuration
 */
export function validateStepAutomation(automation: any, automationPath: string, result: SchemaValidationResult): void {
  if (automation.actions && Array.isArray(automation.actions)) {
    automation.actions.forEach((action: any, actionIndex: number) => {
      const actionPath = `${automationPath}.actions[${actionIndex}]`;

      if (!action.type || !VALID_ACTION_TYPES.includes(action.type)) {
        result.errors.push({
          path: `${actionPath}.type`,
          message: `Invalid action type: ${action.type}. Must be one of: ${VALID_ACTION_TYPES.join(', ')}`,
          severity: 'error',
        });
      }

      if (action.type === 'navigate' && !action.value) {
        result.errors.push({
          path: `${actionPath}.value`,
          message: 'Navigate action must have a URL value',
          severity: 'error',
        });
      }

      if ((action.type === 'click' || action.type === 'fill') && !action.selector) {
        result.errors.push({
          path: `${actionPath}.selector`,
          message: `${action.type} action must have a selector`,
          severity: 'error',
        });
      }
    });
  }
}

/**
 * Validate submission guide
 */
export function validateSubmissionGuide(guide: SubmissionStep[], result: SchemaValidationResult, isSequential: (numbers: number[]) => boolean): void {
  if (!Array.isArray(guide) || guide.length === 0) {
    result.errors.push({
      path: 'submissionGuide',
      message: 'Submission guide must be a non-empty array',
      severity: 'error',
    });
    return;
  }

  const orders = new Set<number>();

  guide.forEach((step, stepIndex) => {
    const stepPath = `submissionGuide[${stepIndex}]`;

    if (typeof step.order !== 'number' || !step.title || !step.description) {
      result.errors.push({
        path: stepPath,
        message: 'Step must have numeric order, title, and description',
        severity: 'error',
      });
      return;
    }

    if (orders.has(step.order)) {
      result.errors.push({
        path: `${stepPath}.order`,
        message: `Duplicate step order: ${step.order}`,
        severity: 'error',
      });
    }
    orders.add(step.order);

    if (step.automation) {
      validateStepAutomation(step.automation, `${stepPath}.automation`, result);
    }
  });

  const sortedOrders = Array.from(orders).sort((a, b) => a - b);
  if (sortedOrders[0] !== 1 || !isSequential(sortedOrders)) {
    result.warnings.push({
      path: 'submissionGuide',
      message: 'Step orders should be sequential starting from 1',
    });
  }
}

/**
 * Validate metadata
 */
export function validateMetadata(metadata: any, result: SchemaValidationResult): void {
  if (metadata.complexity && !VALID_COMPLEXITIES.includes(metadata.complexity)) {
    result.errors.push({
      path: 'metadata.complexity',
      message: `Invalid complexity: ${metadata.complexity}. Must be one of: ${VALID_COMPLEXITIES.join(', ')}`,
      severity: 'error',
    });
  }

  if (metadata.implementationStatus && !VALID_STATUSES.includes(metadata.implementationStatus)) {
    result.errors.push({
      path: 'metadata.implementationStatus',
      message: `Invalid implementation status: ${metadata.implementationStatus}. Must be one of: ${VALID_STATUSES.join(', ')}`,
      severity: 'error',
    });
  }

  if (metadata.maintenanceFrequency && !VALID_FREQUENCIES.includes(metadata.maintenanceFrequency)) {
    result.errors.push({
      path: 'metadata.maintenanceFrequency',
      message: `Invalid maintenance frequency: ${metadata.maintenanceFrequency}. Must be one of: ${VALID_FREQUENCIES.join(', ')}`,
      severity: 'error',
    });
  }

  if (typeof metadata.priority === 'number' && metadata.priority < 1) {
    result.warnings.push({
      path: 'metadata.priority',
      message: 'Priority should be >= 1 (1 = highest priority)',
    });
  }
}

/**
 * Validate change detection configuration
 */
export function validateChangeDetection(changeDetection: any, result: SchemaValidationResult): void {
  if (!Array.isArray(changeDetection.monitoredSelectors) || changeDetection.monitoredSelectors.length === 0) {
    result.warnings.push({
      path: 'changeDetection.monitoredSelectors',
      message: 'Change detection should have monitored selectors',
    });
  }

  if (typeof changeDetection.changeThreshold !== 'number' || changeDetection.changeThreshold < 0 || changeDetection.changeThreshold > 100) {
    result.errors.push({
      path: 'changeDetection.changeThreshold',
      message: 'Change threshold must be a number between 0 and 100',
      severity: 'error',
    });
  }
}

/**
 * Validate portal flow configuration
 */
export function validatePortalFlow(portalFlow: any, result: SchemaValidationResult): void {
  if (typeof portalFlow.requiresAccount !== 'boolean') {
    result.errors.push({
      path: 'portalFlow.requiresAccount',
      message: 'requiresAccount must be a boolean',
      severity: 'error',
    });
  }

  if (typeof portalFlow.multiStep !== 'boolean') {
    result.errors.push({
      path: 'portalFlow.multiStep',
      message: 'multiStep must be a boolean',
      severity: 'error',
    });
  }

  if (portalFlow.prerequisites && Array.isArray(portalFlow.prerequisites)) {
    portalFlow.prerequisites.forEach((prereq: any, index: number) => {
      if (!prereq.type || !VALID_PREREQUISITE_TYPES.includes(prereq.type)) {
        result.errors.push({
          path: `portalFlow.prerequisites[${index}].type`,
          message: `Invalid prerequisite type: ${prereq.type}. Must be one of: ${VALID_PREREQUISITE_TYPES.join(', ')}`,
          severity: 'error',
        });
      }
    });
  }
}

/**
 * Validate automation configuration
 */
export function validateAutomation(automation: any, result: SchemaValidationResult): void {
  if (typeof automation.enabled !== 'boolean') {
    result.errors.push({
      path: 'automation.enabled',
      message: 'automation.enabled must be a boolean',
      severity: 'error',
    });
  }

  if (!automation.entryUrl) {
    result.errors.push({
      path: 'automation.entryUrl',
      message: 'automation.entryUrl is required',
      severity: 'error',
    });
  }

  if (!Array.isArray(automation.successIndicators) || automation.successIndicators.length === 0) {
    result.warnings.push({
      path: 'automation.successIndicators',
      message: 'Automation should have success indicators',
    });
  }
}
