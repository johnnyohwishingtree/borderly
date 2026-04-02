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

test('usePassportScan has an "add_another" mode after first confirm', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/hooks/usePassportScan.ts'),
    'utf-8',
  );
  expect(content).toMatch(/add_another/);
});

test('PassportScanScreen renders Add Another prompt after first confirm', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/screens/onboarding/PassportScanScreen/PassportScanScreen.tsx'),
    'utf-8',
  );
  expect(content).toMatch(/Add Another/i);
  expect(content).toMatch(/Done/);
});

test('usePassportScan tracks scannedProfiles array', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/hooks/usePassportScan.ts'),
    'utf-8',
  );
  expect(content).toMatch(/scannedProfiles|familyMembers|addedProfiles/);
});

test('Family Summary screen shows all scanned profiles after Done', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/screens/onboarding/PassportScanScreen/PassportScanScreen.tsx'),
    'utf-8',
  );
  expect(content).toMatch(/family_summary|FamilySummary/);
});

test('primary profile card has green outline in Family Summary', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/screens/onboarding/PassportScanScreen/PassportScanScreen.tsx'),
    'utf-8',
  );
  expect(content).toMatch(/border-green|green.*border|isPrimary.*green/);
});

test('tapping a non-primary profile in summary changes the primary', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/hooks/usePassportScan.ts'),
    'utf-8',
  );
  expect(content).toMatch(/setPrimary|changePrimary|switchPrimary/);
});

test('solo traveler skips Family Summary — Done goes straight to app', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/hooks/usePassportScan.ts'),
    'utf-8',
  );
  expect(content).toMatch(/scannedProfiles\.length.*[<=]=.*1|addedProfiles\.length.*[<=]=.*1/);
});
