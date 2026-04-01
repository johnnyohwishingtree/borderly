// Test: Passport scan "Import from Photo" must not be inside MRZScanner Modal.
//
// Same bug as boarding pass: react-native-image-picker crashes inside Modal
// ("Couldn't find navigation context"). The PassportScanScreen must handle
// the action sheet (Camera / Import / Manual) at screen level, and only
// open the Modal for camera scanning.
//
// Also: MRZScanner must be camera-only (no action sheet UI inside it).

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

test('PassportScanScreen handles photo import at screen level, not inside Modal', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/screens/onboarding/PassportScanScreen/PassportScanScreen.tsx'),
    'utf-8',
  );

  // Screen must import and call importBoardingPassFromImage or equivalent MRZ import
  // OR use Alert.alert to present action sheet before opening Modal
  expect(content).toMatch(/Alert\.alert|ActionSheet/);
});

test('MRZScanner component does not contain action sheet or photo import UI', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/components/passport/MRZScanner.tsx'),
    'utf-8',
  );

  // MRZScanner should be camera-only — no "choose" mode, no action sheet in JSX
  expect(content).not.toMatch(/scanMode.*choose/);
  // No "Import from Photo" button rendered in JSX (comments don't count)
  expect(content).not.toMatch(/title="Import from Photo"/);
});
