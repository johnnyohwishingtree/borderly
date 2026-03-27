/**
 * Indonesia (IDN) — Electronic Customs Declaration (e-CD) field mappings.
 *
 * Portal: Electronic Customs Declaration (e-CD)
 * URL: https://ecd.beacukai.go.id
 * Account required: No
 * Date format: DD/MM/YYYY
 * Output: QR code to present at customs
 *
 * Selectors are estimates based on the portal structure — verify against
 * the live portal before enabling automation.
 */

import type { AutomationScript, AutomationStep, PortalFieldMapping } from '@/types/submission';

// ── Section 1: Personal Information ──────────────────────────────────────────

const personalInfoMappings: Record<string, PortalFieldMapping> = {
  surname: {
    fieldId: 'surname',
    selector: '#familyName, input[name="familyName"]',
    inputType: 'text',
  },
  givenName: {
    fieldId: 'givenName',
    selector: '#givenName, input[name="givenName"]',
    inputType: 'text',
  },
  dateOfBirth: {
    fieldId: 'dateOfBirth',
    selector: '#dateOfBirth, input[name="dateOfBirth"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    },
  },
  gender: {
    fieldId: 'gender',
    selector: 'select[name="gender"], #gender',
    inputType: 'select',
  },
  nationality: {
    fieldId: 'nationality',
    selector: '#nationality, select[name="nationality"]',
    inputType: 'select',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
  },
  occupation: {
    fieldId: 'occupation',
    selector: '#occupation, select[name="occupation"]',
    inputType: 'select',
  },
};

// ── Section 2: Passport Information ──────────────────────────────────────────

const passportMappings: Record<string, PortalFieldMapping> = {
  passportNumber: {
    fieldId: 'passportNumber',
    selector: '#passportNumber, input[name="passportNumber"]',
    inputType: 'text',
  },
  passportIssuedDate: {
    fieldId: 'passportIssuedDate',
    selector: '#passportIssueDate, input[name="passportIssueDate"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    },
  },
  passportExpiry: {
    fieldId: 'passportExpiry',
    selector: '#passportExpiryDate, input[name="passportExpiryDate"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    },
  },
  passportIssuingCountry: {
    fieldId: 'passportIssuingCountry',
    selector: '#passportIssuingCountry, select[name="passportIssuingCountry"]',
    inputType: 'select',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
  },
};

// ── Section 3: Flight Information ────────────────────────────────────────────

const flightMappings: Record<string, PortalFieldMapping> = {
  arrivalDate: {
    fieldId: 'arrivalDate',
    selector: '#arrivalDate, input[name="arrivalDate"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    },
  },
  flightNumber: {
    fieldId: 'flightNumber',
    selector: '#flightNumber, input[name="flightNumber"]',
    inputType: 'text',
  },
  portOfArrival: {
    fieldId: 'portOfArrival',
    selector: '#portOfArrival, select[name="portOfArrival"]',
    inputType: 'select',
  },
  departureCountry: {
    fieldId: 'departureCountry',
    selector: '#departureCountry, select[name="departureCountry"]',
    inputType: 'select',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
  },
};

// ── Section 4: Accommodation ─────────────────────────────────────────────────

const accommodationMappings: Record<string, PortalFieldMapping> = {
  accommodationAddress: {
    fieldId: 'accommodationAddress',
    selector: '#address, textarea[name="address"], input[name="address"]',
    inputType: 'text',
  },
  cityOfStay: {
    fieldId: 'cityOfStay',
    selector: '#cityOfDestination, select[name="cityOfDestination"]',
    inputType: 'select',
  },
  stayDuration: {
    fieldId: 'stayDuration',
    selector: '#durationOfStay, input[name="durationOfStay"]',
    inputType: 'text',
  },
};

// ── Section 5: Customs Declaration ───────────────────────────────────────────

