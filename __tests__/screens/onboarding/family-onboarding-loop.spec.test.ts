// Spec: Family onboarding loop — scan multiple passports during onboarding.
//
// After scanning the first passport, offer "Add Another Traveler" or "Done".
// Tapping Add Another loops back to scan. After all scans, show a Family
// Summary with green-outlined primary profile (tappable to change).
// Continue completes onboarding.
//
// No relationship selector — customs forms don't ask for it.
//
// Status: hypothesis
// Confirm: Family of 4 can onboard by scanning 4 passports in sequence
// Invalidate: Multi-passport onboarding is too complex for the scan screen

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

test.skip('usePassportScan has an "add_another" mode after first confirm', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/hooks/usePassportScan.ts'),
    'utf-8',
  );
  expect(content).toMatch(/add_another/);
});

test.skip('PassportScanScreen renders Add Another prompt after first confirm', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/screens/onboarding/PassportScanScreen/PassportScanScreen.tsx'),
    'utf-8',
  );
  expect(content).toMatch(/Add Another/i);
  expect(content).toMatch(/Done/);
});

test.skip('usePassportScan tracks scannedProfiles array', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/hooks/usePassportScan.ts'),
    'utf-8',
  );
  expect(content).toMatch(/scannedProfiles|familyMembers|addedProfiles/);
});

test.skip('Family Summary screen shows all scanned profiles after Done', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/screens/onboarding/PassportScanScreen/PassportScanScreen.tsx'),
    'utf-8',
  );
  expect(content).toMatch(/family_summary|FamilySummary/);
});

test.skip('primary profile card has green outline in Family Summary', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/screens/onboarding/PassportScanScreen/PassportScanScreen.tsx'),
    'utf-8',
  );
  expect(content).toMatch(/border-green|green.*border|isPrimary.*green/);
});

test.skip('tapping a non-primary profile in summary changes the primary', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/hooks/usePassportScan.ts'),
    'utf-8',
  );
  expect(content).toMatch(/setPrimary|changePrimary|switchPrimary/);
});

test.skip('solo traveler skips Family Summary — Done goes straight to app', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/hooks/usePassportScan.ts'),
    'utf-8',
  );
  expect(content).toMatch(/scannedProfiles\.length.*[<=]=.*1|addedProfiles\.length.*[<=]=.*1/);
});
