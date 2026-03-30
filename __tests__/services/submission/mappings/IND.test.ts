import IND_MAPPING from '../../../../src/services/submission/mappings/IND';
import INDSchema from '../../../../src/schemas/IND.json';
import { runSharedMappingTests } from './sharedMappingTests';

describe('IND field mappings', () => {
  const fieldMappings = IND_MAPPING.fieldMappings;
  const fieldIds = Object.keys(fieldMappings);

  runSharedMappingTests(IND_MAPPING, INDSchema, 'IND');

  it('does not have loginSelectors (guest portal)', () => {
    expect(IND_MAPPING.loginSelectors).toBeUndefined();
  });

  it('has core personal info fields', () => {
    expect(fieldIds).toContain('surname');
    expect(fieldIds).toContain('givenName');
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

  it('health declaration boolean fields use boolean_to_yesno transform', () => {
    const healthFields = ['feverOrCough', 'contactWithInfected'];
    healthFields.forEach((id) => {
      if (fieldMappings[id]) {
        expect(fieldMappings[id].transform?.type).toBe('boolean_to_yesno');
      }
    });
  });

  it('customs declaration boolean fields use boolean_to_yesno transform', () => {
    const customsFields = ['carryingCurrency', 'dutiableGoods', 'prohibitedItems', 'commercialGoods'];
    customsFields.forEach((id) => {
      if (fieldMappings[id]) {
        expect(fieldMappings[id].transform?.type).toBe('boolean_to_yesno');
      }
    });
  });

  it('country code fields use country_code transform', () => {
    const countryFields = ['nationality', 'passportIssuingCountry', 'departureCountry'];
    countryFields.forEach((id) => {
      if (fieldMappings[id]) {
        expect(fieldMappings[id].transform?.type).toBe('country_code');
      }
    });
  });

  it('has India-specific fields (visa, passport type, place of birth)', () => {
    expect(fieldIds).toContain('visaType');
    expect(fieldIds).toContain('passportType');
    expect(fieldIds).toContain('placeOfBirth');
  });
});
