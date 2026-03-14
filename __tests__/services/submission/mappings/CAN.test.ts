/**
 * Tests for Canada (CAN) field mapping config.
 *
 * Validates:
 * - All field IDs in the mapping exist in the CAN JSON schema
 * - All selectors are non-empty strings
 * - All inputTypes are valid enum values
 * - Transform configs are well-formed
 */

import CAN_MAPPING from '../../../../src/services/submission/mappings/CAN';
import CAN_SCHEMA from '../../../../src/schemas/CAN.json';

type SchemaSection = { fields: Array<{ id: string }> };

// Collect all field IDs from the CAN schema sections
const schemaFieldIds = new Set<string>(
  (CAN_SCHEMA.sections as SchemaSection[]).flatMap((section) =>
    section.fields.map((f) => f.id)
  )
);

const VALID_INPUT_TYPES = ['text', 'select', 'radio', 'checkbox', 'date', 'file'];
const VALID_TRANSFORM_TYPES = ['date_format', 'country_code', 'boolean_to_yesno', 'custom'];

describe('CAN field mapping', () => {
  it('has a non-empty fieldMappings object', () => {
    expect(Object.keys(CAN_MAPPING.fieldMappings).length).toBeGreaterThan(0);
  });

  it('has the correct countryCode', () => {
    expect(CAN_MAPPING.countryCode).toBe('CAN');
  });

  it('has a non-empty portalUrl', () => {
    expect(CAN_MAPPING.portalUrl.length).toBeGreaterThan(0);
  });

  it('has at least one automation step', () => {
    expect(CAN_MAPPING.steps.length).toBeGreaterThan(0);
  });

  describe('each field mapping', () => {
    Object.entries(CAN_MAPPING.fieldMappings).forEach(([key, mapping]) => {
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

        it('has a fieldId that exists in the CAN schema', () => {
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

  it('has eTA core fields: surname, givenNames, passportNumber, nationality, dateOfBirth', () => {
    const fieldIds = Object.keys(CAN_MAPPING.fieldMappings);
    expect(fieldIds).toContain('surname');
    expect(fieldIds).toContain('givenNames');
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('nationality');
    expect(fieldIds).toContain('dateOfBirth');
  });

  it('has Canada-specific fields: maritalStatus, confirmEmail, fundingSource', () => {
    const fieldIds = Object.keys(CAN_MAPPING.fieldMappings);
    expect(fieldIds).toContain('maritalStatus');
    expect(fieldIds).toContain('confirmEmail');
    expect(fieldIds).toContain('fundingSource');
  });

  it('background check fields use boolean_to_yesno with N/Y values', () => {
    const backgroundFields = ['criminalOffence', 'immigrationOffence', 'warCrimes'];
    backgroundFields.forEach((fieldId) => {
      const mapping = CAN_MAPPING.fieldMappings[fieldId];
      expect(mapping).toBeDefined();
      expect(mapping.transform?.type).toBe('boolean_to_yesno');
      expect(mapping.transform?.config?.['falseValue']).toBe('N');
    });
  });
});
