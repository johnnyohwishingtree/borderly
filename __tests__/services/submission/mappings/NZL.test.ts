import NZL_MAPPING from '../../../../src/services/submission/mappings/NZL';
import NZLSchema from '../../../../src/schemas/NZL.json';
import { runSharedMappingTests } from './sharedMappingTests';

describe('NZL field mappings', () => {
  const fieldMappings = NZL_MAPPING.fieldMappings;
  const fieldIds = Object.keys(fieldMappings);

  runSharedMappingTests(NZL_MAPPING, NZLSchema, 'NZL');

  it('does not have loginSelectors (guest portal)', () => {
    expect(NZL_MAPPING.loginSelectors).toBeUndefined();
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

  it('includes arrivalAirport field', () => {
    expect(fieldIds).toContain('arrivalAirport');
  });

  it('biosecurity boolean fields use boolean_to_yesno transform', () => {
    const booleanFields = ['hasFoodItems', 'hasPlantItems', 'hasAnimalItems', 'hasSoilOrWaterItems'];
    booleanFields.forEach((id) => {
      if (fieldMappings[id]) {
        expect(fieldMappings[id].transform?.type).toBe('boolean_to_yesno');
      }
    });
  });

  it('goods declaration boolean fields use boolean_to_yesno transform', () => {
    const goodsFields = ['hasCurrencyOver10000', 'hasControlledItems', 'hasGoodsExceedingAllowance'];
    goodsFields.forEach((id) => {
      if (fieldMappings[id]) {
        expect(fieldMappings[id].transform?.type).toBe('boolean_to_yesno');
      }
    });
  });
});
