/**
 * Japan (JPN) — Visit Japan Web field mappings and portal automation config.
 *
 * Extracted from AutomationScriptRegistry.createJapanScript() so that the
 * AutomationScriptRegistry can auto-discover it without any hard-coded
 * country lists.
 *
 * Portal: Visit Japan Web (vjw-lp.digital.go.jp)
 * Tech stack: React SPA — element names are stable but IDs may be generated.
 *   Use name-attribute selectors as primary; add data-testid fallbacks where known.
 * Date format: YYYY/MM/DD (verified)
 * Multi-step: Step 1 = Registration, Step 2 = Passport, Step 3 = Visit/Customs
 *
 * Selectors last verified: 2026-03-15
 */

import type { AutomationScript, AutomationStep, PortalFieldMapping } from '@/types/submission';

const fieldMappings: Record<string, PortalFieldMapping> = {
  // Step 2 — Passport & Personal Info
  surname: {
    fieldId: 'surname',
    selector:
      'input[name="lastName"], input[name="lastNameEn"], input[name="family_name"], input[id="family_name"]',
    inputType: 'text',
  },
  givenNames: {
    fieldId: 'givenNames',
    selector:
      'input[name="firstName"], input[name="firstNameEn"], input[name="given_name"], input[id="given_name"]',
    inputType: 'text',
  },
  passportNumber: {
    fieldId: 'passportNumber',
    selector:
      'input[name="passportNo"], input[name="passportNumber"], input[name="passport_no"], input[id="passport_no"]',
    inputType: 'text',
  },
  nationality: {
    fieldId: 'nationality',
    selector:
      'select[name="nationalityCode"], select[name="nationality"], select[id="nationality"]',
    inputType: 'select',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
  },
  dateOfBirth: {
    fieldId: 'dateOfBirth',
    // VJW uses YYYY/MM/DD; the input name is "birthday" in some form versions
    selector:
      'input[name="birthday"], input[name="birthDate"], input[name="birth_date"], input[id="birth_date"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'YYYY/MM/DD' },
    },
  },
  gender: {
    fieldId: 'gender',
    // VJW uses "sex" with values "M"/"F"; also check for "gender"
    selector:
      'select[name="sex"], select[name="gender"], input[name="sex"], input[id="sex"]',
    inputType: 'select',
  },
  // Step 3 — Visit Details
  arrivalDate: {
    fieldId: 'arrivalDate',
    selector:
      'input[name="scheduledArrivalDate"], input[name="arrivalDate"], input[name="arrival_date"], input[id="arrival_date"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'YYYY/MM/DD' },
    },
  },
  flightNumber: {
    fieldId: 'flightNumber',
    selector:
      'input[name="flightNumber"], input[name="flight_no"], input[id="flight_no"], input[name="flightNo"]',
    inputType: 'text',
  },
  purposeOfVisit: {
    fieldId: 'purposeOfVisit',
    selector:
      'select[name="purposeOfVisit"], select[name="purpose"], select[id="purpose"]',
    inputType: 'select',
  },
  // Step 3 — Accommodation (address in Japan)
  hotelName: {
    fieldId: 'hotelName',
    selector:
      'input[name="accommodationName"], input[name="accommodation_name"], input[id="accommodation_name"]',
    inputType: 'text',
  },
  hotelAddress: {
    fieldId: 'hotelAddress',
    selector:
      'textarea[name="accommodationAddress"], input[name="accommodationAddress"], textarea[name="accommodation_address"], textarea[id="accommodation_address"]',
    inputType: 'text',
  },
  // Step 3 — Customs Declaration (yes/no radio buttons)
  carryingProhibitedItems: {
    fieldId: 'carryingProhibitedItems',
    // VJW radio values are typically "0" (no) / "1" (yes)
    selector:
      'input[name="prohibitedItems"][value="0"], input[name="prohibited_items"][value="no"], input[name="prohibited_items"][value="false"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'no', trueValue: 'yes' },
    },
  },
  currencyOver1M: {
    fieldId: 'currencyOver1M',
    // 1 million JPY threshold; VJW radio values are "0" (no) / "1" (yes)
    selector:
      'input[name="currencyOverLimit"][value="0"], input[name="currency_over_limit"][value="no"], input[name="currency_over_limit"][value="false"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'no', trueValue: 'yes' },
    },
  },
};

