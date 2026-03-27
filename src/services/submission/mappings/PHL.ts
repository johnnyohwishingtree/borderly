/**
 * Philippines (PHL) — eTravel field mappings and portal automation config.
 *
 * Portal: Philippines eTravel
 * URL: https://etravel.gov.ph
 * Account required: Yes (email verification)
 * Date format: MM/DD/YYYY
 * Output: QR code sent via email
 *
 * The eTravel portal requires email registration and verification before
 * form submission. Set portalFlow.requiresAccount: true in the schema.
 *
 * Selectors are estimates based on the portal structure — verify against
 * the live portal before enabling automation.
 */

import type { AutomationScript, AutomationStep, PortalFieldMapping } from '@/types/submission';

// ── Section 1: Personal Information ──────────────────────────────────────────

const personalInfoMappings: Record<string, PortalFieldMapping> = {
  surname: {
    fieldId: 'surname',
    selector: 'input[name="lastName"], input[name="last_name"], #lastName',
    inputType: 'text',
  },
  givenNames: {
    fieldId: 'givenNames',
    selector: 'input[name="firstName"], input[name="first_name"], #firstName',
    inputType: 'text',
  },
  middleName: {
    fieldId: 'middleName',
    selector: 'input[name="middleName"], input[name="middle_name"], #middleName',
    inputType: 'text',
  },
  dateOfBirth: {
    fieldId: 'dateOfBirth',
    selector: 'input[name="dateOfBirth"], input[name="date_of_birth"], #dateOfBirth',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'MM/DD/YYYY' },
    },
  },
  sex: {
    fieldId: 'sex',
    selector: 'select[name="sex"], select[name="gender"], #sex',
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
  countryOfResidence: {
    fieldId: 'countryOfResidence',
    selector: 'select[name="countryOfResidence"], select[name="country_of_residence"], #countryOfResidence',
    inputType: 'select',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
  },
  occupation: {
    fieldId: 'occupation',
    selector: 'select[name="occupation"], #occupation',
    inputType: 'select',
  },
};

// ── Section 2: Passport Information ──────────────────────────────────────────

const passportMappings: Record<string, PortalFieldMapping> = {
  passportNumber: {
    fieldId: 'passportNumber',
    selector: 'input[name="passportNumber"], input[name="passport_number"], #passportNumber',
    inputType: 'text',
  },
  passportIssueDate: {
    fieldId: 'passportIssueDate',
    selector: 'input[name="passportIssueDate"], input[name="passport_issue_date"], #passportIssueDate',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'MM/DD/YYYY' },
    },
  },
  passportExpiryDate: {
    fieldId: 'passportExpiryDate',
    selector: 'input[name="passportExpiryDate"], input[name="passport_expiry_date"], #passportExpiryDate',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'MM/DD/YYYY' },
    },
  },
  passportIssuingCountry: {
    fieldId: 'passportIssuingCountry',
    selector: 'select[name="countryOfIssue"], select[name="passport_country"], #countryOfIssue',
    inputType: 'select',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
  },
};

// ── Section 3: Travel Information ────────────────────────────────────────────

const travelMappings: Record<string, PortalFieldMapping> = {
  purposeOfTravel: {
    fieldId: 'purposeOfTravel',
    selector: 'select[name="purposeOfTravel"], select[name="purpose_of_travel"], #purposeOfTravel',
    inputType: 'select',
  },
  arrivalDate: {
    fieldId: 'arrivalDate',
    selector: 'input[name="arrivalDate"], input[name="date_of_arrival"], #arrivalDate',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'MM/DD/YYYY' },
    },
  },
  flightNumber: {
    fieldId: 'flightNumber',
    selector: 'input[name="flightNumber"], input[name="flight_number"], #flightNumber',
    inputType: 'text',
  },
  portOfArrival: {
    fieldId: 'portOfArrival',
    selector: 'select[name="portOfArrival"], select[name="port_of_arrival"], #portOfArrival',
    inputType: 'select',
  },
  countryOfOrigin: {
    fieldId: 'countryOfOrigin',
    selector: 'select[name="countryOfOrigin"], select[name="country_of_origin"], #countryOfOrigin',
    inputType: 'select',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
  },
  intendedLengthOfStay: {
    fieldId: 'intendedLengthOfStay',
    selector: 'input[name="lengthOfStay"], input[name="length_of_stay"], #lengthOfStay',
    inputType: 'text',
  },
  addressInPhilippines: {
    fieldId: 'addressInPhilippines',
    selector: 'input[name="localAddress"], textarea[name="localAddress"], #localAddress',
    inputType: 'text',
  },
  localContactNumber: {
    fieldId: 'localContactNumber',
    selector: 'input[name="localContactNumber"], input[name="local_contact"], #localContactNumber',
    inputType: 'text',
  },
};

