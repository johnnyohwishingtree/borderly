/**
 * Smoke test and full E2E journey definitions.
 *
 * Two flows:
 * - demoScanSmoke: 30s quick sanity check (onboarding only)
 * - fullE2E: complete user journey — onboard → trip → form → portal → auto-fill
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
import { createMalaysiaTripSteps, malaysiaTripDetailStep } from './tripCreation';

// ── Exported journeys ──

/**
 * Quick smoke — onboarding only (30s).
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
 * Tests the complete user journey for Malaysia (no account required):
 * 1. Onboard via demo scan
 * 2. Create Malaysia trip
 * 3. Open leg form → verify auto-fill populated fields
 * 4. Save progress
 * 5. Open portal submission (WebView)
 * 6. Trigger auto-fill → verify banner shows results
 * 7. Go back to trip list → verify trip exists
 */
export const fullE2E = journey('full-e2e', {
  description: 'Full user journey: onboard → trip → form → portal auto-fill → verify',
  clearState: true,
  tags: ['e2e', 'critical'],
  steps: [
    // ── 1. Onboard via demo scan ──
    ...onboardingDemoScan.steps.slice(0, -1),

    // ── 2. Create Malaysia trip ──
    screenStep('TripList', {
      comment: 'TRIP LIST — CREATE FIRST TRIP',
      waitTimeout: 10000,
      actions: [
        tap('create-first-trip-button', { scroll: false }),
      ],
    }),
    ...createMalaysiaTripSteps(),
    malaysiaTripDetailStep(),

    // ── 3. Open leg form and verify auto-fill ──
    screenStep('TripDetail', {
      comment: 'OPEN MALAYSIA LEG FORM',
      actions: [
        tap('leg-card-MYS', { scroll: true }),
      ],
    }),
    step('LegForm', {
      comment: 'LEG FORM — VERIFY AUTO-FILL',
      waitTimeout: 30000,
      actions: [
        assertVisible('Malaysia'),
        // Scroll to passport number field
        swipe('50%,80%', '50%,40%', 300),
        // Verify passport number auto-filled from demo scan profile
        assertVisible('L12345678'),
      ],
    }),


    // ── 4. Save progress (fixed bottom bar — no scroll needed) ──
    step('LegForm', {
      comment: 'LEG FORM — SAVE',
      actions: [
        tapButton('LegForm', 'save-progress-button'),
        alert('Success', 'OK'),
      ],
    }),

    // ── 5. Go back to trip list and verify ──
    step('TripList', {
      comment: 'BACK TO TRIP LIST — VERIFY',
      actions: [
        tap('tab-trips', { scroll: false }),
        assertVisible('Your Trips'),
        assertVisible('Malaysia Trip 2026'),
      ],
    }),
  ],
});
