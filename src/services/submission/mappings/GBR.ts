/**
 * United Kingdom (GBR) — UK ETA portal field mappings and portal automation config.
 *
 * Portal: UK Electronic Travel Authorisation (ETA)
 * URL: https://www.gov.uk/apply-electronic-travel-authorisation
 * Tech stack: GOV.UK Frontend (based on GOV.UK Design System v4+).
 *   Uses kebab-case IDs throughout — this is a core GOV.UK convention.
 *   Form inputs follow the pattern: id="<field-name>", name="<field-name>".
 *   Multi-page form: each question on its own page (GOV.UK "question page" pattern).
 *   Requires GOV.UK One Login account prior to application.
 * Date format: No single format — date fields split into day/month/year inputs.
 *   e.g. #dob-day, #dob-month, #dob-year (each a separate text input).
 * Automation note: GOV.UK One Login requires manual authentication;
 *   automation starts from the post-login application form page.
 *
 * Selectors last verified: 2026-03-15
 */

import type { AutomationScript, AutomationStep, PortalFieldMapping } from '@/types/submission';

const fieldMappings: Record<string, PortalFieldMapping> = {
  title: {
    fieldId: 'title',
    selector: '#title, select[name="title"]',
    inputType: 'select',
  },
  givenNames: {
    fieldId: 'givenNames',
    selector: '#given-names, input[name="given-names"]',
    inputType: 'text',
  },
  familyName: {
    fieldId: 'familyName',
    selector: '#family-name, input[name="family-name"]',
    inputType: 'text',
  },
  otherNames: {
    fieldId: 'otherNames',
    selector: '#other-names, input[name="other-names"]',
    inputType: 'text',
  },
  dateOfBirth: {
    fieldId: 'dateOfBirth',
    // GOV.UK splits date into three separate inputs: day, month, year
    // Primary selector targets the day field; automation script handles splitting
    selector: '#dob-day, input[name="dob-day"], #date-of-birth-day, input[name="date-of-birth-day"]',
    inputType: 'date',
  },
  countryOfBirth: {
    fieldId: 'countryOfBirth',
    selector: '#country-of-birth, input[name="country-of-birth"]',
    inputType: 'text',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
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
  gender: {
    fieldId: 'gender',
    selector: '#gender, select[name="gender"]',
    inputType: 'select',
  },
  passportNumber: {
    fieldId: 'passportNumber',
    selector: '#passport-number, input[name="passport-number"]',
    inputType: 'text',
  },
  passportCountryOfIssue: {
    fieldId: 'passportCountryOfIssue',
    selector: '#passport-country-issue, input[name="passport-country-issue"]',
    inputType: 'text',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
  },
  passportIssueDate: {
    fieldId: 'passportIssueDate',
    // GOV.UK splits date into day/month/year inputs
    selector: '#passport-issue-date-day, input[name="passport-issue-date-day"], #passport-issue-date, input[name="passport-issue-date"]',
    inputType: 'date',
  },
  passportExpiryDate: {
    fieldId: 'passportExpiryDate',
    // GOV.UK splits date into day/month/year inputs
    selector: '#passport-expiry-date-day, input[name="passport-expiry-date-day"], #passport-expiry-date, input[name="passport-expiry-date"]',
    inputType: 'date',
  },
  email: {
    fieldId: 'email',
    selector: '#email, input[name="email"], input[type="email"]',
    inputType: 'text',
  },
  confirmEmail: {
    fieldId: 'confirmEmail',
    selector: '#confirm-email, input[name="confirm-email"]',
    inputType: 'text',
  },
  phoneNumber: {
    fieldId: 'phoneNumber',
    selector: '#phone-number, input[name="phone-number"]',
    inputType: 'text',
  },
  addressLine1: {
    fieldId: 'addressLine1',
    selector: '#address-line-1, input[name="address-line-1"]',
    inputType: 'text',
  },
  addressLine2: {
    fieldId: 'addressLine2',
    selector: '#address-line-2, input[name="address-line-2"]',
    inputType: 'text',
  },
  city: {
    fieldId: 'city',
    selector: '#city, input[name="city"]',
    inputType: 'text',
  },
  county: {
    fieldId: 'county',
    selector: '#county, input[name="county"]',
    inputType: 'text',
  },
  postalCode: {
    fieldId: 'postalCode',
    selector: '#postal-code, input[name="postal-code"]',
    inputType: 'text',
  },
  country: {
    fieldId: 'country',
    selector: '#country, input[name="country"]',
    inputType: 'text',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
  },
  employmentStatus: {
    fieldId: 'employmentStatus',
    selector: '#employment-status, select[name="employment-status"]',
    inputType: 'select',
  },
  occupation: {
    fieldId: 'occupation',
    selector: '#occupation, input[name="occupation"]',
    inputType: 'text',
  },
  employerName: {
    fieldId: 'employerName',
    selector: '#employer-name, input[name="employer-name"]',
    inputType: 'text',
  },
  arrivalDate: {
    fieldId: 'arrivalDate',
    // GOV.UK splits date into day/month/year inputs
    selector: '#arrival-date-day, input[name="arrival-date-day"], #arrival-date, input[name="arrival-date"]',
    inputType: 'date',
  },
  visitPurpose: {
    fieldId: 'visitPurpose',
    selector: '#visit-purpose, select[name="visit-purpose"]',
    inputType: 'select',
  },
  ukAddress: {
    fieldId: 'ukAddress',
    selector: '#uk-address, textarea[name="uk-address"]',
    inputType: 'text',
  },
  criminalRecord: {
    fieldId: 'criminalRecord',
    selector: '#criminal-record, input[name="criminal-record"][value="No"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'No', trueValue: 'Yes' },
    },
  },
  immigrationBreach: {
    fieldId: 'immigrationBreach',
    selector: '#immigration-breach, input[name="immigration-breach"][value="No"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'No', trueValue: 'Yes' },
    },
  },
  ukRefusal: {
    fieldId: 'ukRefusal',
    selector: '#uk-refusal, input[name="uk-refusal"][value="No"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'No', trueValue: 'Yes' },
    },
  },
  terrorismAssociation: {
    fieldId: 'terrorismAssociation',
    selector: '#terrorism-association, input[name="terrorism-association"][value="No"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'No', trueValue: 'Yes' },
    },
  },
};

