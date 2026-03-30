import SGP_MAPPING from '../../../../src/services/submission/mappings/SGP';
import SGPSchema from '../../../../src/schemas/SGP.json';
import { runSharedMappingTests } from './sharedMappingTests';

describe('SGP field mappings', () => {
  const fieldMappings = SGP_MAPPING.fieldMappings;
  const fieldIds = Object.keys(fieldMappings);

  runSharedMappingTests(SGP_MAPPING, SGPSchema, 'SGP');

  it('has core personal info fields', () => {
    expect(fieldIds).toContain('surname');
    expect(fieldIds).toContain('givenNames');
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('nationality');
    expect(fieldIds).toContain('dateOfBirth');
  });

  it('has health declaration fields', () => {
    expect(fieldIds).toContain('feverSymptoms');
    expect(fieldIds).toContain('infectiousDisease');
    expect(fieldIds).toContain('visitedOutbreakArea');
  });

  it('has customs declaration fields', () => {
    expect(fieldIds).toContain('exceedsAllowance');
    expect(fieldIds).toContain('carryingCash');
    expect(fieldIds).toContain('prohibitedGoods');
  });

  it('nationality field has country_code transform', () => {
    expect(fieldMappings['nationality'].transform?.type).toBe('country_code');
  });
});
