/**
 * Australia (AUS) — Digital Incoming Passenger Card (DIPC) field mappings.
 *
 * Portal: ABF Digital Incoming Passenger Card (DIPC)
 * URL: https://online.abf.gov.au/incoming-passenger-card/
 * Account required: No
 * Date format: DD/MM/YYYY
 * Output: No QR code — ABF verifies via passport scan at arrival
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
  countryOfBirth: {
    fieldId: 'countryOfBirth',
    selector: '#countryOfBirth, select[name="countryOfBirth"]',
    inputType: 'select',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
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
  seatClass: {
    fieldId: 'seatClass',
    selector: '#seatClass, select[name="seatClass"]',
    inputType: 'select',
  },
  lastCountryVisited: {
    fieldId: 'lastCountryVisited',
    selector: '#lastCountryVisited, select[name="lastCountryVisited"]',
    inputType: 'select',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
  },
  intendedLengthOfStay: {
    fieldId: 'intendedLengthOfStay',
    selector: '#intendedLengthOfStay, input[name="intendedLengthOfStay"]',
    inputType: 'text',
  },
  purposeOfVisit: {
    fieldId: 'purposeOfVisit',
    selector: '#purposeOfVisit, select[name="purposeOfVisit"]',
    inputType: 'select',
  },
};

// ── Section 3: Address in Australia ──────────────────────────────────────────

const addressMappings: Record<string, PortalFieldMapping> = {
  australianAddressLine1: {
    fieldId: 'australianAddressLine1',
    selector: '#australianAddressLine1, input[name="addressLine1"]',
    inputType: 'text',
  },
  australianAddressCity: {
    fieldId: 'australianAddressCity',
    selector: '#australianAddressCity, input[name="addressCity"]',
    inputType: 'text',
  },
  australianAddressState: {
    fieldId: 'australianAddressState',
    selector: '#australianAddressState, select[name="addressState"]',
    inputType: 'select',
  },
  australianAddressPostcode: {
    fieldId: 'australianAddressPostcode',
    selector: '#australianAddressPostcode, input[name="addressPostcode"]',
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
  hasBiosecurityRiskItems: {
    fieldId: 'hasBiosecurityRiskItems',
    selector: 'input[name="hasBiosecurityRiskItems"], #hasBiosecurityRiskItems',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
  hasSoilOrWater: {
    fieldId: 'hasSoilOrWater',
    selector: 'input[name="hasSoilOrWater"], #hasSoilOrWater',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
};

// ── Section 5: Customs Declarations ──────────────────────────────────────────

const customsMappings: Record<string, PortalFieldMapping> = {
  hasControlledGoods: {
    fieldId: 'hasControlledGoods',
    selector: 'input[name="hasControlledGoods"], #hasControlledGoods',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
  hasCurrencyOver10000: {
    fieldId: 'hasCurrencyOver10000',
    selector: 'input[name="hasCurrencyOver10000"], #hasCurrencyOver10000',
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
  hasCommercialGoods: {
    fieldId: 'hasCommercialGoods',
    selector: 'input[name="hasCommercialGoods"], #hasCommercialGoods',
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
  ...customsMappings,
};

// ── Automation Steps ─────────────────────────────────────────────────────────

const steps: AutomationStep[] = [
  {
    id: 'load_portal',
    name: 'Load DIPC Portal',
    description: 'Navigate to the Australian Digital Incoming Passenger Card portal',
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
    description: 'Fill name, DOB, gender, country of birth, nationality, passport details',
    script: `
      return { success: true, message: 'Personal information filling script placeholder' };
    `,
    timing: { timeout: 15000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_travel_info',
    name: 'Fill Travel Information',
    description: 'Fill flight number, arrival date, seat class, last country visited, length of stay, purpose of visit',
    script: `
      return { success: true, message: 'Travel information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_address',
    name: 'Fill Australian Address',
    description: 'Fill street address, city, state/territory, and postcode',
    script: `
      return { success: true, message: 'Australian address filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_biosecurity',
    name: 'Fill Biosecurity Declarations',
    description: 'Fill food, plant, animal, biosecurity risk, and soil/water declarations',
    script: `
      return { success: true, message: 'Biosecurity declarations filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_customs',
    name: 'Fill Customs Declarations',
    description: 'Fill controlled goods, currency, duty-free allowance, and commercial goods declarations',
    script: `
      return { success: true, message: 'Customs declarations filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'submit_form',
    name: 'Submit DIPC',
    description: 'Submit the completed Digital Incoming Passenger Card',
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

const AUS_MAPPING: AutomationScript = {
  countryCode: 'AUS',
  portalUrl: 'https://online.abf.gov.au/incoming-passenger-card/',
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

export default AUS_MAPPING;
