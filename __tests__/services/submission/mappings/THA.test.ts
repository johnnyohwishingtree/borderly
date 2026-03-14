/**
 * Tests for Thailand (THA) field mapping config.
 *
 * Validates:
 * - All field IDs in the mapping exist in the THA JSON schema
 * - All selectors are non-empty strings
 * - All inputTypes are valid enum values
 * - Transform configs are well-formed
 */

import THA_MAPPING from '../../../../src/services/submission/mappings/THA';
import THA_SCHEMA from '../../../../src/schemas/THA.json';

type SchemaSection = { fields: Array<{ id: string }> };

// Collect all field IDs from the THA schema sections
const schemaFieldIds = new Set<string>(
  (THA_SCHEMA.sections as SchemaSection[]).flatMap((section) =>
    section.fields.map((f) => f.id)
  )
);

const VALID_INPUT_TYPES = ['text', 'select', 'radio', 'checkbox', 'date', 'file'];
const VALID_TRANSFORM_TYPES = ['date_format', 'country_code', 'boolean_to_yesno', 'custom'];

describe('THA field mapping', () => {
  it('has a non-empty fieldMappings object', () => {
    expect(Object.keys(THA_MAPPING.fieldMappings).length).toBeGreaterThan(0);
  });

  it('has the correct countryCode', () => {
    expect(THA_MAPPING.countryCode).toBe('THA');
  });

  it('has a non-empty portalUrl', () => {
    expect(THA_MAPPING.portalUrl.length).toBeGreaterThan(0);
  });

  it('has at least one automation step', () => {
    expect(THA_MAPPING.steps.length).toBeGreaterThan(0);
  });

  describe('each field mapping', () => {
    Object.entries(THA_MAPPING.fieldMappings).forEach(([key, mapping]) => {
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

        it('has a fieldId that exists in the THA schema', () => {
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

  it('has Thailand Pass personal fields: firstName, lastName, passportNumber, nationality', () => {
    const fieldIds = Object.keys(THA_MAPPING.fieldMappings);
    expect(fieldIds).toContain('firstName');
    expect(fieldIds).toContain('lastName');
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('nationality');
  });

  it('has Thailand Pass health fields: vaccinationStatus, hasInsurance, emergencyContact', () => {
    const fieldIds = Object.keys(THA_MAPPING.fieldMappings);
    expect(fieldIds).toContain('vaccinationStatus');
    expect(fieldIds).toContain('hasInsurance');
    expect(fieldIds).toContain('emergencyContact');
  });

  it('has Thailand Pass accommodation fields: accommodationType, hotelName, hotelAddress', () => {
    const fieldIds = Object.keys(THA_MAPPING.fieldMappings);
    expect(fieldIds).toContain('accommodationType');
    expect(fieldIds).toContain('hotelName');
    expect(fieldIds).toContain('hotelAddress');
  });
});
