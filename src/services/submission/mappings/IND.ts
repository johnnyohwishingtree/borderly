/**
 * India (IND) — Air Suvidha / e-Arrival Card field mappings.
 *
 * Portal: Air Suvidha / e-Arrival Card
 * URL: https://www.newdelhiairport.in/airsuvidha
 * Account required: No
 * Date format: DD/MM/YYYY
 *
 * India has the most complex form of the supported countries:
 * - 12 visa types (including 3 e-Visa categories)
 * - 4 passport types (Ordinary, Diplomatic, Official, Service)
 * - Third-gender option (Male / Female / Other)
 * - Place of birth field
 * - Pilgrimage as a distinct purpose of visit
 *
 * Selectors are estimates based on the portal structure — verify against
 * the live portal before enabling automation.
 */

import type { AutomationScript, AutomationStep, PortalFieldMapping } from '@/types/submission';

// ── Section 1: Personal Information ──────────────────────────────────────────

const personalInfoMappings: Record<string, PortalFieldMapping> = {
  surname: {
    fieldId: 'surname',
    selector: 'input[name="surname"], input[name="lastName"], #surname',
    inputType: 'text',
  },
  givenName: {
    fieldId: 'givenName',
    selector: 'input[name="givenName"], input[name="firstName"], #givenName',
    inputType: 'text',
  },
  middleName: {
    fieldId: 'middleName',
    selector: 'input[name="middleName"], input[name="middle_name"], #middleName',
    inputType: 'text',
  },
  dateOfBirth: {
    fieldId: 'dateOfBirth',
    selector: 'input[name="dateOfBirth"], input[name="dob"], #dateOfBirth',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    },
  },
  placeOfBirth: {
    fieldId: 'placeOfBirth',
    selector: 'input[name="placeOfBirth"], input[name="birthPlace"], #placeOfBirth',
    inputType: 'text',
  },
  gender: {
    fieldId: 'gender',
    // India legally recognizes three genders: Male, Female, Other
    selector: 'select[name="gender"], select[name="sex"], #gender',
    inputType: 'select',
  },
  nationality: {
    fieldId: 'nationality',
    selector: 'select[name="nationality"], #nationality',
    inputType: 'select',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
  },
  occupation: {
    fieldId: 'occupation',
    selector: 'select[name="occupation"], select[name="profession"], #occupation',
    inputType: 'select',
  },
};

// ── Section 2: Passport Information ──────────────────────────────────────────

const passportMappings: Record<string, PortalFieldMapping> = {
  passportType: {
    fieldId: 'passportType',
    // Ordinary, Diplomatic, Official, Service
    selector: 'select[name="passportType"], select[name="passport_type"], #passportType',
    inputType: 'select',
  },
  passportNumber: {
    fieldId: 'passportNumber',
    selector: 'input[name="passportNumber"], input[name="passport_number"], #passportNumber',
    inputType: 'text',
  },
  passportIssuedDate: {
    fieldId: 'passportIssuedDate',
    selector: 'input[name="passportIssueDate"], input[name="passport_issue_date"], #passportIssueDate',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    },
  },
  passportExpiry: {
    fieldId: 'passportExpiry',
    selector: 'input[name="passportExpiryDate"], input[name="passport_expiry_date"], #passportExpiryDate',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    },
  },
  passportIssuingCountry: {
    fieldId: 'passportIssuingCountry',
    selector: 'select[name="issuingCountry"], select[name="passport_issuing_country"], #issuingCountry',
    inputType: 'select',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
  },
  visaNumber: {
    fieldId: 'visaNumber',
    selector: 'input[name="visaNumber"], input[name="visa_number"], #visaNumber',
    inputType: 'text',
  },
  visaType: {
    fieldId: 'visaType',
    // 12 types: Tourist, Business, Employment, Student, Medical, Conference,
    // Transit, e-Tourist, e-Business, e-Medical, Visa on Arrival, Other
    selector: 'select[name="visaType"], select[name="visa_type"], #visaType',
    inputType: 'select',
  },
};

// ── Section 3: Travel Information ────────────────────────────────────────────

const travelMappings: Record<string, PortalFieldMapping> = {
  purposeOfVisit: {
    fieldId: 'purposeOfVisit',
    selector: 'select[name="purposeOfVisit"], select[name="purpose_of_visit"], #purposeOfVisit',
    inputType: 'select',
  },
  arrivalDate: {
    fieldId: 'arrivalDate',
    selector: 'input[name="arrivalDate"], input[name="date_of_arrival"], #arrivalDate',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    },
  },
  flightNumber: {
    fieldId: 'flightNumber',
    selector: 'input[name="flightNumber"], input[name="flight_number"], #flightNumber',
    inputType: 'text',
  },
  portOfArrival: {
    fieldId: 'portOfArrival',
    // 10 airports: DEL, BOM, BLR, MAA, CCU, HYD, COK, GOI, AMD, JAI
    selector: 'select[name="portOfArrival"], select[name="port_of_arrival"], #portOfArrival',
    inputType: 'select',
  },
  departureCountry: {
    fieldId: 'departureCountry',
    selector: 'select[name="departureCountry"], select[name="country_of_departure"], #departureCountry',
    inputType: 'select',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
  },
  stayDuration: {
    fieldId: 'stayDuration',
    selector: 'input[name="lengthOfStay"], input[name="duration_of_stay"], #lengthOfStay',
    inputType: 'text',
  },
  addressInIndia: {
    fieldId: 'addressInIndia',
    selector: 'input[name="addressInIndia"], textarea[name="addressInIndia"], #addressInIndia',
    inputType: 'text',
  },
  cityInIndia: {
    fieldId: 'cityInIndia',
    selector: 'input[name="cityInIndia"], select[name="cityInIndia"], #cityInIndia',
    inputType: 'text',
  },
  previousIndiaVisit: {
    fieldId: 'previousIndiaVisit',
    selector: 'input[name="previousVisit"], input[name="previous_india_visit"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
};

