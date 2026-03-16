/**
 * MYS — Malaysia MDAC portal selector validation.
 *
 * Portal: https://imigresen-online.imi.gov.my/mdac/main
 * Auth: Open portal — all form field selectors can be validated.
 *
 * The selectors below mirror src/services/submission/mappings/MYS.ts.
 * Run this test after updating MYS.ts to confirm that the selectors still
 * resolve to real DOM elements on the live MDAC portal.
 */

import { test, expect } from '@playwright/test';
import {
  tryLoadPage,
  validateSelectors,
  buildReport,
  writeReport,
  printSummary,
} from './helpers';

const PORTAL_URL = 'https://imigresen-online.imi.gov.my/mdac/main';
const COUNTRY_CODE = 'MYS';

/**
 * Full field selectors mirrored from MYS.ts fieldMappings.
 * MDAC is an Angular app that uses ngModel with snake_case attribute names.
 */
const FIELD_SELECTORS: Record<string, { fieldId: string; selector: string }> = {
  // Page 1 — Personal Information
  surname: {
    fieldId: 'surname',
    selector:
      'input[name="surname"], input[formcontrolname="surname"], input[name="family_name"], input[id="family_name"]',
  },
  givenNames: {
    fieldId: 'givenNames',
    selector:
      'input[name="given_name"], input[formcontrolname="given_name"], input[name="first_name"], input[id="first_name"]',
  },
  dateOfBirth: {
    fieldId: 'dateOfBirth',
    selector:
      'input[name="date_of_birth"], input[formcontrolname="date_of_birth"], input[name="dob"], input[id="dob"]',
  },
  nationality: {
    fieldId: 'nationality',
    selector:
      'select[name="nationality"], select[formcontrolname="nationality"], select[id="nationality"]',
  },
  passportNumber: {
    fieldId: 'passportNumber',
    selector:
      'input[name="passport_no"], input[formcontrolname="passport_no"], input[name="passport_number"], input[id="passport_no"]',
  },
  passportExpiry: {
    fieldId: 'passportExpiry',
    selector:
      'input[name="passport_expiry"], input[formcontrolname="passport_expiry"], input[name="expiry_date"], input[id="passport_expiry"]',
  },
  gender: {
    fieldId: 'gender',
    selector:
      'select[name="gender"], select[formcontrolname="gender"], select[id="gender"]',
  },
  email: {
    fieldId: 'email',
    selector:
      'input[name="email"], input[formcontrolname="email"], input[type="email"], input[id="email"]',
  },
  phoneNumber: {
    fieldId: 'phoneNumber',
    selector:
      'input[name="phone_no"], input[formcontrolname="phone_no"], input[name="mobile"], input[name="phone"], input[id="phone"]',
  },
  // Page 2 — Travel Information
  arrivalDate: {
    fieldId: 'arrivalDate',
    selector:
      'input[name="arrival_date"], input[formcontrolname="arrival_date"], input[id="arrival_date"]',
  },
  arrivalAirport: {
    fieldId: 'arrivalAirport',
    selector:
      'select[name="port_of_entry"], select[formcontrolname="port_of_entry"], select[name="arrival_airport"], select[id="port_of_entry"]',
  },
  flightNumber: {
    fieldId: 'flightNumber',
    selector:
      'input[name="flight_no"], input[formcontrolname="flight_no"], input[name="flight_number"], input[id="flight_no"]',
  },
  purposeOfVisit: {
    fieldId: 'purposeOfVisit',
    selector:
      'select[name="purpose_of_visit"], select[formcontrolname="purpose_of_visit"], select[id="purpose_of_visit"]',
  },
  durationOfStay: {
    fieldId: 'durationOfStay',
    selector:
      'input[name="duration_of_stay"], input[formcontrolname="duration_of_stay"], input[name="length_of_stay"], input[id="duration_of_stay"]',
  },
  hotelName: {
    fieldId: 'hotelName',
    selector:
      'input[name="accommodation_name"], input[formcontrolname="accommodation_name"], input[name="hotel_name"], input[id="accommodation_name"]',
  },
  hotelAddress: {
    fieldId: 'hotelAddress',
    selector:
      'textarea[name="accommodation_address"], input[formcontrolname="accommodation_address"], input[name="hotel_address"], textarea[id="accommodation_address"]',
  },
  hotelPhone: {
    fieldId: 'hotelPhone',
    selector:
      'input[name="accommodation_contact_no"], input[name="accommodation_phone"], input[formcontrolname="accommodation_contact_no"], input[name="hotel_phone"]',
  },
  // Page 3 — Health Declarations
  healthCondition: {
    fieldId: 'healthCondition',
    selector:
      'input[name="health_condition"][value="N"], input[name="health_condition"][value="no"], input[name="health_condition"][value="false"]',
  },
  visitedHighRiskCountries: {
    fieldId: 'visitedHighRiskCountries',
    selector:
      'input[name="high_risk_country"][value="N"], input[name="high_risk_country"][value="no"], input[name="high_risk_country"][value="false"]',
  },
  carryingCurrency: {
    fieldId: 'carryingCurrency',
    selector:
      'input[name="carrying_currency"][value="N"], input[name="carrying_currency"][value="no"], input[name="carrying_currency"][value="false"]',
  },
  carryingProhibitedItems: {
    fieldId: 'carryingProhibitedItems',
    selector:
      'input[name="prohibited_goods"][value="N"], input[name="prohibited_items"][value="no"], input[name="prohibited_items"][value="false"]',
  },
};

let report = buildReport(COUNTRY_CODE, PORTAL_URL, false, undefined, []);

test.describe(`${COUNTRY_CODE} — portal selector validation (full form)`, () => {
  test('load MDAC portal and validate all field selectors', async ({ page }) => {
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
