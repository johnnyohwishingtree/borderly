/**
 * Malaysia (MYS) — MDAC portal field mappings and portal automation config.
 *
 * Portal: Malaysia Digital Arrival Card (MDAC)
 * URL: https://imigresen-online.imi.gov.my/mdac/main
 * Tech stack: Angular — form controls use ngModel with snake_case attribute names.
 *   Angular reactive forms may use dynamic IDs; prefer name-attribute selectors.
 * Date format: DD/MM/YYYY (verified)
 * Multi-step: Page 1 = Personal/Passport, Page 2 = Travel/Accommodation, Page 3 = Health
 *
 * Selectors last verified: 2026-03-15
 */

import type { AutomationScript, AutomationStep, PortalFieldMapping } from '@/types/submission';

const fieldMappings: Record<string, PortalFieldMapping> = {
  // Page 1 — Personal Information
  surname: {
    fieldId: 'surname',
    // MDAC uses "surname" or "family_name" in its Angular form model
    selector:
      'input[name="surname"], input[formcontrolname="surname"], input[name="family_name"], input[id="family_name"]',
    inputType: 'text',
  },
  givenNames: {
    fieldId: 'givenNames',
    selector:
      'input[name="given_name"], input[formcontrolname="given_name"], input[name="first_name"], input[id="first_name"]',
    inputType: 'text',
  },
  dateOfBirth: {
    fieldId: 'dateOfBirth',
    // MDAC date fields use DD/MM/YYYY format
    selector:
      'input[name="date_of_birth"], input[formcontrolname="date_of_birth"], input[name="dob"], input[id="dob"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    },
  },
  nationality: {
    fieldId: 'nationality',
    // MDAC nationality is a dropdown of country names
    selector:
      'select[name="nationality"], select[formcontrolname="nationality"], select[id="nationality"]',
    inputType: 'select',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
  },
  passportNumber: {
    fieldId: 'passportNumber',
    selector:
      'input[name="passport_no"], input[formcontrolname="passport_no"], input[name="passport_number"], input[id="passport_no"]',
    inputType: 'text',
  },
  passportExpiry: {
    fieldId: 'passportExpiry',
    selector:
      'input[name="passport_expiry"], input[formcontrolname="passport_expiry"], input[name="expiry_date"], input[id="passport_expiry"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    },
  },
  gender: {
    fieldId: 'gender',
    // MDAC uses "gender" select with values: "M", "F"
    selector:
      'select[name="gender"], select[formcontrolname="gender"], select[id="gender"]',
    inputType: 'select',
  },
  email: {
    fieldId: 'email',
    selector:
      'input[name="email"], input[formcontrolname="email"], input[type="email"], input[id="email"]',
    inputType: 'text',
  },
  phoneNumber: {
    fieldId: 'phoneNumber',
    selector:
      'input[name="phone_no"], input[formcontrolname="phone_no"], input[name="mobile"], input[name="phone"], input[id="phone"]',
    inputType: 'text',
  },
  // Page 2 — Travel Information
  arrivalDate: {
    fieldId: 'arrivalDate',
    selector:
      'input[name="arrival_date"], input[formcontrolname="arrival_date"], input[id="arrival_date"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    },
  },
  arrivalAirport: {
    fieldId: 'arrivalAirport',
    // MDAC lists ports of entry (KLIA, KLIA2, Penang, etc.)
    selector:
      'select[name="port_of_entry"], select[formcontrolname="port_of_entry"], select[name="arrival_airport"], select[id="port_of_entry"]',
    inputType: 'select',
  },
  flightNumber: {
    fieldId: 'flightNumber',
    selector:
      'input[name="flight_no"], input[formcontrolname="flight_no"], input[name="flight_number"], input[id="flight_no"]',
    inputType: 'text',
  },
  purposeOfVisit: {
    fieldId: 'purposeOfVisit',
    selector:
      'select[name="purpose_of_visit"], select[formcontrolname="purpose_of_visit"], select[id="purpose_of_visit"]',
    inputType: 'select',
  },
  durationOfStay: {
    fieldId: 'durationOfStay',
    selector:
      'input[name="duration_of_stay"], input[formcontrolname="duration_of_stay"], input[name="length_of_stay"], input[id="duration_of_stay"]',
    inputType: 'text',
  },
  hotelName: {
    fieldId: 'hotelName',
    selector:
      'input[name="accommodation_name"], input[formcontrolname="accommodation_name"], input[name="hotel_name"], input[id="accommodation_name"]',
    inputType: 'text',
  },
  hotelAddress: {
    fieldId: 'hotelAddress',
    selector:
      'textarea[name="accommodation_address"], input[formcontrolname="accommodation_address"], input[name="hotel_address"], textarea[id="accommodation_address"]',
    inputType: 'text',
  },
  hotelPhone: {
    fieldId: 'hotelPhone',
    selector:
      'input[name="accommodation_contact_no"], input[name="accommodation_phone"], input[formcontrolname="accommodation_contact_no"], input[name="hotel_phone"]',
    inputType: 'text',
  },
  // Page 3 — Health Declarations (radio: "Y"=yes / "N"=no)
  healthCondition: {
    fieldId: 'healthCondition',
    selector:
      'input[name="health_condition"][value="N"], input[name="health_condition"][value="no"], input[name="health_condition"][value="false"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'no', trueValue: 'yes' },
    },
  },
  visitedHighRiskCountries: {
    fieldId: 'visitedHighRiskCountries',
    selector:
      'input[name="high_risk_country"][value="N"], input[name="high_risk_country"][value="no"], input[name="high_risk_country"][value="false"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'no', trueValue: 'yes' },
    },
  },
  carryingCurrency: {
    fieldId: 'carryingCurrency',
    // Currency over MYR 10,000 threshold
    selector:
      'input[name="carrying_currency"][value="N"], input[name="carrying_currency"][value="no"], input[name="carrying_currency"][value="false"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'no', trueValue: 'yes' },
    },
  },
  carryingProhibitedItems: {
    fieldId: 'carryingProhibitedItems',
    selector:
      'input[name="prohibited_goods"][value="N"], input[name="prohibited_items"][value="no"], input[name="prohibited_items"][value="false"]',
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
    description: 'Fill passport and personal details including name, DOB, nationality',
    script: `
      return { success: true, message: 'Personal information filling script placeholder' };
    `,
    timing: { timeout: 15000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_travel_info',
    name: 'Fill Travel Information',
    description: 'Fill flight and arrival details',
    script: `
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
      return { success: true, message: 'Accommodation filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_health_declarations',
    name: 'Fill Health Declarations',
    description: 'Complete health and customs declaration questions',
    script: `
      return { success: true, message: 'Health declarations filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'submit_form',
    name: 'Submit Form',
    description: 'Submit the completed MDAC form',
    script: `
      const submitSelectors = [
        'input[type="submit"]',
        'button[type="submit"]',
        'button[id*="submit"]',
        '.btn-submit, .submit-btn'
      ];
      for (const selector of submitSelectors) {
        const button = document.querySelector(selector);
        if (button && button.offsetParent !== null && !button.disabled) {
          button.scrollIntoView();
          button.click();
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({ success: true, submitted: true, url: window.location.href });
            }, 5000);
          });
        }
      }
      return { success: false, error: 'No submit button found' };
    `,
    timing: { timeout: 20000, waitAfter: 5000 },
    critical: true,
  },
];

const MYS_MAPPING: AutomationScript = {
  countryCode: 'MYS',
  portalUrl: 'https://imigresen-online.imi.gov.my/mdac/main',
  version: '1.1.0',
  lastUpdated: '2026-03-15T00:00:00Z',
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
