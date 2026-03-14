/**
 * Tests for Singapore (SGP) field mappings.
 *
 * Validates that:
 * - All field IDs in the mapping exist in the SGP JSON schema
 * - All selectors are non-empty strings (valid CSS selector syntax)
 * - All inputTypes are valid enum values
 * - Transform configs are well-formed
 */

import SGP_MAPPING from '../../../../src/services/submission/mappings/SGP';
import SGPSchema from '../../../../src/schemas/SGP.json';

const VALID_INPUT_TYPES = ['text', 'select', 'radio', 'checkbox', 'date', 'file'] as const;
const VALID_TRANSFORM_TYPES = ['date_format', 'country_code', 'boolean_to_yesno', 'custom'] as const;

/** Extract all field IDs from a JSON schema. */
function extractSchemaFieldIds(schema: typeof SGPSchema): Set<string> {
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

describe('SGP field mappings', () => {
  const schemaFieldIds = extractSchemaFieldIds(SGPSchema);
  const fieldMappings = SGP_MAPPING.fieldMappings;
  const fieldIds = Object.keys(fieldMappings);

  it('has a non-empty fieldMappings object', () => {
    expect(fieldIds.length).toBeGreaterThan(0);
  });

  it('country code is SGP', () => {
    expect(SGP_MAPPING.countryCode).toBe('SGP');
  });

  it('has at least one automation step', () => {
    expect(SGP_MAPPING.steps.length).toBeGreaterThan(0);
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

    it('exists in the SGP JSON schema', () => {
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

  it('has health declaration fields', () => {
    expect(fieldIds).toContain('feverSymptoms');
    expect(fieldIds).toContain('infectiousDisease');
    expect(fieldIds).toContain('visitedOutbreakArea');
  });

  it('has customs declaration fields', () => {
    expect(fieldIds).toContain('exceedsAllowance');
    expect(fieldIds).toContain('carryingCash');
    expect(fieldIds).toContain('prohibitedGoods');
  });

  it('nationality field has country_code transform', () => {
    const nationalityMapping = fieldMappings['nationality'];
    expect(nationalityMapping).toBeDefined();
    expect(nationalityMapping.transform?.type).toBe('country_code');
  });
});
