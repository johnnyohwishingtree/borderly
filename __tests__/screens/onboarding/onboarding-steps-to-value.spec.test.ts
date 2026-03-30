import { readdirSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

/**
 * Spec: Onboarding should be 3 screens or fewer before reaching the main app.
 * Context: .context/external/customer/travelers-fill-forms-at-borders.md
 * Found by ux-audit: 4-6 screens before first value (Welcome → Scan → Preview →
 * Confirm → Companions → Biometric → Trip List). Companions and Biometric can be
 * deferred. Tutorial can be removed.
 *
 * Current state: 6 onboarding screens in src/screens/onboarding/
 * Gap: Should be 3 max (Welcome → Scan → Confirm → done)
 */
test.skip('onboarding has at most 3 screens before main app', () => {
  const onboardingScreens = readdirSync(
    resolve(ROOT, 'src/screens/onboarding'),
  ).filter(f => f.endsWith('Screen'));

  // Welcome, PassportScan, ConfirmProfile — everything else is deferred
  expect(onboardingScreens.length).toBeLessThanOrEqual(3);
});
