import JPN_MAPPING from '../../../../src/services/submission/mappings/JPN';
import JPNSchema from '../../../../src/schemas/JPN.json';
import { runSharedMappingTests } from './sharedMappingTests';

describe('JPN field mappings', () => {
  const fieldMappings = JPN_MAPPING.fieldMappings;
  const fieldIds = Object.keys(fieldMappings);

  runSharedMappingTests(JPN_MAPPING, JPNSchema, 'JPN');

  it('has core personal info fields', () => {
    expect(fieldIds).toContain('surname');
    expect(fieldIds).toContain('givenNames');
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('nationality');
    expect(fieldIds).toContain('dateOfBirth');
  });

  it('date fields have date_format transform', () => {
    const dateFields = fieldIds.filter((id) => fieldMappings[id].inputType === 'date');
    dateFields.forEach((id) => {
      expect(fieldMappings[id].transform?.type).toBe('date_format');
    });
  });
});
