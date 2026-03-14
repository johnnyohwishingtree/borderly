/**
 * United States (USA) — ESTA portal field mappings and portal automation config.
 *
 * The AutomationScriptRegistry auto-discovers this file via the mappings barrel.
 * ESTA is multi-page with complex eligibility questions and payment flow.
 */

import type { AutomationScript, AutomationStep, PortalFieldMapping } from '@/types/submission';

const fieldMappings: Record<string, PortalFieldMapping> = {
  surname: {
    fieldId: 'surname',
    selector: 'input[id="surname"], input[name="surname"]',
    inputType: 'text',
  },
  firstName: {
    fieldId: 'firstName',
    selector: 'input[id="firstName"], input[name="firstName"]',
    inputType: 'text',
  },
  middleName: {
    fieldId: 'middleName',
    selector: 'input[id="middleName"], input[name="middleName"]',
    inputType: 'text',
  },
  aliases: {
    fieldId: 'aliases',
    selector: 'input[id="aliases"][value="N"], input[name="aliases"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  dateOfBirth: {
    fieldId: 'dateOfBirth',
    selector: 'input[id="dateOfBirth"], input[name="dateOfBirth"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'MM/DD/YYYY' },
    },
  },
  cityOfBirth: {
    fieldId: 'cityOfBirth',
    selector: 'input[id="cityOfBirth"], input[name="cityOfBirth"]',
    inputType: 'text',
  },
  countryOfBirth: {
    fieldId: 'countryOfBirth',
    selector: 'input[id="countryOfBirth"], input[name="countryOfBirth"]',
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
    selector: 'input[id="passportNumber"], input[name="passportNumber"]',
    inputType: 'text',
  },
  passportCountry: {
    fieldId: 'passportCountry',
    selector: 'input[id="passportCountry"], input[name="passportCountry"]',
    inputType: 'text',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
  },
  passportIssueDate: {
    fieldId: 'passportIssueDate',
    selector: 'input[id="passportIssueDate"], input[name="passportIssueDate"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'MM/DD/YYYY' },
    },
  },
  passportExpirationDate: {
    fieldId: 'passportExpirationDate',
    selector: 'input[id="passportExpirationDate"], input[name="passportExpirationDate"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'MM/DD/YYYY' },
    },
  },
  issuingAuthority: {
    fieldId: 'issuingAuthority',
    selector: 'input[id="issuingAuthority"], input[name="issuingAuthority"]',
    inputType: 'text',
  },
  homeAddress: {
    fieldId: 'homeAddress',
    selector: 'textarea[id="homeAddress"], textarea[name="homeAddress"], input[id="homeAddress"], input[name="homeAddress"]',
    inputType: 'text',
  },
  homePhone: {
    fieldId: 'homePhone',
    selector: 'input[id="homePhone"], input[name="homePhone"]',
    inputType: 'text',
  },
  workPhone: {
    fieldId: 'workPhone',
    selector: 'input[id="workPhone"], input[name="workPhone"]',
    inputType: 'text',
  },
  email: {
    fieldId: 'email',
    selector: 'input[id="email"], input[name="email"], input[type="email"]',
    inputType: 'text',
  },
  employer: {
    fieldId: 'employer',
    selector: 'input[id="employer"], input[name="employer"]',
    inputType: 'text',
  },
  employerAddress: {
    fieldId: 'employerAddress',
    selector: 'textarea[id="employerAddress"], textarea[name="employerAddress"], input[id="employerAddress"], input[name="employerAddress"]',
    inputType: 'text',
  },
  employerPhone: {
    fieldId: 'employerPhone',
    selector: 'input[id="employerPhone"], input[name="employerPhone"]',
    inputType: 'text',
  },
  jobTitle: {
    fieldId: 'jobTitle',
    selector: 'input[id="jobTitle"], input[name="jobTitle"]',
    inputType: 'text',
  },
  emergencyContactName: {
    fieldId: 'emergencyContactName',
    selector: 'input[id="emergencyContactName"], input[name="emergencyContactName"]',
    inputType: 'text',
  },
  emergencyContactPhone: {
    fieldId: 'emergencyContactPhone',
    selector: 'input[id="emergencyContactPhone"], input[name="emergencyContactPhone"]',
    inputType: 'text',
  },
  emergencyContactEmail: {
    fieldId: 'emergencyContactEmail',
    selector: 'input[id="emergencyContactEmail"], input[name="emergencyContactEmail"]',
    inputType: 'text',
  },
  purposeOfTravel: {
    fieldId: 'purposeOfTravel',
    selector: 'select[id="purposeOfTravel"], select[name="purposeOfTravel"]',
    inputType: 'select',
  },
  addressInUS: {
    fieldId: 'addressInUS',
    selector: 'textarea[id="addressInUS"], textarea[name="addressInUS"], input[id="addressInUS"], input[name="addressInUS"]',
    inputType: 'text',
  },
  contactPersonUS: {
    fieldId: 'contactPersonUS',
    selector: 'input[id="contactPersonUS"], input[name="contactPersonUS"]',
    inputType: 'text',
  },
  contactPhoneUS: {
    fieldId: 'contactPhoneUS',
    selector: 'input[id="contactPhoneUS"], input[name="contactPhoneUS"]',
    inputType: 'text',
  },
  mentalDisorder: {
    fieldId: 'mentalDisorder',
    selector: 'input[id="mentalDisorder"][value="N"], input[name="mentalDisorder"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  drugConviction: {
    fieldId: 'drugConviction',
    selector: 'input[id="drugConviction"][value="N"], input[name="drugConviction"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  childAbduction: {
    fieldId: 'childAbduction',
    selector: 'input[id="childAbduction"][value="N"], input[name="childAbduction"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  crimeConviction: {
    fieldId: 'crimeConviction',
    selector: 'input[id="crimeConviction"][value="N"], input[name="crimeConviction"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  controlledSubstance: {
    fieldId: 'controlledSubstance',
    selector: 'input[id="controlledSubstance"][value="N"], input[name="controlledSubstance"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  prostitution: {
    fieldId: 'prostitution',
    selector: 'input[id="prostitution"][value="N"], input[name="prostitution"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  moneyLaundering: {
    fieldId: 'moneyLaundering',
    selector: 'input[id="moneyLaundering"][value="N"], input[name="moneyLaundering"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  humanTrafficking: {
    fieldId: 'humanTrafficking',
    selector: 'input[id="humanTrafficking"][value="N"], input[name="humanTrafficking"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  terrorism: {
    fieldId: 'terrorism',
    selector: 'input[id="terrorism"][value="N"], input[name="terrorism"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  genocide: {
    fieldId: 'genocide',
    selector: 'input[id="genocide"][value="N"], input[name="genocide"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  childSoldier: {
    fieldId: 'childSoldier',
    selector: 'input[id="childSoldier"][value="N"], input[name="childSoldier"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  religiousFreedom: {
    fieldId: 'religiousFreedom',
    selector: 'input[id="religiousFreedom"][value="N"], input[name="religiousFreedom"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  visaRefusal: {
    fieldId: 'visaRefusal',
    selector: 'input[id="visaRefusal"][value="N"], input[name="visaRefusal"][value="N"]',
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
    name: 'Load ESTA Portal',
    description: 'Navigate to the official ESTA portal at esta.cbp.dhs.gov',
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
    id: 'start_application',
    name: 'Start New Application',
    description: 'Click on New Application to begin the ESTA process',
    script: `
      const startButtons = [
        'a[href*="new-application"], a[href*="newApplication"]',
        'button[id*="new"], input[value*="New Application"]',
        '.btn-new-application, .new-application-btn'
      ];

      for (const selector of startButtons) {
        const button = document.querySelector(selector);
        if (button && button.offsetParent !== null) {
          button.scrollIntoView();
          button.click();
          return new Promise((resolve) => {
            setTimeout(() => resolve({ success: true, buttonClicked: selector }), 2000);
          });
        }
      }

      return { success: false, error: 'No new application button found' };
    `,
    timing: { timeout: 10000, waitAfter: 3000 },
    critical: false,
  },
  {
    id: 'fill_applicant_info',
    name: 'Fill Applicant Information',
    description: 'Fill in personal and passport information',
    script: `
      // This script will be dynamically generated with actual form data
      return { success: true, message: 'Applicant information filling script placeholder' };
    `,
    timing: { timeout: 15000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_contact_employment',
    name: 'Fill Contact and Employment',
    description: 'Fill contact information and employment details',
    script: `
      // This script will be dynamically generated with actual form data
      return { success: true, message: 'Contact and employment filling script placeholder' };
    `,
    timing: { timeout: 15000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_eligibility',
    name: 'Fill Eligibility Questions',
    description: 'Answer all ESTA eligibility questions',
    script: `
      // This script will be dynamically generated with actual form data
      return { success: true, message: 'Eligibility questions script placeholder' };
    `,
    timing: { timeout: 15000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'submit_form',
    name: 'Submit Application',
    description: 'Submit the ESTA application and proceed to payment',
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
    name: 'Capture Application Number',
    description: 'Extract ESTA application number from confirmation page',
    script: `
      const applicationNumber = (
        document.querySelector('[id*="application-number"]')?.textContent ||
        document.querySelector('[class*="application-number"]')?.textContent ||
        ''
      ).trim();

      const isApproved = document.querySelector('.authorization-approved, #esta-approval') !== null;

      return {
        success: applicationNumber !== '' || isApproved,
        applicationNumber: applicationNumber,
        isApproved: isApproved,
        pageUrl: window.location.href
      };
    `,
    timing: { timeout: 10000, waitAfter: 0 },
    critical: false,
  },
];

const USA_MAPPING: AutomationScript = {
  countryCode: 'USA',
  portalUrl: 'https://esta.cbp.dhs.gov/',
  version: '1.0.0',
  lastUpdated: '2026-03-14T00:00:00Z',
  prerequisites: {
    cookiesEnabled: true,
    javascriptEnabled: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },
  steps,
  fieldMappings,
  session: {
    maxDurationMs: 30 * 60 * 1000, // 30 minutes
    keepAlive: true,
    clearCookiesOnStart: false,
  },
};

export default USA_MAPPING;
