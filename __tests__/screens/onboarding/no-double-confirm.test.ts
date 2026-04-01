// Test: Passport confirm must complete onboarding directly, not navigate
// to a second confirmation screen.
//
// PassportPreview "Confirm & Continue" shows all passport data. Navigating
// to ConfirmProfileScreen to show the same data again is redundant bloat.
// After save, just call setOnboardingComplete(true).

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

test('saveProfileData completes onboarding directly, no ConfirmProfile navigation', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/hooks/usePassportScan.ts'),
    'utf-8',
  );

  // Must call setOnboardingComplete after save (not navigate to ConfirmProfile)
  expect(content).toMatch(/setOnboardingComplete\(true\)/);

  // Must NOT navigate to ConfirmProfile
  expect(content).not.toMatch(/navigate.*ConfirmProfile/);
});
