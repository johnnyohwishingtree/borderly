/**
 * Tests for United States (USA) field mapping config.
 *
 * Validates:
 * - All field IDs in the mapping exist in the USA JSON schema
 * - All selectors are non-empty strings
 * - All inputTypes are valid enum values
 * - Transform configs are well-formed
 */

import USA_MAPPING from '../../../../src/services/submission/mappings/USA';
import USA_SCHEMA from '../../../../src/schemas/USA.json';

type SchemaSection = { fields: Array<{ id: string }> };

// Collect all field IDs from the USA schema sections
const schemaFieldIds = new Set<string>(
  (USA_SCHEMA.sections as SchemaSection[]).flatMap((section) =>
    section.fields.map((f) => f.id)
  )
);

const VALID_INPUT_TYPES = ['text', 'select', 'radio', 'checkbox', 'date', 'file'];
const VALID_TRANSFORM_TYPES = ['date_format', 'country_code', 'boolean_to_yesno', 'custom'];

describe('USA field mapping', () => {
  it('has a non-empty fieldMappings object', () => {
    expect(Object.keys(USA_MAPPING.fieldMappings).length).toBeGreaterThan(0);
  });

  it('has the correct countryCode', () => {
    expect(USA_MAPPING.countryCode).toBe('USA');
  });

  it('has a non-empty portalUrl', () => {
    expect(USA_MAPPING.portalUrl.length).toBeGreaterThan(0);
  });

  it('has at least one automation step', () => {
    expect(USA_MAPPING.steps.length).toBeGreaterThan(0);
  });

  describe('each field mapping', () => {
    Object.entries(USA_MAPPING.fieldMappings).forEach(([key, mapping]) => {
      describe(`field: ${key}`, () => {
        it('has a fieldId that matches the mapping key', () => {
          expect(mapping.fieldId).toBe(key);
        });

        it('has a non-empty selector string', () => {
          expect(typeof mapping.selector).toBe('string');
          expect(mapping.selector.length).toBeGreaterThan(0);
        });

        it('has a valid inputType', () => {
          expect(VALID_INPUT_TYPES).toContain(mapping.inputType);
        });

        it('has a fieldId that exists in the USA schema', () => {
          expect(schemaFieldIds.has(mapping.fieldId)).toBe(true);
        });

        if (mapping.transform) {
          it('has a valid transform type', () => {
            expect(VALID_TRANSFORM_TYPES).toContain(mapping.transform!.type);
          });

          if (mapping.transform.type === 'date_format') {
            it('date_format transform has from and to config', () => {
              expect(mapping.transform!.config).toBeDefined();
              expect(mapping.transform!.config!['from']).toBeDefined();
              expect(mapping.transform!.config!['to']).toBeDefined();
            });
          }

          if (mapping.transform.type === 'country_code') {
            it('country_code transform has format config', () => {
              expect(mapping.transform!.config).toBeDefined();
              expect(mapping.transform!.config!['format']).toBe('iso3_to_name');
            });
          }

          if (mapping.transform.type === 'boolean_to_yesno') {
            it('boolean_to_yesno transform has trueValue and falseValue', () => {
              expect(mapping.transform!.config).toBeDefined();
              expect(mapping.transform!.config!['trueValue']).toBeDefined();
              expect(mapping.transform!.config!['falseValue']).toBeDefined();
            });
          }
        }
      });
    });
  });

  it('has ESTA applicant fields: surname, firstName, passportNumber, gender', () => {
    const fieldIds = Object.keys(USA_MAPPING.fieldMappings);
    expect(fieldIds).toContain('surname');
    expect(fieldIds).toContain('firstName');
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('gender');
  });

  it('has ESTA eligibility question fields', () => {
    const fieldIds = Object.keys(USA_MAPPING.fieldMappings);
    expect(fieldIds).toContain('terrorism');
    expect(fieldIds).toContain('drugConviction');
    expect(fieldIds).toContain('visaRefusal');
  });

  it('eligibility question fields use boolean_to_yesno transform with N/Y values', () => {
    const eligibilityFields = ['mentalDisorder', 'terrorism', 'visaRefusal'];
    eligibilityFields.forEach((fieldId) => {
      const mapping = USA_MAPPING.fieldMappings[fieldId];
      expect(mapping).toBeDefined();
      expect(mapping.transform?.type).toBe('boolean_to_yesno');
      expect(mapping.transform?.config?.['falseValue']).toBe('N');
      expect(mapping.transform?.config?.['trueValue']).toBe('Y');
    });
  });
});
