/**
 * Tests for Singapore (SGP) field mapping config.
 *
 * Validates:
 * - All field IDs in the mapping exist in the SGP JSON schema
 * - All selectors are non-empty strings
 * - All inputTypes are valid enum values
 * - Transform configs are well-formed
 */

import SGP_MAPPING from '../../../../src/services/submission/mappings/SGP';
import SGP_SCHEMA from '../../../../src/schemas/SGP.json';

type SchemaSection = { fields: Array<{ id: string }> };

// Collect all field IDs from the SGP schema sections
const schemaFieldIds = new Set<string>(
  (SGP_SCHEMA.sections as SchemaSection[]).flatMap((section) =>
    section.fields.map((f) => f.id)
  )
);

const VALID_INPUT_TYPES = ['text', 'select', 'radio', 'checkbox', 'date', 'file'];
const VALID_TRANSFORM_TYPES = ['date_format', 'country_code', 'boolean_to_yesno', 'custom'];

describe('SGP field mapping', () => {
  it('has a non-empty fieldMappings object', () => {
    expect(Object.keys(SGP_MAPPING.fieldMappings).length).toBeGreaterThan(0);
  });

  it('has the correct countryCode', () => {
    expect(SGP_MAPPING.countryCode).toBe('SGP');
  });

  it('has a non-empty portalUrl', () => {
    expect(SGP_MAPPING.portalUrl.length).toBeGreaterThan(0);
  });

  it('has at least one automation step', () => {
    expect(SGP_MAPPING.steps.length).toBeGreaterThan(0);
  });

  describe('each field mapping', () => {
    Object.entries(SGP_MAPPING.fieldMappings).forEach(([key, mapping]) => {
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

        it('has a fieldId that exists in the SGP schema', () => {
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

  it('has core required fields: surname, givenNames, passportNumber, nationality, dateOfBirth', () => {
    const fieldIds = Object.keys(SGP_MAPPING.fieldMappings);
    expect(fieldIds).toContain('surname');
    expect(fieldIds).toContain('givenNames');
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('nationality');
    expect(fieldIds).toContain('dateOfBirth');
  });

  it('has SG Arrival Card specific fields: accommodationType, feverSymptoms, exceedsAllowance', () => {
    const fieldIds = Object.keys(SGP_MAPPING.fieldMappings);
    expect(fieldIds).toContain('accommodationType');
    expect(fieldIds).toContain('feverSymptoms');
    expect(fieldIds).toContain('exceedsAllowance');
  });
});
