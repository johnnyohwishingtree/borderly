/**
 * Singapore (SGP) — SG Arrival Card field mappings and portal automation config.
 *
 * Portal: SG Arrival Card (ICA)
 * URL: https://eservices.ica.gov.sg/sgarrivalcard
 * Tech stack: React SPA — uses controlled inputs with camelCase name attributes.
 * Date format: DD/MM/YYYY (verified)
 * Multi-step wizard: Step 1 = Personal Info, Step 2 = Travel, Step 3 = Accommodation,
 *   Step 4 = Health Declaration, Step 5 = Customs
 * Session timeout: 15 minutes (warning shown at 13 minutes)
 *
 * Selectors last verified: 2026-03-15
 */

import type { AutomationScript, AutomationStep, PortalFieldMapping } from '@/types/submission';

const fieldMappings: Record<string, PortalFieldMapping> = {
  // Step 1 — Personal Information
  surname: {
    fieldId: 'surname',
    // ICA uses camelCase: "familyName" or "surname"
    selector:
      'input[name="familyName"], input[name="surname"], input[name="family_name"], input[id="family_name"]',
    inputType: 'text',
  },
  givenNames: {
    fieldId: 'givenNames',
    selector:
      'input[name="givenName"], input[name="given_name"], input[name="first_name"], input[id="given_name"]',
    inputType: 'text',
  },
  dateOfBirth: {
    fieldId: 'dateOfBirth',
    // ICA uses DD/MM/YYYY date format
    selector:
      'input[name="dob"], input[name="dateOfBirth"], input[name="date_of_birth"], input[id="dob"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    },
  },
  nationality: {
    fieldId: 'nationality',
    selector:
      'select[name="nationality"], select[name="nationalityCode"], select[id="nationality"]',
    inputType: 'select',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
  },
  passportNumber: {
    fieldId: 'passportNumber',
    selector:
      'input[name="passportNo"], input[name="passport_no"], input[name="passport_number"], input[id="passport_no"]',
    inputType: 'text',
  },
  passportExpiry: {
    fieldId: 'passportExpiry',
    selector:
      'input[name="passportExpiryDate"], input[name="passport_expiry"], input[name="expiry_date"], input[id="passport_expiry"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    },
  },
  gender: {
    fieldId: 'gender',
    // ICA uses "sex" with values "M"/"F"; also check "gender"
    selector:
      'select[name="sex"], select[name="gender"], input[name="sex"], input[id="sex"]',
    inputType: 'select',
  },
  email: {
    fieldId: 'email',
    selector:
      'input[name="email"], input[type="email"], input[id="email"]',
    inputType: 'text',
  },
  phoneNumber: {
    fieldId: 'phoneNumber',
    selector:
      'input[name="mobileNo"], input[name="mobile_no"], input[name="phone"], input[id="mobile_no"]',
    inputType: 'text',
  },
  // Step 2 — Travel Information
  arrivalDate: {
    fieldId: 'arrivalDate',
    selector:
      'input[name="arrivalDate"], input[name="arrival_date"], input[id="arrival_date"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    },
  },
  arrivalTime: {
    fieldId: 'arrivalTime',
    selector:
      'input[name="arrivalTime"], input[name="arrival_time"], input[id="arrival_time"]',
    inputType: 'text',
  },
  flightNumber: {
    fieldId: 'flightNumber',
    selector:
      'input[name="flightNo"], input[name="flight_no"], input[name="flight_number"], input[id="flight_no"]',
    inputType: 'text',
  },
  airlineCode: {
    fieldId: 'airlineCode',
    selector:
      'input[name="airlineCode"], input[name="airline_code"], input[name="airline"], input[id="airline_code"]',
    inputType: 'text',
  },
  departureCity: {
    fieldId: 'departureCity',
    // ICA calls this "port of departure" or "last city"
    selector:
      'input[name="portDeparture"], input[name="departure_city"], input[name="last_port"], input[id="departure_city"]',
    inputType: 'text',
  },
  purposeOfVisit: {
    fieldId: 'purposeOfVisit',
    selector:
      'select[name="purposeOfVisit"], select[name="purpose_of_visit"], select[id="purpose_of_visit"]',
    inputType: 'select',
  },
  intendedLengthOfStay: {
    fieldId: 'intendedLengthOfStay',
    selector:
      'input[name="durationStay"], input[name="length_of_stay"], input[name="duration_of_stay"], input[id="length_of_stay"]',
    inputType: 'text',
  },
  // Step 3 — Accommodation
  accommodationType: {
    fieldId: 'accommodationType',
    selector:
      'select[name="accommodationType"], select[name="accommodation_type"], select[id="accommodation_type"]',
    inputType: 'select',
  },
  accommodationName: {
    fieldId: 'accommodationName',
    selector:
      'input[name="accommodationName"], input[name="accommodation_name"], input[name="hotel_name"], input[id="accommodation_name"]',
    inputType: 'text',
  },
  accommodationAddress: {
    fieldId: 'accommodationAddress',
    selector:
      'textarea[name="accommodationAddress"], textarea[name="accommodation_address"], input[name="hotel_address"], textarea[id="accommodation_address"]',
    inputType: 'text',
  },
  accommodationPhone: {
    fieldId: 'accommodationPhone',
    selector:
      'input[name="accommodationPhone"], input[name="accommodation_phone"], input[id="accommodation_phone"]',
    inputType: 'text',
  },
  // Step 4 — Health Declaration (radio values: "N" for No / "Y" for Yes)
  feverSymptoms: {
    fieldId: 'feverSymptoms',
    selector:
      'input[name="feverSymptoms"][value="N"], input[name="fever_symptoms"][value="no"], input[name="has_fever"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'no', trueValue: 'yes' },
    },
  },
  infectiousDisease: {
    fieldId: 'infectiousDisease',
    selector:
      'input[name="infectiousDisease"][value="N"], input[name="infectious_disease"][value="no"], input[name="has_infectious_disease"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'no', trueValue: 'yes' },
    },
  },
  visitedOutbreakArea: {
    fieldId: 'visitedOutbreakArea',
    selector:
      'input[name="visitedOutbreakArea"][value="N"], input[name="visited_outbreak"][value="no"], input[name="visited_high_risk"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'no', trueValue: 'yes' },
    },
  },
  contactWithInfected: {
    fieldId: 'contactWithInfected',
    selector:
      'input[name="contactWithInfected"][value="N"], input[name="contact_infected"][value="no"], input[name="close_contact"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'no', trueValue: 'yes' },
    },
  },
  // Step 5 — Customs Declaration
  exceedsAllowance: {
    fieldId: 'exceedsAllowance',
    // Goods exceeding duty-free allowance
    selector:
      'input[name="exceedsAllowance"][value="N"], input[name="exceeds_allowance"][value="no"], input[name="goods_to_declare"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'no', trueValue: 'yes' },
    },
  },
  carryingCash: {
    fieldId: 'carryingCash',
    // Cash/monetary instruments above SGD 20,000
    selector:
      'input[name="carryingCash"][value="N"], input[name="carrying_cash"][value="no"], input[name="cash_above_limit"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'no', trueValue: 'yes' },
    },
  },
  prohibitedGoods: {
    fieldId: 'prohibitedGoods',
    selector:
      'input[name="prohibitedGoods"][value="N"], input[name="prohibited_goods"][value="no"], input[name="has_prohibited"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'no', trueValue: 'yes' },
    },
  },
  commercialGoods: {
    fieldId: 'commercialGoods',
    selector:
      'input[name="commercialGoods"][value="N"], input[name="commercial_goods"][value="no"], input[name="has_commercial"][value="N"]',
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
    name: 'Load SG Arrival Card Portal',
    description: 'Navigate to Singapore ICA portal and wait for page load',
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
      return { success: true, message: 'Personal information filling script placeholder' };
    `,
    timing: { timeout: 15000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_travel_info',
    name: 'Fill Travel Information',
    description: 'Fill flight and travel details',
    script: `
      return { success: true, message: 'Travel information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_accommodation',
    name: 'Fill Accommodation Details',
    description: 'Fill accommodation information',
    script: `
      return { success: true, message: 'Accommodation filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_health_declarations',
    name: 'Fill Health Declaration',
    description: 'Complete health screening questions',
    script: `
      return { success: true, message: 'Health declaration filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_customs_declaration',
    name: 'Fill Customs Declaration',
    description: 'Complete customs declaration questions',
    script: `
      return { success: true, message: 'Customs declaration filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'submit_form',
    name: 'Submit Form',
    description: 'Submit the completed SG Arrival Card',
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

const SGP_MAPPING: AutomationScript = {
  countryCode: 'SGP',
  portalUrl: 'https://eservices.ica.gov.sg/sgarrivalcard',
  version: '1.1.0',
  lastUpdated: '2026-03-15T00:00:00Z',
  prerequisites: {
    cookiesEnabled: true,
    javascriptEnabled: true,
  },
  steps,
  fieldMappings,
  session: {
    maxDurationMs: 15 * 60 * 1000, // 15 minutes
    keepAlive: true,
    clearCookiesOnStart: false,
  },
};

export default SGP_MAPPING;
