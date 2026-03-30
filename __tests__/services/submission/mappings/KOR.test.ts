import KOR_MAPPING from '../../../../src/services/submission/mappings/KOR';
import KORSchema from '../../../../src/schemas/KOR.json';
import { runSharedMappingTests } from './sharedMappingTests';

/** Checks whether a CSS selector string is parseable. */
function isValidCssSelector(selector: string): boolean {
  if (!selector || typeof selector !== 'string') return false;
  const parts = selector.split(',').map((s) => s.trim());
  if (parts.some((p) => p.length === 0)) return false;
  const validStart = /^[#.\[a-zA-Z*]/;
  return parts.every((p) => validStart.test(p));
}

describe('KOR field mappings', () => {
  const fieldMappings = KOR_MAPPING.fieldMappings;
  const fieldIds = Object.keys(fieldMappings);

  runSharedMappingTests(KOR_MAPPING, KORSchema, 'KOR');

  it('has loginSelectors (K-ETA requires account)', () => {
    expect(KOR_MAPPING.loginSelectors).not.toBeUndefined();
    expect(KOR_MAPPING.loginSelectors!.username.length).toBeGreaterThan(0);
    expect(KOR_MAPPING.loginSelectors!.password.length).toBeGreaterThan(0);
    expect(KOR_MAPPING.loginSelectors!.submit.length).toBeGreaterThan(0);
  });

  it('loginSelectors have valid CSS selectors', () => {
    const ls = KOR_MAPPING.loginSelectors!;
    expect(isValidCssSelector(ls.username)).toBe(true);
    expect(isValidCssSelector(ls.password)).toBe(true);
    expect(isValidCssSelector(ls.submit)).toBe(true);
  });

  it('has core personal info fields', () => {
    expect(fieldIds).toContain('surname');
    expect(fieldIds).toContain('givenNames');
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('nationality');
    expect(fieldIds).toContain('dateOfBirth');
  });

  it('occupation uses select input type', () => {
    expect(fieldMappings.occupation.inputType).toBe('select');
  });

  it('health boolean fields use boolean_to_yesno transform', () => {
    const healthFields = ['hasSymptoms', 'hasInfectiousDisease', 'visitedOutbreakArea'];
    healthFields.forEach((id) => {
      if (fieldMappings[id]) {
        expect(fieldMappings[id].transform?.type).toBe('boolean_to_yesno');
      }
    });
  });

  it('country code fields use country_code transform', () => {
    const countryFields = ['nationality', 'passportIssuingCountry', 'departureCountry', 'homeCountry'];
    countryFields.forEach((id) => {
      if (fieldMappings[id]) {
        expect(fieldMappings[id].transform?.type).toBe('country_code');
      }
    });
  });
});
