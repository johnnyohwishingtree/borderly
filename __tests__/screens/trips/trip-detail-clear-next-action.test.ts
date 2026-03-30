import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

/**
 * Spec: Trip detail should have one clear primary CTA based on trip state.
 * Context: .context/external/cognitive/fewer-fields-higher-completion.md
 * Found by ux-audit: trip-detail screenshot shows competing sections — status badge,
 * progress bars, "3 items need attention" (vague), pre-trip setup, pre-departure
 * checklist, itinerary — all at same visual weight. No single clear next action.
 *
 * Current state: Multiple sections compete for attention, no primary CTA
 * Gap: Should have a single prominent "next step" CTA (e.g., "Fill Malaysia Form")
 */
test('TripDetailScreen has a primary action button in footer zone', () => {
  const testIDs = require(resolve(
    ROOT,
    'src/screens/trips/TripDetailScreen/testIDs.ts',
  ));

  const ids = Object.values(testIDs.TRIP_DETAIL_IDS) as Array<{ type: string; zone?: string }>;
  const footerButtons = ids.filter(
    (id) => id.type === 'button' && id.zone === 'footer',
  );

  expect(footerButtons.length).toBeGreaterThanOrEqual(1);
});
