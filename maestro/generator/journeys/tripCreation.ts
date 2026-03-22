/**
 * Trip creation journey definitions.
 *
 * These assume onboarding is already complete (reuse onboarding steps).
 */
import {
  journey, step,
  tap, fill, select, date, alert, swipe, inputText,
  assertVisible, assertVisibleID, conditional, tapText,
} from '../dsl';

// Import shared onboarding steps
import { onboardingManual } from './onboarding';

/**
 * Create a Japan trip from the empty trip list.
 *
 * Only fills required fields (country, arrival date, accommodation)
 * to keep the flow short and avoid deep-scroll issues in Maestro.
 * Optional fields (flight number, airport, departure date) are skipped.
 */
const createJapanTrip = () => step('CreateTrip', {
  comment: 'CREATE TRIP — JAPAN',
  waitFor: 'Create New Trip',
  actions: [
    // Fill trip name first (at top, no scrolling needed)
    fill('trip-name-input', 'Japan Trip 2026'),
    // Add a destination leg
    tap('add-destination-button'),
    // Select Japan: open dropdown, type search, select first result.
    // The SearchableSelect inline dropdown renders below the trigger.
    // At this nesting depth, Maestro can't reliably tap FlatList items
    // by id or text, so we use pressKey Enter to dismiss the keyboard
    // then tap the filtered option which should be the only visible one.
    tap('country-select-0-trigger'),
    tap('country-select-0-search'),
    inputText('Jap'),
    // Dismiss keyboard so the option is easier to tap
    swipe('50%,40%', '50%,38%', 150),
    // Tap the Japan option by id
    tap('country-select-0-option-JPN'),
    // Arrival date (required) — tap field then confirm default date
    date('leg-0-arrival-date'),
    // Accommodation name (required)
    fill('leg-0-accommodation-name', 'Park Hyatt Tokyo'),
    // Create the trip
    tap('create-trip-button'),
    // Dismiss success alert
    alert('Success', 'OK'),
  ],
});

/** Verify trip detail screen after creation */
const tripDetailStep = () => step('TripDetail', {
  comment: 'TRIP DETAIL — VERIFY',
  waitFor: 'Itinerary',
  waitTimeout: 15000,
  actions: [
    assertVisibleID('leg-card-JPN'),
  ],
});

// ── Exported journeys ──

export const fullJourneyWithTrip = journey('full-journey-trip', {
  description: 'Full journey: onboarding + create Japan trip + verify trip detail',
  clearState: true,
  tags: ['trip', 'critical'],
  steps: [
    // Reuse onboarding steps (minus the trip list assertion)
    ...onboardingManual.steps.slice(0, -1),
    // From trip list, create a trip
    step('TripList', {
      comment: 'TRIP LIST — CREATE FIRST TRIP',
      waitFor: 'Your Trips',
      waitTimeout: 30000,
      actions: [
        tap('create-first-trip-button'),
      ],
    }),
    createJapanTrip(),
    tripDetailStep(),
  ],
});
