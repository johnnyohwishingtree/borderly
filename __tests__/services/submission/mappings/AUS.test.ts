import AUS_MAPPING from '../../../../src/services/submission/mappings/AUS';
import AUSSchema from '../../../../src/schemas/AUS.json';
import { runSharedMappingTests } from './sharedMappingTests';

describe('AUS field mappings', () => {
  const fieldMappings = AUS_MAPPING.fieldMappings;
  const fieldIds = Object.keys(fieldMappings);

  runSharedMappingTests(AUS_MAPPING, AUSSchema, 'AUS');

  it('does not have loginSelectors (guest portal)', () => {
    expect(AUS_MAPPING.loginSelectors).toBeUndefined();
  });

  it('has core personal info fields', () => {
    expect(fieldIds).toContain('familyName');
    expect(fieldIds).toContain('givenNames');
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('nationality');
    expect(fieldIds).toContain('dateOfBirth');
  });

  it('date transforms use DD/MM/YYYY format', () => {
    const dateFields = fieldIds.filter((id) => fieldMappings[id].inputType === 'date');
    dateFields.forEach((id) => {
      const config = fieldMappings[id].transform?.config as Record<string, string> | undefined;
      expect(config?.to).toBe('DD/MM/YYYY');
    });
  });

  it('australianAddressState uses select input type', () => {
    expect(fieldMappings.australianAddressState.inputType).toBe('select');
  });

  it('biosecurity boolean fields use boolean_to_yesno transform', () => {
    const booleanFields = ['hasFoodItems', 'hasPlantItems', 'hasAnimalItems', 'hasBiosecurityRiskItems', 'hasSoilOrWater'];
    booleanFields.forEach((id) => {
      if (fieldMappings[id]) {
        expect(fieldMappings[id].transform?.type).toBe('boolean_to_yesno');
      }
    });
  });

  it('customs boolean fields use boolean_to_yesno transform', () => {
    const customsFields = ['hasControlledGoods', 'hasCurrencyOver10000', 'hasGoodsExceedingAllowance', 'hasCommercialGoods'];
    customsFields.forEach((id) => {
      if (fieldMappings[id]) {
        expect(fieldMappings[id].transform?.type).toBe('boolean_to_yesno');
      }
    });
  });
});
