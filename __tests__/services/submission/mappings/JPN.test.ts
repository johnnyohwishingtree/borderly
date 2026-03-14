/**
 * Tests for Japan (JPN) field mappings.
 *
 * Validates that:
 * - All field IDs in the mapping exist in the JPN JSON schema
 * - All selectors are non-empty strings (valid CSS selector syntax)
 * - All inputTypes are valid enum values
 * - Transform configs are well-formed
 */

import JPN_MAPPING from '../../../../src/services/submission/mappings/JPN';
import JPNSchema from '../../../../src/schemas/JPN.json';

const VALID_INPUT_TYPES = ['text', 'select', 'radio', 'checkbox', 'date', 'file'] as const;
const VALID_TRANSFORM_TYPES = ['date_format', 'country_code', 'boolean_to_yesno', 'custom'] as const;

/** Extract all field IDs from a JSON schema. */
function extractSchemaFieldIds(schema: typeof JPNSchema): Set<string> {
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
  // Split comma-separated selectors and validate each part is non-empty.
  const parts = selector.split(',').map((s) => s.trim());
  if (parts.some((p) => p.length === 0)) return false;
  // Each part must start with a valid CSS selector character.
  const validStart = /^[#.\[a-zA-Z*]/;
  return parts.every((p) => validStart.test(p));
}

describe('JPN field mappings', () => {
  const schemaFieldIds = extractSchemaFieldIds(JPNSchema);
  const fieldMappings = JPN_MAPPING.fieldMappings;
  const fieldIds = Object.keys(fieldMappings);

  it('has a non-empty fieldMappings object', () => {
    expect(fieldIds.length).toBeGreaterThan(0);
  });

  it('country code is JPN', () => {
    expect(JPN_MAPPING.countryCode).toBe('JPN');
  });

  it('has at least one automation step', () => {
    expect(JPN_MAPPING.steps.length).toBeGreaterThan(0);
  });

  describe.each(fieldIds)('field "%s"', (fieldId) => {
    const mapping = fieldMappings[fieldId];

    it('has a valid fieldId string', () => {
      expect(typeof mapping.fieldId).toBe('string');
      expect(mapping.fieldId.length).toBeGreaterThan(0);
    });

    it('has a valid CSS selector', () => {
      expect(isValidCssSelector(mapping.selector)).toBe(true);
    });

    it('has a valid inputType', () => {
      expect(VALID_INPUT_TYPES).toContain(mapping.inputType);
    });

    it('has a well-formed transform (if present)', () => {
      if (mapping.transform) {
        expect(VALID_TRANSFORM_TYPES).toContain(mapping.transform.type);
        if (mapping.transform.config !== undefined) {
          expect(typeof mapping.transform.config).toBe('object');
          expect(mapping.transform.config).not.toBeNull();
        }
      }
    });

    it('exists in the JPN JSON schema', () => {
      expect(schemaFieldIds.has(fieldId)).toBe(true);
    });
  });

  it('has core personal info fields', () => {
    expect(fieldIds).toContain('surname');
    expect(fieldIds).toContain('givenNames');
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('nationality');
    expect(fieldIds).toContain('dateOfBirth');
  });

  it('date fields have date_format transform', () => {
    const dateFields = fieldIds.filter((id) => fieldMappings[id].inputType === 'date');
    dateFields.forEach((id) => {
      const transform = fieldMappings[id].transform;
      expect(transform).toBeDefined();
      expect(transform?.type).toBe('date_format');
    });
  });
});
