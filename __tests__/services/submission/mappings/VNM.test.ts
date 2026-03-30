import VNM_MAPPING from '../../../../src/services/submission/mappings/VNM';
import VNMSchema from '../../../../src/schemas/VNM.json';
import { runSharedMappingTests } from './sharedMappingTests';

describe('VNM field mappings', () => {
  const fieldMappings = VNM_MAPPING.fieldMappings;
  const fieldIds = Object.keys(fieldMappings);

  runSharedMappingTests(VNM_MAPPING, VNMSchema, 'VNM');

  it('has core personal info fields', () => {
    expect(fieldIds).toContain('surname');
    expect(fieldIds).toContain('givenName');
    expect(fieldIds).toContain('dateOfBirth');
    expect(fieldIds).toContain('nationality');
    expect(fieldIds).toContain('gender');
  });

  it('has Vietnam-specific fields', () => {
    expect(fieldIds).toContain('religion');
    expect(fieldIds).toContain('entryPort');
    expect(fieldIds).toContain('cityOfStay');
  });

  it('has passport fields', () => {
    expect(fieldIds).toContain('passportType');
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('passportIssuedDate');
    expect(fieldIds).toContain('passportExpiry');
    expect(fieldIds).toContain('passportIssuingAuthority');
  });

  it('has accommodation fields', () => {
    expect(fieldIds).toContain('accommodationType');
    expect(fieldIds).toContain('hotelName');
    expect(fieldIds).toContain('hotelAddress');
    expect(fieldIds).toContain('cityOfStay');
  });

  it('nationality field has country_code transform', () => {
    expect(fieldMappings['nationality'].transform?.type).toBe('country_code');
  });

  it('previousVietnamVisit field has boolean_to_yesno transform', () => {
    expect(fieldMappings['previousVietnamVisit'].transform?.type).toBe('boolean_to_yesno');
  });

  it('religion and entryPort are select fields', () => {
    expect(fieldMappings['religion'].inputType).toBe('select');
    expect(fieldMappings['entryPort'].inputType).toBe('select');
  });
});
