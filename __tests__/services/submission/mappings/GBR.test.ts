import GBR_MAPPING from '../../../../src/services/submission/mappings/GBR';
import GBRSchema from '../../../../src/schemas/GBR.json';
import { runSharedMappingTests } from './sharedMappingTests';

describe('GBR field mappings', () => {
  const fieldMappings = GBR_MAPPING.fieldMappings;
  const fieldIds = Object.keys(fieldMappings);

  runSharedMappingTests(GBR_MAPPING, GBRSchema, 'GBR');

  it('has core personal info fields', () => {
    expect(fieldIds).toContain('givenNames');
    expect(fieldIds).toContain('familyName');
    expect(fieldIds).toContain('dateOfBirth');
    expect(fieldIds).toContain('nationality');
    expect(fieldIds).toContain('gender');
  });

  it('has passport fields', () => {
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('passportCountryOfIssue');
    expect(fieldIds).toContain('passportIssueDate');
    expect(fieldIds).toContain('passportExpiryDate');
  });

  it('has address fields (GOV.UK pattern)', () => {
    expect(fieldIds).toContain('addressLine1');
    expect(fieldIds).toContain('city');
    expect(fieldIds).toContain('country');
  });

  it('has security question fields', () => {
    expect(fieldIds).toContain('criminalRecord');
    expect(fieldIds).toContain('immigrationBreach');
    expect(fieldIds).toContain('ukRefusal');
    expect(fieldIds).toContain('terrorismAssociation');
  });

  it('uses GOV.UK kebab-case selectors', () => {
    const kebabSelectors = fieldIds
      .map((id) => fieldMappings[id].selector)
      .filter((s) => s.startsWith('#'));
    expect(kebabSelectors.length).toBeGreaterThan(0);
    expect(kebabSelectors.some((s) => s.includes('-'))).toBe(true);
  });

  it('nationality field has country_code transform', () => {
    expect(fieldMappings['nationality'].transform?.type).toBe('country_code');
  });
});
