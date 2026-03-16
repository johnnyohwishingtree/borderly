/**
 * USA — CBP One portal selector validation.
 *
 * Portal: https://cbpone.cbp.dhs.gov/
 * Auth: Login required — validation covers only the landing/login page.
 *
 * The selectors below mirror src/services/submission/mappings/USA.ts.
 * Run this test after updating USA.ts to confirm that the selectors still
 * resolve to real DOM elements on the live CBP One portal.
 */

import { test, expect } from '@playwright/test';
import {
  tryLoadPage,
  validateSelectors,
  buildReport,
  writeReport,
  printSummary,
} from './helpers';

const PORTAL_URL = 'https://cbpone.cbp.dhs.gov/';
const COUNTRY_CODE = 'USA';

/**
 * Selectors that should be visible on the CBP One landing / login page
 * without requiring an authenticated session.
 */
const LOGIN_PAGE_SELECTORS: Record<string, { fieldId: string; selector: string }> = {
  loginEmail: {
    fieldId: 'loginEmail',
    selector:
      'input[type="email"], input[name="email"], input[id="email"], input[name="username"], input[id="username"]',
  },
  loginPassword: {
    fieldId: 'loginPassword',
    selector: 'input[type="password"], input[name="password"], input[id="password"]',
  },
  loginSubmit: {
    fieldId: 'loginSubmit',
    selector:
      'button[type="submit"], input[type="submit"], button[id*="login"], button[id*="submit"]',
  },
};

/**
 * Authenticated form field selectors (gated behind CBP One login).
 * Documented here for reference; NOT validated without credentials.
 * These mirror the fieldMappings in USA.ts.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _AUTHENTICATED_SELECTORS: Record<string, { fieldId: string; selector: string }> = {
  surname: { fieldId: 'surname', selector: '#surname, input[name="surname"]' },
  firstName: { fieldId: 'firstName', selector: '#firstName, input[name="firstName"]' },
  middleName: { fieldId: 'middleName', selector: '#middleName, input[name="middleName"]' },
  aliases: {
    fieldId: 'aliases',
    selector: '#aliases, input[name="aliases"][value="N"], input[name="aliases"][value="No"]',
  },
  dateOfBirth: { fieldId: 'dateOfBirth', selector: '#dateOfBirth, input[name="dateOfBirth"]' },
  cityOfBirth: { fieldId: 'cityOfBirth', selector: '#cityOfBirth, input[name="cityOfBirth"]' },
  countryOfBirth: {
    fieldId: 'countryOfBirth',
    selector: '#countryOfBirth, input[name="countryOfBirth"]',
  },
  gender: { fieldId: 'gender', selector: '#gender, select[name="gender"]' },
  passportNumber: {
    fieldId: 'passportNumber',
    selector: '#passportNumber, input[name="passportNumber"]',
  },
  passportCountry: {
    fieldId: 'passportCountry',
    selector: '#passportCountry, input[name="passportCountry"]',
  },
  passportIssueDate: {
    fieldId: 'passportIssueDate',
    selector: '#passportIssueDate, input[name="passportIssueDate"]',
  },
  passportExpirationDate: {
    fieldId: 'passportExpirationDate',
    selector: '#passportExpirationDate, input[name="passportExpirationDate"]',
  },
  issuingAuthority: {
    fieldId: 'issuingAuthority',
    selector: '#issuingAuthority, input[name="issuingAuthority"]',
  },
  homeAddress: {
    fieldId: 'homeAddress',
    selector: '#homeAddress, textarea[name="homeAddress"]',
  },
  homePhone: { fieldId: 'homePhone', selector: '#homePhone, input[name="homePhone"]' },
  workPhone: { fieldId: 'workPhone', selector: '#workPhone, input[name="workPhone"]' },
  email: {
    fieldId: 'email',
    selector: '#email, input[name="email"], input[type="email"]',
  },
};

let report = buildReport(COUNTRY_CODE, PORTAL_URL, false, undefined, []);

test.describe(`${COUNTRY_CODE} — portal selector validation (login page)`, () => {
  test('load CBP One portal landing page', async ({ page }) => {
    const { loaded, status } = await tryLoadPage(page, PORTAL_URL);

    if (!loaded) {
      report = buildReport(COUNTRY_CODE, PORTAL_URL, false, status, []);
      test.skip(true, `${COUNTRY_CODE} portal unreachable (status=${status ?? 'network error'})`);
      return;
    }

    const results = await validateSelectors(page, LOGIN_PAGE_SELECTORS);
    report = buildReport(COUNTRY_CODE, PORTAL_URL, true, status, results);

    // Expect at least one login selector to be present on the landing page
    const anyFound = results.some(r => r.status === 'found');
    expect(anyFound).toBe(true);
  });

  test.afterAll(() => {
    writeReport(report);
    printSummary(report);
  });
});
