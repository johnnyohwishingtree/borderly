/**
 * Smoke test journey definitions.
 *
 * Quick validation flows for CI and pre-merge checks.
 * Reuse onboarding and trip creation steps.
 */
import { journey, step } from '../dsl';
import {
  tap, assertVisible, assertVisibleID, swipe, inputText,
} from '../dsl';
import {
  screenStep, tapButton, fillField,
} from '../journeyBuilder';

// Import shared steps
import { onboardingManual, onboardingDemoScan } from './onboarding';
import { createJapanTripSteps, tripDetailStep } from './tripCreation';

// ── Exported journeys ──

/**
 * Basic smoke test — manual onboarding only.
 * Verifies the app launches and onboarding completes.
 */
export const smokeTest = journey('smoke-test', {
  description: 'Basic smoke: onboard via manual entry, reach trip list',
  clearState: true,
  tags: ['smoke'],
  steps: [
    ...onboardingManual.steps,
  ],
});

/**
 * Demo scan smoke test — faster onboarding via dev mode scan.
 */
export const demoScanSmoke = journey('demo-scan-smoke', {
  description: 'Fast smoke: onboard via demo scan, reach trip list',
  clearState: true,
  tags: ['smoke', 'demo'],
  steps: [
    ...onboardingDemoScan.steps,
  ],
});

/**
 * Trip and submit — full happy path through form submission.
 * Onboard → Create trip → Fill leg form → Save → Mark ready → Open guide
 */
export const tripAndSubmit = journey('trip-and-submit', {
  description: 'Full happy path: onboard, create trip, fill form, save, submit guide',
  clearState: true,
  tags: ['smoke', 'trip', 'critical'],
  steps: [
    // Onboard
    ...onboardingManual.steps.slice(0, -1),
    // Create trip from empty list
    screenStep('TripList', {
      comment: 'TRIP LIST — CREATE FIRST TRIP',
      waitTimeout: 30000,
      actions: [
        tapButton('TripList', 'create-first-trip-button'),
      ],
    }),
    ...createJapanTripSteps(),
    tripDetailStep(),
    // Open leg form
    screenStep('TripDetail', {
      comment: 'OPEN LEG FORM',
      actions: [
        tap('leg-card-JPN'),
      ],
    }),
    // Fill leg form fields and save
    screenStep('LegForm', {
      comment: 'LEG FORM — FILL AND SAVE',
      waitTimeout: 30000,
      actions: [
        // Scroll to dynamic form section
        swipe('50%,80%', '50%,30%', 300),
        // Save progress
        tapButton('LegForm', 'save-progress-button'),
      ],
    }),
    // Mark ready and open submission guide
    screenStep('LegForm', {
      comment: 'MARK READY + OPEN GUIDE',
      actions: [
        tapButton('LegForm', 'mark-ready-button'),
        tapButton('LegForm', 'open-submission-guide-button'),
      ],
    }),
    // Verify submission guide loads
    step('SubmissionGuide', {
      comment: 'SUBMISSION GUIDE — VERIFY',
      waitFor: 'Submission Guide',
      waitTimeout: 20000,
      actions: [
        assertVisible('Submission Guide'),
      ],
    }),
  ],
});
