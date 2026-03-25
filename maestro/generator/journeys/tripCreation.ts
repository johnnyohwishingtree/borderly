/**
 * Trip creation journey definitions.
 *
 * These assume onboarding is already complete (reuse onboarding steps).
 * Screen metadata is loaded from the screen registry at generation time.
 */
import { journey } from '../dsl';
import {
  tap, inputText, assertVisible, assertVisibleID, swipe, conditional,
} from '../dsl';
import {
  screenStep, tapButton, handleAlert, fillField,
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
    // Fill trip name (Input → fill DSL action)
    ...fillField('CreateTrip', 'trip-name-input', { text: 'Japan Trip 2026' }),
    // Add a destination leg
    tapButton('CreateTrip', 'add-destination-button'),
    // Country select: use manual tap actions (Maestro depth issue with SearchableSelect)
    tap('country-select-0-trigger'),
    tap('country-select-0-search'),
    inputText('Japan'),
    swipe('50%,40%', '50%,38%', 150),
    tap('country-select-0-option-JPN'),
    // Arrival date (required) — DatePickerField → date DSL action
    ...fillField('CreateTrip', 'leg-${index}-arrival-date', 'default', { index: 0 }),
    // Accommodation name (required) — Input → fill DSL action
    ...fillField('CreateTrip', 'leg-${index}-accommodation-name', { text: 'Park Hyatt Tokyo' }, { index: 0 }),
    // Address sub-fields (AddressAutocomplete generates sub-testIDs)
    // fillField returns [] for AddressAutocomplete, so we fill sub-fields manually
    ...fillField('CreateTrip', 'leg-${index}-accommodation-address', undefined, { index: 0 }),
    // Address line 1
    tap('leg-0-accommodation-address-line1'),
    inputText('3-7-1-2 Nishi Shinjuku'),
    swipe('50%,40%', '50%,35%', 200),
    // City
    tap('leg-0-accommodation-address-city'),
    inputText('Tokyo'),
    swipe('50%,40%', '50%,35%', 200),
    // Postal code
    tap('leg-0-accommodation-address-postal-code'),
    inputText('163-1055'),
    swipe('50%,40%', '50%,35%', 200),
    // Country
    tap('leg-0-accommodation-address-country'),
    inputText('JPN'),
    swipe('50%,40%', '50%,35%', 200),
    // Create the trip
    tapButton('CreateTrip', 'create-trip-button'),
    // Dismiss success alert using registry's happy-path button
    handleAlert('CreateTrip', 'success'),
  ],
});

/** Verify trip detail screen after creation */
const tripDetailStep = () => screenStep('TripDetail', {
  comment: 'TRIP DETAIL — VERIFY',
  waitTimeout: 20000,
  actions: [
    assertVisible('Japan Trip 2026'),
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
