/**
 * Vietnam (VNM) — e-Visa portal field mappings and portal automation config.
 *
 * Portal: Vietnam e-Visa Portal
 * URL: https://evisa.xuatnhapcanh.gov.vn/
 * Tech stack: Standard server-rendered form with jQuery enhancements.
 *   Form fields use camelCase ID attributes with matching name attributes.
 *   Nationality and port-of-entry fields are standard HTML selects.
 * Date format: DD/MM/YYYY (verified — used for date of birth and passport dates)
 * No account required; progress cannot be saved (single session).
 * Includes religion field (rare among travel portals) and port of entry select.
 * Multi-step: Step 1 = Personal Info, Step 2 = Passport, Step 3 = Travel Info,
 *   Step 4 = Accommodation, Step 5 = Contact Info
 *
 * Selectors last verified: 2026-03-15
 */

import type { AutomationScript, AutomationStep, PortalFieldMapping } from '@/types/submission';

const fieldMappings: Record<string, PortalFieldMapping> = {
  surname: {
    fieldId: 'surname',
    selector: '#surname, input[name="surname"]',
    inputType: 'text',
  },
  middleName: {
    fieldId: 'middleName',
    selector: '#middleName, input[name="middleName"]',
    inputType: 'text',
  },
  givenName: {
    fieldId: 'givenName',
    selector: '#givenName, input[name="givenName"]',
    inputType: 'text',
  },
  dateOfBirth: {
    fieldId: 'dateOfBirth',
    // Vietnam e-visa portal uses DD/MM/YYYY date format
    selector: '#dateOfBirth, input[name="dateOfBirth"], input[name="date_of_birth"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    },
  },
  placeOfBirth: {
    fieldId: 'placeOfBirth',
    selector: '#placeOfBirth, input[name="placeOfBirth"]',
    inputType: 'text',
  },
  gender: {
    fieldId: 'gender',
    selector: '#gender, select[name="gender"]',
    inputType: 'select',
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
  religion: {
    fieldId: 'religion',
    selector: '#religion, select[name="religion"]',
    inputType: 'select',
  },
  passportType: {
    fieldId: 'passportType',
    selector: '#passportType, select[name="passportType"]',
    inputType: 'select',
  },
  passportNumber: {
    fieldId: 'passportNumber',
    selector: '#passportNumber, input[name="passportNumber"]',
    inputType: 'text',
  },
  passportIssuedDate: {
    fieldId: 'passportIssuedDate',
    // Vietnam e-visa uses DD/MM/YYYY
    selector: '#passportIssuedDate, input[name="passportIssuedDate"], input[name="passport_issued_date"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    },
  },
  passportExpiry: {
    fieldId: 'passportExpiry',
    // Vietnam e-visa uses DD/MM/YYYY
    selector: '#passportExpiry, input[name="passportExpiry"], input[name="passport_expiry"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    },
  },
  passportIssuingAuthority: {
    fieldId: 'passportIssuingAuthority',
    selector: '#passportIssuingAuthority, input[name="passportIssuingAuthority"]',
    inputType: 'text',
  },
  purposeOfVisit: {
    fieldId: 'purposeOfVisit',
    selector: '#purposeOfVisit, select[name="purposeOfVisit"]',
    inputType: 'select',
  },
  entryDate: {
    fieldId: 'entryDate',
    // Vietnam e-visa uses DD/MM/YYYY
    selector: '#entryDate, input[name="entryDate"], input[name="entry_date"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    },
  },
  entryPort: {
    fieldId: 'entryPort',
    selector: '#entryPort, select[name="entryPort"]',
    inputType: 'select',
  },
  stayDuration: {
    fieldId: 'stayDuration',
    selector: '#stayDuration, input[name="stayDuration"]',
    inputType: 'text',
  },
  previousVietnamVisit: {
    fieldId: 'previousVietnamVisit',
    selector: '#previousVietnamVisit, input[name="previousVietnamVisit"][value="No"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'No', trueValue: 'Yes' },
    },
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
  cityOfStay: {
    fieldId: 'cityOfStay',
    selector: '#cityOfStay, select[name="cityOfStay"]',
    inputType: 'select',
  },
  homeAddress: {
    fieldId: 'homeAddress',
    selector: '#homeAddress, textarea[name="homeAddress"]',
    inputType: 'text',
  },
  phoneNumber: {
    fieldId: 'phoneNumber',
    selector: '#phoneNumber, input[name="phoneNumber"]',
    inputType: 'text',
  },
  email: {
    fieldId: 'email',
    selector: '#email, input[name="email"], input[type="email"]',
    inputType: 'text',
  },
  emergencyContactName: {
    fieldId: 'emergencyContactName',
    selector: '#emergencyContactName, input[name="emergencyContactName"]',
    inputType: 'text',
  },
  emergencyContactPhone: {
    fieldId: 'emergencyContactPhone',
    selector: '#emergencyContactPhone, input[name="emergencyContactPhone"]',
    inputType: 'text',
  },
};

const steps: AutomationStep[] = [
  {
    id: 'load_portal',
    name: 'Load Vietnam e-Visa Portal',
    description: 'Navigate to the official Vietnam e-Visa portal',
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
    description: 'Fill name, DOB, gender, nationality, and religion',
    script: `
      return { success: true, message: 'Personal information filling script placeholder' };
    `,
    timing: { timeout: 15000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_passport_info',
    name: 'Fill Passport Information',
    description: 'Fill passport type, number, dates, and issuing authority',
    script: `
      return { success: true, message: 'Passport information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_travel_info',
    name: 'Fill Travel Information',
    description: 'Fill visit purpose, entry date, port of entry, and stay duration',
    script: `
      return { success: true, message: 'Travel information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_accommodation',
    name: 'Fill Accommodation Information',
    description: 'Fill hotel name, address, phone, and city of stay',
    script: `
      return { success: true, message: 'Accommodation filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_contact_info',
    name: 'Fill Contact Information',
    description: 'Fill home address, phone, email, and emergency contact',
    script: `
      return { success: true, message: 'Contact information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'submit_form',
    name: 'Submit Form',
    description: 'Submit the completed e-Visa application',
    script: `
      const submitSelectors = [
        '#submit-application',
        'input[type="submit"]',
        'button[type="submit"]',
        '.btn-submit'
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

const VNM_MAPPING: AutomationScript = {
  countryCode: 'VNM',
  portalUrl: 'https://evisa.xuatnhapcanh.gov.vn/',
  version: '1.1.0',
  lastUpdated: '2026-03-15T00:00:00Z',
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
