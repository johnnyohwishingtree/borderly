/**
 * Tests for United Kingdom (GBR) ETA field mappings.
 *
 * Validates that:
 * - All field IDs in the mapping exist in the GBR JSON schema
 * - All selectors are non-empty strings (valid CSS selector syntax)
 * - All inputTypes are valid enum values
 * - Transform configs are well-formed
 */

import GBR_MAPPING from '../../../../src/services/submission/mappings/GBR';
import GBRSchema from '../../../../src/schemas/GBR.json';

const VALID_INPUT_TYPES = ['text', 'select', 'radio', 'checkbox', 'date', 'file'] as const;
const VALID_TRANSFORM_TYPES = ['date_format', 'country_code', 'boolean_to_yesno', 'custom'] as const;

/** Extract all field IDs from a JSON schema. */
function extractSchemaFieldIds(schema: typeof GBRSchema): Set<string> {
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

describe('GBR field mappings', () => {
  const schemaFieldIds = extractSchemaFieldIds(GBRSchema);
  const fieldMappings = GBR_MAPPING.fieldMappings;
  const fieldIds = Object.keys(fieldMappings);

  it('has a non-empty fieldMappings object', () => {
    expect(fieldIds.length).toBeGreaterThan(0);
  });

  it('country code is GBR', () => {
    expect(GBR_MAPPING.countryCode).toBe('GBR');
  });

  it('has at least one automation step', () => {
    expect(GBR_MAPPING.steps.length).toBeGreaterThan(0);
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

    it('exists in the GBR JSON schema', () => {
      expect(schemaFieldIds.has(fieldId)).toBe(true);
    });
  });

  it('has core personal info fields', () => {
    expect(fieldIds).toContain('givenNames');
    expect(fieldIds).toContain('familyName');
    expect(fieldIds).toContain('dateOfBirth');
    expect(fieldIds).toContain('nationality');
    expect(fieldIds).toContain('gender');
  });

  it('has passport fields', () => {
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('passportCountryOfIssue');
    expect(fieldIds).toContain('passportIssueDate');
    expect(fieldIds).toContain('passportExpiryDate');
  });

  it('has address fields (GOV.UK pattern)', () => {
    expect(fieldIds).toContain('addressLine1');
    expect(fieldIds).toContain('city');
    expect(fieldIds).toContain('country');
  });

  it('has security question fields', () => {
    expect(fieldIds).toContain('criminalRecord');
    expect(fieldIds).toContain('immigrationBreach');
    expect(fieldIds).toContain('ukRefusal');
    expect(fieldIds).toContain('terrorismAssociation');
  });

  it('uses GOV.UK kebab-case selectors', () => {
    // GOV.UK design system uses kebab-case IDs
    const kebabSelectors = fieldIds
      .map((id) => fieldMappings[id].selector)
      .filter((s) => s.startsWith('#'));
    expect(kebabSelectors.length).toBeGreaterThan(0);
    // Check some selectors contain kebab-case
    const hasKebabCase = kebabSelectors.some((s) => s.includes('-'));
    expect(hasKebabCase).toBe(true);
  });

  it('nationality field has country_code transform', () => {
    const nationalityMapping = fieldMappings['nationality'];
    expect(nationalityMapping).toBeDefined();
    expect(nationalityMapping.transform?.type).toBe('country_code');
  });
});
