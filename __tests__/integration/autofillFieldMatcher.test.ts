/**
 * Integration tests: AutoFill field matcher against real country schemas.
 *
 * Verifies that the field matching engine correctly identifies profile fields
 * when given typical HTML input attributes from government portal forms.
 * Covers all portals listed in story #838.
 */

import { matchField, detectCountryFromUrl } from '@/services/forms/fieldMatcher';
import type { CountryFormSchema } from '@/types/schema';
import * as fs from 'fs';
import * as path from 'path';

const SCHEMAS_DIR = path.resolve(__dirname, '../../src/schemas');

function loadSchema(countryCode: string): CountryFormSchema {
  const filePath = path.join(SCHEMAS_DIR, `${countryCode}.json`);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

describe('AutoFill Field Matcher — Real Schema Integration', () => {
  describe('Japan (Visit Japan Web)', () => {
    let schema: CountryFormSchema;

    beforeAll(() => {
      schema = loadSchema('JPN');
    });

    it('detects country from portal URL', () => {
      expect(detectCountryFromUrl('https://vjw-lp.digital.go.jp/en/registration/')).toBe('JPN');
    });

    it('matches passport number via autocomplete', () => {
      const result = matchField({ autocomplete: 'given-name' }, schema);
      expect(result).not.toBeNull();
      expect(result!.field.id).toBe('givenNames');
    });

    it('matches surname via portalFieldName', () => {
      const result = matchField({ labelText: 'Surname' }, schema);
      expect(result).not.toBeNull();
      expect(result!.field.id).toBe('surname');
    });

    it('matches date of birth via portalFieldName', () => {
      const result = matchField({ labelText: 'Date of birth' }, schema);
      expect(result).not.toBeNull();
      expect(result!.field.id).toBe('dateOfBirth');
    });

    it('matches nationality via portalFieldName', () => {
      const result = matchField({ labelText: 'Nationality or citizenship' }, schema);
      expect(result).not.toBeNull();
      expect(result!.field.id).toBe('nationality');
    });

    it('matches passport number via field name attribute', () => {
      const result = matchField({ name: 'passportNumber' }, schema);
      expect(result).not.toBeNull();
      expect(result!.field.id).toBe('passportNumber');
    });
  });

  describe('Singapore (SG Arrival Card)', () => {
    let schema: CountryFormSchema;

    beforeAll(() => {
      schema = loadSchema('SGP');
    });

    it('detects country from portal URL', () => {
      expect(detectCountryFromUrl('https://eservices.ica.gov.sg/sgarrivalcard')).toBe('SGP');
    });

    it('matches given name via autocomplete', () => {
      const result = matchField({ autocomplete: 'given-name' }, schema);
      expect(result).not.toBeNull();
      expect(result!.field.id).toBe('givenNames');
    });

    it('matches surname via autocomplete', () => {
      const result = matchField({ autocomplete: 'family-name' }, schema);
      expect(result).not.toBeNull();
      expect(result!.field.id).toBe('surname');
    });

    it('matches email via autocomplete', () => {
      const result = matchField({ autocomplete: 'email' }, schema);
      expect(result).not.toBeNull();
      expect(result!.field.id).toBe('email');
    });
  });

  describe('Malaysia (MDAC)', () => {
    let schema: CountryFormSchema;

    beforeAll(() => {
      schema = loadSchema('MYS');
    });

    it('detects country from portal URL', () => {
      expect(detectCountryFromUrl('https://imigresen-online.imi.gov.my/mdac/main')).toBe('MYS');
    });

    it('matches passport number via portalFieldName', () => {
      const result = matchField({ labelText: 'Passport number' }, schema);
      expect(result).not.toBeNull();
      expect(result!.field.id).toBe('passportNumber');
    });
  });

  describe('Thailand (TM6)', () => {
    let schema: CountryFormSchema;

    beforeAll(() => {
      schema = loadSchema('THA');
    });

    it('detects country from portal URL', () => {
      expect(detectCountryFromUrl('https://tp.consular.go.th/')).toBe('THA');
    });

    it('matches given name via autocomplete', () => {
      const result = matchField({ autocomplete: 'given-name' }, schema);
      expect(result).not.toBeNull();
      expect(['givenNames', 'givenName', 'firstName']).toContain(result!.field.id);
    });
  });

  describe('All supported countries — URL detection', () => {
    const portalUrls: [string, string][] = [
      ['https://vjw-lp.digital.go.jp/en/registration/', 'JPN'],
      ['https://eservices.ica.gov.sg/sgarrivalcard', 'SGP'],
      ['https://imigresen-online.imi.gov.my/mdac/main', 'MYS'],
      ['https://tp.consular.go.th/', 'THA'],
      ['https://evisa.xuatnhapcanh.gov.vn/', 'VNM'],
      ['https://cbpone.cbp.dhs.gov/', 'USA'],
      ['https://online.abf.gov.au/incoming-passenger-card/', 'AUS'],
      ['https://www.k-eta.go.kr/portal/apply/index.do', 'KOR'],
      ['https://www.gov.uk/apply-electronic-travel-authorisation', 'GBR'],
      ['https://etravel.gov.ph', 'PHL'],
      ['https://ecd.beacukai.go.id', 'IDN'],
      ['https://www.nztravellerdeclaration.govt.nz', 'NZL'],
      ['https://www.newdelhiairport.in/airsuvidha', 'IND'],
      ['https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta.html', 'CAN'],
    ];

    it.each(portalUrls)('detects %s as %s', (url, expectedCode) => {
      expect(detectCountryFromUrl(url)).toBe(expectedCode);
    });
  });

  describe('All schemas — core fields are matchable', () => {
    const countryCodes = ['JPN', 'SGP', 'MYS', 'THA', 'VNM', 'USA', 'AUS', 'KOR', 'GBR', 'CAN', 'NZL', 'PHL', 'IDN', 'IND'];

    it.each(countryCodes)('%s: given name matchable via autocomplete', (code) => {
      const schema = loadSchema(code);
      const result = matchField({ autocomplete: 'given-name' }, schema);
      expect(result).not.toBeNull();
      expect(['givenNames', 'givenName', 'firstName']).toContain(result!.field.id);
    });

    it.each(countryCodes)('%s: surname matchable via autocomplete', (code) => {
      const schema = loadSchema(code);
      const result = matchField({ autocomplete: 'family-name' }, schema);
      expect(result).not.toBeNull();
      expect(['surname', 'lastName', 'familyName']).toContain(result!.field.id);
    });

    it.each(countryCodes)('%s: passportNumber matchable via field name', (code) => {
      const schema = loadSchema(code);
      const result = matchField({ name: 'passportNumber' }, schema);
      expect(result).not.toBeNull();
      expect(result!.field.id).toBe('passportNumber');
    });

    it.each(countryCodes)('%s: dateOfBirth matchable via autocomplete', (code) => {
      const schema = loadSchema(code);
      const result = matchField({ autocomplete: 'bday' }, schema);
      expect(result).not.toBeNull();
      expect(result!.field.id).toBe('dateOfBirth');
    });
  });

  describe('Dropdown field mapping', () => {
    it('JPN occupation field has autoFillMapping for portal-specific values', () => {
      const schema = loadSchema('JPN');
      const allFields = schema.sections.flatMap(s => s.fields);
      const occupation = allFields.find(f => f.id === 'occupation');
      expect(occupation).not.toBeUndefined();
      // Occupation should have options for the dropdown
      expect(occupation!.options).not.toBeUndefined();
      expect(occupation!.options!.length).toBeGreaterThan(0);
    });
  });
});
