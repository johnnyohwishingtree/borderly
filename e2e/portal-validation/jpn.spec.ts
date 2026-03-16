/**
 * JPN — Visit Japan Web portal selector validation.
 *
 * Portal: https://vjw-lp.digital.go.jp/en/registration/
 * Auth: Login required — validation covers only the landing/login page.
 *
 * The selectors below mirror src/services/submission/mappings/JPN.ts.
 * Run this test after updating JPN.ts to confirm that the selectors still
 * resolve to real DOM elements on the live portal.
 */

import { test, expect } from '@playwright/test';
import {
  tryLoadPage,
  validateSelectors,
  buildReport,
  writeReport,
  printSummary,
} from './helpers';

const PORTAL_URL = 'https://vjw-lp.digital.go.jp/en/registration/';
const COUNTRY_CODE = 'JPN';

/**
 * Selectors that should be visible on the JPN portal landing / login page
 * without requiring an authenticated session.
 *
 * The portal is a React SPA; these selectors target the registration entry
 * page. Full form-field selectors (passport info, customs declaration) are
 * gated behind login and cannot be validated without credentials.
 */
const LOGIN_PAGE_SELECTORS: Record<string, { fieldId: string; selector: string }> = {
  // Registration start / login entry points (common across JPN portal pages)
  loginEmailOrId: {
    fieldId: 'loginEmailOrId',
    selector: 'input[type="email"], input[name="email"], input[id="email"], input[name="userId"]',
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
 * Selectors that exist behind the login wall (documented here for reference
 * but NOT validated by this test suite because they require authentication).
 *
 * These mirror the full fieldMappings in JPN.ts and would be validated in a
 * manual/credentialed run only.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _AUTHENTICATED_SELECTORS: Record<string, { fieldId: string; selector: string }> = {
  surname: {
    fieldId: 'surname',
    selector:
      'input[name="lastName"], input[name="lastNameEn"], input[name="family_name"], input[id="family_name"]',
  },
  givenNames: {
    fieldId: 'givenNames',
    selector:
      'input[name="firstName"], input[name="firstNameEn"], input[name="given_name"], input[id="given_name"]',
  },
  passportNumber: {
    fieldId: 'passportNumber',
    selector:
      'input[name="passportNo"], input[name="passportNumber"], input[name="passport_no"], input[id="passport_no"]',
  },
  nationality: {
    fieldId: 'nationality',
    selector: 'select[name="nationalityCode"], select[name="nationality"], select[id="nationality"]',
  },
  dateOfBirth: {
    fieldId: 'dateOfBirth',
    selector:
      'input[name="birthday"], input[name="birthDate"], input[name="birth_date"], input[id="birth_date"]',
  },
  gender: {
    fieldId: 'gender',
    selector: 'select[name="sex"], select[name="gender"], input[name="sex"], input[id="sex"]',
  },
  arrivalDate: {
    fieldId: 'arrivalDate',
    selector:
      'input[name="scheduledArrivalDate"], input[name="arrivalDate"], input[name="arrival_date"], input[id="arrival_date"]',
  },
  flightNumber: {
    fieldId: 'flightNumber',
    selector:
      'input[name="flightNumber"], input[name="flight_no"], input[id="flight_no"], input[name="flightNo"]',
  },
  purposeOfVisit: {
    fieldId: 'purposeOfVisit',
    selector: 'select[name="purposeOfVisit"], select[name="purpose"], select[id="purpose"]',
  },
  hotelName: {
    fieldId: 'hotelName',
    selector:
      'input[name="accommodationName"], input[name="accommodation_name"], input[id="accommodation_name"]',
  },
  hotelAddress: {
    fieldId: 'hotelAddress',
    selector:
      'textarea[name="accommodationAddress"], input[name="accommodationAddress"], textarea[name="accommodation_address"], textarea[id="accommodation_address"]',
  },
  carryingProhibitedItems: {
    fieldId: 'carryingProhibitedItems',
    selector:
      'input[name="prohibitedItems"][value="0"], input[name="prohibited_items"][value="no"], input[name="prohibited_items"][value="false"]',
  },
  currencyOver1M: {
    fieldId: 'currencyOver1M',
    selector:
      'input[name="currencyOverLimit"][value="0"], input[name="currency_over_limit"][value="no"], input[name="currency_over_limit"][value="false"]',
  },
};

let report = buildReport(COUNTRY_CODE, PORTAL_URL, false, undefined, []);

test.describe(`${COUNTRY_CODE} — portal selector validation (login page)`, () => {
  test('load portal landing page', async ({ page }) => {
    const { loaded, status } = await tryLoadPage(page, PORTAL_URL);

    if (!loaded) {
      // Portal is unreachable — skip validation but record the result
      report = buildReport(COUNTRY_CODE, PORTAL_URL, false, status, []);
      test.skip(true, `${COUNTRY_CODE} portal unreachable (status=${status ?? 'network error'})`);
      return;
    }

    // Portal loaded — validate login page selectors
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
