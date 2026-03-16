/**
 * GBR — UK ETA portal selector validation.
 *
 * Portal: https://www.gov.uk/apply-electronic-travel-authorisation
 * Auth: Login required (GOV.UK One Login) — validation covers only the
 *   landing page / One Login entry point.
 *
 * The selectors below mirror src/services/submission/mappings/GBR.ts.
 * Run this test after updating GBR.ts to confirm that the selectors still
 * resolve to real DOM elements on the live GOV.UK ETA portal.
 */

import { test, expect } from '@playwright/test';
import {
  tryLoadPage,
  validateSelectors,
  buildReport,
  writeReport,
  printSummary,
} from './helpers';

const PORTAL_URL = 'https://www.gov.uk/apply-electronic-travel-authorisation';
const COUNTRY_CODE = 'GBR';

/**
 * Selectors visible on the GOV.UK ETA landing page / One Login entry point
 * without requiring an authenticated session.
 *
 * GOV.UK uses kebab-case IDs throughout (GOV.UK Design System convention).
 * The "Start now" button and the One Login sign-in form are the only elements
 * accessible without credentials.
 */
const LOGIN_PAGE_SELECTORS: Record<string, { fieldId: string; selector: string }> = {
  // GOV.UK "Start now" button on the service landing page
  startButton: {
    fieldId: 'startButton',
    selector:
      'a[href*="start"], a.govuk-button--start, .govuk-button--start, a[role="button"][data-module="govuk-button"]',
  },
  // GOV.UK One Login: email input (sign-in page)
  loginEmail: {
    fieldId: 'loginEmail',
    selector:
      'input[type="email"], input[name="email"], input[id="email"], input[autocomplete="email"]',
  },
  // GOV.UK One Login: password input
  loginPassword: {
    fieldId: 'loginPassword',
    selector:
      'input[type="password"], input[name="password"], input[id="password"]',
  },
  // GOV.UK "Continue" / submit button (common across all question pages)
  continueButton: {
    fieldId: 'continueButton',
    selector:
      'button[type="submit"], input[type="submit"], .govuk-button[type="submit"]',
  },
};

/**
 * Authenticated form field selectors (behind GOV.UK One Login).
 * Documented for reference; NOT validated without credentials.
 * These mirror the fieldMappings in GBR.ts.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _AUTHENTICATED_SELECTORS: Record<string, { fieldId: string; selector: string }> = {
  title: { fieldId: 'title', selector: '#title, select[name="title"]' },
  givenNames: {
    fieldId: 'givenNames',
    selector: '#given-names, input[name="given-names"]',
  },
  familyName: {
    fieldId: 'familyName',
    selector: '#family-name, input[name="family-name"]',
  },
  otherNames: {
    fieldId: 'otherNames',
    selector: '#other-names, input[name="other-names"]',
  },
  dateOfBirth: {
    fieldId: 'dateOfBirth',
    selector:
      '#dob-day, input[name="dob-day"], #date-of-birth-day, input[name="date-of-birth-day"]',
  },
  countryOfBirth: {
    fieldId: 'countryOfBirth',
    selector: '#country-of-birth, input[name="country-of-birth"]',
  },
  nationality: {
    fieldId: 'nationality',
    selector: '#nationality, input[name="nationality"]',
  },
  gender: { fieldId: 'gender', selector: '#gender, select[name="gender"]' },
  passportNumber: {
    fieldId: 'passportNumber',
    selector: '#passport-number, input[name="passport-number"]',
  },
  passportCountryOfIssue: {
    fieldId: 'passportCountryOfIssue',
    selector: '#passport-country-issue, input[name="passport-country-issue"]',
  },
  passportIssueDate: {
    fieldId: 'passportIssueDate',
    selector:
      '#passport-issue-date-day, input[name="passport-issue-date-day"], #passport-issue-date, input[name="passport-issue-date"]',
  },
  passportExpiryDate: {
    fieldId: 'passportExpiryDate',
    selector:
      '#passport-expiry-date-day, input[name="passport-expiry-date-day"], #passport-expiry-date, input[name="passport-expiry-date"]',
  },
  email: {
    fieldId: 'email',
    selector: '#email, input[name="email"], input[type="email"]',
  },
  confirmEmail: {
    fieldId: 'confirmEmail',
    selector: '#confirm-email, input[name="confirm-email"]',
  },
  phoneNumber: {
    fieldId: 'phoneNumber',
    selector: '#phone-number, input[name="phone-number"]',
  },
  addressLine1: {
    fieldId: 'addressLine1',
    selector: '#address-line-1, input[name="address-line-1"]',
  },
  addressLine2: {
    fieldId: 'addressLine2',
    selector: '#address-line-2, input[name="address-line-2"]',
  },
  city: { fieldId: 'city', selector: '#city, input[name="city"]' },
};

let report = buildReport(COUNTRY_CODE, PORTAL_URL, false, undefined, []);

test.describe(`${COUNTRY_CODE} — portal selector validation (login page)`, () => {
  test('load GOV.UK ETA landing page', async ({ page }) => {
    const { loaded, status } = await tryLoadPage(page, PORTAL_URL);

    if (!loaded) {
      report = buildReport(COUNTRY_CODE, PORTAL_URL, false, status, []);
      test.skip(true, `${COUNTRY_CODE} portal unreachable (status=${status ?? 'network error'})`);
      return;
    }

    const results = await validateSelectors(page, LOGIN_PAGE_SELECTORS);
    report = buildReport(COUNTRY_CODE, PORTAL_URL, true, status, results);

    // Expect at least one selector to be present on the landing page
    const anyFound = results.some(r => r.status === 'found');
    expect(anyFound).toBe(true);
  });

  test.afterAll(() => {
    writeReport(report);
    printSummary(report);
  });
});
