/**
 * Tests for schemas/validation/subValidators
 */

import {
  validateFields,
  validateSections,
  validateSubmissionGuide,
  validateMetadata,
  validateChangeDetection,
  validatePortalFlow,
  validateAutomation,
  validateFieldAutomation,
  validateStepAutomation,
} from '@/services/schemas/validation/subValidators';
import { SchemaValidationResult } from '@/types/schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyResult(): SchemaValidationResult {
  return { valid: true, errors: [], warnings: [] };
}

const isValidDotNotation = (path: string) =>
  /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/.test(path);

const isSequential = (numbers: number[]) => {
  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] !== numbers[i - 1] + 1) return false;
  }
  return true;
};

// ---------------------------------------------------------------------------
// validateFields
// ---------------------------------------------------------------------------
describe('validateFields', () => {
  it('passes for valid fields', () => {
    const result = emptyResult();
    validateFields(
      [{ id: 'f1', label: 'Name', type: 'text', required: true, countrySpecific: false }],
      'fields',
      result,
      isValidDotNotation,
    );
    expect(result.errors).toHaveLength(0);
  });

  it('errors on missing id/label/type', () => {
    const result = emptyResult();
    validateFields(
      [{ id: '', label: '', type: '' } as never],
      'fields',
      result,
      isValidDotNotation,
    );
    expect(result.errors.some(e => e.message.includes('must have id, label, and type'))).toBe(true);
  });

  it('errors on duplicate field IDs', () => {
    const result = emptyResult();
    validateFields(
      [
        { id: 'dup', label: 'A', type: 'text', required: false, countrySpecific: false },
        { id: 'dup', label: 'B', type: 'text', required: false, countrySpecific: false },
      ],
      'fields',
      result,
      isValidDotNotation,
    );
    expect(result.errors.some(e => e.message.includes('Duplicate field ID'))).toBe(true);
  });

  it('errors on invalid field type', () => {
    const result = emptyResult();
    validateFields(
      [{ id: 'f1', label: 'X', type: 'color' as never, required: false, countrySpecific: false }],
      'fields',
      result,
      isValidDotNotation,
    );
    expect(result.errors.some(e => e.message.includes('Invalid field type'))).toBe(true);
  });

  it('errors when select field has no options', () => {
    const result = emptyResult();
    validateFields(
      [{ id: 'f1', label: 'X', type: 'select', required: false, countrySpecific: false }],
      'fields',
      result,
      isValidDotNotation,
    );
    expect(result.errors.some(e => e.message.includes('non-empty options'))).toBe(true);
  });

  it('warns on invalid autoFillSource dot notation', () => {
    const result = emptyResult();
    validateFields(
      [{ id: 'f1', label: 'X', type: 'text', required: false, countrySpecific: false, autoFillSource: '123invalid' }],
      'fields',
      result,
      isValidDotNotation,
    );
    expect(result.warnings.some(w => w.message.includes('dot notation'))).toBe(true);
  });

  it('errors when fields is not an array', () => {
    const result = emptyResult();
    validateFields('not-an-array' as never, 'fields', result, isValidDotNotation);
    expect(result.errors.some(e => e.message.includes('must be an array'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateSections
// ---------------------------------------------------------------------------
describe('validateSections', () => {
  it('passes for valid sections', () => {
    const result = emptyResult();
    validateSections(
      [{ id: 's1', title: 'Section 1', fields: [{ id: 'f1', label: 'F', type: 'text', required: false, countrySpecific: false }] }],
      result,
      isValidDotNotation,
    );
    expect(result.errors).toHaveLength(0);
  });

  it('errors on empty sections array', () => {
    const result = emptyResult();
    validateSections([], result, isValidDotNotation);
    expect(result.errors.some(e => e.message.includes('non-empty array'))).toBe(true);
  });

  it('errors on duplicate section IDs', () => {
    const result = emptyResult();
    validateSections(
      [
        { id: 'dup', title: 'A', fields: [] },
        { id: 'dup', title: 'B', fields: [] },
      ],
      result,
      isValidDotNotation,
    );
    expect(result.errors.some(e => e.message.includes('Duplicate section ID'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateSubmissionGuide
// ---------------------------------------------------------------------------
describe('validateSubmissionGuide', () => {
  it('passes for valid sequential guide', () => {
    const result = emptyResult();
    validateSubmissionGuide(
      [
        { order: 1, title: 'Step 1', description: 'Desc', fieldsOnThisScreen: [] },
        { order: 2, title: 'Step 2', description: 'Desc', fieldsOnThisScreen: [] },
      ] as never,
      result,
      isSequential,
    );
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('errors on empty guide', () => {
    const result = emptyResult();
    validateSubmissionGuide([], result, isSequential);
    expect(result.errors.some(e => e.message.includes('non-empty array'))).toBe(true);
  });

  it('errors on duplicate step orders', () => {
    const result = emptyResult();
    validateSubmissionGuide(
      [
        { order: 1, title: 'A', description: 'D', fieldsOnThisScreen: [] },
        { order: 1, title: 'B', description: 'D', fieldsOnThisScreen: [] },
      ] as never,
      result,
      isSequential,
    );
    expect(result.errors.some(e => e.message.includes('Duplicate step order'))).toBe(true);
  });

  it('warns when orders are not sequential from 1', () => {
    const result = emptyResult();
    validateSubmissionGuide(
      [{ order: 3, title: 'A', description: 'D', fieldsOnThisScreen: [] }] as never,
      result,
      isSequential,
    );
    expect(result.warnings.some(w => w.message.includes('sequential'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateMetadata
// ---------------------------------------------------------------------------
describe('validateMetadata', () => {
  it('passes for valid metadata', () => {
    const result = emptyResult();
    validateMetadata({ complexity: 'medium', implementationStatus: 'complete', maintenanceFrequency: 'monthly' }, result);
    expect(result.errors).toHaveLength(0);
  });

  it('errors on invalid complexity', () => {
    const result = emptyResult();
    validateMetadata({ complexity: 'extreme' }, result);
    expect(result.errors.some(e => e.message.includes('Invalid complexity'))).toBe(true);
  });

  it('errors on invalid implementation status', () => {
    const result = emptyResult();
    validateMetadata({ implementationStatus: 'done' }, result);
    expect(result.errors.some(e => e.message.includes('Invalid implementation status'))).toBe(true);
  });

  it('warns when priority is less than 1', () => {
    const result = emptyResult();
    validateMetadata({ priority: 0 }, result);
    expect(result.warnings.some(w => w.message.includes('Priority'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateChangeDetection
// ---------------------------------------------------------------------------
describe('validateChangeDetection', () => {
  it('passes for valid config', () => {
    const result = emptyResult();
    validateChangeDetection({ monitoredSelectors: ['.form'], changeThreshold: 50 }, result);
    expect(result.errors).toHaveLength(0);
  });

  it('warns on missing monitored selectors', () => {
    const result = emptyResult();
    validateChangeDetection({ monitoredSelectors: [], changeThreshold: 50 }, result);
    expect(result.warnings.some(w => w.message.includes('monitored selectors'))).toBe(true);
  });

  it('errors on invalid change threshold', () => {
    const result = emptyResult();
    validateChangeDetection({ monitoredSelectors: ['.x'], changeThreshold: 200 }, result);
    expect(result.errors.some(e => e.message.includes('between 0 and 100'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validatePortalFlow
// ---------------------------------------------------------------------------
describe('validatePortalFlow', () => {
  it('passes for valid portal flow', () => {
    const result = emptyResult();
    validatePortalFlow({ requiresAccount: true, multiStep: false }, result);
    expect(result.errors).toHaveLength(0);
  });

  it('errors when requiresAccount is not boolean', () => {
    const result = emptyResult();
    validatePortalFlow({ requiresAccount: 'yes', multiStep: true }, result);
    expect(result.errors.some(e => e.message.includes('requiresAccount must be a boolean'))).toBe(true);
  });

  it('errors on invalid prerequisite type', () => {
    const result = emptyResult();
    validatePortalFlow(
      { requiresAccount: true, multiStep: true, prerequisites: [{ type: 'magic' }] },
      result,
    );
    expect(result.errors.some(e => e.message.includes('Invalid prerequisite type'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateAutomation
// ---------------------------------------------------------------------------
describe('validateAutomation', () => {
  it('passes for valid automation config', () => {
    const result = emptyResult();
    validateAutomation({ enabled: true, entryUrl: 'https://example.gov', successIndicators: ['.success'] }, result);
    expect(result.errors).toHaveLength(0);
  });

  it('errors when enabled is not boolean', () => {
    const result = emptyResult();
    validateAutomation({ enabled: 'yes', entryUrl: 'x', successIndicators: [] }, result);
    expect(result.errors.some(e => e.message.includes('must be a boolean'))).toBe(true);
  });

  it('errors when entryUrl is missing', () => {
    const result = emptyResult();
    validateAutomation({ enabled: true, entryUrl: '', successIndicators: [] }, result);
    expect(result.errors.some(e => e.message.includes('entryUrl is required'))).toBe(true);
  });

  it('warns when successIndicators is empty', () => {
    const result = emptyResult();
    validateAutomation({ enabled: true, entryUrl: 'https://x', successIndicators: [] }, result);
    expect(result.warnings.some(w => w.message.includes('success indicators'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateFieldAutomation
// ---------------------------------------------------------------------------
describe('validateFieldAutomation', () => {
  it('passes for valid field automation', () => {
    const result = emptyResult();
    validateFieldAutomation({ fillMethod: 'input' }, 'path', result);
    expect(result.errors).toHaveLength(0);
  });

  it('errors on invalid fillMethod', () => {
    const result = emptyResult();
    validateFieldAutomation({ fillMethod: 'magic' }, 'path', result);
    expect(result.errors.some(e => e.message.includes('Invalid fillMethod'))).toBe(true);
  });

  it('errors when dependencies is not an array', () => {
    const result = emptyResult();
    validateFieldAutomation({ dependencies: 'not-array' }, 'path', result);
    expect(result.errors.some(e => e.message.includes('must be an array'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateStepAutomation
// ---------------------------------------------------------------------------
describe('validateStepAutomation', () => {
  it('passes for valid step automation', () => {
    const result = emptyResult();
    validateStepAutomation({ actions: [{ type: 'click', selector: '#btn' }] }, 'path', result);
    expect(result.errors).toHaveLength(0);
  });

  it('errors on invalid action type', () => {
    const result = emptyResult();
    validateStepAutomation({ actions: [{ type: 'teleport' }] }, 'path', result);
    expect(result.errors.some(e => e.message.includes('Invalid action type'))).toBe(true);
  });

  it('errors when navigate action has no value', () => {
    const result = emptyResult();
    validateStepAutomation({ actions: [{ type: 'navigate' }] }, 'path', result);
    expect(result.errors.some(e => e.message.includes('URL value'))).toBe(true);
  });

  it('errors when click action has no selector', () => {
    const result = emptyResult();
    validateStepAutomation({ actions: [{ type: 'click' }] }, 'path', result);
    expect(result.errors.some(e => e.message.includes('must have a selector'))).toBe(true);
  });
});