const customsMappings: Record<string, PortalFieldMapping> = {
  carryingCurrency: {
    fieldId: 'carryingCurrency',
    selector: 'input[name="currencyExceeding"], #currencyExceeding',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
  currencyAmount: {
    fieldId: 'currencyAmount',
    selector: '#currencyAmount, input[name="currencyAmount"]',
    inputType: 'text',
  },
  carryingGoods: {
    fieldId: 'carryingGoods',
    selector: 'input[name="goodsExceedingAllowance"], #goodsExceedingAllowance',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
  carryingAnimalsPlants: {
    fieldId: 'carryingAnimalsPlants',
    selector: 'input[name="animalsOrPlants"], #animalsOrPlants',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
  carryingNarcotics: {
    fieldId: 'carryingNarcotics',
    selector: 'input[name="narcotics"], #narcotics',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
  carryingCommercialGoods: {
    fieldId: 'carryingCommercialGoods',
    selector: 'input[name="commercialGoods"], #commercialGoods',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
  alcoholQuantity: {
    fieldId: 'alcoholQuantity',
    selector: '#alcoholQuantity, input[name="alcoholQuantity"]',
    inputType: 'text',
  },
  tobaccoQuantity: {
    fieldId: 'tobaccoQuantity',
    selector: '#tobaccoQuantity, input[name="tobaccoQuantity"]',
    inputType: 'text',
  },
};

// ── Section 6: Contact Information ───────────────────────────────────────────

const contactMappings: Record<string, PortalFieldMapping> = {
  homeAddress: {
    fieldId: 'homeAddress',
    selector: '#homeAddress, textarea[name="homeAddress"], input[name="homeAddress"]',
    inputType: 'text',
  },
  phoneNumber: {
    fieldId: 'phoneNumber',
    selector: '#phoneNumber, input[name="phoneNumber"]',
    inputType: 'text',
  },
  email: {
    fieldId: 'email',
    selector: '#email, input[name="email"]',
    inputType: 'text',
  },
};

// ── Combined field mappings ──────────────────────────────────────────────────

const fieldMappings: Record<string, PortalFieldMapping> = {
  ...personalInfoMappings,
  ...passportMappings,
  ...flightMappings,
  ...accommodationMappings,
  ...customsMappings,
  ...contactMappings,
};

// ── Automation Steps ─────────────────────────────────────────────────────────

const steps: AutomationStep[] = [
  {
    id: 'load_portal',
    name: 'Load e-CD Portal',
    description: 'Navigate to the Indonesia Electronic Customs Declaration portal',
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
    description: 'Fill name, DOB, gender, nationality, and occupation',
    script: `
      return { success: true, message: 'Personal information filling script placeholder' };
    `,
    timing: { timeout: 15000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_passport_info',
    name: 'Fill Passport Information',
    description: 'Fill passport number, issue date, expiry date, and issuing country',
    script: `
      return { success: true, message: 'Passport information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_flight_info',
    name: 'Fill Flight Information',
    description: 'Fill arrival date, flight number, port of arrival, and departure country',
    script: `
      return { success: true, message: 'Flight information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_accommodation',
    name: 'Fill Accommodation Details',
    description: 'Fill address, city of destination, and duration of stay',
    script: `
      return { success: true, message: 'Accommodation filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_customs_declaration',
    name: 'Fill Customs Declaration',
    description: 'Fill currency, goods, narcotics, alcohol, and tobacco declarations',
    script: `
      return { success: true, message: 'Customs declaration filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_contact_info',
    name: 'Fill Contact Information',
    description: 'Fill home address, phone number, and email',
    script: `
      return { success: true, message: 'Contact information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'submit_form',
    name: 'Submit Declaration',
    description: 'Submit the completed e-CD form to receive QR code',
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

const IDN_MAPPING: AutomationScript = {
  countryCode: 'IDN',
  portalUrl: 'https://ecd.beacukai.go.id',
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

export default IDN_MAPPING;
