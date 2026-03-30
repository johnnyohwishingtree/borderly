import THA_MAPPING from '../../../../src/services/submission/mappings/THA';
import THASchema from '../../../../src/schemas/THA.json';
import { runSharedMappingTests } from './sharedMappingTests';

describe('THA field mappings', () => {
  const fieldMappings = THA_MAPPING.fieldMappings;
  const fieldIds = Object.keys(fieldMappings);

  runSharedMappingTests(THA_MAPPING, THASchema, 'THA');

  it('has core personal info fields', () => {
    expect(fieldIds).toContain('firstName');
    expect(fieldIds).toContain('lastName');
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('nationality');
    expect(fieldIds).toContain('dateOfBirth');
  });

  it('has health fields (Thailand Pass specific)', () => {
    expect(fieldIds).toContain('vaccinationStatus');
    expect(fieldIds).toContain('hasInsurance');
    expect(fieldIds).toContain('emergencyContact');
  });

  it('has accommodation fields', () => {
    expect(fieldIds).toContain('accommodationType');
    expect(fieldIds).toContain('hotelName');
    expect(fieldIds).toContain('hotelAddress');
  });

  it('nationality field has country_code transform', () => {
    expect(fieldMappings['nationality'].transform?.type).toBe('country_code');
  });

  it('hasInsurance field has boolean_to_yesno transform', () => {
    expect(fieldMappings['hasInsurance'].transform?.type).toBe('boolean_to_yesno');
  });
});
