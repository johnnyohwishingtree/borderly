// Test: Passport "Import from Photo" must actually open the photo library.
//
// Currently it calls scan.handleManualEntry which just switches to the
// manual form — it never opens the photo picker. The user expects to
// pick a photo of their passport and have the MRZ scanned from it.

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

test('passport Import from Photo calls image picker, not manual entry', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/screens/onboarding/PassportScanScreen/PassportScanScreen.tsx'),
    'utf-8',
  );

  // Must import selectImageFromLibrary
  expect(content).toMatch(/selectImageFromLibrary/);

  // The "Import from Photo" handler must call selectImageFromLibrary
  expect(content).toMatch(/Import from Photo[\s\S]*?selectImageFromLibrary/);
});
