/**
 * VNM — Vietnam e-Visa portal selector validation.
 *
 * Portal: https://evisa.xuatnhapcanh.gov.vn/
 * Auth: Open portal — all form field selectors can be validated.
 *
 * The selectors below mirror src/services/submission/mappings/VNM.ts.
 * Run this test after updating VNM.ts to confirm that the selectors still
 * resolve to real DOM elements on the live Vietnam e-Visa portal.
 */

import { test, expect } from '@playwright/test';
import {
  tryLoadPage,
  validateSelectors,
  buildReport,
  writeReport,
  printSummary,
} from './helpers';

const PORTAL_URL = 'https://evisa.xuatnhapcanh.gov.vn/';
const COUNTRY_CODE = 'VNM';

/**
 * Full field selectors mirrored from VNM.ts fieldMappings.
 * Vietnam e-Visa portal uses server-rendered HTML with jQuery enhancements;
 * fields use camelCase ID attributes with matching name attributes.
 */
const FIELD_SELECTORS: Record<string, { fieldId: string; selector: string }> = {
  // Step 1 — Personal Info
  surname: {
    fieldId: 'surname',
    selector: '#surname, input[name="surname"]',
  },
  middleName: {
    fieldId: 'middleName',
    selector: '#middleName, input[name="middleName"]',
  },
  givenName: {
    fieldId: 'givenName',
    selector: '#givenName, input[name="givenName"]',
  },
  dateOfBirth: {
    fieldId: 'dateOfBirth',
    selector: '#dateOfBirth, input[name="dateOfBirth"], input[name="date_of_birth"]',
  },
  placeOfBirth: {
    fieldId: 'placeOfBirth',
    selector: '#placeOfBirth, input[name="placeOfBirth"]',
  },
  gender: {
    fieldId: 'gender',
    selector: '#gender, select[name="gender"]',
  },
  nationality: {
    fieldId: 'nationality',
    selector: '#nationality, input[name="nationality"]',
  },
  religion: {
    fieldId: 'religion',
    selector: '#religion, select[name="religion"]',
  },
  // Step 2 — Passport
  passportType: {
    fieldId: 'passportType',
    selector: '#passportType, select[name="passportType"]',
  },
  passportNumber: {
    fieldId: 'passportNumber',
    selector: '#passportNumber, input[name="passportNumber"]',
  },
  passportIssuedDate: {
    fieldId: 'passportIssuedDate',
    selector:
      '#passportIssuedDate, input[name="passportIssuedDate"], input[name="passport_issued_date"]',
  },
  passportExpiry: {
    fieldId: 'passportExpiry',
    selector:
      '#passportExpiry, input[name="passportExpiry"], input[name="passport_expiry"]',
  },
  passportIssuingAuthority: {
    fieldId: 'passportIssuingAuthority',
    selector: '#passportIssuingAuthority, input[name="passportIssuingAuthority"]',
  },
  // Step 3 — Travel Info
  purposeOfVisit: {
    fieldId: 'purposeOfVisit',
    selector: '#purposeOfVisit, select[name="purposeOfVisit"]',
  },
  entryDate: {
    fieldId: 'entryDate',
    selector: '#entryDate, input[name="entryDate"], input[name="entry_date"]',
  },
  entryPort: {
    fieldId: 'entryPort',
    selector: '#entryPort, select[name="entryPort"]',
  },
  stayDuration: {
    fieldId: 'stayDuration',
    selector: '#stayDuration, input[name="stayDuration"]',
  },
  previousVietnamVisit: {
    fieldId: 'previousVietnamVisit',
    selector:
      '#previousVietnamVisit, input[name="previousVietnamVisit"][value="No"]',
  },
  // Step 4 — Accommodation
  accommodationType: {
    fieldId: 'accommodationType',
    selector: '#accommodationType, select[name="accommodationType"]',
  },
  hotelName: {
    fieldId: 'hotelName',
    selector: '#hotelName, input[name="hotelName"]',
  },
  hotelAddress: {
    fieldId: 'hotelAddress',
    selector: '#hotelAddress, input[name="hotelAddress"], textarea[name="hotelAddress"]',
  },
};

let report = buildReport(COUNTRY_CODE, PORTAL_URL, false, undefined, []);

test.describe(`${COUNTRY_CODE} — portal selector validation (full form)`, () => {
  test('load Vietnam e-Visa portal and validate all field selectors', async ({ page }) => {
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
