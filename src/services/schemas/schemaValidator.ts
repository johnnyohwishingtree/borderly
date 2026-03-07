import { CountryFormSchema, FormField, FormSection, SubmissionStep, SchemaValidationResult } from '../../types/schema';

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
      // Validate required top-level fields
      this.validateRequiredFields(schema, result);
      
      // Validate country code format
      this.validateCountryCode(schema, result);
      
      // Validate schema version
      this.validateSchemaVersion(schema, result);
      
      // Validate timestamps
      this.validateTimestamps(schema, result);
      
      // Validate submission timing
      this.validateSubmissionTiming(schema, result);
      
      // Validate sections
      this.validateSections(schema.sections, result);
      
      // Validate submission guide
      this.validateSubmissionGuide(schema.submissionGuide, result);
      
      // Validate metadata if present
      if (schema.metadata) {
        this.validateMetadata(schema.metadata, result);
      }
      
      // Validate change detection if present
      if (schema.changeDetection) {
        this.validateChangeDetection(schema.changeDetection, result);
      }
      
      // Validate portal flow if present
      if (schema.portalFlow) {
        this.validatePortalFlow(schema.portalFlow, result);
      }
      
      // Validate automation if present
      if (schema.automation) {
        this.validateAutomation(schema.automation, result);
      }
      
      // Cross-validation checks
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
    const required = ['countryCode', 'countryName', 'schemaVersion', 'lastUpdated', 'portalUrl', 'portalName', 'submission', 'sections', 'submissionGuide'];
    
    for (const field of required) {
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
      const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
      if (!semverRegex.test(schema.schemaVersion)) {
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
    
    // Validate metadata timestamps if present
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

    const durationRegex = /^(\d+)([hdw])$/; // hours, days, weeks
    
    const timingFields = ['earliestBeforeArrival', 'latestBeforeArrival', 'recommended'];
    for (const field of timingFields) {
      const value = schema.submission[field as keyof typeof schema.submission] as string;
      if (value && !durationRegex.test(value)) {
        result.errors.push({
          path: `submission.${field}`,
          message: `${field} must be in format like '14d', '72h', '1w'`,
          severity: 'error',
        });
      }
    }
    
    if (schema.submission.processingTime && !durationRegex.test(schema.submission.processingTime)) {
      result.errors.push({
        path: 'submission.processingTime',
        message: 'processingTime must be in format like "24h", "3d"',
        severity: 'error',
      });
    }
  }

  /**
   * Validate form sections
   */
  private validateSections(sections: FormSection[], result: SchemaValidationResult): void {
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
      
      // Validate required section fields
      if (!section.id || !section.title || !Array.isArray(section.fields)) {
        result.errors.push({
          path: sectionPath,
          message: 'Section must have id, title, and fields array',
          severity: 'error',
        });
        return;
      }
      
      // Check for duplicate section IDs
      if (sectionIds.has(section.id)) {
        result.errors.push({
          path: `${sectionPath}.id`,
          message: `Duplicate section ID: ${section.id}`,
          severity: 'error',
        });
      }
      sectionIds.add(section.id);
      
      // Validate fields
      this.validateFields(section.fields, `${sectionPath}.fields`, result);
    });
  }

  /**
   * Validate form fields
   */
  private validateFields(fields: FormField[], fieldsPath: string, result: SchemaValidationResult): void {
    if (!Array.isArray(fields)) {
      result.errors.push({
        path: fieldsPath,
        message: 'Fields must be an array',
        severity: 'error',
      });
      return;
    }

    const fieldIds = new Set<string>();
    const validTypes = ['text', 'date', 'select', 'boolean', 'number', 'textarea'];
    
    fields.forEach((field, fieldIndex) => {
      const fieldPath = `${fieldsPath}[${fieldIndex}]`;
      
      // Validate required field properties
      if (!field.id || !field.label || !field.type) {
        result.errors.push({
          path: fieldPath,
          message: 'Field must have id, label, and type',
          severity: 'error',
        });
        return;
      }
      
      // Check for duplicate field IDs
      if (fieldIds.has(field.id)) {
        result.errors.push({
          path: `${fieldPath}.id`,
          message: `Duplicate field ID: ${field.id}`,
          severity: 'error',
        });
      }
      fieldIds.add(field.id);
      
      // Validate field type
      if (!validTypes.includes(field.type)) {
        result.errors.push({
          path: `${fieldPath}.type`,
          message: `Invalid field type: ${field.type}. Must be one of: ${validTypes.join(', ')}`,
          severity: 'error',
        });
      }
      
      // Validate select field options
      if (field.type === 'select' && (!field.options || !Array.isArray(field.options) || field.options.length === 0)) {
        result.errors.push({
          path: `${fieldPath}.options`,
          message: 'Select field must have non-empty options array',
          severity: 'error',
        });
      }
      
      // Validate autoFillSource format
      if (field.autoFillSource && !this.isValidDotNotation(field.autoFillSource)) {
        result.warnings.push({
          path: `${fieldPath}.autoFillSource`,
          message: `AutoFillSource should use dot notation (e.g., "profile.surname"): ${field.autoFillSource}`,
        });
      }
      
      // Validate automation if present
      if (field.automation) {
        this.validateFieldAutomation(field.automation, `${fieldPath}.automation`, result);
      }
    });
  }

  /**
   * Validate field automation configuration
   */
  private validateFieldAutomation(automation: any, automationPath: string, result: SchemaValidationResult): void {
    const validFillMethods = ['input', 'select', 'click', 'upload'];
    
    if (automation.fillMethod && !validFillMethods.includes(automation.fillMethod)) {
      result.errors.push({
        path: `${automationPath}.fillMethod`,
        message: `Invalid fillMethod: ${automation.fillMethod}. Must be one of: ${validFillMethods.join(', ')}`,
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
   * Validate submission guide
   */
  private validateSubmissionGuide(guide: SubmissionStep[], result: SchemaValidationResult): void {
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
      
      // Validate required step fields
      if (typeof step.order !== 'number' || !step.title || !step.description) {
        result.errors.push({
          path: stepPath,
          message: 'Step must have numeric order, title, and description',
          severity: 'error',
        });
        return;
      }
      
      // Check for duplicate orders
      if (orders.has(step.order)) {
        result.errors.push({
          path: `${stepPath}.order`,
          message: `Duplicate step order: ${step.order}`,
          severity: 'error',
        });
      }
      orders.add(step.order);
      
      // Validate step automation if present
      if (step.automation) {
        this.validateStepAutomation(step.automation, `${stepPath}.automation`, result);
      }
    });
    
    // Check for sequential ordering
    const sortedOrders = Array.from(orders).sort((a, b) => a - b);
    if (sortedOrders[0] !== 1 || !this.isSequential(sortedOrders)) {
      result.warnings.push({
        path: 'submissionGuide',
        message: 'Step orders should be sequential starting from 1',
      });
    }
  }

  /**
   * Validate step automation configuration
   */
  private validateStepAutomation(automation: any, automationPath: string, result: SchemaValidationResult): void {
    if (automation.actions && Array.isArray(automation.actions)) {
      const validActionTypes = ['navigate', 'click', 'wait', 'fill', 'submit', 'scroll'];
      
      automation.actions.forEach((action: any, actionIndex: number) => {
        const actionPath = `${automationPath}.actions[${actionIndex}]`;
        
        if (!action.type || !validActionTypes.includes(action.type)) {
          result.errors.push({
            path: `${actionPath}.type`,
            message: `Invalid action type: ${action.type}. Must be one of: ${validActionTypes.join(', ')}`,
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
   * Validate metadata
   */
  private validateMetadata(metadata: any, result: SchemaValidationResult): void {
    const validComplexities = ['low', 'medium', 'high'];
    const validStatuses = ['planned', 'in_progress', 'complete', 'deprecated'];
    const validFrequencies = ['weekly', 'monthly', 'quarterly', 'annually'];
    
    if (metadata.complexity && !validComplexities.includes(metadata.complexity)) {
      result.errors.push({
        path: 'metadata.complexity',
        message: `Invalid complexity: ${metadata.complexity}. Must be one of: ${validComplexities.join(', ')}`,
        severity: 'error',
      });
    }
    
    if (metadata.implementationStatus && !validStatuses.includes(metadata.implementationStatus)) {
      result.errors.push({
        path: 'metadata.implementationStatus',
        message: `Invalid implementation status: ${metadata.implementationStatus}. Must be one of: ${validStatuses.join(', ')}`,
        severity: 'error',
      });
    }
    
    if (metadata.maintenanceFrequency && !validFrequencies.includes(metadata.maintenanceFrequency)) {
      result.errors.push({
        path: 'metadata.maintenanceFrequency',
        message: `Invalid maintenance frequency: ${metadata.maintenanceFrequency}. Must be one of: ${validFrequencies.join(', ')}`,
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
  private validateChangeDetection(changeDetection: any, result: SchemaValidationResult): void {
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
  private validatePortalFlow(portalFlow: any, result: SchemaValidationResult): void {
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
      const validPrereqTypes = ['document', 'payment', 'approval', 'other'];
      
      portalFlow.prerequisites.forEach((prereq: any, index: number) => {
        if (!prereq.type || !validPrereqTypes.includes(prereq.type)) {
          result.errors.push({
            path: `portalFlow.prerequisites[${index}].type`,
            message: `Invalid prerequisite type: ${prereq.type}. Must be one of: ${validPrereqTypes.join(', ')}`,
            severity: 'error',
          });
        }
      });
    }
  }

  /**
   * Validate automation configuration
   */
  private validateAutomation(automation: any, result: SchemaValidationResult): void {
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

  /**
   * Cross-validation checks
   */
  private validateCrossReferences(schema: CountryFormSchema, result: SchemaValidationResult): void {
    // Collect all field IDs
    const allFieldIds = new Set<string>();
    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        allFieldIds.add(field.id);
      });
    });
    
    // Check that submission guide references valid field IDs
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
    
    // Check field automation dependencies
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

    this.validateFields([field], 'field', result);
    result.valid = result.errors.filter(e => e.severity === 'error').length === 0;
    
    return result;
  }
}

export const schemaValidator = new SchemaValidator();