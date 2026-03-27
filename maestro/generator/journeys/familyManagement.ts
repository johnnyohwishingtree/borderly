/**
 * Family management journey definitions.
 *
 * Tests adding family members via manual entry and demo scan,
 * and the full family-of-4 trip flow.
 */
import { journey } from '../dsl';
import {
  tap, tapText, assertVisible, conditional, fill, select, date,
} from '../dsl';
import {
  screenStep, tapButton,
} from '../journeyBuilder';

// Import shared steps
import { onboardingManual, onboardingDemoScan } from './onboarding';
import { createJapanTripSteps, tripDetailStep } from './tripCreation';

/**
 * Navigate to family management from any tab.
 */
const navigateToFamilyManagement = () => screenStep('Profile', {
  comment: 'NAVIGATE TO FAMILY MANAGEMENT',
  waitFor: null,
  actions: [
    tap('tab-profile'),
    assertVisible('Profile'),
    tap('family-summary-row'),
  ],
});

/**
 * Add a family member via manual passport entry.
 */
const addFamilyMemberManual = (data: {
  relationship: string;
  passportNumber: string;
  surname: string;
  givenNames: string;
  nationality: { search: string; code: string };
  gender: 'Male' | 'Female' | 'Other';
  issuingCountry: { search: string; code: string };
}) => screenStep('FamilyManagement', {
  comment: `ADD FAMILY MEMBER — ${data.surname} (${data.relationship})`,
  waitFor: null,
  actions: [
    tapButton('FamilyManagement', 'add-member-button'),
    // Select relationship
    tap('relationship-select'),
    tap(`relationship-select-option-${data.relationship}`),
    // Manual passport entry
    tap('enter-manually-family-button'),
    fill('passport-number-field', data.passportNumber),
    fill('surname-field', data.surname),
    fill('given-names-field', data.givenNames),
    select('nationality-field', data.nationality.search, data.nationality.code),
    date('dob-field'),
    tap(`gender-${data.gender}-button`),
    date('passport-expiry-field'),
    select('issuing-country-field', data.issuingCountry.search, data.issuingCountry.code),
    tap('passport-continue-button'),
  ],
});

/**
 * Add a family member via demo scan (dev mode).
 */
const addFamilyMemberDemoScan = (data: {
  relationship: string;
  scanButton: string;
  expectedName: string;
}) => screenStep('FamilyManagement', {
  comment: `ADD FAMILY MEMBER — DEMO SCAN (${data.relationship})`,
  waitFor: null,
  actions: [
    tapButton('FamilyManagement', 'add-member-button'),
    tap('relationship-select'),
    tap(`relationship-select-option-${data.relationship}`),
    conditional('Performance Optimization Enabled', tapText('Dismiss')),
    tap(data.scanButton),
    assertVisible(data.expectedName),
    tap('confirm-scan-button'),
  ],
});

// ── Exported journeys ──

export const addFamilyMember = journey('add-family-member', {
  description: 'Onboard then add a family member via manual passport entry',
  clearState: true,
  tags: ['family'],
  steps: [
    ...onboardingManual.steps,
    navigateToFamilyManagement(),
    addFamilyMemberManual({
      relationship: 'Spouse',
      passportNumber: 'M98765432',
      surname: 'SMITH',
      givenNames: 'JANE',
      nationality: { search: 'United States', code: 'USA' },
      gender: 'Female',
      issuingCountry: { search: 'United States', code: 'USA' },
    }),
  ],
});

export const demoScanFamily = journey('demo-scan-family', {
  description: 'Onboard with demo scan then add spouse and child via demo scan',
  clearState: true,
  tags: ['family', 'demo'],
  steps: [
    ...onboardingDemoScan.steps,
    navigateToFamilyManagement(),
    addFamilyMemberDemoScan({
      relationship: 'Spouse',
      scanButton: 'demo-scan-spouse-button',
      expectedName: 'JANE',
    }),
    addFamilyMemberDemoScan({
      relationship: 'Child',
      scanButton: 'demo-scan-child-button',
      expectedName: 'EMILY',
    }),
  ],
});

export const familyOf4FullTrip = journey('family-of-4-full-trip', {
  description: 'Onboard, add family, create Japan trip, fill form, save',
  clearState: true,
  tags: ['family', 'trip', 'critical'],
  steps: [
    ...onboardingManual.steps,
    navigateToFamilyManagement(),
    addFamilyMemberManual({
      relationship: 'Spouse',
      passportNumber: 'M98765432',
      surname: 'SMITH',
      givenNames: 'JANE',
      nationality: { search: 'United States', code: 'USA' },
      gender: 'Female',
      issuingCountry: { search: 'United States', code: 'USA' },
    }),
    // Navigate back to trips and create a trip
    screenStep('TripList', {
      comment: 'BACK TO TRIPS',
      waitFor: null,
      actions: [
        tap('tab-trips'),
        tapButton('TripList', 'create-first-trip-button'),
      ],
    }),
    ...createJapanTripSteps(),
    tripDetailStep(),
  ],
});
