import USA_MAPPING from '../../../../src/services/submission/mappings/USA';
import USASchema from '../../../../src/schemas/USA.json';
import { runSharedMappingTests } from './sharedMappingTests';

describe('USA field mappings', () => {
  const fieldMappings = USA_MAPPING.fieldMappings;
  const fieldIds = Object.keys(fieldMappings);

  runSharedMappingTests(USA_MAPPING, USASchema, 'USA');

  it('has core applicant fields', () => {
    expect(fieldIds).toContain('surname');
    expect(fieldIds).toContain('firstName');
    expect(fieldIds).toContain('dateOfBirth');
    expect(fieldIds).toContain('gender');
  });

  it('has passport fields', () => {
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('passportCountry');
    expect(fieldIds).toContain('passportIssueDate');
    expect(fieldIds).toContain('passportExpirationDate');
  });

  it('has eligibility question fields', () => {
    expect(fieldIds).toContain('terrorism');
    expect(fieldIds).toContain('drugConviction');
    expect(fieldIds).toContain('visaRefusal');
  });

  it('date fields use MM/DD/YYYY format (ESTA requirement)', () => {
    const dateFields = fieldIds.filter((id) => fieldMappings[id].inputType === 'date');
    dateFields.forEach((id) => {
      const transform = fieldMappings[id].transform;
      expect(transform?.type).toBe('date_format');
      expect((transform?.config as { to?: string })?.to).toBe('MM/DD/YYYY');
    });
  });

  it('eligibility question fields use Y/N boolean transform', () => {
    const eligibilityFields = [
      'terrorism', 'drugConviction', 'visaRefusal', 'mentalDisorder', 'genocide',
    ];
    eligibilityFields.forEach((fieldId) => {
      const mapping = fieldMappings[fieldId];
      if (mapping) {
        expect(mapping.transform?.type).toBe('boolean_to_yesno');
        const config = mapping.transform?.config as { trueValue?: string; falseValue?: string } | undefined;
        expect(config?.trueValue).toBe('Y');
        expect(config?.falseValue).toBe('N');
      }
    });
  });
});
