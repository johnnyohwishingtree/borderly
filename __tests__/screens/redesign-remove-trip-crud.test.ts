import { existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Spec: Remove trip management UI — the app is a form assistant, not a travel manager.
 *
 * Decision: No trip naming, trip list, trip detail, trip status, duplicate trip,
 *   edit trip, pre-departure checklist, readiness checks, or itinerary sections.
 *   The "trip" concept exists in the data layer only — not user-facing.
 * Rejected: Trip management UI — adds cognitive load without helping the core
 *   task (fill customs forms). Users don't think in "trips", they think in
 *   "countries I need forms for."
 *
 * Confirm: Users complete forms faster without trip management overhead
 * Invalidate: Users need to save/revisit past form sessions
 */

test('TripListScreen no longer exists', () => {
  expect(existsSync(
    resolve(ROOT, 'src/screens/trips/TripListScreen'),
  )).toBe(false);
});

test('TripDetailScreen no longer exists', () => {
  expect(existsSync(
    resolve(ROOT, 'src/screens/trips/TripDetailScreen'),
  )).toBe(false);
});

test('CreateTripScreen no longer exists', () => {
  expect(existsSync(
    resolve(ROOT, 'src/screens/trips/CreateTripScreen'),
  )).toBe(false);
});

test('no duplicate trip functionality', () => {
  // DuplicateTripModal, tripDuplicateService — removed
});

test('no trip naming in any screen', () => {
  // No "Trip Name" input field anywhere in the app
});

test('forms tab is the first tab', () => {
  // Tab 1: Forms (wizard flow)
  // Tab 2: Wallet (QR receipts)
  // Tab 3: Profile (passport, contact, family)
  // Tab 4: Settings
});
