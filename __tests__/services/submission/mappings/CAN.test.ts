import CAN_MAPPING from '../../../../src/services/submission/mappings/CAN';
import CANSchema from '../../../../src/schemas/CAN.json';
import { runSharedMappingTests } from './sharedMappingTests';

describe('CAN field mappings', () => {
  const fieldMappings = CAN_MAPPING.fieldMappings;
  const fieldIds = Object.keys(fieldMappings);

  runSharedMappingTests(CAN_MAPPING, CANSchema, 'CAN');

  it('has core personal info fields', () => {
    expect(fieldIds).toContain('surname');
    expect(fieldIds).toContain('givenNames');
    expect(fieldIds).toContain('dateOfBirth');
    expect(fieldIds).toContain('gender');
  });

  it('has passport fields', () => {
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('passportCountry');
    expect(fieldIds).toContain('passportIssueDate');
    expect(fieldIds).toContain('passportExpiryDate');
  });

  it('has background check fields', () => {
    expect(fieldIds).toContain('criminalOffence');
    expect(fieldIds).toContain('immigrationOffence');
    expect(fieldIds).toContain('warCrimes');
  });

  it('nationality field has country_code transform', () => {
    expect(fieldMappings['nationality'].transform?.type).toBe('country_code');
  });

  it('background check fields have boolean_to_yesno transform', () => {
    const booleanFields = ['criminalOffence', 'immigrationOffence', 'warCrimes', 'tuberculosis'];
    booleanFields.forEach((fieldId) => {
      if (fieldMappings[fieldId]) {
        expect(fieldMappings[fieldId].transform?.type).toBe('boolean_to_yesno');
      }
    });
  });
});
