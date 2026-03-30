/**
 * Shared test helpers for country mapping validation.
 *
 * These tests verify properties that every supported country mapping must
 * satisfy. Import and call `runSharedMappingTests` from each mapping test
 * file to avoid duplication.
 */

import type { AutomationScript } from '../../../../src/types/submission';

const VALID_INPUT_TYPES = ['text', 'select', 'radio', 'checkbox', 'date', 'file'] as const;
const VALID_TRANSFORM_TYPES = ['date_format', 'country_code', 'boolean_to_yesno', 'custom'] as const;

/** Extract all field IDs from a JSON schema. */
function extractSchemaFieldIds(schema: { sections: Array<{ fields: Array<{ id: string }> }> }): Set<string> {
  const ids = new Set<string>();
  for (const section of schema.sections) {
    for (const field of section.fields) {
      ids.add(field.id);
    }
  }
  return ids;
}

/** Checks whether a CSS selector string is parseable (no obvious syntax errors). */
function isValidCssSelector(selector: string): boolean {
  if (!selector || typeof selector !== 'string') return false;
  const parts = selector.split(',').map((s) => s.trim());
  if (parts.some((p) => p.length === 0)) return false;
  const validStart = /^[#.\[a-zA-Z*]/;
  return parts.every((p) => validStart.test(p));
}

/**
 * Runs the subset of mapping tests that are identical across all country
 * mappings. Call this inside the top-level `describe` block of each
 * `__tests__/services/submission/mappings/<ISO>.test.ts` file.
 *
 * @param mapping - The country automation script / mapping config
 * @param schema - The corresponding JSON schema (for field ID cross-reference)
 * @param countryCode - ISO 3166-1 alpha-3 code (e.g. 'JPN')
 */
export function runSharedMappingTests(
  mapping: AutomationScript,
  schema: { sections: Array<{ fields: Array<{ id: string }> }> },
  countryCode: string,
): void {
  const schemaFieldIds = extractSchemaFieldIds(schema);
  const fieldMappings = mapping.fieldMappings;
  const fieldIds = Object.keys(fieldMappings);

  it('has a non-empty fieldMappings object', () => {
    expect(fieldIds.length).toBeGreaterThan(0);
  });

  it(`country code is ${countryCode}`, () => {
    expect(mapping.countryCode).toBe(countryCode);
  });

  it('has at least one automation step', () => {
    expect(mapping.steps.length).toBeGreaterThan(0);
  });

  describe('each field mapping', () => {
    it.each(fieldIds)('field "%s" has a valid fieldId string', (fieldId) => {
      const m = fieldMappings[fieldId];
      expect(typeof m.fieldId).toBe('string');
      expect(m.fieldId.length).toBeGreaterThan(0);
    });

    it.each(fieldIds)('field "%s" has a valid CSS selector', (fieldId) => {
      const m = fieldMappings[fieldId];
      expect(isValidCssSelector(m.selector)).toBe(true);
    });

    it.each(fieldIds)('field "%s" has a valid inputType', (fieldId) => {
      const m = fieldMappings[fieldId];
      expect(VALID_INPUT_TYPES).toContain(m.inputType);
    });

    it.each(fieldIds)('field "%s" has a well-formed transform (if present)', (fieldId) => {
      const m = fieldMappings[fieldId];
      if (m.transform) {
        expect(VALID_TRANSFORM_TYPES).toContain(m.transform.type);
        if (m.transform.config !== undefined) {
          expect(typeof m.transform.config).toBe('object');
          expect(m.transform.config).not.toBeNull();
        }
      }
    });

    it.each(fieldIds)(`field "%s" exists in the ${countryCode} JSON schema`, (fieldId) => {
      expect(schemaFieldIds.has(fieldId)).toBe(true);
    });
  });
}
