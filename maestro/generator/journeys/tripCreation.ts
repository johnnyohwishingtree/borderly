/**
 * Trip creation journey definitions.
 *
 * These assume onboarding is already complete (reuse onboarding steps).
 * Screen metadata is loaded from the screen registry at generation time.
 */
import { journey, date, fill, alert } from '../dsl';
import {
  tap, inputText, assertVisible, assertVisibleID, swipe,
} from '../dsl';
import {
  screenStep, tapButton,
} from '../journeyBuilder';

// Import shared onboarding steps
import { onboardingManual } from './onboarding';

/**
 * Create a Japan trip from the empty trip list.
 *
 * Uses fillField to auto-determine the correct interaction pattern for each
 * field based on its componentType in the registry (Input → fill, SearchableSelect
 * → select, DatePickerField → date).
 *
 * Fills all required fields + address sub-fields to avoid validation errors.
 */
const createJapanTrip = () => screenStep('CreateTrip', {
  comment: 'CREATE TRIP — JAPAN',
  actions: [
    // Trip name
    fill('trip-name-field', 'Japan Trip 2026'),
    // Add destination
    tapButton('CreateTrip', 'add-destination-button'),
    // Country select (manual — Maestro depth issue with SearchableSelect)
    tap('country-select-0-trigger', { scroll: true }),
    tap('country-select-0-search', { scroll: true }),
    inputText('Japan'),
    swipe('50%,40%', '50%,38%', 150),
    tap('country-select-0-option-JPN'),
    // Arrival date
    date('leg-0-arrival-date'),
    // Accommodation
    fill('leg-0-accommodation-name', 'Park Hyatt Tokyo'),
    // Address sub-fields
    fill('leg-0-accommodation-address-line1', '3-7-1-2 Nishi Shinjuku'),
    fill('leg-0-accommodation-address-city', 'Tokyo'),
    fill('leg-0-accommodation-address-postal-code', '163-1055'),
    fill('leg-0-accommodation-address-country', 'JPN'),
    // Create
    tapButton('CreateTrip', 'create-trip-button'),
    // Dismiss success alert
    alert('Success', 'OK'),
  ],
});

/** Verify trip detail screen after creation */
export const tripDetailStep = () => screenStep('TripDetail', {
  comment: 'TRIP DETAIL — VERIFY',
  waitTimeout: 20000,
  actions: [
    assertVisible('Japan Trip 2026'),
    assertVisibleID('leg-card-JPN'),
  ],
});

/** Reusable: create Japan trip steps (for composition in other journeys) */
export const createJapanTripSteps = () => [createJapanTrip()];

// ── Exported journeys ──

export const fullJourneyWithTrip = journey('full-journey-trip', {
  description: 'Full journey: onboarding + create Japan trip + verify trip detail',
  clearState: true,
  tags: ['trip', 'critical'],
  steps: [
    // Reuse onboarding steps (minus the trip list assertion)
    ...onboardingManual.steps.slice(0, -1),
    // From trip list, create a trip
    screenStep('TripList', {
      comment: 'TRIP LIST — CREATE FIRST TRIP',
      waitTimeout: 30000,
      actions: [
        tapButton('TripList', 'create-first-trip-button'),
      ],
    }),
    createJapanTrip(),
    tripDetailStep(),
  ],
});
