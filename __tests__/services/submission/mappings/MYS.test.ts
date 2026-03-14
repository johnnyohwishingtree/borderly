/**
 * Tests for Malaysia (MYS) field mappings.
 *
 * Validates that:
 * - All field IDs in the mapping exist in the MYS JSON schema
 * - All selectors are non-empty strings (valid CSS selector syntax)
 * - All inputTypes are valid enum values
 * - Transform configs are well-formed
 */

import MYS_MAPPING from '../../../../src/services/submission/mappings/MYS';
import MYSSchema from '../../../../src/schemas/MYS.json';

const VALID_INPUT_TYPES = ['text', 'select', 'radio', 'checkbox', 'date', 'file'] as const;
const VALID_TRANSFORM_TYPES = ['date_format', 'country_code', 'boolean_to_yesno', 'custom'] as const;

/** Extract all field IDs from a JSON schema. */
function extractSchemaFieldIds(schema: typeof MYSSchema): Set<string> {
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

describe('MYS field mappings', () => {
  const schemaFieldIds = extractSchemaFieldIds(MYSSchema);
  const fieldMappings = MYS_MAPPING.fieldMappings;
  const fieldIds = Object.keys(fieldMappings);

  it('has a non-empty fieldMappings object', () => {
    expect(fieldIds.length).toBeGreaterThan(0);
  });

  it('country code is MYS', () => {
    expect(MYS_MAPPING.countryCode).toBe('MYS');
  });

  it('has at least one automation step', () => {
    expect(MYS_MAPPING.steps.length).toBeGreaterThan(0);
  });

  describe('each field mapping', () => {
    it.each(fieldIds)('field "%s" has a valid fieldId string', (fieldId) => {
      const mapping = fieldMappings[fieldId];
      expect(typeof mapping.fieldId).toBe('string');
      expect(mapping.fieldId.length).toBeGreaterThan(0);
    });

    it.each(fieldIds)('field "%s" has a valid CSS selector', (fieldId) => {
      const mapping = fieldMappings[fieldId];
      expect(isValidCssSelector(mapping.selector)).toBe(true);
    });

    it.each(fieldIds)('field "%s" has a valid inputType', (fieldId) => {
      const mapping = fieldMappings[fieldId];
      expect(VALID_INPUT_TYPES).toContain(mapping.inputType);
    });

    it.each(fieldIds)('field "%s" has a well-formed transform (if present)', (fieldId) => {
      const mapping = fieldMappings[fieldId];
      if (mapping.transform) {
        expect(VALID_TRANSFORM_TYPES).toContain(mapping.transform.type);
        if (mapping.transform.config !== undefined) {
          expect(typeof mapping.transform.config).toBe('object');
          expect(mapping.transform.config).not.toBeNull();
        }
      }
    });

    it.each(fieldIds)('field "%s" exists in the MYS JSON schema', (fieldId) => {
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

  it('date fields use DD/MM/YYYY format (MDAC requirement)', () => {
    const dateFields = fieldIds.filter((id) => fieldMappings[id].inputType === 'date');
    dateFields.forEach((id) => {
      const transform = fieldMappings[id].transform;
      expect(transform).toBeDefined();
      expect(transform?.type).toBe('date_format');
      expect(transform?.config).toBeDefined();
      expect((transform?.config as { to?: string })?.to).toBe('DD/MM/YYYY');
    });
  });

  it('nationality field has country_code transform', () => {
    const nationalityMapping = fieldMappings['nationality'];
    expect(nationalityMapping).toBeDefined();
    expect(nationalityMapping.transform?.type).toBe('country_code');
  });

  it('boolean fields have boolean_to_yesno transform', () => {
    const booleanFields = fieldIds.filter((id) => fieldMappings[id].inputType === 'radio');
    booleanFields.forEach((id) => {
      const transform = fieldMappings[id].transform;
      expect(transform).toBeDefined();
      expect(transform?.type).toBe('boolean_to_yesno');
    });
  });
});
