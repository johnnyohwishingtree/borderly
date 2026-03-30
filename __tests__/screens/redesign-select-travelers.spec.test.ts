import { existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Spec: Step 2 — "Who's traveling?" screen.
 *
 * Shows existing profiles with passport data. Option to add new
 * traveler via passport scan. Validates passport expiry here —
 * warns if passport expires within 6 months of travel.
 *
 * Only shown if family members exist. Solo travelers skip this step.
 *
 * Confirm: Passport validation at this step prevents portal rejection
 * Invalidate: Passport validation belongs at form submission time
 */

test.skip('SelectTravelers screen exists', () => {
  expect(existsSync(
    resolve(ROOT, 'src/screens/forms/SelectTravelersScreen'),
  )).toBe(true);
});

test.skip('SelectTravelers shows existing profiles', () => {
  // Each profile shows: name, nationality, passport expiry
  // Selectable via checkbox/toggle
});

test.skip('SelectTravelers has add new traveler option', () => {
  // "Add traveler" button opens passport scan
});

test.skip('SelectTravelers validates passport expiry inline', () => {
  // If passport expires within 6 months, show warning badge
  // Don't block — just warn
});

test.skip('SelectTravelers is skipped for solo travelers', () => {
  // If only one profile exists, go directly from countries to form
});
