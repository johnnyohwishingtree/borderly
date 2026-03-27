/**
 * South Korea (KOR) — K-ETA field mappings.
 *
 * Portal: Korea K-ETA
 * URL: https://www.k-eta.go.kr/portal/apply/index.do
 * Account required: Yes (email-based, per traveler)
 * Date format: YYYY-MM-DD (Korean standard)
 * Output: K-ETA approval emailed — valid for 2 years or until passport expiry
 *
 * Selectors are estimates based on the portal structure — verify against
 * the live portal before enabling automation.
 */

import type { AutomationScript, AutomationStep, PortalFieldMapping } from '@/types/submission';

// ── Section 1: Passport Details ──────────────────────────────────────────────

const passportMappings: Record<string, PortalFieldMapping> = {
  passportNumber: {
    fieldId: 'passportNumber',
    selector: '#passportNumber, input[name="passportNumber"]',
    inputType: 'text',
  },
  surname: {
    fieldId: 'surname',
    selector: '#surname, input[name="surname"]',
    inputType: 'text',
  },
  givenNames: {
    fieldId: 'givenNames',
    selector: '#givenNames, input[name="givenNames"]',
    inputType: 'text',
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
  dateOfBirth: {
    fieldId: 'dateOfBirth',
    selector: '#dateOfBirth, input[name="dateOfBirth"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' },
    },
  },
  gender: {
    fieldId: 'gender',
    selector: 'select[name="gender"], #gender',
    inputType: 'select',
  },
  passportExpiry: {
    fieldId: 'passportExpiry',
    selector: '#passportExpiry, input[name="passportExpiry"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' },
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

// ── Section 2: Personal Information ──────────────────────────────────────────

const personalInfoMappings: Record<string, PortalFieldMapping> = {
  email: {
    fieldId: 'email',
    selector: '#email, input[name="email"]',
    inputType: 'text',
  },
  phoneNumber: {
    fieldId: 'phoneNumber',
    selector: '#phoneNumber, input[name="phoneNumber"]',
    inputType: 'text',
  },
  occupation: {
    fieldId: 'occupation',
    selector: '#occupation, select[name="occupation"]',
    inputType: 'select',
  },
  homeCountry: {
    fieldId: 'homeCountry',
    selector: '#homeCountry, select[name="homeCountry"]',
    inputType: 'select',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
  },
  homeAddress: {
    fieldId: 'homeAddress',
    selector: '#homeAddress, input[name="homeAddress"], textarea[name="homeAddress"]',
    inputType: 'text',
  },
};

// ── Section 3: Travel Information ────────────────────────────────────────────

const travelMappings: Record<string, PortalFieldMapping> = {
  purposeOfVisit: {
    fieldId: 'purposeOfVisit',
    selector: '#purposeOfVisit, select[name="purposeOfVisit"]',
    inputType: 'select',
  },
  arrivalDate: {
    fieldId: 'arrivalDate',
    selector: '#arrivalDate, input[name="arrivalDate"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' },
    },
  },
  durationOfStay: {
    fieldId: 'durationOfStay',
    selector: '#durationOfStay, input[name="durationOfStay"]',
    inputType: 'text',
  },
  flightNumber: {
    fieldId: 'flightNumber',
    selector: '#flightNumber, input[name="flightNumber"]',
    inputType: 'text',
  },
  airlineCode: {
    fieldId: 'airlineCode',
    selector: '#airlineCode, select[name="airlineCode"]',
    inputType: 'select',
  },
  arrivalAirport: {
    fieldId: 'arrivalAirport',
    selector: '#arrivalAirport, select[name="arrivalAirport"]',
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
  hotelName: {
    fieldId: 'hotelName',
    selector: '#hotelName, input[name="hotelName"]',
    inputType: 'text',
  },
  hotelAddress: {
    fieldId: 'hotelAddress',
    selector: '#hotelAddress, input[name="hotelAddress"], textarea[name="hotelAddress"]',
    inputType: 'text',
  },
  hotelPhone: {
    fieldId: 'hotelPhone',
    selector: '#hotelPhone, input[name="hotelPhone"]',
    inputType: 'text',
  },
};

// ── Section 5: Health Declaration ────────────────────────────────────────────

