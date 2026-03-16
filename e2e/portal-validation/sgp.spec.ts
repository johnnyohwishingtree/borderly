/**
 * SGP — Singapore SG Arrival Card portal selector validation.
 *
 * Portal: https://eservices.ica.gov.sg/sgarrivalcard
 * Auth: Open portal — all form field selectors can be validated.
 *
 * The selectors below mirror src/services/submission/mappings/SGP.ts.
 * Run this test after updating SGP.ts to confirm that the selectors still
 * resolve to real DOM elements on the live ICA portal.
 */

import { test, expect } from '@playwright/test';
import {
  tryLoadPage,
  validateSelectors,
  buildReport,
  writeReport,
  printSummary,
} from './helpers';

const PORTAL_URL = 'https://eservices.ica.gov.sg/sgarrivalcard';
const COUNTRY_CODE = 'SGP';

/**
 * Full field selectors mirrored from SGP.ts fieldMappings.
 * ICA portal is a React SPA that uses camelCase name attributes.
 */
const FIELD_SELECTORS: Record<string, { fieldId: string; selector: string }> = {
  // Step 1 — Personal Information
  surname: {
    fieldId: 'surname',
    selector:
      'input[name="familyName"], input[name="surname"], input[name="family_name"], input[id="family_name"]',
  },
  givenNames: {
    fieldId: 'givenNames',
    selector:
      'input[name="givenName"], input[name="given_name"], input[name="first_name"], input[id="given_name"]',
  },
  dateOfBirth: {
    fieldId: 'dateOfBirth',
    selector:
      'input[name="dob"], input[name="dateOfBirth"], input[name="date_of_birth"], input[id="dob"]',
  },
  nationality: {
    fieldId: 'nationality',
    selector:
      'select[name="nationality"], select[name="nationalityCode"], select[id="nationality"]',
  },
  passportNumber: {
    fieldId: 'passportNumber',
    selector:
      'input[name="passportNo"], input[name="passport_no"], input[name="passport_number"], input[id="passport_no"]',
  },
  passportExpiry: {
    fieldId: 'passportExpiry',
    selector:
      'input[name="passportExpiryDate"], input[name="passport_expiry"], input[name="expiry_date"], input[id="passport_expiry"]',
  },
  gender: {
    fieldId: 'gender',
    selector:
      'select[name="sex"], select[name="gender"], input[name="sex"], input[id="sex"]',
  },
  email: {
    fieldId: 'email',
    selector: 'input[name="email"], input[type="email"], input[id="email"]',
  },
  phoneNumber: {
    fieldId: 'phoneNumber',
    selector:
      'input[name="mobileNo"], input[name="mobile_no"], input[name="phone"], input[id="mobile_no"]',
  },
  // Step 2 — Travel Information
  arrivalDate: {
    fieldId: 'arrivalDate',
    selector:
      'input[name="arrivalDate"], input[name="arrival_date"], input[id="arrival_date"]',
  },
  arrivalTime: {
    fieldId: 'arrivalTime',
    selector:
      'input[name="arrivalTime"], input[name="arrival_time"], input[id="arrival_time"]',
  },
  flightNumber: {
    fieldId: 'flightNumber',
    selector:
      'input[name="flightNo"], input[name="flight_no"], input[name="flight_number"], input[id="flight_no"]',
  },
  airlineCode: {
    fieldId: 'airlineCode',
    selector:
      'input[name="airlineCode"], input[name="airline_code"], input[name="airline"], input[id="airline_code"]',
  },
  departureCity: {
    fieldId: 'departureCity',
    selector:
      'input[name="portDeparture"], input[name="departure_city"], input[name="last_port"], input[id="departure_city"]',
  },
  purposeOfVisit: {
    fieldId: 'purposeOfVisit',
    selector:
      'select[name="purposeOfVisit"], select[name="purpose_of_visit"], select[id="purpose_of_visit"]',
  },
};

let report = buildReport(COUNTRY_CODE, PORTAL_URL, false, undefined, []);

test.describe(`${COUNTRY_CODE} — portal selector validation (full form)`, () => {
  test('load SG Arrival Card portal and validate all field selectors', async ({ page }) => {
    const { loaded, status } = await tryLoadPage(page, PORTAL_URL);

    if (!loaded) {
      report = buildReport(COUNTRY_CODE, PORTAL_URL, false, status, []);
      test.skip(true, `${COUNTRY_CODE} portal unreachable (status=${status ?? 'network error'})`);
      return;
    }

    const results = await validateSelectors(page, FIELD_SELECTORS);
    report = buildReport(COUNTRY_CODE, PORTAL_URL, true, status, results);

    // At least 50% of selectors should resolve on an open portal
    expect(report.summary.matchRate).toBeGreaterThanOrEqual(50);
  });

  test.afterAll(() => {
    writeReport(report);
    printSummary(report);
  });
});
