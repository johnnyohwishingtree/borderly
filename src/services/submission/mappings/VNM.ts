/**
 * Vietnam (VNM) — e-Visa portal field mappings and portal automation config.
 *
 * The AutomationScriptRegistry auto-discovers this file via the mappings barrel.
 * Includes photo upload, port of entry select, and religion field.
 */

import type { AutomationScript, AutomationStep, PortalFieldMapping } from '@/types/submission';

const fieldMappings: Record<string, PortalFieldMapping> = {
  surname: {
    fieldId: 'surname',
    selector: 'input[id="surname"], input[name="surname"]',
    inputType: 'text',
  },
  middleName: {
    fieldId: 'middleName',
    selector: 'input[id="middleName"], input[name="middleName"]',
    inputType: 'text',
  },
  givenName: {
    fieldId: 'givenName',
    selector: 'input[id="givenName"], input[name="givenName"]',
    inputType: 'text',
  },
  dateOfBirth: {
    fieldId: 'dateOfBirth',
    selector: 'input[id="dateOfBirth"], input[name="dateOfBirth"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    },
  },
  placeOfBirth: {
    fieldId: 'placeOfBirth',
    selector: 'input[id="placeOfBirth"], input[name="placeOfBirth"]',
    inputType: 'text',
  },
  gender: {
    fieldId: 'gender',
    selector: 'select[id="gender"], select[name="gender"]',
    inputType: 'select',
  },
  nationality: {
    fieldId: 'nationality',
    selector: 'input[id="nationality"], input[name="nationality"], select[id="nationality"], select[name="nationality"]',
    inputType: 'text',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
  },
  religion: {
    fieldId: 'religion',
    selector: 'select[id="religion"], select[name="religion"]',
    inputType: 'select',
  },
  passportType: {
    fieldId: 'passportType',
    selector: 'select[id="passportType"], select[name="passportType"]',
    inputType: 'select',
  },
  passportNumber: {
    fieldId: 'passportNumber',
    selector: 'input[id="passportNumber"], input[name="passportNumber"]',
    inputType: 'text',
  },
  passportIssuedDate: {
    fieldId: 'passportIssuedDate',
    selector: 'input[id="passportIssuedDate"], input[name="passportIssuedDate"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    },
  },
  passportExpiry: {
    fieldId: 'passportExpiry',
    selector: 'input[id="passportExpiry"], input[name="passportExpiry"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    },
  },
  passportIssuingAuthority: {
    fieldId: 'passportIssuingAuthority',
    selector: 'input[id="passportIssuingAuthority"], input[name="passportIssuingAuthority"]',
    inputType: 'text',
  },
  purposeOfVisit: {
    fieldId: 'purposeOfVisit',
    selector: 'select[id="purposeOfVisit"], select[name="purposeOfVisit"]',
    inputType: 'select',
  },
  entryDate: {
    fieldId: 'entryDate',
    selector: 'input[id="entryDate"], input[name="entryDate"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    },
  },
  entryPort: {
    fieldId: 'entryPort',
    selector: 'select[id="entryPort"], select[name="entryPort"]',
    inputType: 'select',
  },
  stayDuration: {
    fieldId: 'stayDuration',
    selector: 'input[id="stayDuration"], input[name="stayDuration"]',
    inputType: 'text',
  },
  previousVietnamVisit: {
    fieldId: 'previousVietnamVisit',
    selector: 'input[id="previousVietnamVisit"][value="no"], input[name="previousVietnamVisit"][value="no"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'no', trueValue: 'yes' },
    },
  },
  accommodationType: {
    fieldId: 'accommodationType',
    selector: 'select[id="accommodationType"], select[name="accommodationType"]',
    inputType: 'select',
  },
  hotelName: {
    fieldId: 'hotelName',
    selector: 'input[id="hotelName"], input[name="hotelName"]',
    inputType: 'text',
  },
  hotelAddress: {
    fieldId: 'hotelAddress',
    selector: 'textarea[id="hotelAddress"], textarea[name="hotelAddress"], input[id="hotelAddress"], input[name="hotelAddress"]',
    inputType: 'text',
  },
  hotelPhone: {
    fieldId: 'hotelPhone',
    selector: 'input[id="hotelPhone"], input[name="hotelPhone"]',
    inputType: 'text',
  },
  cityOfStay: {
    fieldId: 'cityOfStay',
    selector: 'select[id="cityOfStay"], select[name="cityOfStay"]',
    inputType: 'select',
  },
  homeAddress: {
    fieldId: 'homeAddress',
    selector: 'textarea[id="homeAddress"], textarea[name="homeAddress"], input[id="homeAddress"], input[name="homeAddress"]',
    inputType: 'text',
  },
  phoneNumber: {
    fieldId: 'phoneNumber',
    selector: 'input[id="phoneNumber"], input[name="phoneNumber"]',
    inputType: 'text',
  },
  email: {
    fieldId: 'email',
    selector: 'input[id="email"], input[name="email"], input[type="email"]',
    inputType: 'text',
  },
  emergencyContactName: {
    fieldId: 'emergencyContactName',
    selector: 'input[id="emergencyContactName"], input[name="emergencyContactName"]',
    inputType: 'text',
  },
  emergencyContactPhone: {
    fieldId: 'emergencyContactPhone',
    selector: 'input[id="emergencyContactPhone"], input[name="emergencyContactPhone"]',
    inputType: 'text',
  },
};

