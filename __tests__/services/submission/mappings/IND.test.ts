/**
 * Tests for India (IND) field mappings.
 *
 * Validates that:
 * - All field IDs in the mapping exist in the IND JSON schema
 * - All selectors are non-empty strings (valid CSS selector syntax)
 * - All inputTypes are valid enum values
 * - Transform configs are well-formed
 * - No loginSelectors (guest portal)
 */

import IND_MAPPING from '../../../../src/services/submission/mappings/IND';
import INDSchema from '../../../../src/schemas/IND.json';

const VALID_INPUT_TYPES = ['text', 'select', 'radio', 'checkbox', 'date', 'file'] as const;
const VALID_TRANSFORM_TYPES = ['date_format', 'country_code', 'boolean_to_yesno', 'custom'] as const;

/** Extract all field IDs from a JSON schema. */
function extractSchemaFieldIds(schema: typeof INDSchema): Set<string> {
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

describe('IND field mappings', () => {
  const schemaFieldIds = extractSchemaFieldIds(INDSchema);
  const fieldMappings = IND_MAPPING.fieldMappings;
  const fieldIds = Object.keys(fieldMappings);

  it('has a non-empty fieldMappings object', () => {
    expect(fieldIds.length).toBeGreaterThan(0);
  });

  it('country code is IND', () => {
    expect(IND_MAPPING.countryCode).toBe('IND');
  });

  it('has at least one automation step', () => {
    expect(IND_MAPPING.steps.length).toBeGreaterThan(0);
  });

  it('does not have loginSelectors (guest portal)', () => {
    expect(IND_MAPPING.loginSelectors).toBeUndefined();
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

    it.each(fieldIds)('field "%s" exists in the IND JSON schema', (fieldId) => {
      expect(schemaFieldIds.has(fieldId)).toBe(true);
    });
  });

  it('has core personal info fields', () => {
    expect(fieldIds).toContain('surname');
    expect(fieldIds).toContain('givenName');
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('nationality');
    expect(fieldIds).toContain('dateOfBirth');
  });

  it('date fields have date_format transform', () => {
    const dateFields = fieldIds.filter((id) => fieldMappings[id].inputType === 'date');
    dateFields.forEach((id) => {
      const transform = fieldMappings[id].transform;
      expect(transform).not.toBeUndefined();
      expect(transform?.type).toBe('date_format');
    });
  });

  it('health declaration boolean fields use boolean_to_yesno transform', () => {
    const healthFields = ['feverOrCough', 'contactWithInfected'];
    healthFields.forEach((id) => {
      if (fieldMappings[id]) {
        const transform = fieldMappings[id].transform;
        expect(transform).not.toBeUndefined();
        expect(transform?.type).toBe('boolean_to_yesno');
      }
    });
  });

  it('customs declaration boolean fields use boolean_to_yesno transform', () => {
    const customsFields = ['carryingCurrency', 'dutiableGoods', 'prohibitedItems', 'commercialGoods'];
    customsFields.forEach((id) => {
      if (fieldMappings[id]) {
        const transform = fieldMappings[id].transform;
        expect(transform).not.toBeUndefined();
        expect(transform?.type).toBe('boolean_to_yesno');
      }
    });
  });

  it('country code fields use country_code transform', () => {
    const countryFields = ['nationality', 'passportIssuingCountry', 'departureCountry'];
    countryFields.forEach((id) => {
      if (fieldMappings[id]) {
        const transform = fieldMappings[id].transform;
        expect(transform).not.toBeUndefined();
        expect(transform?.type).toBe('country_code');
      }
    });
  });

  it('has India-specific fields (visa, passport type, place of birth)', () => {
    expect(fieldIds).toContain('visaType');
    expect(fieldIds).toContain('passportType');
    expect(fieldIds).toContain('placeOfBirth');
  });
});
