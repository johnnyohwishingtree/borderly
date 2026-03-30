import PHL_MAPPING from '../../../../src/services/submission/mappings/PHL';
import PHLSchema from '../../../../src/schemas/PHL.json';
import { runSharedMappingTests } from './sharedMappingTests';

/** Checks whether a CSS selector string is parseable. */
function isValidCssSelector(selector: string): boolean {
  if (!selector || typeof selector !== 'string') return false;
  const parts = selector.split(',').map((s) => s.trim());
  if (parts.some((p) => p.length === 0)) return false;
  const validStart = /^[#.\[a-zA-Z*]/;
  return parts.every((p) => validStart.test(p));
}

describe('PHL field mappings', () => {
  const fieldMappings = PHL_MAPPING.fieldMappings;
  const fieldIds = Object.keys(fieldMappings);

  runSharedMappingTests(PHL_MAPPING, PHLSchema, 'PHL');

  it('has loginSelectors (eTravel requires email verification)', () => {
    expect(PHL_MAPPING.loginSelectors).not.toBeUndefined();
    expect(PHL_MAPPING.loginSelectors!.username.length).toBeGreaterThan(0);
    expect(PHL_MAPPING.loginSelectors!.password.length).toBeGreaterThan(0);
    expect(PHL_MAPPING.loginSelectors!.submit.length).toBeGreaterThan(0);
  });

  it('loginSelectors have valid CSS selectors', () => {
    const ls = PHL_MAPPING.loginSelectors!;
    expect(isValidCssSelector(ls.username)).toBe(true);
    expect(isValidCssSelector(ls.password)).toBe(true);
    expect(isValidCssSelector(ls.submit)).toBe(true);
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
    const healthFields = ['havingSymptoms', 'contactWithSick'];
    healthFields.forEach((id) => {
      if (fieldMappings[id]) {
        expect(fieldMappings[id].transform?.type).toBe('boolean_to_yesno');
      }
    });
  });

  it('country code fields use country_code transform', () => {
    const countryFields = ['nationality', 'passportIssuingCountry', 'departureCountry', 'countryOfResidence'];
    countryFields.forEach((id) => {
      if (fieldMappings[id]) {
        expect(fieldMappings[id].transform?.type).toBe('country_code');
      }
    });
  });
});
