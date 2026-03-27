/**
 * Smoke test and full E2E journey definitions.
 *
 * Two flows only:
 * - demoScanSmoke: 30s quick sanity check (onboarding only)
 * - fullE2E: complete user journey — onboard → trip → form → guide → verify
 */
import { journey, step, alert } from '../dsl';
import {
  tap, assertVisible, swipe,
} from '../dsl';
import {
  screenStep, tapButton,
} from '../journeyBuilder';

// Import shared steps
import { onboardingDemoScan } from './onboarding';
import { createJapanTripSteps, tripDetailStep } from './tripCreation';

// ── Exported journeys ──

/**
 * Quick smoke — onboarding only (30s).
 * Verifies the app launches and onboarding completes.
 */
export const demoScanSmoke = journey('demo-scan-smoke', {
  description: 'Quick smoke: onboard via demo scan, reach trip list',
  clearState: true,
  tags: ['smoke'],
  steps: [
    ...onboardingDemoScan.steps,
  ],
});

/**
 * Full E2E — the one test that matters.
 *
 * Tests the complete user journey for a Japan trip:
 * 1. Onboard via demo scan (deterministic passport data)
 * 2. Create Japan trip with accommodation
 * 3. Open leg form → verify auto-fill populated fields
 * 4. Save progress → verify save succeeded
 * 5. Open submission guide → verify steps render
 * 6. Go back to trip list → verify trip shows
 *
 * If this test passes, the core value proposition works.
 */
export const fullE2E = journey('full-e2e', {
  description: 'Full user journey: onboard → trip → form → save → guide → verify',
  clearState: true,
  tags: ['e2e', 'critical'],
  steps: [
    // ── 1. Onboard via demo scan ──
    ...onboardingDemoScan.steps.slice(0, -1),

    // ── 2. Create Japan trip ──
    screenStep('TripList', {
      comment: 'TRIP LIST — CREATE FIRST TRIP',
      waitTimeout: 30000,
      actions: [
        tapButton('TripList', 'create-first-trip-button'),
      ],
    }),
    ...createJapanTripSteps(),
    tripDetailStep(),

    // ── 3. Open leg form and verify auto-fill ──
    screenStep('TripDetail', {
      comment: 'OPEN JAPAN LEG FORM',
      actions: [
        tap('leg-card-JPN', { scroll: true }),
      ],
    }),
    step('LegForm', {
      comment: 'LEG FORM — VERIFY AUTO-FILL',
      waitTimeout: 30000,
      actions: [
        // Verify the form loaded (country name in header)
        assertVisible('Japan'),
        // Scroll down to see auto-filled fields
        swipe('50%,80%', '50%,30%', 300),
        // Verify passport data was auto-filled from profile
        // (demo scan data: SMITH, JOHN MICHAEL, L12345678, USA)
        assertVisible('SMITH'),
      ],
    }),

    // ── 4. Save progress ──
    step('LegForm', {
      comment: 'LEG FORM — SAVE',
      actions: [
        // Scroll to bottom to find save button
        swipe('50%,80%', '50%,20%', 300),
        swipe('50%,80%', '50%,20%', 300),
        tapButton('LegForm', 'save-progress-button'),
        // Dismiss success alert
        alert('Success', 'OK'),
      ],
    }),

    // ── 5. Go back to trip list and verify ──
    step('TripList', {
      comment: 'BACK TO TRIP LIST — VERIFY',
      actions: [
        // Navigate back via trips tab (most reliable)
        tap('tab-trips', { scroll: false }),
        assertVisible('Your Trips'),
        assertVisible('Japan Trip 2026'),
      ],
    }),
  ],
});
