/**
 * United Kingdom (GBR) — UK ETA portal field mappings and portal automation config.
 *
 * The AutomationScriptRegistry auto-discovers this file via the mappings barrel.
 * Uses GOV.UK design system patterns. Requires GOV.UK One Login account.
 */

import type { AutomationScript, AutomationStep, PortalFieldMapping } from '@/types/submission';

const fieldMappings: Record<string, PortalFieldMapping> = {
  title: {
    fieldId: 'title',
    selector: 'select[id="title"], select[name="title"]',
    inputType: 'select',
  },
  givenNames: {
    fieldId: 'givenNames',
    selector: 'input[id="given-names"], input[name="given-names"]',
    inputType: 'text',
  },
  familyName: {
    fieldId: 'familyName',
    selector: 'input[id="family-name"], input[name="family-name"]',
    inputType: 'text',
  },
  otherNames: {
    fieldId: 'otherNames',
    selector: 'input[id="other-names"], input[name="other-names"]',
    inputType: 'text',
  },
  dateOfBirth: {
    fieldId: 'dateOfBirth',
    selector: 'input[id="date-of-birth"], input[name="date-of-birth"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    },
  },
  countryOfBirth: {
    fieldId: 'countryOfBirth',
    selector: 'input[id="country-of-birth"], input[name="country-of-birth"], select[id="country-of-birth"], select[name="country-of-birth"]',
    inputType: 'text',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
  },
  nationality: {
    fieldId: 'nationality',
    selector: 'input[id="nationality"], input[name="nationality"], select[id="nationality"], select[name="nationality"]',
    inputType: 'text',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
  },
  gender: {
    fieldId: 'gender',
    selector: 'select[id="gender"], select[name="gender"]',
    inputType: 'select',
  },
  passportNumber: {
    fieldId: 'passportNumber',
    selector: 'input[id="passport-number"], input[name="passport-number"]',
    inputType: 'text',
  },
  passportCountryOfIssue: {
    fieldId: 'passportCountryOfIssue',
    selector: 'input[id="passport-country-issue"], input[name="passport-country-issue"], select[id="passport-country-issue"], select[name="passport-country-issue"]',
    inputType: 'text',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
  },
  passportIssueDate: {
    fieldId: 'passportIssueDate',
    selector: 'input[id="passport-issue-date"], input[name="passport-issue-date"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    },
  },
  passportExpiryDate: {
    fieldId: 'passportExpiryDate',
    selector: 'input[id="passport-expiry-date"], input[name="passport-expiry-date"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    },
  },
  email: {
    fieldId: 'email',
    selector: 'input[id="email"], input[name="email"], input[type="email"]',
    inputType: 'text',
  },
  confirmEmail: {
    fieldId: 'confirmEmail',
    selector: 'input[id="confirm-email"], input[name="confirm-email"]',
    inputType: 'text',
  },
  phoneNumber: {
    fieldId: 'phoneNumber',
    selector: 'input[id="phone-number"], input[name="phone-number"]',
    inputType: 'text',
  },
  addressLine1: {
    fieldId: 'addressLine1',
    selector: 'input[id="address-line-1"], input[name="address-line-1"]',
    inputType: 'text',
  },
  addressLine2: {
    fieldId: 'addressLine2',
    selector: 'input[id="address-line-2"], input[name="address-line-2"]',
    inputType: 'text',
  },
  city: {
    fieldId: 'city',
    selector: 'input[id="city"], input[name="city"]',
    inputType: 'text',
  },
  county: {
    fieldId: 'county',
    selector: 'input[id="county"], input[name="county"]',
    inputType: 'text',
  },
  postalCode: {
    fieldId: 'postalCode',
    selector: 'input[id="postal-code"], input[name="postal-code"]',
    inputType: 'text',
  },
  country: {
    fieldId: 'country',
    selector: 'input[id="country"], input[name="country"], select[id="country"], select[name="country"]',
    inputType: 'text',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
  },
  employmentStatus: {
    fieldId: 'employmentStatus',
    selector: 'select[id="employment-status"], select[name="employment-status"]',
    inputType: 'select',
  },
  occupation: {
    fieldId: 'occupation',
    selector: 'input[id="occupation"], input[name="occupation"]',
    inputType: 'text',
  },
  employerName: {
    fieldId: 'employerName',
    selector: 'input[id="employer-name"], input[name="employer-name"]',
    inputType: 'text',
  },
  arrivalDate: {
    fieldId: 'arrivalDate',
    selector: 'input[id="arrival-date"], input[name="arrival-date"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    },
  },
  visitPurpose: {
    fieldId: 'visitPurpose',
    selector: 'select[id="visit-purpose"], select[name="visit-purpose"]',
    inputType: 'select',
  },
  ukAddress: {
    fieldId: 'ukAddress',
    selector: 'textarea[id="uk-address"], textarea[name="uk-address"], input[id="uk-address"], input[name="uk-address"]',
    inputType: 'text',
  },
  criminalRecord: {
    fieldId: 'criminalRecord',
    selector: 'input[id="criminal-record"][value="no"], input[name="criminal-record"][value="no"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'no', trueValue: 'yes' },
    },
  },
  immigrationBreach: {
    fieldId: 'immigrationBreach',
    selector: 'input[id="immigration-breach"][value="no"], input[name="immigration-breach"][value="no"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'no', trueValue: 'yes' },
    },
  },
  ukRefusal: {
    fieldId: 'ukRefusal',
    selector: 'input[id="uk-refusal"][value="no"], input[name="uk-refusal"][value="no"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'no', trueValue: 'yes' },
    },
  },
  terrorismAssociation: {
    fieldId: 'terrorismAssociation',
    selector: 'input[id="terrorism-association"][value="no"], input[name="terrorism-association"][value="no"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'no', trueValue: 'yes' },
    },
  },
};

