/**
 * Thailand (THA) — COMING SOON — Digital TM6 / Thailand Pass field mappings.
 *
 * ⚠️  STATUS: COMING SOON — Automation not yet active
 *
 * Thailand Pass (tp.consular.go.th) was a COVID-era requirement that was
 * officially discontinued on May 1, 2022. Thailand no longer requires a
 * mandatory pre-arrival digital health declaration or Thailand Pass.
 *
 * The Thailand TM6 Departure/Arrival Card (paper form) is still used at
 * some entry points, but Thailand has been piloting a digital TM6 via the
 * "Thailand Digital Arrival Card" (TDAC) system. As of early 2026, the
 * TDAC digital rollout is ongoing and not yet mandatory for all travelers.
 *
 * Field mappings and selectors in this file are placeholder estimates based
 * on the discontinued Thailand Pass portal structure and may not match the
 * eventual TDAC system. Do not enable automation without verifying against
 * the live TDAC portal when it becomes available.
 *
 * Portal: Thailand Pass (discontinued reference)
 * URL: https://tp.consular.go.th/ (no longer active)
 * Date format: YYYY-MM-DD
 * implementationStatus: coming_soon (see THA.json)
 *
 * Selectors last verified: 2026-03-15 (against archived Thailand Pass structure)
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
  // Thailand Pass is discontinued. URL retained for reference; TDAC URL TBD.
  portalUrl: 'https://tp.consular.go.th/',
  version: '1.1.0',
  lastUpdated: '2026-03-15T00:00:00Z',
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
