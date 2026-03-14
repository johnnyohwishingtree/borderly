/**
 * Tests for United States (USA) ESTA field mappings.
 *
 * Validates that:
 * - All field IDs in the mapping exist in the USA JSON schema
 * - All selectors are non-empty strings (valid CSS selector syntax)
 * - All inputTypes are valid enum values
 * - Transform configs are well-formed
 */

import USA_MAPPING from '../../../../src/services/submission/mappings/USA';
import USASchema from '../../../../src/schemas/USA.json';

const VALID_INPUT_TYPES = ['text', 'select', 'radio', 'checkbox', 'date', 'file'] as const;
const VALID_TRANSFORM_TYPES = ['date_format', 'country_code', 'boolean_to_yesno', 'custom'] as const;

/** Extract all field IDs from a JSON schema. */
function extractSchemaFieldIds(schema: typeof USASchema): Set<string> {
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

describe('USA field mappings', () => {
  const schemaFieldIds = extractSchemaFieldIds(USASchema);
  const fieldMappings = USA_MAPPING.fieldMappings;
  const fieldIds = Object.keys(fieldMappings);

  it('has a non-empty fieldMappings object', () => {
    expect(fieldIds.length).toBeGreaterThan(0);
  });

  it('country code is USA', () => {
    expect(USA_MAPPING.countryCode).toBe('USA');
  });

  it('has at least one automation step', () => {
    expect(USA_MAPPING.steps.length).toBeGreaterThan(0);
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

    it('exists in the USA JSON schema', () => {
      expect(schemaFieldIds.has(fieldId)).toBe(true);
    });
  });

  it('has core applicant fields', () => {
    expect(fieldIds).toContain('surname');
    expect(fieldIds).toContain('firstName');
    expect(fieldIds).toContain('dateOfBirth');
    expect(fieldIds).toContain('gender');
  });

  it('has passport fields', () => {
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('passportCountry');
    expect(fieldIds).toContain('passportIssueDate');
    expect(fieldIds).toContain('passportExpirationDate');
  });

  it('has eligibility question fields', () => {
    expect(fieldIds).toContain('terrorism');
    expect(fieldIds).toContain('drugConviction');
    expect(fieldIds).toContain('visaRefusal');
  });

  it('date fields use MM/DD/YYYY format (ESTA requirement)', () => {
    const dateFields = fieldIds.filter((id) => fieldMappings[id].inputType === 'date');
    dateFields.forEach((id) => {
      const transform = fieldMappings[id].transform;
      expect(transform).toBeDefined();
      expect(transform?.type).toBe('date_format');
      expect((transform?.config as { to?: string })?.to).toBe('MM/DD/YYYY');
    });
  });

  it('eligibility question fields use Y/N boolean transform', () => {
    const eligibilityFields = [
      'terrorism', 'drugConviction', 'visaRefusal', 'mentalDisorder', 'genocide',
    ];
    eligibilityFields.forEach((fieldId) => {
      const mapping = fieldMappings[fieldId];
      if (mapping) {
        expect(mapping.transform?.type).toBe('boolean_to_yesno');
        const config = mapping.transform?.config as { trueValue?: string; falseValue?: string } | undefined;
        expect(config?.trueValue).toBe('Y');
        expect(config?.falseValue).toBe('N');
      }
    });
  });
});