// ── Section 4: Health Declaration ────────────────────────────────────────────

const healthMappings: Record<string, PortalFieldMapping> = {
  countriesVisited30Days: {
    fieldId: 'countriesVisited30Days',
    selector: 'textarea[name="countriesVisited"], input[name="countries_visited"], #countriesVisited',
    inputType: 'text',
  },
  hasSymptoms: {
    fieldId: 'hasSymptoms',
    selector: 'input[name="hasSymptoms"], input[name="has_symptoms"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
  closeContactWithSick: {
    fieldId: 'closeContactWithSick',
    selector: 'input[name="closeContact"], input[name="close_contact"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
};

// ── Section 5: Contact Information ───────────────────────────────────────────

const contactMappings: Record<string, PortalFieldMapping> = {
  homeAddress: {
    fieldId: 'homeAddress',
    selector: 'input[name="permanentAddress"], textarea[name="permanentAddress"], #permanentAddress',
    inputType: 'text',
  },
  phoneNumber: {
    fieldId: 'phoneNumber',
    selector: 'input[name="phoneNumber"], input[name="phone_number"], #phoneNumber',
    inputType: 'text',
  },
  email: {
    fieldId: 'email',
    selector: 'input[name="email"], input[type="email"], #email',
    inputType: 'text',
  },
};

// ── Combined field mappings ──────────────────────────────────────────────────

const fieldMappings: Record<string, PortalFieldMapping> = {
  ...personalInfoMappings,
  ...passportMappings,
  ...travelMappings,
  ...healthMappings,
  ...contactMappings,
};

// ── Automation Steps ─────────────────────────────────────────────────────────

const steps: AutomationStep[] = [
  {
    id: 'load_portal',
    name: 'Load eTravel Portal',
    description: 'Navigate to the Philippines eTravel portal',
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
    id: 'login',
    name: 'Login to eTravel Account',
    description: 'Authenticate with email-verified eTravel account',
    script: `
      return { success: true, message: 'Login script placeholder — requires account credentials' };
    `,
    timing: { timeout: 20000, waitAfter: 3000 },
    critical: true,
  },
  {
    id: 'fill_personal_info',
    name: 'Fill Personal Information',
    description: 'Fill name, DOB, sex, nationality, occupation, and OFW/Balikbayan status',
    script: `
      return { success: true, message: 'Personal information filling script placeholder' };
    `,
    timing: { timeout: 15000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_passport_info',
    name: 'Fill Passport Information',
    description: 'Fill passport number, issue/expiry dates, and issuing country',
    script: `
      return { success: true, message: 'Passport information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_travel_info',
    name: 'Fill Travel Information',
    description: 'Fill purpose of travel, flight details, port of arrival, and length of stay',
    script: `
      return { success: true, message: 'Travel information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_health_declaration',
    name: 'Fill Health Declaration',
    description: 'Fill countries visited in last 30 days and symptom questions',
    script: `
      return { success: true, message: 'Health declaration filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_contact_info',
    name: 'Fill Contact Information',
    description: 'Fill permanent address, phone number, and email',
    script: `
      return { success: true, message: 'Contact information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'submit_form',
    name: 'Submit eTravel Form',
    description: 'Submit the completed eTravel registration to receive QR code via email',
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

const PHL_MAPPING: AutomationScript = {
  countryCode: 'PHL',
  portalUrl: 'https://etravel.gov.ph',
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
  loginSelectors: {
    username: 'input[name="email"], input[type="email"], #email',
    password: 'input[name="password"], input[type="password"], #password',
    submit: 'button[type="submit"], .login-btn, .btn-login',
    successIndicator: '.dashboard, .welcome-message, [data-testid="user-menu"]',
  },
};

export default PHL_MAPPING;
