/**
 * Trip creation journey definitions.
 *
 * These assume onboarding is already complete (reuse onboarding steps).
 * Screen metadata is loaded from the screen registry at generation time.
 */
import { journey } from '../dsl';
import {
  tap, inputText, assertVisibleID, swipe,
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
 * Only fills required fields (country, arrival date, accommodation)
 * to keep the flow short and avoid deep-scroll issues in Maestro.
 */
const createJapanTrip = () => screenStep('CreateTrip', {
  comment: 'CREATE TRIP — JAPAN',
  actions: [
    // Fill trip name (Input → fill DSL action)
    ...fillField('CreateTrip', 'trip-name-input', { text: 'Japan Trip 2026' }),
    // Add a destination leg
    tapButton('CreateTrip', 'add-destination-button'),
    // Country select: SearchableSelect requires raw actions at this nesting depth
    // because Maestro's XCTest driver can't reliably find FlatList items.
    // The select() DSL works for shallower nesting, but CreateTrip is deep
    // (Tab > Stack > Screen > ScrollView > Form), so we use manual actions.
    tap('country-select-0-trigger'),
    tap('country-select-0-search'),
    inputText('Jap'),
    // Dismiss keyboard so the option is easier to tap
    swipe('50%,40%', '50%,38%', 150),
    // Tap the Japan option by id
    tap('country-select-0-option-JPN'),
    // Arrival date (required) — DatePickerField → date DSL action
    ...fillField('CreateTrip', 'leg-${index}-arrival-date', 'default', { index: 0 }),
    // Accommodation name (required) — Input → fill DSL action
    ...fillField('CreateTrip', 'leg-${index}-accommodation-name', { text: 'Park Hyatt Tokyo' }, { index: 0 }),
    // Create the trip
    tapButton('CreateTrip', 'create-trip-button'),
    // Dismiss success alert using registry's happy-path button
    handleAlert('CreateTrip', 'success'),
  ],
});

/** Verify trip detail screen after creation */
const tripDetailStep = () => screenStep('TripDetail', {
  comment: 'TRIP DETAIL — VERIFY',
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
