/**
 * Malaysia (MYS) — MDAC portal field mappings and portal automation config.
 *
 * The AutomationScriptRegistry auto-discovers this file via the mappings barrel.
 * Date format: DD/MM/YYYY (Malaysian portal standard).
 */

import type { AutomationScript, AutomationStep, PortalFieldMapping } from '@/types/submission';

const fieldMappings: Record<string, PortalFieldMapping> = {
  surname: {
    fieldId: 'surname',
    selector: 'input[name="family_name"], input[id="family_name"], input[name="surname"], input[id="surname"]',
    inputType: 'text',
  },
  givenNames: {
    fieldId: 'givenNames',
    selector: 'input[name="first_name"], input[id="first_name"], input[name="given_name"], input[id="given_name"]',
    inputType: 'text',
  },
  dateOfBirth: {
    fieldId: 'dateOfBirth',
    selector: 'input[name="dob"], input[id="dob"], input[name="date_of_birth"], input[id="date_of_birth"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    },
  },
  nationality: {
    fieldId: 'nationality',
    selector: 'select[name="nationality"], select[id="nationality"]',
    inputType: 'select',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
  },
  passportNumber: {
    fieldId: 'passportNumber',
    selector: 'input[name="passport_no"], input[id="passport_no"], input[name="passport_number"], input[id="passport_number"]',
    inputType: 'text',
  },
  passportExpiry: {
    fieldId: 'passportExpiry',
    selector: 'input[name="passport_expiry"], input[id="passport_expiry"], input[name="expiry_date"], input[id="expiry_date"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    },
  },
  gender: {
    fieldId: 'gender',
    selector: 'select[name="gender"], select[id="gender"]',
    inputType: 'select',
  },
  email: {
    fieldId: 'email',
    selector: 'input[name="email"], input[id="email"], input[type="email"]',
    inputType: 'text',
  },
  phoneNumber: {
    fieldId: 'phoneNumber',
    selector: 'input[name="phone"], input[id="phone"], input[name="phone_number"], input[id="phone_number"]',
    inputType: 'text',
  },
  arrivalDate: {
    fieldId: 'arrivalDate',
    selector: 'input[name="arrival_date"], input[id="arrival_date"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    },
  },
  arrivalAirport: {
    fieldId: 'arrivalAirport',
    selector: 'select[name="arrival_airport"], select[id="arrival_airport"], select[name="port_of_entry"], select[id="port_of_entry"]',
    inputType: 'select',
  },
  flightNumber: {
    fieldId: 'flightNumber',
    selector: 'input[name="flight_no"], input[id="flight_no"], input[name="flight_number"], input[id="flight_number"]',
    inputType: 'text',
  },
  purposeOfVisit: {
    fieldId: 'purposeOfVisit',
    selector: 'select[name="purpose_of_visit"], select[id="purpose_of_visit"], select[name="visit_purpose"], select[id="visit_purpose"]',
    inputType: 'select',
  },
  durationOfStay: {
    fieldId: 'durationOfStay',
    selector: 'input[name="duration_of_stay"], input[id="duration_of_stay"], input[name="stay_duration"], input[id="stay_duration"]',
    inputType: 'text',
  },
  hotelName: {
    fieldId: 'hotelName',
    selector: 'input[name="hotel_name"], input[id="hotel_name"], input[name="accommodation_name"], input[id="accommodation_name"]',
    inputType: 'text',
  },
  hotelAddress: {
    fieldId: 'hotelAddress',
    selector: 'textarea[name="hotel_address"], textarea[id="hotel_address"], textarea[name="accommodation_address"], textarea[id="accommodation_address"]',
    inputType: 'text',
  },
  hotelPhone: {
    fieldId: 'hotelPhone',
    selector: 'input[name="hotel_phone"], input[id="hotel_phone"], input[name="accommodation_phone"], input[id="accommodation_phone"]',
    inputType: 'text',
  },
  healthCondition: {
    fieldId: 'healthCondition',
    selector: 'input[name="health_condition"][value="no"], input[name="health_condition"][value="false"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'no', trueValue: 'yes' },
    },
  },
  visitedHighRiskCountries: {
    fieldId: 'visitedHighRiskCountries',
    selector: 'input[name="high_risk_countries"][value="no"], input[name="high_risk_countries"][value="false"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'no', trueValue: 'yes' },
    },
  },
  carryingCurrency: {
    fieldId: 'carryingCurrency',
    selector: 'input[name="carrying_currency"][value="no"], input[name="carrying_currency"][value="false"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'no', trueValue: 'yes' },
    },
  },
  carryingProhibitedItems: {
    fieldId: 'carryingProhibitedItems',
    selector: 'input[name="prohibited_items"][value="no"], input[name="prohibited_items"][value="false"]',
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
    name: 'Load MDAC Portal',
    description: 'Navigate to Malaysia Digital Arrival Card portal and wait for page load',
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
    description: 'Fill passport and personal details',
    script: `
      // This script will be dynamically generated with actual form data
      return { success: true, message: 'Personal information filling script placeholder' };
    `,
    timing: { timeout: 15000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_travel_info',
    name: 'Fill Travel Information',
    description: 'Fill arrival and travel details',
    script: `
      // This script will be dynamically generated with actual form data
      return { success: true, message: 'Travel information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_accommodation',
    name: 'Fill Accommodation Details',
    description: 'Fill hotel and accommodation information',
    script: `
      // This script will be dynamically generated with actual form data
      return { success: true, message: 'Accommodation filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 1000 },
    critical: true,
  },
  {
    id: 'fill_declarations',
    name: 'Fill Health Declarations',
    description: 'Complete health and customs declaration questions',
    script: `
      // This script will be dynamically generated with actual form data
      return { success: true, message: 'Declarations filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'submit_form',
    name: 'Submit Form',
    description: 'Submit the completed MDAC form and wait for confirmation',
    script: `
      const submitSelectors = [
        'input[type="submit"]',
        'button[type="submit"]',
        'button[id*="submit"]',
        'input[value*="Submit"]',
        '.btn-submit, .submit-btn'
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
                url: window.location.href,
                hasConfirmation: document.querySelector('.confirmation, .success, [id*="confirm"]') !== null
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
    name: 'Capture Confirmation',
    description: 'Extract confirmation reference from MDAC submission',
    script: `
      const confirmationNumber = (
        document.querySelector('[id*="confirmation"]')?.textContent ||
        document.querySelector('[class*="reference"]')?.textContent ||
        ''
      ).trim();

      return {
        success: confirmationNumber !== '',
        confirmationNumber: confirmationNumber,
        pageUrl: window.location.href
      };
    `,
    timing: { timeout: 10000, waitAfter: 0 },
    critical: false,
  },
];

const MYS_MAPPING: AutomationScript = {
  countryCode: 'MYS',
  portalUrl: 'https://imigresen-online.imi.gov.my/mdac/main',
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

export default MYS_MAPPING;
