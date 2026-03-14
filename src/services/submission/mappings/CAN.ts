/**
 * Canada (CAN) — eTA portal field mappings and portal automation config.
 *
 * Portal: Electronic Travel Authorization (eTA)
 * URL: https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta.html
 * Date format: YYYY-MM-DD (standard)
 */

import type { AutomationScript, AutomationStep, PortalFieldMapping } from '@/types/submission';

const fieldMappings: Record<string, PortalFieldMapping> = {
  surname: {
    fieldId: 'surname',
    selector: '#surname, input[name="surname"]',
    inputType: 'text',
  },
  givenNames: {
    fieldId: 'givenNames',
    selector: '#given-names, input[name="given-names"], input[name="givenNames"]',
    inputType: 'text',
  },
  previousNames: {
    fieldId: 'previousNames',
    selector: '#previous-names, input[name="previous-names"][value="N"], input[name="previous-names"][value="No"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  dateOfBirth: {
    fieldId: 'dateOfBirth',
    selector: '#date-of-birth, input[name="date-of-birth"]',
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
  gender: {
    fieldId: 'gender',
    selector: '#gender, select[name="gender"]',
    inputType: 'select',
  },
  maritalStatus: {
    fieldId: 'maritalStatus',
    selector: '#marital-status, select[name="marital-status"]',
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
  dualCitizenship: {
    fieldId: 'dualCitizenship',
    selector: '#dual-citizenship, input[name="dual-citizenship"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  immigrationStatus: {
    fieldId: 'immigrationStatus',
    selector: '#immigration-status, select[name="immigration-status"]',
    inputType: 'select',
  },
  passportNumber: {
    fieldId: 'passportNumber',
    selector: '#passport-number, input[name="passport-number"]',
    inputType: 'text',
  },
  passportCountry: {
    fieldId: 'passportCountry',
    selector: '#passport-country, input[name="passport-country"]',
    inputType: 'text',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
  },
  passportIssueDate: {
    fieldId: 'passportIssueDate',
    selector: '#passport-issue-date, input[name="passport-issue-date"]',
    inputType: 'date',
  },
  passportExpiryDate: {
    fieldId: 'passportExpiryDate',
    selector: '#passport-expiry-date, input[name="passport-expiry-date"]',
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
  homeAddress: {
    fieldId: 'homeAddress',
    selector: '#home-address, textarea[name="home-address"]',
    inputType: 'text',
  },
  homeCountry: {
    fieldId: 'homeCountry',
    selector: '#home-country, input[name="home-country"]',
    inputType: 'text',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
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
  purposeOfVisit: {
    fieldId: 'purposeOfVisit',
    selector: '#purpose-of-visit, select[name="purpose-of-visit"]',
    inputType: 'select',
  },
  fundingSource: {
    fieldId: 'fundingSource',
    selector: '#funding-source, select[name="funding-source"]',
    inputType: 'select',
  },
  criminalOffence: {
    fieldId: 'criminalOffence',
    selector: '#criminal-offence, input[name="criminal-offence"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  immigrationOffence: {
    fieldId: 'immigrationOffence',
    selector: '#immigration-offence, input[name="immigration-offence"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  medicalCondition: {
    fieldId: 'medicalCondition',
    selector: '#medical-condition, input[name="medical-condition"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  tuberculosis: {
    fieldId: 'tuberculosis',
    selector: '#tuberculosis, input[name="tuberculosis"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  governmentPosition: {
    fieldId: 'governmentPosition',
    selector: '#government-position, input[name="government-position"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  militaryService: {
    fieldId: 'militaryService',
    selector: '#military-service, input[name="military-service"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  warCrimes: {
    fieldId: 'warCrimes',
    selector: '#war-crimes, input[name="war-crimes"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
};

const steps: AutomationStep[] = [
  {
    id: 'load_portal',
    name: 'Load Canada eTA Portal',
    description: 'Navigate to the official Canada eTA application page',
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
    description: 'Fill name, date of birth, country of birth, and gender',
    script: `
      return { success: true, message: 'Personal information filling script placeholder' };
    `,
    timing: { timeout: 15000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_nationality',
    name: 'Fill Nationality and Citizenship',
    description: 'Fill nationality, dual citizenship status, and immigration status',
    script: `
      return { success: true, message: 'Nationality information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_passport_info',
    name: 'Fill Passport Information',
    description: 'Fill passport number, country, issue and expiry dates',
    script: `
      return { success: true, message: 'Passport information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_contact_info',
    name: 'Fill Contact and Address',
    description: 'Fill email address and home address',
    script: `
      return { success: true, message: 'Contact information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_employment',
    name: 'Fill Employment Information',
    description: 'Fill occupation and employer name',
    script: `
      return { success: true, message: 'Employment information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_travel_info',
    name: 'Fill Travel Information',
    description: 'Fill purpose of visit and funding source',
    script: `
      return { success: true, message: 'Travel information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_background_questions',
    name: 'Fill Background Questions',
    description: 'Answer background and security questions',
    script: `
      return { success: true, message: 'Background questions filling script placeholder' };
    `,
    timing: { timeout: 15000, waitAfter: 2000 },
    critical: true,
  },
];

const CAN_MAPPING: AutomationScript = {
  countryCode: 'CAN',
  portalUrl: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta.html',
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

export default CAN_MAPPING;