const steps: AutomationStep[] = [
  {
    id: 'load_portal',
    name: 'Load Vietnam e-Visa Portal',
    description: 'Navigate to official Vietnam e-Visa portal',
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
    id: 'start_application',
    name: 'Start e-Visa Application',
    description: 'Click Apply for e-Visa and select nationality',
    script: `
      const applyButton = document.querySelector('a[href*="apply"], button[id*="apply"], .apply-btn');
      if (applyButton && applyButton.offsetParent !== null) {
        applyButton.scrollIntoView();
        applyButton.click();
        return new Promise((resolve) => {
          setTimeout(() => resolve({ success: true }), 2000);
        });
      }
      return { success: false, error: 'Apply button not found' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: false,
  },
  {
    id: 'fill_personal_info',
    name: 'Fill Personal Information',
    description: 'Fill personal details including religion field',
    script: `
      // This script will be dynamically generated with actual form data
      return { success: true, message: 'Personal information filling script placeholder' };
    `,
    timing: { timeout: 15000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_passport_travel',
    name: 'Fill Passport and Travel',
    description: 'Fill passport details and travel information including port of entry',
    script: `
      // This script will be dynamically generated with actual form data
      return { success: true, message: 'Passport and travel filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_accommodation_contact',
    name: 'Fill Accommodation and Contact',
    description: 'Fill accommodation and contact information',
    script: `
      // This script will be dynamically generated with actual form data
      return { success: true, message: 'Accommodation and contact filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'submit_form',
    name: 'Submit Application',
    description: 'Submit the Vietnam e-Visa application and proceed to payment',
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
              resolve({
                success: true,
                submitted: true,
                url: window.location.href
              });
            }, 5000);
          });
        }
      }

      return { success: false, error: 'No submit button found or enabled' };
    `,
    timing: { timeout: 20000, waitAfter: 5000 },
    critical: true,
  },
  {
    id: 'capture_confirmation',
    name: 'Capture Application Reference',
    description: 'Extract application reference number from confirmation page',
    script: `
      const applicationNumber = (
        document.querySelector('#application-reference')?.textContent ||
        document.querySelector('[class*="application-number"]')?.textContent ||
        ''
      ).trim();

      return {
        success: applicationNumber !== '',
        applicationNumber: applicationNumber,
        pageUrl: window.location.href
      };
    `,
    timing: { timeout: 10000, waitAfter: 0 },
    critical: false,
  },
];

const VNM_MAPPING: AutomationScript = {
  countryCode: 'VNM',
  portalUrl: 'https://evisa.xuatnhapcanh.gov.vn/',
  version: '1.0.0',
  lastUpdated: '2026-03-14T00:00:00Z',
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

export default VNM_MAPPING;
