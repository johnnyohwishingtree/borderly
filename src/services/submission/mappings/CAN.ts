/**
 * Canada (CAN) — eTA portal field mappings and portal automation config.
 *
 * The AutomationScriptRegistry auto-discovers this file via the mappings barrel.
 * Canada eTA uses canada.ca with date format DD/MMM/YYYY.
 */

import type { AutomationScript, AutomationStep, PortalFieldMapping } from '@/types/submission';

const fieldMappings: Record<string, PortalFieldMapping> = {
  surname: {
    fieldId: 'surname',
    selector: 'input[id="surname"], input[name="surname"]',
    inputType: 'text',
  },
  givenNames: {
    fieldId: 'givenNames',
    selector: 'input[id="given-names"], input[name="given-names"], input[id="givenNames"], input[name="givenNames"]',
    inputType: 'text',
  },
  previousNames: {
    fieldId: 'previousNames',
    selector: 'input[id="previous-names"][value="N"], input[name="previous-names"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
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
  gender: {
    fieldId: 'gender',
    selector: 'select[id="gender"], select[name="gender"]',
    inputType: 'select',
  },
  maritalStatus: {
    fieldId: 'maritalStatus',
    selector: 'select[id="marital-status"], select[name="marital-status"]',
    inputType: 'select',
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
  dualCitizenship: {
    fieldId: 'dualCitizenship',
    selector: 'input[id="dual-citizenship"][value="N"], input[name="dual-citizenship"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  immigrationStatus: {
    fieldId: 'immigrationStatus',
    selector: 'select[id="immigration-status"], select[name="immigration-status"]',
    inputType: 'select',
  },
  passportNumber: {
    fieldId: 'passportNumber',
    selector: 'input[id="passport-number"], input[name="passport-number"]',
    inputType: 'text',
  },
  passportCountry: {
    fieldId: 'passportCountry',
    selector: 'input[id="passport-country"], input[name="passport-country"], select[id="passport-country"], select[name="passport-country"]',
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
  homeAddress: {
    fieldId: 'homeAddress',
    selector: 'textarea[id="home-address"], textarea[name="home-address"], input[id="home-address"], input[name="home-address"]',
    inputType: 'text',
  },
  homeCountry: {
    fieldId: 'homeCountry',
    selector: 'input[id="home-country"], input[name="home-country"], select[id="home-country"], select[name="home-country"]',
    inputType: 'text',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
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
  purposeOfVisit: {
    fieldId: 'purposeOfVisit',
    selector: 'select[id="purpose-of-visit"], select[name="purpose-of-visit"]',
    inputType: 'select',
  },
  fundingSource: {
    fieldId: 'fundingSource',
    selector: 'select[id="funding-source"], select[name="funding-source"]',
    inputType: 'select',
  },
  criminalOffence: {
    fieldId: 'criminalOffence',
    selector: 'input[id="criminal-offence"][value="N"], input[name="criminal-offence"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  immigrationOffence: {
    fieldId: 'immigrationOffence',
    selector: 'input[id="immigration-offence"][value="N"], input[name="immigration-offence"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  medicalCondition: {
    fieldId: 'medicalCondition',
    selector: 'input[id="medical-condition"][value="N"], input[name="medical-condition"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  tuberculosis: {
    fieldId: 'tuberculosis',
    selector: 'input[id="tuberculosis"][value="N"], input[name="tuberculosis"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  governmentPosition: {
    fieldId: 'governmentPosition',
    selector: 'input[id="government-position"][value="N"], input[name="government-position"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  militaryService: {
    fieldId: 'militaryService',
    selector: 'input[id="military-service"][value="N"], input[name="military-service"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  warCrimes: {
    fieldId: 'warCrimes',
    selector: 'input[id="war-crimes"][value="N"], input[name="war-crimes"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
};

const steps: AutomationStep[] = [
  {
    id: 'load_portal',
    name: 'Load Canada eTA Portal',
    description: 'Navigate to the official Canada eTA application page',
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
    id: 'fill_personal_info',
    name: 'Fill Personal Information',
    description: 'Fill personal and nationality details',
    script: `
      // This script will be dynamically generated with actual form data
      return { success: true, message: 'Personal information filling script placeholder' };
    `,
    timing: { timeout: 15000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_passport_info',
    name: 'Fill Passport Information',
    description: 'Fill passport details',
    script: `
      // This script will be dynamically generated with actual form data
      return { success: true, message: 'Passport information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_contact_employment',
    name: 'Fill Contact and Employment',
    description: 'Fill contact, address and employment details',
    script: `
      // This script will be dynamically generated with actual form data
      return { success: true, message: 'Contact and employment filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_background',
    name: 'Fill Background Questions',
    description: 'Answer all background and security questions',
    script: `
      // This script will be dynamically generated with actual form data
      return { success: true, message: 'Background questions script placeholder' };
    `,
    timing: { timeout: 15000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'submit_form',
    name: 'Submit Application',
    description: 'Submit the eTA application and proceed to payment',
    script: `
      const submitSelectors = [
        'input[type="submit"]',
        'button[type="submit"]',
        'button[id*="submit"]',
        'input[value*="Submit"]',
        '.btn-submit'
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
    name: 'Capture eTA Number',
    description: 'Extract eTA confirmation number from approval page',
    script: `
      const etaNumber = (
        document.querySelector('#eta-number')?.textContent ||
        document.querySelector('[class*="eta-number"]')?.textContent ||
        document.querySelector('[id*="confirmation-number"]')?.textContent ||
        ''
      ).trim();

      const isApproved = document.querySelector('.eta-approved, #confirmation-number') !== null;

      return {
        success: etaNumber !== '' || isApproved,
        etaNumber: etaNumber,
        isApproved: isApproved,
        pageUrl: window.location.href
      };
    `,
    timing: { timeout: 10000, waitAfter: 0 },
    critical: false,
  },
];

const CAN_MAPPING: AutomationScript = {
  countryCode: 'CAN',
  portalUrl: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta.html',
  version: '1.0.0',
  lastUpdated: '2026-03-14T00:00:00Z',
  prerequisites: {
    cookiesEnabled: true,
    javascriptEnabled: true,
  },
  steps,
  fieldMappings,
  session: {
    maxDurationMs: 20 * 60 * 1000, // 20 minutes
    keepAlive: true,
    clearCookiesOnStart: false,
  },
};

export default CAN_MAPPING;