const steps: AutomationStep[] = [
  {
    id: 'load_portal',
    name: 'Load UK ETA Portal',
    description: 'Navigate to GOV.UK ETA application page',
    script: `
      return new Promise((resolve) => {
        if (document.readyState === 'complete') {
          resolve({ success: true, url: window.location.href });
        } else {
          window.addEventListener('load', () => {
            resolve({ success: true, url: window.location.href });
          });
        }
      });
    `,
    timing: { timeout: 15000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'check_login',
    name: 'Check GOV.UK One Login',
    description: 'Verify user is logged into GOV.UK One Login',
    script: `
      const isLoggedIn = document.querySelector('.govuk-user-info, [data-user-email]') !== null;
      const loginLink = document.querySelector('a[href*="sign-in"], a[href*="login"]');

      return {
        isLoggedIn: isLoggedIn,
        loginRequired: loginLink !== null && !isLoggedIn,
        loginUrl: loginLink ? loginLink.href : null
      };
    `,
    timing: { timeout: 5000, waitAfter: 1000 },
    critical: true,
  },
  {
    id: 'fill_personal_details',
    name: 'Fill Personal Details',
    description: 'Fill personal information in GOV.UK design system format',
    script: `
      // This script will be dynamically generated with actual form data
      return { success: true, message: 'Personal details filling script placeholder' };
    `,
    timing: { timeout: 15000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_passport_address',
    name: 'Fill Passport and Address',
    description: 'Fill passport details and home address',
    script: `
      // This script will be dynamically generated with actual form data
      return { success: true, message: 'Passport and address filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_employment_travel',
    name: 'Fill Employment and Travel',
    description: 'Fill employment status and travel details',
    script: `
      // This script will be dynamically generated with actual form data
      return { success: true, message: 'Employment and travel filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_security_questions',
    name: 'Fill Security Questions',
    description: 'Answer security and background questions',
    script: `
      // This script will be dynamically generated with actual form data
      return { success: true, message: 'Security questions script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'submit_form',
    name: 'Submit Application',
    description: 'Submit the UK ETA application and proceed to payment',
    script: `
      const submitSelectors = [
        'button[type="submit"].govuk-button',
        'input[type="submit"]',
        'button[type="submit"]',
        '.govuk-button:not([disabled])'
      ];

      for (const selector of submitSelectors) {
        const button = document.querySelector(selector);
        if (button && button.offsetParent !== null && !button.disabled) {
          button.scrollIntoView();
          button.click();
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                success: true,
                submitted: true,
                url: window.location.href
              });
            }, 5000);
          });
        }
      }

      return { success: false, error: 'No submit button found or enabled' };
    `,
    timing: { timeout: 20000, waitAfter: 5000 },
    critical: true,
  },
  {
    id: 'capture_confirmation',
    name: 'Capture Application Reference',
    description: 'Extract ETA application reference from confirmation page',
    script: `
      const applicationReference = (
        document.querySelector('#application-reference')?.textContent ||
        document.querySelector('[class*="reference"]')?.textContent ||
        ''
      ).trim();

      const isComplete = document.querySelector('.application-complete, #eta-approval') !== null;

      return {
        success: applicationReference !== '' || isComplete,
        applicationReference: applicationReference,
        isComplete: isComplete,
        pageUrl: window.location.href
      };
    `,
    timing: { timeout: 10000, waitAfter: 0 },
    critical: false,
  },
];

const GBR_MAPPING: AutomationScript = {
  countryCode: 'GBR',
  portalUrl: 'https://www.gov.uk/apply-electronic-travel-authorisation',
  version: '1.0.0',
  lastUpdated: '2026-03-14T00:00:00Z',
  prerequisites: {
    cookiesEnabled: true,
    javascriptEnabled: true,
  },
  steps,
  fieldMappings,
  session: {
    maxDurationMs: 60 * 60 * 1000, // 60 minutes (GOV.UK sessions are longer)
    keepAlive: true,
    clearCookiesOnStart: false,
  },
};

export default GBR_MAPPING;