const healthMappings: Record<string, PortalFieldMapping> = {
  hasSymptoms: {
    fieldId: 'hasSymptoms',
    selector: 'input[name="hasSymptoms"], #hasSymptoms',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
  hasInfectiousDisease: {
    fieldId: 'hasInfectiousDisease',
    selector: 'input[name="hasInfectiousDisease"], #hasInfectiousDisease',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
  visitedOutbreakArea: {
    fieldId: 'visitedOutbreakArea',
    selector: 'input[name="visitedOutbreakArea"], #visitedOutbreakArea',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
};

// ── Section 6: Customs Declaration ───────────────────────────────────────────

const customsMappings: Record<string, PortalFieldMapping> = {
  carryingProhibitedItems: {
    fieldId: 'carryingProhibitedItems',
    selector: 'input[name="carryingProhibitedItems"], #carryingProhibitedItems',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
  exceedsDutyFreeAllowance: {
    fieldId: 'exceedsDutyFreeAllowance',
    selector: 'input[name="exceedsDutyFreeAllowance"], #exceedsDutyFreeAllowance',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
  carryingCurrencyOverLimit: {
    fieldId: 'carryingCurrencyOverLimit',
    selector: 'input[name="carryingCurrencyOverLimit"], #carryingCurrencyOverLimit',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
  carryingAnimalPlantProducts: {
    fieldId: 'carryingAnimalPlantProducts',
    selector: 'input[name="carryingAnimalPlantProducts"], #carryingAnimalPlantProducts',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
  carryingCommercialGoods: {
    fieldId: 'carryingCommercialGoods',
    selector: 'input[name="carryingCommercialGoods"], #carryingCommercialGoods',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
  carryingMedications: {
    fieldId: 'carryingMedications',
    selector: 'input[name="carryingMedications"], #carryingMedications',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { trueValue: 'yes', falseValue: 'no' },
    },
  },
};

// ── Combined field mappings ──────────────────────────────────────────────────

const fieldMappings: Record<string, PortalFieldMapping> = {
  ...passportMappings,
  ...personalInfoMappings,
  ...travelMappings,
  ...accommodationMappings,
  ...healthMappings,
  ...customsMappings,
};

// ── Automation Steps ─────────────────────────────────────────────────────────

const steps: AutomationStep[] = [
  {
    id: 'load_portal',
    name: 'Load K-ETA Portal',
    description: 'Navigate to the Korea K-ETA application portal',
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
    name: 'Log In to K-ETA Account',
    description: 'Authenticate with the K-ETA portal using stored credentials',
    script: `
      return { success: true, message: 'Login script placeholder' };
    `,
    timing: { timeout: 15000, waitAfter: 3000 },
    critical: true,
  },
  {
    id: 'fill_passport_details',
    name: 'Fill Passport Details',
    description: 'Fill passport number, name, nationality, DOB, gender, expiry, and issuing country',
    script: `
      return { success: true, message: 'Passport details filling script placeholder' };
    `,
    timing: { timeout: 15000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_personal_info',
    name: 'Fill Personal Information',
    description: 'Fill email, phone, occupation, country of residence, and home address',
    script: `
      return { success: true, message: 'Personal information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_travel_info',
    name: 'Fill Travel Information',
    description: 'Fill purpose of visit, arrival date, duration, flight, airline, airport, and departure country',
    script: `
      return { success: true, message: 'Travel information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_accommodation',
    name: 'Fill Accommodation Details',
    description: 'Fill hotel name, address, and phone number',
    script: `
      return { success: true, message: 'Accommodation filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_health_declaration',
    name: 'Fill Health Declaration',
    description: 'Fill symptoms, infectious disease, and outbreak area questions',
    script: `
      return { success: true, message: 'Health declaration filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_customs_declaration',
    name: 'Fill Customs Declaration',
    description: 'Fill prohibited items, duty-free, currency, biosecurity, commercial goods, and medication declarations',
    script: `
      return { success: true, message: 'Customs declaration filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'submit_form',
    name: 'Submit K-ETA Application',
    description: 'Submit the completed K-ETA application for processing',
    script: `
      const submitSelectors = [
        '#submit-btn',
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

const KOR_MAPPING: AutomationScript = {
  countryCode: 'KOR',
  portalUrl: 'https://www.k-eta.go.kr/portal/apply/index.do',
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
    username: 'input[type="email"], input[name="email"], input[id="email"]',
    password: 'input[type="password"], input[name="password"], input[id="password"]',
    submit: 'button[type="submit"], input[type="submit"], button[id*="login"], button[id*="signin"]',
    successIndicator: '.user-info, .logged-in, [data-user], .dashboard, nav .my-page',
  },
};

export default KOR_MAPPING;
