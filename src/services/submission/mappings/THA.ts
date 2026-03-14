/**
 * Thailand (THA) — Thailand Pass portal field mappings and portal automation config.
 *
 * The AutomationScriptRegistry auto-discovers this file via the mappings barrel.
 * Requires account registration. Includes vaccine cert upload and hotel booking.
 */

import type { AutomationScript, AutomationStep, PortalFieldMapping } from '@/types/submission';

const fieldMappings: Record<string, PortalFieldMapping> = {
  title: {
    fieldId: 'title',
    selector: 'select[id="title-select"], select[name="title"], select[id="title"]',
    inputType: 'select',
  },
  firstName: {
    fieldId: 'firstName',
    selector: 'input[id="firstName"], input[name="firstName"]',
    inputType: 'text',
  },
  lastName: {
    fieldId: 'lastName',
    selector: 'input[id="lastName"], input[name="lastName"]',
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
  nationality: {
    fieldId: 'nationality',
    selector: 'input[id="nationality"], input[name="nationality"], select[id="nationality"], select[name="nationality"]',
    inputType: 'text',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
  },
  passportNumber: {
    fieldId: 'passportNumber',
    selector: 'input[id="passportNumber"], input[name="passportNumber"]',
    inputType: 'text',
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
  arrivalDate: {
    fieldId: 'arrivalDate',
    selector: 'input[id="arrivalDate"], input[name="arrivalDate"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'DD/MM/YYYY' },
    },
  },
  flightNumber: {
    fieldId: 'flightNumber',
    selector: 'input[id="flightNumber"], input[name="flightNumber"]',
    inputType: 'text',
  },
  departureCountry: {
    fieldId: 'departureCountry',
    selector: 'input[id="departureCountry"], input[name="departureCountry"], select[id="departureCountry"], select[name="departureCountry"]',
    inputType: 'text',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
  },
  purposeOfVisit: {
    fieldId: 'purposeOfVisit',
    selector: 'select[id="purposeOfVisit"], select[name="purposeOfVisit"]',
    inputType: 'select',
  },
  lengthOfStay: {
    fieldId: 'lengthOfStay',
    selector: 'input[id="lengthOfStay"], input[name="lengthOfStay"]',
    inputType: 'text',
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
  vaccinationStatus: {
    fieldId: 'vaccinationStatus',
    selector: 'select[id="vaccinationStatus"], select[name="vaccinationStatus"]',
    inputType: 'select',
  },
  hasInsurance: {
    fieldId: 'hasInsurance',
    selector: 'input[id="hasInsurance"][value="yes"], input[name="hasInsurance"][value="yes"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'no', trueValue: 'yes' },
    },
  },
  emergencyContact: {
    fieldId: 'emergencyContact',
    selector: 'input[id="emergencyContact"], input[name="emergencyContact"]',
    inputType: 'text',
  },
};

const steps: AutomationStep[] = [
  {
    id: 'load_portal',
    name: 'Load Thailand Pass Portal',
    description: 'Navigate to Thailand Pass portal and wait for page load',
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
    id: 'check_login',
    name: 'Check Thailand Pass Login',
    description: 'Verify user is logged into Thailand Pass account',
    script: `
      const isLoggedIn = document.querySelector('.user-info, .user-menu, [data-user]') !== null;
      const loginButton = document.querySelector('a[href*="login"], button[id*="login"]');

      return {
        isLoggedIn: isLoggedIn,
        loginRequired: loginButton !== null && !isLoggedIn,
        loginUrl: loginButton ? loginButton.href || window.location.href : null
      };
    `,
    timing: { timeout: 5000, waitAfter: 1000 },
    critical: true,
  },
  {
    id: 'start_application',
    name: 'Start New Application',
    description: 'Click Apply for Thailand Pass to begin application',
    script: `
      const applyButton = document.querySelector('#apply-new-btn, .apply-btn, a[href*="apply"]');
      if (applyButton && applyButton.offsetParent !== null) {
        applyButton.scrollIntoView();
        applyButton.click();
        return new Promise((resolve) => {
          setTimeout(() => resolve({ success: true }), 2000);
        });
      }
      return { success: false, error: 'Apply button not found' };
    `,
    timing: { timeout: 10000, waitAfter: 3000 },
    critical: false,
  },
  {
    id: 'fill_personal_info',
    name: 'Fill Personal Information',
    description: 'Fill passport and personal details',
    script: `
      // This script will be dynamically generated with actual form data
      return { success: true, message: 'Personal information filling script placeholder' };
    `,
    timing: { timeout: 15000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_travel_accommodation',
    name: 'Fill Travel and Accommodation',
    description: 'Fill travel details and accommodation information',
    script: `
      // This script will be dynamically generated with actual form data
      return { success: true, message: 'Travel and accommodation filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_health_info',
    name: 'Fill Health Information',
    description: 'Fill vaccination status and insurance information',
    script: `
      // This script will be dynamically generated with actual form data
      return { success: true, message: 'Health information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'submit_form',
    name: 'Submit Application',
    description: 'Submit the Thailand Pass application',
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
                url: window.location.href,
                hasQR: document.querySelector('#qr-code img, .qr-code img, canvas') !== null
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
    id: 'capture_qr',
    name: 'Capture Thailand Pass QR Code',
    description: 'Extract QR code from Thailand Pass confirmation page',
    script: `
      let qrCodeSrc = null;

      // Check for QR code image
      const qrImg = document.querySelector('#qr-code img, .qr-code img, img[alt*="QR" i]');
      if (qrImg && qrImg.src) {
        qrCodeSrc = qrImg.src;
      }

      // Check for canvas (dynamically rendered QR)
      if (!qrCodeSrc) {
        const canvases = document.querySelectorAll('canvas');
        for (const c of canvases) {
          if (c.width >= 50 && c.height >= 50) {
            qrCodeSrc = c.toDataURL('image/png');
            break;
          }
        }
      }

      const confirmationNumber = (
        document.querySelector('#confirmation-number')?.textContent ||
        document.querySelector('[class*="confirmation"]')?.textContent ||
        ''
      ).trim();

      return {
        success: qrCodeSrc !== null || confirmationNumber !== '',
        qrCodeUrl: qrCodeSrc,
        confirmationNumber: confirmationNumber,
        pageUrl: window.location.href
      };
    `,
    timing: { timeout: 10000, waitAfter: 0 },
    critical: false,
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
