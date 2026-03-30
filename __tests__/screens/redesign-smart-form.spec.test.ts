import { existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Spec: Step 3 — Smart form showing only unfilled fields for all countries.
 *
 * One continuous form grouped by country. Only shows fields that the
 * profile doesn't already have. Smart delta is the ONLY mode — no
 * "show all" toggle. Progressive save-back to profile.
 *
 * Example: Going to Malaysia + Japan.
 *   "Malaysia — 3 fields needed" (email, phone, accommodation)
 *   "Japan — 5 fields needed" (address, occupation, accommodation, ...)
 *
 * Confirm: Single-page form is faster than per-country form screens
 * Invalidate: Too many fields for multiple countries overwhelm the user
 */

test.skip('SmartForm screen exists', () => {
  expect(existsSync(
    resolve(ROOT, 'src/screens/forms/SmartFormScreen'),
  )).toBe(true);
});

test.skip('SmartForm shows fields grouped by country', () => {
  // Country headers: "Malaysia — N fields needed"
  // Fields listed under each country
  // Only unfilled fields shown (smart delta is the only mode)
});

test.skip('SmartForm has no "show all" toggle', () => {
  // Smart delta is the default AND only mode
  // No button to show auto-filled fields
});

test.skip('SmartForm saves values back to profile', () => {
  // Uses profileSaveBack service (already built)
  // After filling email for Malaysia, Japan form auto-fills it
});

test.skip('SmartForm validates inline', () => {
  // Required field validation shown inline, not as a modal
  // Expired dates highlighted with warning
});

test.skip('SmartForm CTA is "Done" in footer', () => {
  // When all required fields are filled, CTA says "Done"
  // Navigates to Portal Links screen
});