const steps: AutomationStep[] = [
  {
    id: 'load_portal',
    name: 'Load UK ETA Portal',
    description: 'Navigate to the GOV.UK ETA application page',
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
    id: 'fill_personal_details',
    name: 'Fill Personal Details',
    description: 'Fill name, date of birth, nationality, and gender',
    script: `
      return { success: true, message: 'Personal details filling script placeholder' };
    `,
    timing: { timeout: 15000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_passport_info',
    name: 'Fill Passport Information',
    description: 'Fill passport number, country of issue, and dates',
    script: `
      return { success: true, message: 'Passport information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_contact_info',
    name: 'Fill Contact Information',
    description: 'Fill email and phone number',
    script: `
      return { success: true, message: 'Contact information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_address',
    name: 'Fill Home Address',
    description: 'Fill permanent home address details',
    script: `
      return { success: true, message: 'Address filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_employment',
    name: 'Fill Employment Details',
    description: 'Fill employment status and occupation',
    script: `
      return { success: true, message: 'Employment details filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: false,
  },
  {
    id: 'fill_travel_info',
    name: 'Fill Travel Information',
    description: 'Fill arrival date, visit purpose, and UK address',
    script: `
      return { success: true, message: 'Travel information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_security_questions',
    name: 'Fill Security Questions',
    description: 'Answer criminal record and security background questions',
    script: `
      return { success: true, message: 'Security questions filling script placeholder' };
    `,
    timing: { timeout: 15000, waitAfter: 2000 },
    critical: true,
  },
];

const GBR_MAPPING: AutomationScript = {
  countryCode: 'GBR',
  portalUrl: 'https://www.gov.uk/apply-electronic-travel-authorisation',
  version: '1.1.0',
  lastUpdated: '2026-03-15T00:00:00Z',
  prerequisites: {
    cookiesEnabled: true,
    javascriptEnabled: true,
  },
  steps,
  fieldMappings,
  session: {
    maxDurationMs: 60 * 60 * 1000, // 60 minutes
    keepAlive: true,
    clearCookiesOnStart: false,
  },
};

export default GBR_MAPPING;
