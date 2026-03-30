import IDN_MAPPING from '../../../../src/services/submission/mappings/IDN';
import IDNSchema from '../../../../src/schemas/IDN.json';
import { runSharedMappingTests } from './sharedMappingTests';

describe('IDN field mappings', () => {
  const fieldMappings = IDN_MAPPING.fieldMappings;
  const fieldIds = Object.keys(fieldMappings);

  runSharedMappingTests(IDN_MAPPING, IDNSchema, 'IDN');

  it('does not have loginSelectors (guest portal)', () => {
    expect(IDN_MAPPING.loginSelectors).toBeUndefined();
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

  it('boolean customs declaration fields use boolean_to_yesno transform', () => {
    const booleanFields = ['carryingCurrency', 'carryingGoods', 'carryingAnimalsPlants', 'carryingNarcotics', 'carryingCommercialGoods'];
    booleanFields.forEach((id) => {
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
});
