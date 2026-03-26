/**
 * Tests for submissionEngine/engineHelpers
 */

import {
  generateSessionId,
  extractFormData,
  prepareStepData,
  injectFormData,
  categorizeOutcome,
} from '@/services/submission/submissionEngine/engineHelpers';
import { FilledForm } from '@/services/forms/formEngine';
import { AutomationScript, SubmissionResult } from '@/types/submission';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const defaultFieldProps = {
  source: 'auto' as const,
  needsUserInput: false,
  countrySpecific: false,
};

function makeFilledForm(overrides?: Partial<FilledForm>): FilledForm {
  return {
    countryCode: 'JPN',
    countryName: 'Japan',
    portalName: 'Visit Japan Web',
    portalUrl: 'https://vjw-lp.digital.go.jp',
    sections: [
      {
        id: 'personal',
        title: 'Personal Info',
        fields: [
          { id: 'surname', label: 'Surname', type: 'text', currentValue: 'Tanaka', required: true, ...defaultFieldProps },
          { id: 'givenNames', label: 'Given Names', type: 'text', currentValue: 'Taro', required: true, ...defaultFieldProps },
          { id: 'emptyField', label: 'Empty', type: 'text', currentValue: '', required: false, ...defaultFieldProps },
        ],
      },
      {
        id: 'travel',
        title: 'Travel Info',
        fields: [
          { id: 'flightNumber', label: 'Flight', type: 'text', currentValue: 'JL001', required: false, ...defaultFieldProps },
        ],
      },
    ],
    stats: { totalFields: 4, autoFilled: 3, userFilled: 0, remaining: 1, completionPercentage: 75 },
    ...overrides,
  };
}

function makeSubmissionResult(overrides?: Partial<SubmissionResult>): SubmissionResult {
  return {
    sessionId: 'sub_123',
    status: 'completed',
    method: 'automated',
    duration: 5000,
    stepsCompleted: 3,
    errors: [],
    nextSteps: { type: 'completed', description: 'Done', actions: [] },
    ...overrides,
  };
}

function makeAutomationScript(overrides?: Partial<AutomationScript>): AutomationScript {
  return {
    countryCode: 'JPN',
    portalName: 'Visit Japan Web',
    portalUrl: 'https://vjw-lp.digital.go.jp',
    version: '1.0',
    steps: [],
    fieldMappings: {
      surname: { fieldId: 'surname', selector: '#surname', inputType: 'text' },
      givenNames: { fieldId: 'givenNames', selector: '#given', inputType: 'text' },
      flightNumber: { fieldId: 'flightNumber', selector: '#flight', inputType: 'text' },
    },
    prerequisites: { cookiesEnabled: true, javascriptEnabled: true },
    ...overrides,
  } as AutomationScript;
}

// ---------------------------------------------------------------------------
// generateSessionId
// ---------------------------------------------------------------------------
describe('generateSessionId', () => {
  it('returns a string starting with "sub_"', () => {
    const id = generateSessionId();
    expect(id.startsWith('sub_')).toBe(true);
  });

  it('returns unique IDs on successive calls', () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateSessionId()));
    expect(ids.size).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// extractFormData
// ---------------------------------------------------------------------------
describe('extractFormData', () => {
  it('returns a flat map of non-empty field values', () => {
    const data = extractFormData(makeFilledForm());
    expect(data).toEqual({
      surname: 'Tanaka',
      givenNames: 'Taro',
      flightNumber: 'JL001',
    });
  });

  it('excludes fields with empty or undefined values', () => {
    const data = extractFormData(makeFilledForm());
    expect(data).not.toHaveProperty('emptyField');
  });

  it('returns empty object for form with no filled fields', () => {
    const form = makeFilledForm({
      sections: [
        {
          id: 's1',
          title: 'S1',
          fields: [
            { id: 'f1', label: 'F1', type: 'text', currentValue: '', required: false, ...defaultFieldProps },
          ],
        },
      ],
    });
    expect(extractFormData(form)).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// prepareStepData
// ---------------------------------------------------------------------------
describe('prepareStepData', () => {
  it('returns only fields that exist in both formData and script fieldMappings', () => {
    const form = makeFilledForm();
    const script = makeAutomationScript({
      fieldMappings: {
        surname: { fieldId: 'surname', selector: '#s', inputType: 'text' },
        // givenNames not in mappings
      },
    } as Partial<AutomationScript>);

    const data = prepareStepData({}, form, script);
    expect(data).toEqual({ surname: 'Tanaka' });
    expect(data).not.toHaveProperty('givenNames');
  });

  it('returns empty object when no mappings match form data', () => {
    const form = makeFilledForm();
    const script = makeAutomationScript({
      fieldMappings: {
        nonExistentField: { fieldId: 'nonExistentField', selector: '#x', inputType: 'text' },
      },
    } as Partial<AutomationScript>);

    expect(prepareStepData({}, form, script)).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// injectFormData
// ---------------------------------------------------------------------------
describe('injectFormData', () => {
  it('replaces {{key}} placeholders with JSON-stringified values', () => {
    const result = injectFormData('name={{surname}}, age={{age}}', {
      surname: 'Tanaka',
      age: 30,
    });
    expect(result).toBe('name="Tanaka", age=30');
  });

  it('replaces all occurrences of the same placeholder', () => {
    const result = injectFormData('{{x}} and {{x}}', { x: 'hi' });
    expect(result).toBe('"hi" and "hi"');
  });

  it('returns original string when no placeholders match', () => {
    const result = injectFormData('no placeholders here', { a: 1 });
    expect(result).toBe('no placeholders here');
  });
});

// ---------------------------------------------------------------------------
// categorizeOutcome
// ---------------------------------------------------------------------------
describe('categorizeOutcome', () => {
  it('maps "completed" status to "success"', () => {
    expect(categorizeOutcome(makeSubmissionResult({ status: 'completed' }))).toBe('success');
  });

  it('maps "manual_fallback" status to "partial_success"', () => {
    expect(categorizeOutcome(makeSubmissionResult({ status: 'manual_fallback' }))).toBe('partial_success');
  });

  it('maps "failed" status to "failure"', () => {
    expect(categorizeOutcome(makeSubmissionResult({ status: 'failed' }))).toBe('failure');
  });

  it('maps any other status to "user_abandoned"', () => {
    expect(categorizeOutcome(makeSubmissionResult({ status: 'cancelled' as never }))).toBe('user_abandoned');
  });
});
