/**
 * Thailand (THA) — Thailand Pass portal field mappings and portal automation config.
 *
 * Portal: Thailand Pass
 * URL: https://tp.consular.go.th/
 * Account-based application, vaccination cert upload required.
 */

import type { AutomationScript, AutomationStep, PortalFieldMapping } from '@/types/submission';

const fieldMappings: Record<string, PortalFieldMapping> = {
  title: {
    fieldId: 'title',
    selector: '#title-select, select[name="title"]',
    inputType: 'select',
  },
  firstName: {
    fieldId: 'firstName',
    selector: '#firstName, input[name="firstName"]',
    inputType: 'text',
  },
  lastName: {
    fieldId: 'lastName',
    selector: '#lastName, input[name="lastName"]',
    inputType: 'text',
  },
  dateOfBirth: {
    fieldId: 'dateOfBirth',
    selector: '#dateOfBirth, input[name="dateOfBirth"]',
    inputType: 'date',
  },
  nationality: {
    fieldId: 'nationality',
    selector: '#nationality, input[name="nationality"]',
    inputType: 'text',
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
  },
  arrivalDate: {
    fieldId: 'arrivalDate',
    selector: '#arrivalDate, input[name="arrivalDate"]',
    inputType: 'date',
  },
  flightNumber: {
    fieldId: 'flightNumber',
    selector: '#flightNumber, input[name="flightNumber"]',
    inputType: 'text',
  },
  departureCountry: {
    fieldId: 'departureCountry',
    selector: '#departureCountry, input[name="departureCountry"]',
    inputType: 'text',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
  },
  purposeOfVisit: {
    fieldId: 'purposeOfVisit',
    selector: '#purposeOfVisit, select[name="purposeOfVisit"]',
    inputType: 'select',
  },
  lengthOfStay: {
    fieldId: 'lengthOfStay',
    selector: '#lengthOfStay, input[name="lengthOfStay"]',
    inputType: 'text',
  },
  accommodationType: {
    fieldId: 'accommodationType',
    selector: '#accommodationType, select[name="accommodationType"]',
    inputType: 'select',
  },
  hotelName: {
    fieldId: 'hotelName',
    selector: '#hotelName, input[name="hotelName"]',
    inputType: 'text',
  },
  hotelAddress: {
    fieldId: 'hotelAddress',
    selector: '#hotelAddress, textarea[name="hotelAddress"]',
    inputType: 'text',
  },
  hotelPhone: {
    fieldId: 'hotelPhone',
    selector: '#hotelPhone, input[name="hotelPhone"]',
    inputType: 'text',
  },
  vaccinationStatus: {
    fieldId: 'vaccinationStatus',
    selector: '#vaccinationStatus, select[name="vaccinationStatus"]',
    inputType: 'select',
  },
  hasInsurance: {
    fieldId: 'hasInsurance',
    selector: '#hasInsurance, input[name="hasInsurance"][value="yes"], input[name="has_insurance"][value="Y"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'no', trueValue: 'yes' },
    },
  },
  emergencyContact: {
    fieldId: 'emergencyContact',
    selector: '#emergencyContact, input[name="emergencyContact"]',
    inputType: 'text',
  },
};

const steps: AutomationStep[] = [
  {
    id: 'load_portal',
    name: 'Load Thailand Pass Portal',
    description: 'Navigate to the Thailand Pass website',
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
    description: 'Fill passport and personal details including title, name, DOB, nationality',
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
    description: 'Fill hotel and accommodation information',
    script: `
      return { success: true, message: 'Accommodation filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_health_info',
    name: 'Fill Health and Insurance Information',
    description: 'Fill vaccination status, insurance, and emergency contact',
    script: `
      return { success: true, message: 'Health information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'submit_form',
    name: 'Submit Form',
    description: 'Submit the completed Thailand Pass application',
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

const THA_MAPPING: AutomationScript = {
  countryCode: 'THA',
  portalUrl: 'https://tp.consular.go.th/',
  version: '1.0.0',
  lastUpdated: '2026-03-14T00:00:00Z',
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

export default THA_MAPPING;
