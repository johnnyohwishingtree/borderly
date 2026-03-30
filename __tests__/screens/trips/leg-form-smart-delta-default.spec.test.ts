import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

/**
 * Spec: Leg form should show only unfilled fields by default (Smart Delta mode).
 * Context: .context/external/cognitive/fewer-fields-higher-completion.md
 * Context: .context/external/customer/users-wont-verify-auto-filled-values-carefully.md
 * Found by ux-audit: leg-form-initial screenshot shows form statistics (Total: 21,
 * Auto-filled: 12, Remaining: 9) instead of the actual fields. User must tap
 * "Smart Delta" to see only what they need to fill. This should be the default.
 *
 * Current state: Form starts in summary view, user taps Smart Delta to filter
 * Gap: Form should start in Smart Delta mode showing only unfilled fields
 */
test.skip('LegFormScreen defaults to smart delta (unfilled fields only)', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/screens/trips/LegFormScreen/LegFormScreen.tsx'),
    'utf-8',
  );

  // The initial state should show filtered/smart-delta view, not full form summary
  // Look for default state being 'delta' or 'unfilled' rather than 'all' or 'summary'
  expect(content).toMatch(/initialMode.*?delta|defaultMode.*?delta|showOnlyUnfilled.*?true/);
});
