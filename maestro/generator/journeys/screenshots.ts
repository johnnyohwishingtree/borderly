/**
 * Screenshot capture journey.
 *
 * Navigates through key screens capturing screenshots for visual audit.
 * Uses takeScreenshot action to save to maestro/output/.
 */
import { journey, step } from '../dsl';
import {
  tap, tapText, assertVisible, swipe,
} from '../dsl';
import {
  screenStep, tapButton,
} from '../journeyBuilder';
import type { Action } from '../types';

// Import shared steps
import { onboardingManual } from './onboarding';
import { createJapanTripSteps, tripDetailStep } from './tripCreation';

/** Take a screenshot with a numbered filename */
const screenshot = (name: string): Action => ({
  type: 'screenshot', name,
});

// ── Exported journeys ──

export const captureScreenshots = journey('capture-screenshots', {
  description: 'Navigate through all key screens and capture screenshots',
  clearState: true,
  tags: ['screenshots'],
  steps: [
    // Onboarding (captures welcome, tutorial, passport, confirm, companions, biometric)
    ...onboardingManual.steps,

    // Trip list (empty state)
    screenStep('TripList', {
      comment: 'SCREENSHOT — EMPTY TRIP LIST',
      actions: [
        assertVisible('No trips yet'),
        screenshot('01-trip-list-empty'),
        tapButton('TripList', 'create-first-trip-button'),
      ],
    }),

    // Create trip
    ...createJapanTripSteps(),

    // Trip detail
    tripDetailStep(),
    screenStep('TripDetail', {
      comment: 'SCREENSHOT — TRIP DETAIL',
      actions: [
        screenshot('02-trip-detail'),
        tap('leg-card-JPN'),
      ],
    }),

    // Leg form
    step('LegForm', {
      comment: 'SCREENSHOT — LEG FORM',
      waitTimeout: 30000,
      actions: [
        screenshot('03-leg-form'),
        tapText('Back'),
      ],
    }),

    // Wallet tab
    step('QRWallet', {
      comment: 'SCREENSHOT — QR WALLET',
      actions: [
        tap('tab-wallet'),
        screenshot('04-qr-wallet'),
      ],
    }),

    // Profile tab
    step('Profile', {
      comment: 'SCREENSHOT — PROFILE',
      actions: [
        tap('tab-profile'),
        screenshot('05-profile'),
      ],
    }),

    // Settings
    step('Settings', {
      comment: 'SCREENSHOT — SETTINGS',
      actions: [
        tap('tab-settings'),
        screenshot('06-settings'),
      ],
    }),
  ],
});