// ── Section 4: Health Declaration ────────────────────────────────────────────

const healthMappings: Record<string, PortalFieldMapping> = {
  countriesVisitedLast14Days: {
    fieldId: 'countriesVisitedLast14Days',
    selector: 'textarea[name="countriesVisited"], input[name="countries_visited"], #countriesVisited',
    inputType: 'text',
  },
  feverOrCough: {
    fieldId: 'feverOrCough',
    selector: 'input[name="hasSymptoms"], input[name="fever_cough"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
  contactWithInfected: {
    fieldId: 'contactWithInfected',
    selector: 'input[name="closeContact"], input[name="contact_infected"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
};

// ── Section 5: Customs Declaration ───────────────────────────────────────────

const customsMappings: Record<string, PortalFieldMapping> = {
  carryingCurrency: {
    fieldId: 'carryingCurrency',
    // Currency exceeding USD 5,000
    selector: 'input[name="currencyExceeding"], input[name="excess_currency"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
  currencyAmount: {
    fieldId: 'currencyAmount',
    selector: 'input[name="currencyAmount"], input[name="currency_amount"], #currencyAmount',
    inputType: 'text',
  },
  dutiableGoods: {
    fieldId: 'dutiableGoods',
    selector: 'input[name="dutiableGoods"], input[name="dutiable_goods"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
  prohibitedItems: {
    fieldId: 'prohibitedItems',
    selector: 'input[name="prohibitedItems"], input[name="prohibited_items"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
  commercialGoods: {
    fieldId: 'commercialGoods',
    selector: 'input[name="commercialGoods"], input[name="commercial_goods"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
};

// ── Section 6: Contact Information ───────────────────────────────────────────

const contactMappings: Record<string, PortalFieldMapping> = {
  homeAddress: {
    fieldId: 'homeAddress',
    selector: 'input[name="permanentAddress"], textarea[name="permanentAddress"], #permanentAddress',
    inputType: 'text',
  },
  phoneNumber: {
    fieldId: 'phoneNumber',
    selector: 'input[name="phoneNumber"], input[name="phone"], #phoneNumber',
    inputType: 'text',
  },
  email: {
    fieldId: 'email',
    selector: 'input[name="email"], input[type="email"], #email',
    inputType: 'text',
  },
  emergencyContactName: {
    fieldId: 'emergencyContactName',
    selector: 'input[name="emergencyContactName"], input[name="emergency_name"], #emergencyContactName',
    inputType: 'text',
  },
  emergencyContactPhone: {
    fieldId: 'emergencyContactPhone',
    selector: 'input[name="emergencyContactPhone"], input[name="emergency_phone"], #emergencyContactPhone',
    inputType: 'text',
  },
};

// ── Combined field mappings ──────────────────────────────────────────────────

const fieldMappings: Record<string, PortalFieldMapping> = {
  ...personalInfoMappings,
  ...passportMappings,
  ...travelMappings,
  ...healthMappings,
  ...customsMappings,
  ...contactMappings,
};

// ── Automation Steps ─────────────────────────────────────────────────────────

const steps: AutomationStep[] = [
  {
    id: 'load_portal',
    name: 'Load Air Suvidha Portal',
    description: 'Navigate to the India Air Suvidha / e-Arrival Card portal',
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
    description: 'Fill name, DOB, place of birth, gender (M/F/Other), nationality, occupation',
    script: `
      return { success: true, message: 'Personal information filling script placeholder' };
    `,
    timing: { timeout: 15000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_passport_info',
    name: 'Fill Passport Information',
    description: 'Fill passport type, number, dates, visa number, and visa type (12 options)',
    script: `
      return { success: true, message: 'Passport information filling script placeholder' };
    `,
    timing: { timeout: 15000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_travel_info',
    name: 'Fill Travel Information',
    description: 'Fill purpose of visit, flight details, port of arrival (10 airports), address in India',
    script: `
      return { success: true, message: 'Travel information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_health_declaration',
    name: 'Fill Health Declaration',
    description: 'Fill countries visited in last 14 days and symptom questions',
    script: `
      return { success: true, message: 'Health declaration filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_customs_declaration',
    name: 'Fill Customs Declaration',
    description: 'Fill currency (USD 5,000 threshold), dutiable goods, prohibited items declarations',
    script: `
      return { success: true, message: 'Customs declaration filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_contact_info',
    name: 'Fill Contact Information',
    description: 'Fill home address, phone, email, and emergency contact details',
    script: `
      return { success: true, message: 'Contact information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'submit_form',
    name: 'Submit e-Arrival Card',
    description: 'Submit the completed Air Suvidha form',
    script: `
      const submitSelectors = [
        'input[type="submit"]',
        'button[type="submit"]',
        '.submit-button, .btn-submit'
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

// ── Export ────────────────────────────────────────────────────────────────────

const IND_MAPPING: AutomationScript = {
  countryCode: 'IND',
  portalUrl: 'https://www.newdelhiairport.in/airsuvidha',
  version: '1.0.0',
  lastUpdated: '2026-03-27T00:00:00Z',
  prerequisites: {
    cookiesEnabled: true,
    javascriptEnabled: true,
  },
  steps,
  fieldMappings,
  session: {
    maxDurationMs: 30 * 60 * 1000, // 30 minutes
    keepAlive: true,
    clearCookiesOnStart: false,
  },
};

export default IND_MAPPING;
