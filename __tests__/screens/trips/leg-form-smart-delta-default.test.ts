import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

/**
 * Spec: Leg form should show only unfilled fields by default (Smart Delta mode).
 * Context: .context/external/cognitive/fewer-fields-higher-completion.md
 * Context: .context/external/customer/users-wont-verify-auto-filled-values-carefully.md
 * Found by ux-audit: leg-form-initial screenshot showed form statistics instead of
 * fields. Smart Delta (country-specific only) is now the default view.
 *
 * Current state: showOnlyCountrySpecific defaults to true
 * Confirm: Form completion rate improves with fewer visible fields
 */
test('LegFormScreen defaults to smart delta (unfilled fields only)', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/screens/trips/LegFormScreen/LegFormScreen.tsx'),
    'utf-8',
  );

  // The initial state for showOnlyCountrySpecific should be true (smart delta mode)
  expect(content).toMatch(/useState\(\s*true\s*\)/);
});
