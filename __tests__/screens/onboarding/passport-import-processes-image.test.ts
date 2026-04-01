// Test: Passport "Import from Photo" must process the selected image,
// not show a "coming soon" stub.
//
// When a user picks a passport photo, the app should scan the QR code
// (which encodes MRZ text) and parse it into passport data, then call
// scan.handleSuccess with the result.

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

test('passport Import from Photo processes image instead of showing stub message', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/screens/onboarding/PassportScanScreen/PassportScanScreen.tsx'),
    'utf-8',
  );

  // Must NOT contain "coming soon" or TODO stub
  expect(content).not.toMatch(/coming soon/i);
  expect(content).not.toMatch(/TODO.*MRZ/);

  // Must call scan.handleSuccess or equivalent after processing
  expect(content).toMatch(/selectImageFromLibrary[\s\S]*?scan\.handleSuccess|ImageBarcodeScanner|parseMRZ/);
});
