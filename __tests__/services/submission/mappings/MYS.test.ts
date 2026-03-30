import MYS_MAPPING from '../../../../src/services/submission/mappings/MYS';
import MYSSchema from '../../../../src/schemas/MYS.json';
import { runSharedMappingTests } from './sharedMappingTests';

describe('MYS field mappings', () => {
  const fieldMappings = MYS_MAPPING.fieldMappings;
  const fieldIds = Object.keys(fieldMappings);

  runSharedMappingTests(MYS_MAPPING, MYSSchema, 'MYS');

  it('has core personal info fields', () => {
    expect(fieldIds).toContain('surname');
    expect(fieldIds).toContain('givenNames');
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('nationality');
    expect(fieldIds).toContain('dateOfBirth');
  });

  it('date fields use DD/MM/YYYY format (MDAC requirement)', () => {
    const dateFields = fieldIds.filter((id) => fieldMappings[id].inputType === 'date');
    dateFields.forEach((id) => {
      const transform = fieldMappings[id].transform;
      expect(transform?.type).toBe('date_format');
      expect((transform?.config as { to?: string })?.to).toBe('DD/MM/YYYY');
    });
  });

  it('nationality field has country_code transform', () => {
    expect(fieldMappings['nationality'].transform?.type).toBe('country_code');
  });

  it('boolean fields have boolean_to_yesno transform', () => {
    const booleanFields = fieldIds.filter((id) => fieldMappings[id].inputType === 'radio');
    booleanFields.forEach((id) => {
      expect(fieldMappings[id].transform?.type).toBe('boolean_to_yesno');
    });
  });
});
