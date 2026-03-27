/**
 * New Zealand (NZL) — Traveller Declaration (NZTD) field mappings.
 *
 * Portal: New Zealand Traveller Declaration (NZTD)
 * URL: https://www.nztravellerdeclaration.govt.nz
 * Account required: No (guest submission with email for reference code)
 * Date format: DD/MM/YYYY
 * Output: No QR code — reference code emailed, border officers verify via passport scan
 *
 * Selectors are estimates based on the portal structure — verify against
 * the live portal before enabling automation.
 */

import type { AutomationScript, AutomationStep, PortalFieldMapping } from '@/types/submission';

// ── Section 1: Personal Information ──────────────────────────────────────────

const personalInfoMappings: Record<string, PortalFieldMapping> = {
  familyName: {
    fieldId: 'familyName',
    selector: '#familyName, input[name="familyName"]',
    inputType: 'text',
  },
  givenNames: {
    fieldId: 'givenNames',
    selector: '#givenNames, input[name="givenNames"]',
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
  passportNumber: {
    fieldId: 'passportNumber',
    selector: '#passportNumber, input[name="passportNumber"]',
    inputType: 'text',
  },
  passportExpiry: {
    fieldId: 'passportExpiry',
    selector: '#passportExpiry, input[name="passportExpiry"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    },
  },
  passportCountry: {
    fieldId: 'passportCountry',
    selector: '#passportCountry, select[name="passportCountry"]',
    inputType: 'select',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
  },
  email: {
    fieldId: 'email',
    selector: '#email, input[name="email"]',
    inputType: 'text',
  },
};

// ── Section 2: Travel Information ────────────────────────────────────────────

const travelMappings: Record<string, PortalFieldMapping> = {
  flightNumber: {
    fieldId: 'flightNumber',
    selector: '#flightNumber, input[name="flightNumber"]',
    inputType: 'text',
  },
  arrivalDate: {
    fieldId: 'arrivalDate',
    selector: '#arrivalDate, input[name="arrivalDate"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    },
  },
  arrivalAirport: {
    fieldId: 'arrivalAirport',
    selector: '#arrivalAirport, select[name="arrivalAirport"]',
    inputType: 'select',
  },
  purposeOfVisit: {
    fieldId: 'purposeOfVisit',
    selector: '#purposeOfVisit, select[name="purposeOfVisit"]',
    inputType: 'select',
  },
  intendedLengthOfStay: {
    fieldId: 'intendedLengthOfStay',
    selector: '#intendedLengthOfStay, input[name="intendedLengthOfStay"]',
    inputType: 'text',
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

// ── Section 3: Address in New Zealand ────────────────────────────────────────

const addressMappings: Record<string, PortalFieldMapping> = {
  nzAddressLine1: {
    fieldId: 'nzAddressLine1',
    selector: '#nzAddressLine1, input[name="addressLine1"]',
    inputType: 'text',
  },
  nzAddressCity: {
    fieldId: 'nzAddressCity',
    selector: '#nzAddressCity, input[name="addressCity"]',
    inputType: 'text',
  },
  nzAddressPostcode: {
    fieldId: 'nzAddressPostcode',
    selector: '#nzAddressPostcode, input[name="addressPostcode"]',
    inputType: 'text',
    validation: {
      selector: '.postcode-error',
      expectedValue: '',
    },
  },
};

// ── Section 4: Biosecurity Declarations ──────────────────────────────────────

const biosecurityMappings: Record<string, PortalFieldMapping> = {
  hasFoodItems: {
    fieldId: 'hasFoodItems',
    selector: 'input[name="hasFoodItems"], #hasFoodItems',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
  hasPlantItems: {
    fieldId: 'hasPlantItems',
    selector: 'input[name="hasPlantItems"], #hasPlantItems',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
  hasAnimalItems: {
    fieldId: 'hasAnimalItems',
    selector: 'input[name="hasAnimalItems"], #hasAnimalItems',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
  hasSoilOrWaterItems: {
    fieldId: 'hasSoilOrWaterItems',
    selector: 'input[name="hasSoilOrWaterItems"], #hasSoilOrWaterItems',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
};

// ── Section 5: Goods Declarations ────────────────────────────────────────────

const goodsMappings: Record<string, PortalFieldMapping> = {
  hasCurrencyOver10000: {
    fieldId: 'hasCurrencyOver10000',
    selector: 'input[name="hasCurrencyOver10000"], #hasCurrencyOver10000',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
  hasControlledItems: {
    fieldId: 'hasControlledItems',
    selector: 'input[name="hasControlledItems"], #hasControlledItems',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
  hasGoodsExceedingAllowance: {
    fieldId: 'hasGoodsExceedingAllowance',
    selector: 'input[name="hasGoodsExceedingAllowance"], #hasGoodsExceedingAllowance',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
};

// ── Combined field mappings ──────────────────────────────────────────────────

const fieldMappings: Record<string, PortalFieldMapping> = {
  ...personalInfoMappings,
  ...travelMappings,
  ...addressMappings,
  ...biosecurityMappings,
  ...goodsMappings,
};

// ── Automation Steps ─────────────────────────────────────────────────────────

const steps: AutomationStep[] = [
  {
    id: 'load_portal',
    name: 'Load NZTD Portal',
    description: 'Navigate to the New Zealand Traveller Declaration portal',
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
    description: 'Fill name, DOB, gender, nationality, passport details, and email',
    script: `
      return { success: true, message: 'Personal information filling script placeholder' };
    `,
    timing: { timeout: 15000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_travel_info',
    name: 'Fill Travel Information',
    description: 'Fill flight number, arrival date, arrival airport, purpose of visit, length of stay, and departure country',
    script: `
      return { success: true, message: 'Travel information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_address',
    name: 'Fill New Zealand Address',
    description: 'Fill street address, city, and postcode',
    script: `
      return { success: true, message: 'New Zealand address filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_biosecurity',
    name: 'Fill Biosecurity Declarations',
    description: 'Fill food, plant, animal, and soil/water declarations',
    script: `
      return { success: true, message: 'Biosecurity declarations filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_goods',
    name: 'Fill Goods Declarations',
    description: 'Fill currency, controlled items, and duty-free allowance declarations',
    script: `
      return { success: true, message: 'Goods declarations filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'submit_form',
    name: 'Submit NZTD',
    description: 'Submit the completed New Zealand Traveller Declaration',
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

const NZL_MAPPING: AutomationScript = {
  countryCode: 'NZL',
  portalUrl: 'https://www.nztravellerdeclaration.govt.nz',
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

export default NZL_MAPPING;
