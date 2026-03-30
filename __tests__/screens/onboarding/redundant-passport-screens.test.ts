import { readdirSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

/**
 * Spec: Passport data should be confirmed on one screen, not two.
 * Context: .context/external/cognitive/fewer-fields-higher-completion.md
 * Found by ux-audit: Both passport-preview and confirm-profile screenshots display
 * the same passport data in different layouts. Two review screens for the same info
 * adds a redundant step to onboarding.
 *
 * Current state: PassportScanScreen shows preview, then ConfirmProfileScreen shows same data again
 * Gap: Merge passport preview into confirm profile, or skip confirm if scan confidence is high
 */
test('onboarding does not have redundant passport display screens', () => {
  // There should not be both a "preview" step and a "confirm" step showing the same data
  const onboardingScreens = readdirSync(
    resolve(ROOT, 'src/screens/onboarding'),
  );

  const passportDisplayScreens = onboardingScreens.filter(
    (s) => s.includes('Confirm') || s.includes('Preview'),
  );

  // At most one screen should display passport details for confirmation
  expect(passportDisplayScreens.length).toBeLessThanOrEqual(1);
});
