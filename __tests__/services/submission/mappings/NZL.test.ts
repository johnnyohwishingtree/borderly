/**
 * Tests for New Zealand (NZL) field mappings.
 *
 * Validates that:
 * - All field IDs in the mapping exist in the NZL JSON schema
 * - All selectors are non-empty strings (valid CSS selector syntax)
 * - All inputTypes are valid enum values
 * - Transform configs are well-formed
 * - No loginSelectors (guest portal)
 * - Date format is DD/MM/YYYY
 */

import NZL_MAPPING from '../../../../src/services/submission/mappings/NZL';
import NZLSchema from '../../../../src/schemas/NZL.json';

const VALID_INPUT_TYPES = ['text', 'select', 'radio', 'checkbox', 'date', 'file'] as const;
const VALID_TRANSFORM_TYPES = ['date_format', 'country_code', 'boolean_to_yesno', 'custom'] as const;

/** Extract all field IDs from a JSON schema. */
function extractSchemaFieldIds(schema: typeof NZLSchema): Set<string> {
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

describe('NZL field mappings', () => {
  const schemaFieldIds = extractSchemaFieldIds(NZLSchema);
  const fieldMappings = NZL_MAPPING.fieldMappings;
  const fieldIds = Object.keys(fieldMappings);

  it('has a non-empty fieldMappings object', () => {
    expect(fieldIds.length).toBeGreaterThan(0);
  });

  it('country code is NZL', () => {
    expect(NZL_MAPPING.countryCode).toBe('NZL');
  });

  it('has at least one automation step', () => {
    expect(NZL_MAPPING.steps.length).toBeGreaterThan(0);
  });

  it('does not have loginSelectors (guest portal)', () => {
    expect(NZL_MAPPING.loginSelectors).toBeUndefined();
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

    it.each(fieldIds)('field "%s" exists in the NZL JSON schema', (fieldId) => {
      expect(schemaFieldIds.has(fieldId)).toBe(true);
    });
  });

  it('has core personal info fields', () => {
    expect(fieldIds).toContain('familyName');
    expect(fieldIds).toContain('givenNames');
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

  it('date transforms use DD/MM/YYYY format', () => {
    const dateFields = fieldIds.filter((id) => fieldMappings[id].inputType === 'date');
    dateFields.forEach((id) => {
      const config = fieldMappings[id].transform?.config as Record<string, string> | undefined;
      expect(config?.to).toBe('DD/MM/YYYY');
    });
  });

  it('includes arrivalAirport field', () => {
    expect(fieldIds).toContain('arrivalAirport');
  });

  it('biosecurity boolean fields use boolean_to_yesno transform', () => {
    const booleanFields = ['hasFoodItems', 'hasPlantItems', 'hasAnimalItems', 'hasSoilOrWaterItems'];
    booleanFields.forEach((id) => {
      if (fieldMappings[id]) {
        const transform = fieldMappings[id].transform;
        expect(transform).not.toBeUndefined();
        expect(transform?.type).toBe('boolean_to_yesno');
      }
    });
  });

  it('goods declaration boolean fields use boolean_to_yesno transform', () => {
    const goodsFields = ['hasCurrencyOver10000', 'hasControlledItems', 'hasGoodsExceedingAllowance'];
    goodsFields.forEach((id) => {
      if (fieldMappings[id]) {
        const transform = fieldMappings[id].transform;
        expect(transform).not.toBeUndefined();
        expect(transform?.type).toBe('boolean_to_yesno');
      }
    });
  });
});
