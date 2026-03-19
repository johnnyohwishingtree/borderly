/**
 * Guide Step Validation Tests: CAN, GBR, USA
 *
 * Validates structural correctness of the submissionGuide for
 * Canada (CAN), United Kingdom (GBR), and United States (USA).
 *
 * These are the equivalent of THA/VNM guide step validation tests
 * introduced in the no-account-country-tests epic (Story #435).
 *
 * For each country the suite verifies:
 * 1. Each step has a non-empty title and description
 * 2. Each step has a valid stepType when present
 * 3. Copyable fields within steps have a label and a sourceField
 *    that maps to a real schema field
 * 4. The total step count is at least 3 (minimum viable guide)
 * 5. No two steps share the same step number
 * 6. (CAN only) At least one step communicates the archived /
 *    manual-only nature of the portal
 */

import { CountryFormSchema } from '../../src/types/schema';
import CAN from '../../src/schemas/CAN.json';
import GBR from '../../src/schemas/GBR.json';
import USA from '../../src/schemas/USA.json';

// Valid values for automation action types defined in SubmissionStep.automation.actions
const VALID_STEP_ACTION_TYPES = new Set<string>([
  'navigate',
  'fill',
  'copy',
  'submit',
  'wait',
  'click',
  'scroll',
  'upload',
]);

/** Collect every field ID defined across all sections of a schema. */
function getAllFieldIds(schema: CountryFormSchema): Set<string> {
  const ids = new Set<string>();
  schema.sections.forEach(section => {
    section.fields.forEach(field => {
      ids.add(field.id);
    });
  });
  return ids;
}

/**
 * Shared structural validation for submissionGuide steps.
 * Called at the top level of each country describe block so Jest
 * collects the test() declarations correctly.
 */
function runGuideStepValidation(schema: CountryFormSchema): void {
  const guide = schema.submissionGuide;

  // ── 1. Non-empty title ─────────────────────────────────────────────────────

  test('each step has a non-empty title', () => {
    expect(guide.length).toBeGreaterThan(0);
    guide.forEach(step => {
      expect(step.title).toEqual(expect.stringMatching(/\S/));
    });
  });

  // ── 2. Non-empty description ───────────────────────────────────────────────

  test('each step has a non-empty description', () => {
    expect(guide.length).toBeGreaterThan(0);
    guide.forEach(step => {
      expect(step.description).toEqual(expect.stringMatching(/\S/));
    });
  });

  // ── 3. Valid stepType when present ─────────────────────────────────────────
  //
  // SubmissionStep does not define a top-level stepType in the current TypeScript
  // interface — it lives inside automation.actions. If a future schema adds a
  // stepType property, this test catches invalid values.

  test('each step with an explicit stepType has a valid stepType', () => {
    guide.forEach(step => {
      const stepAny = step as any;
      if (stepAny.stepType !== undefined) {
        expect(VALID_STEP_ACTION_TYPES.has(stepAny.stepType as string)).toBe(true);
      }
    });
  });

  test('automation action types within steps are valid when present', () => {
    guide.forEach(step => {
      const actions = step.automation?.actions ?? [];
      actions.forEach(action => {
        expect(VALID_STEP_ACTION_TYPES.has(action.type)).toBe(true);
      });
    });
  });

  // ── 4. Copyable fields structural integrity ────────────────────────────────
  //
  // If a step defines copyableFields (an extension used in some schema variants),
  // each entry must have a non-empty label and a sourceField that resolves to a
  // real field ID defined in the schema's sections.

  test('copyable fields within steps have a label and a sourceField that maps to a schema field', () => {
    const allFieldIds = getAllFieldIds(schema);
    guide.forEach(step => {
      const stepAny = step as any;
      const copyableFields = stepAny.copyableFields as
        | Array<{ label: string; sourceField: string }>
        | undefined;
      if (!copyableFields) return;

      copyableFields.forEach(cf => {
        expect(typeof cf.label).toBe('string');
        expect(cf.label).toEqual(expect.stringMatching(/\S/));
        expect(cf.sourceField).toBeDefined();
        expect(allFieldIds.has(cf.sourceField)).toBe(true);
      });
    });
  });

  // ── 5. Minimum step count ──────────────────────────────────────────────────

  test('total step count is at least 3 (minimum viable guide)', () => {
    expect(guide.length).toBeGreaterThanOrEqual(3);
  });

  // ── 6. Unique step numbers ─────────────────────────────────────────────────

  test('no two steps share the same step number', () => {
    const orders = guide.map(s => s.order);
    const uniqueOrders = new Set(orders);
    expect(uniqueOrders.size).toBe(orders.length);
  });
}

// ── CAN ─────────────────────────────────────────────────────────────────────

describe('CAN Guide Step Validation', () => {
  const schema = CAN as CountryFormSchema;

  runGuideStepValidation(schema);

  // CAN-specific: at least one step must communicate the archived/manual-only
  // nature of the portal (ArriveCAN was discontinued in October 2023).
  test('at least one step communicates the archived/manual-only nature of the CAN portal', () => {
    const archiveKeywords = ['archived', 'discontinued', 'manual', 'no longer'];
    const guide = schema.submissionGuide;

    const stepCommunicatesArchive = guide.some(step => {
      const content = [step.title, step.description, ...(step.tips ?? [])]
        .join(' ')
        .toLowerCase();
      return archiveKeywords.some(kw => content.includes(kw));
    });

    expect(stepCommunicatesArchive).toBe(true);
  });
});

// ── GBR ─────────────────────────────────────────────────────────────────────

describe('GBR Guide Step Validation', () => {
  const schema = GBR as CountryFormSchema;

  runGuideStepValidation(schema);
});

// ── USA ─────────────────────────────────────────────────────────────────────

describe('USA Guide Step Validation', () => {
  const schema = USA as CountryFormSchema;

  runGuideStepValidation(schema);
});
