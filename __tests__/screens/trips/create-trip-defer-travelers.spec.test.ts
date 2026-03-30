import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

/**
 * Spec: Trip creation should not show traveler selection before destinations are added.
 * Context: .context/external/cognitive/fewer-fields-higher-completion.md
 * Found by ux-audit: create-trip-initial screenshot shows "Who's Traveling?" section
 * with traveler selection BEFORE any destinations are added. This is premature —
 * travelers should be assigned after destinations, or on the trip detail screen.
 *
 * Current state: Traveler section visible on initial create trip screen
 * Gap: Show only trip name + destinations initially, defer travelers to after creation
 */
test.skip('CreateTripScreen does not show traveler section before destinations', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/screens/trips/CreateTripScreen/CreateTripScreen.tsx'),
    'utf-8',
  );

  // The traveler section should not render when legs array is empty
  // or should be moved to trip detail screen
  expect(content).toMatch(
    /legs\.length\s*[>!]|hasDestinations|traveler.*after.*destination/i,
  );
});
