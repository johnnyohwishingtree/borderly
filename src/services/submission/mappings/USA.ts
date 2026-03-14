/**
 * United States (USA) — ESTA portal field mappings and portal automation config.
 *
 * Portal: Electronic System for Travel Authorization (ESTA)
 * URL: https://esta.cbp.dhs.gov/
 * Date format: MM/DD/YYYY
 * Note: Automation is in test mode only due to portal complexity.
 */

import type { AutomationScript, AutomationStep, PortalFieldMapping } from '@/types/submission';

const fieldMappings: Record<string, PortalFieldMapping> = {
  surname: {
    fieldId: 'surname',
    selector: '#surname, input[name="surname"]',
    inputType: 'text',
  },
  firstName: {
    fieldId: 'firstName',
    selector: '#firstName, input[name="firstName"]',
    inputType: 'text',
  },
  middleName: {
    fieldId: 'middleName',
    selector: '#middleName, input[name="middleName"]',
    inputType: 'text',
  },
  aliases: {
    fieldId: 'aliases',
    selector: '#aliases, input[name="aliases"][value="N"], input[name="aliases"][value="No"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  dateOfBirth: {
    fieldId: 'dateOfBirth',
    selector: '#dateOfBirth, input[name="dateOfBirth"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'MM/DD/YYYY' },
    },
  },
  cityOfBirth: {
    fieldId: 'cityOfBirth',
    selector: '#cityOfBirth, input[name="cityOfBirth"]',
    inputType: 'text',
  },
  countryOfBirth: {
    fieldId: 'countryOfBirth',
    selector: '#countryOfBirth, input[name="countryOfBirth"]',
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
    selector: '#passportNumber, input[name="passportNumber"]',
    inputType: 'text',
  },
  passportCountry: {
    fieldId: 'passportCountry',
    selector: '#passportCountry, input[name="passportCountry"]',
    inputType: 'text',
    transform: {
      type: 'country_code',
      config: { format: 'iso3_to_name' },
    },
  },
  passportIssueDate: {
    fieldId: 'passportIssueDate',
    selector: '#passportIssueDate, input[name="passportIssueDate"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'MM/DD/YYYY' },
    },
  },
  passportExpirationDate: {
    fieldId: 'passportExpirationDate',
    selector: '#passportExpirationDate, input[name="passportExpirationDate"]',
    inputType: 'date',
    transform: {
      type: 'date_format',
      config: { from: 'YYYY-MM-DD', to: 'MM/DD/YYYY' },
    },
  },
  issuingAuthority: {
    fieldId: 'issuingAuthority',
    selector: '#issuingAuthority, input[name="issuingAuthority"]',
    inputType: 'text',
  },
  homeAddress: {
    fieldId: 'homeAddress',
    selector: '#homeAddress, textarea[name="homeAddress"]',
    inputType: 'text',
  },
  homePhone: {
    fieldId: 'homePhone',
    selector: '#homePhone, input[name="homePhone"]',
    inputType: 'text',
  },
  workPhone: {
    fieldId: 'workPhone',
    selector: '#workPhone, input[name="workPhone"]',
    inputType: 'text',
  },
  email: {
    fieldId: 'email',
    selector: '#email, input[name="email"], input[type="email"]',
    inputType: 'text',
  },
  employer: {
    fieldId: 'employer',
    selector: '#employer, input[name="employer"]',
    inputType: 'text',
  },
  employerAddress: {
    fieldId: 'employerAddress',
    selector: '#employerAddress, textarea[name="employerAddress"]',
    inputType: 'text',
  },
  employerPhone: {
    fieldId: 'employerPhone',
    selector: '#employerPhone, input[name="employerPhone"]',
    inputType: 'text',
  },
  jobTitle: {
    fieldId: 'jobTitle',
    selector: '#jobTitle, input[name="jobTitle"]',
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
  emergencyContactEmail: {
    fieldId: 'emergencyContactEmail',
    selector: '#emergencyContactEmail, input[name="emergencyContactEmail"]',
    inputType: 'text',
  },
  purposeOfTravel: {
    fieldId: 'purposeOfTravel',
    selector: '#purposeOfTravel, select[name="purposeOfTravel"]',
    inputType: 'select',
  },
  addressInUS: {
    fieldId: 'addressInUS',
    selector: '#addressInUS, textarea[name="addressInUS"]',
    inputType: 'text',
  },
  contactPersonUS: {
    fieldId: 'contactPersonUS',
    selector: '#contactPersonUS, input[name="contactPersonUS"]',
    inputType: 'text',
  },
  contactPhoneUS: {
    fieldId: 'contactPhoneUS',
    selector: '#contactPhoneUS, input[name="contactPhoneUS"]',
    inputType: 'text',
  },
  mentalDisorder: {
    fieldId: 'mentalDisorder',
    selector: '#mentalDisorder, input[name="mentalDisorder"][value="N"], input[name="mentalDisorder"][value="No"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  drugConviction: {
    fieldId: 'drugConviction',
    selector: '#drugConviction, input[name="drugConviction"][value="N"], input[name="drugConviction"][value="No"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  childAbduction: {
    fieldId: 'childAbduction',
    selector: '#childAbduction, input[name="childAbduction"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  crimeConviction: {
    fieldId: 'crimeConviction',
    selector: '#crimeConviction, input[name="crimeConviction"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  controlledSubstance: {
    fieldId: 'controlledSubstance',
    selector: '#controlledSubstance, input[name="controlledSubstance"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  prostitution: {
    fieldId: 'prostitution',
    selector: '#prostitution, input[name="prostitution"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  moneyLaundering: {
    fieldId: 'moneyLaundering',
    selector: '#moneyLaundering, input[name="moneyLaundering"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  humanTrafficking: {
    fieldId: 'humanTrafficking',
    selector: '#humanTrafficking, input[name="humanTrafficking"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  terrorism: {
    fieldId: 'terrorism',
    selector: '#terrorism, input[name="terrorism"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  genocide: {
    fieldId: 'genocide',
    selector: '#genocide, input[name="genocide"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  childSoldier: {
    fieldId: 'childSoldier',
    selector: '#childSoldier, input[name="childSoldier"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  religiousFreedom: {
    fieldId: 'religiousFreedom',
    selector: '#religiousFreedom, input[name="religiousFreedom"][value="N"]',
    inputType: 'radio',
    transform: {
      type: 'boolean_to_yesno',
      config: { falseValue: 'N', trueValue: 'Y' },
    },
  },
  visaRefusal: {
    fieldId: 'visaRefusal',
    selector: '#visaRefusal, input[name="visaRefusal"][value="N"]',
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
    name: 'Load ESTA Portal',
    description: 'Navigate to the official ESTA portal and wait for page load',
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
    id: 'fill_applicant_info',
    name: 'Fill Applicant Information',
    description: 'Fill personal details including name, DOB, country of birth',
    script: `
      return { success: true, message: 'Applicant information filling script placeholder' };
    `,
    timing: { timeout: 15000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_passport_info',
    name: 'Fill Passport Information',
    description: 'Fill passport number, issue date, expiry, and country',
    script: `
      return { success: true, message: 'Passport information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_contact_info',
    name: 'Fill Contact Information',
    description: 'Fill home address and contact details',
    script: `
      return { success: true, message: 'Contact information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_employment_info',
    name: 'Fill Employment Information',
    description: 'Fill current employer and job title',
    script: `
      return { success: true, message: 'Employment information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_emergency_contact',
    name: 'Fill Emergency Contact',
    description: 'Fill emergency contact information',
    script: `
      return { success: true, message: 'Emergency contact filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_travel_info',
    name: 'Fill Travel Information',
    description: 'Fill travel purpose and US address',
    script: `
      return { success: true, message: 'Travel information filling script placeholder' };
    `,
    timing: { timeout: 10000, waitAfter: 2000 },
    critical: true,
  },
  {
    id: 'fill_eligibility_questions',
    name: 'Fill Eligibility Questions',
    description: 'Answer security and eligibility questions',
    script: `
      return { success: true, message: 'Eligibility questions filling script placeholder' };
    `,
    timing: { timeout: 15000, waitAfter: 2000 },
    critical: true,
  },
];

const USA_MAPPING: AutomationScript = {
  countryCode: 'USA',
  portalUrl: 'https://esta.cbp.dhs.gov/',
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

export default USA_MAPPING;