const steps: AutomationStep[] = [
  {
    id: 'load_portal',
    name: 'Load Visit Japan Web Portal',
    description: 'Navigate to Visit Japan Web and wait for page load',
    script: `
      // Wait for page to fully load
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
    id: 'check_login_required',
    name: 'Check if Login Required',
    description: 'Determine if user needs to login first',
    script: `
      const loginButton = document.querySelector('a[href*="login"], button[id*="login"], input[value*="Login"]');
      const isLoggedIn = document.querySelector('.user-info, .logged-in, [data-user]') !== null;

      return {
        loginRequired: loginButton !== null && !isLoggedIn,
        loginUrl: loginButton ? loginButton.href || window.location.href : null,
        isLoggedIn: isLoggedIn
      };
    `,
    timing: { timeout: 5000, waitAfter: 1000 },
    critical: true,
  },
  {
    id: 'start_registration',
    name: 'Start Registration Process',
    description: 'Click on register/start button to begin form process',
    script: `
      // Look for registration or start buttons
      const startButtons = [
        'a[href*="register"], a[href*="entry"]',
        'button[id*="start"], button[id*="register"]',
        'input[value*="Start"], input[value*="Register"]',
        '.btn-start, .btn-register, .start-btn'
      ];

      for (const selector of startButtons) {
        const button = document.querySelector(selector);
        if (button && button.offsetParent !== null) {
          button.scrollIntoView();
          button.click();

          // Wait for navigation
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({ success: true, buttonClicked: selector });
            }, 2000);
          });
        }
      }

      return { success: false, error: 'No start/register button found' };
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
    id: 'fill_travel_info',
    name: 'Fill Travel Information',
    description: 'Fill flight and accommodation details',
    script: `
      // This script will be dynamically generated with actual form data
      return { success: true, message: 'Travel information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_customs_declaration',
    name: 'Fill Customs Declaration',
    description: 'Complete customs declaration questions',
    script: `
      // This script will be dynamically generated with actual form data
      return { success: true, message: 'Customs declaration filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'submit_form',
    name: 'Submit Form',
    description: 'Submit the completed form and wait for confirmation',
    script: `
      // Look for submit buttons
      const submitSelectors = [
        'input[type="submit"]',
        'button[type="submit"]',
        'button[id*="submit"]',
        'input[value*="Submit"]',
        '.btn-submit, .submit-btn'
      ];

      for (const selector of submitSelectors) {
        const button = document.querySelector(selector);
        if (button && button.offsetParent !== null && !button.disabled) {
          button.scrollIntoView();
          button.focus();
          button.click();

          // Wait for submission processing
          return new Promise((resolve) => {
            setTimeout(() => {
              const url = window.location.href;
              const hasConfirmation = document.querySelector('.confirmation, .success, [id*="confirm"]') !== null;
              resolve({
                success: true,
                submitted: true,
                url: url,
                hasConfirmation: hasConfirmation
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
    id: 'detect_captcha',
    name: 'Detect CAPTCHA',
    description: 'Check for CAPTCHA challenges that require manual intervention',
    script: `
      // Check for various CAPTCHA types
      const captchaIndicators = [
        '.g-recaptcha', '#g-recaptcha', 'iframe[src*="recaptcha"]',
        '.h-captcha', 'iframe[src*="hcaptcha"]',
        'img[src*="captcha"]', 'img[alt*="captcha"]', '.captcha img',
        'input[name*="captcha"]', 'input[placeholder*="captcha"]'
      ];

      let captchaFound = false;
      let captchaType = 'none';
      let captchaSelector = '';

      for (const selector of captchaIndicators) {
        const element = document.querySelector(selector);
        if (element && element.offsetParent !== null) {
          captchaFound = true;
          captchaSelector = selector;

          if (selector.includes('recaptcha')) captchaType = 'recaptcha';
          else if (selector.includes('hcaptcha')) captchaType = 'hcaptcha';
          else if (selector.includes('img')) captchaType = 'image';
          else if (selector.includes('input')) captchaType = 'text';
          break;
        }
      }

      return {
        success: true,
        captchaFound: captchaFound,
        captchaType: captchaType,
        captchaSelector: captchaSelector,
        requiresManualIntervention: captchaFound
      };
    `,
    timing: { timeout: 5000, waitAfter: 1000 },
    critical: false,
  },
  {
    id: 'handle_errors',
    name: 'Handle Form Errors',
    description: 'Detect and handle form validation errors',
    script: `
      const errorSelectors = [
        '.error', '.error-message', '.field-error',
        '.invalid', '.validation-error', '.form-error',
        '[aria-invalid="true"]', '.has-error',
        '.alert-danger', '.alert-error'
      ];

      const errors = [];
      let hasBlockingErrors = false;

      for (const selector of errorSelectors) {
        const errorElements = document.querySelectorAll(selector);
        errorElements.forEach(el => {
          if (el.offsetParent !== null && el.textContent.trim()) {
            const errorText = el.textContent.trim();
            errors.push({ selector: selector, text: errorText, element: el.tagName });

            const blockingKeywords = ['required', 'invalid', 'error', 'failed', 'missing'];
            if (blockingKeywords.some(keyword => errorText.toLowerCase().includes(keyword))) {
              hasBlockingErrors = true;
            }
          }
        });
      }

      const submitButtons = document.querySelectorAll('input[type="submit"], button[type="submit"]');
      let submitDisabled = false;
      submitButtons.forEach(btn => { if (btn.disabled) submitDisabled = true; });

      return {
        success: true,
        errorsFound: errors.length > 0,
        errors: errors,
        hasBlockingErrors: hasBlockingErrors || submitDisabled,
        submitDisabled: submitDisabled
      };
    `,
    timing: { timeout: 5000, waitAfter: 500 },
    critical: false,
  },
  {
    id: 'capture_confirmation',
    name: 'Capture Confirmation',
    description: 'Extract confirmation number and QR code',
    script: `
      const confirmationSelectors = [
        '[id*="confirmation"] img, [class*="confirmation"] img',
        '[id*="qr"] img, [class*="qr"] img',
        '.qr-code img, .confirmation-qr img'
      ];

      let qrCodeSrc = null;
      for (const selector of confirmationSelectors) {
        const img = document.querySelector(selector);
        if (img && img.src) { qrCodeSrc = img.src; break; }
      }

      const confirmationNumber = (
        document.querySelector('[id*="confirmation"][id*="number"]')?.textContent ||
        document.querySelector('[class*="confirmation"][class*="number"]')?.textContent ||
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

const JPN_MAPPING: AutomationScript = {
  countryCode: 'JPN',
  portalUrl: 'https://vjw-lp.digital.go.jp/en/registration/',
  version: '1.1.0',
  lastUpdated: '2026-03-15T00:00:00Z',
  prerequisites: {
    cookiesEnabled: true,
    javascriptEnabled: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },
  steps,
  fieldMappings,
  session: {
    maxDurationMs: 20 * 60 * 1000, // 20 minutes
    keepAlive: true,
    clearCookiesOnStart: false,
  },
};

export default JPN_MAPPING;
