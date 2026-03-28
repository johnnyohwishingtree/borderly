/**
 * Onboarding journey definitions.
 *
 * These define the test paths through onboarding.
 * Screen metadata (waitFor, fields, alerts) is loaded from the screen registry —
 * the journey builder auto-populates these at generation time.
 */
import { journey } from '../dsl';
import {
  assertVisible, conditional, tapText, tap,
} from '../dsl';
import {
  screenStep, tapButton, handleAlert, fillField,
} from '../journeyBuilder';

/**
 * Shared onboarding steps that are reused across multiple journeys.
 * Split into functions so they can be composed.
 */

/** Welcome screen — tap tutorial button */
const welcomeStep = () => screenStep('Welcome', {
  comment: 'WELCOME SCREEN',
  actions: [
    assertVisible('Welcome to'),
    tapButton('Welcome', 'take-tutorial-button'),
  ],
});

/** Tutorial screen — advance through all 3 steps (buttons always visible) */
const tutorialSkipStep = () => screenStep('Tutorial', {
  comment: 'TUTORIAL — ADVANCE THROUGH STEPS',
  actions: [
    tap('next-step-button', { scroll: false }),
    tap('next-step-button', { scroll: false }),
    tap('next-step-button', { scroll: false }),
  ],
});

/** Passport scan — manual entry with given data */
const passportManualEntry = (data: {
  number: string; surname: string; givenNames: string;
  nationality: { search: string; code: string };
  gender: 'Male' | 'Female' | 'Other';
  issuingCountry: { search: string; code: string };
}) => screenStep('PassportScan', {
  comment: 'PASSPORT — MANUAL ENTRY',
  actions: [
    conditional('Performance Optimization Enabled', tapText('Dismiss')),
    tapButton('PassportScan', 'enter-manually-button'),
    // Fill fields using registry-driven actions (componentType → DSL action)
    ...fillField('PassportScan', 'passport-number-field', { text: data.number }),
    ...fillField('PassportScan', 'surname-field', { text: data.surname }),
    ...fillField('PassportScan', 'given-names-field', { text: data.givenNames }),
    ...fillField('PassportScan', 'nationality-field', { search: data.nationality.search, code: data.nationality.code }),
    ...fillField('PassportScan', 'dob-field'),
    // Gender uses radio buttons (componentType 'other') — manual action
    tap(`gender-${data.gender}-button`),
    ...fillField('PassportScan', 'passport-expiry-field'),
    ...fillField('PassportScan', 'issuing-country-field', { search: data.issuingCountry.search, code: data.issuingCountry.code }),
    tapButton('PassportScan', 'passport-continue-button'),
  ],
});

/** Passport scan — demo scan (dev mode). Demo buttons visible after dismiss. */
const passportDemoScan = () => screenStep('PassportScan', {
  comment: 'PASSPORT — DEMO SCAN',
  actions: [
    conditional('Performance Optimization Enabled', tapText('Dismiss')),
    tap('demo-scan-adult-button', { scroll: false }),
    assertVisible('SMITH'),
    tap('confirm-scan-button', { scroll: false }),
  ],
});

/** Confirm profile screen */
const confirmProfileStep = (expectedName: string) => screenStep('ConfirmProfile', {
  comment: 'CONFIRM PROFILE',
  waitTimeout: 10000,
  actions: [
    assertVisible(expectedName),
    tapButton('ConfirmProfile', 'continue-to-security-button'),
    // Retry if tap didn't register (navigation stack race)
    conditional('continue-to-security-button', tapButton('ConfirmProfile', 'continue-to-security-button')),
  ],
});

/** Add companions screen — skip (solo traveler) */
const addCompanionsSkipStep = () => screenStep('AddCompanions', {
  comment: 'ADD COMPANIONS — SKIP',
  actions: [
    tapText('Skip for now'),
  ],
});

/** Biometric setup screen — skip (buttons visible without scroll) */
const biometricSkipStep = () => screenStep('BiometricSetup', {
  comment: 'BIOMETRIC SETUP — SKIP',
  actions: [
    tap('skip-biometric-button', { scroll: false }),
    handleAlert('BiometricSetup', 'skip-biometric-button'),
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
const notificationAndTripListStep = () => screenStep('NotificationPermission', {
  comment: 'NOTIFICATION PERMISSION + TRIP LIST',
  waitFor: null,  // No waitFor — screen may auto-skip
  actions: [
    // If notification screen appears, skip it
    conditional('Stay on Top of Deadlines', tapButton('NotificationPermission', 'skip-notifications-button')),
    // If it doesn't appear yet, try the skip button directly (screen may be rendering)
    conditional('skip-notifications-button', tapButton('NotificationPermission', 'skip-notifications-button')),
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
