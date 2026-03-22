/**
 * Onboarding journey definitions.
 *
 * These define the test paths through onboarding.
 * The generator converts them to Maestro YAML.
 */
import {
  journey, step,
  tap, fill, select, date, alert,
  assertVisible, conditional, tapText,
} from '../dsl';

/**
 * Shared onboarding steps that are reused across multiple journeys.
 * Split into functions so they can be composed.
 */

/** Welcome screen — tap tutorial button */
const welcomeStep = () => step('Welcome', {
  comment: 'WELCOME SCREEN',
  waitFor: 'Borderly',
  actions: [
    assertVisible('Welcome to'),
    tap('take-tutorial-button'),
  ],
});

/** Tutorial screen — skip to passport scan */
const tutorialSkipStep = () => step('Tutorial', {
  comment: 'TUTORIAL — SKIP',
  waitFor: 'Step 1 of 3',
  actions: [
    tap('tutorial-skip-button'),
  ],
});

/** Passport scan — manual entry with given data */
const passportManualEntry = (data: {
  number: string; surname: string; givenNames: string;
  nationality: { search: string; code: string };
  gender: 'Male' | 'Female' | 'Other';
  issuingCountry: { search: string; code: string };
}) => step('PassportScan', {
  comment: 'PASSPORT — MANUAL ENTRY',
  waitFor: 'Passport Information',
  actions: [
    conditional('Performance Optimization Enabled', tapText('Dismiss')),
    tap('enter-manually-button'),
    fill('passport-number-input', data.number),
    fill('surname-input', data.surname),
    fill('given-names-input', data.givenNames),
    select('nationality-input', data.nationality.search, data.nationality.code),
    date('dob-input'),
    tap(`gender-${data.gender}-button`),
    date('passport-expiry-input'),
    select('issuing-country-input', data.issuingCountry.search, data.issuingCountry.code),
    tap('passport-continue-button'),
  ],
});

/** Passport scan — demo scan (dev mode) */
const passportDemoScan = () => step('PassportScan', {
  comment: 'PASSPORT — DEMO SCAN',
  waitFor: 'Passport Information',
  actions: [
    conditional('Performance Optimization Enabled', tapText('Dismiss')),
    tap('demo-scan-adult'),
    // Preview shows scanned data — confirm it
    assertVisible('SMITH'),
    tap('confirm-scan-button'),
  ],
});

/** Confirm profile screen */
const confirmProfileStep = (expectedName: string) => step('ConfirmProfile', {
  comment: 'CONFIRM PROFILE',
  waitFor: 'Confirm Your Profile',
  waitTimeout: 30000,
  actions: [
    assertVisible(expectedName),
    tap('continue-to-security-button'),
    // Retry if tap didn't register (navigation stack race)
    conditional('continue-to-security-button', tap('continue-to-security-button')),
  ],
});

/** Add companions screen — skip (solo traveler) */
const addCompanionsSkipStep = () => step('AddCompanions', {
  comment: 'ADD COMPANIONS — SKIP',
  waitFor: 'Traveling with family?',
  actions: [
    tapText('Continue \u2014 just me'),
  ],
});

/** Biometric setup screen — skip */
const biometricSkipStep = () => step('BiometricSetup', {
  comment: 'BIOMETRIC SETUP — SKIP',
  waitFor: 'Secure Your Profile',
  actions: [
    tap('skip-biometric-button'),
    alert('Skip Biometric Setup?', 'Skip'),
  ],
});

/**
 * Notification permission screen — skip.
 *
 * Three possible outcomes after BiometricSetup skip:
 * 1. NotificationPermission screen appears → tap "Skip for Now"
 * 2. Notifications already granted → screen auto-skips → goes to TripList
 * 3. notifee check fails → screen stays visible but may render slowly
 *
 * We handle all three by trying to skip notifications, then waiting for trips.
 */
const notificationAndTripListStep = () => step('NotificationPermission', {
  comment: 'NOTIFICATION PERMISSION + TRIP LIST',
  actions: [
    // If notification screen appears, skip it
    conditional('Stay on Top of Deadlines', tap('skip-notifications-button')),
    // If it doesn't appear yet, try the skip button directly (screen may be rendering)
    conditional('skip-notifications-button', tap('skip-notifications-button')),
    // Now wait for the main trip list
    assertVisible('Your Trips'),
    assertVisible('No trips yet'),
  ],
});

// ── Exported journeys ──

export const onboardingManual = journey('onboarding-manual', {
  description: 'Full onboarding via manual passport entry',
  clearState: true,
  tags: ['smoke', 'onboarding'],
  steps: [
    welcomeStep(),
    tutorialSkipStep(),
    passportManualEntry({
      number: 'L12345678',
      surname: 'SMITH',
      givenNames: 'JOHN MICHAEL',
      nationality: { search: 'United States', code: 'USA' },
      gender: 'Male',
      issuingCountry: { search: 'United States', code: 'USA' },
    }),
    confirmProfileStep('JOHN MICHAEL SMITH'),
    addCompanionsSkipStep(),
    biometricSkipStep(),
    notificationAndTripListStep(),
  ],
});

export const onboardingDemoScan = journey('onboarding-demo-scan', {
  description: 'Full onboarding via demo passport scan (dev mode)',
  clearState: true,
  tags: ['smoke', 'onboarding', 'demo'],
  steps: [
    welcomeStep(),
    tutorialSkipStep(),
    passportDemoScan(),
    confirmProfileStep('JOHN MICHAEL SMITH'),
    addCompanionsSkipStep(),
    biometricSkipStep(),
    notificationAndTripListStep(),
  ],
});
