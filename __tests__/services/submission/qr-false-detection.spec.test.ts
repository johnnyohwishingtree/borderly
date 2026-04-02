// Spec: QR code detection must not trigger on pages without actual QR codes.
//
// The portal WebView detects "QR codes" on every page even when there
// are none — likely matching generic images or SVG elements as QR.
// The detection needs to be more precise.
//
// Status: hypothesis
// Confirm: QR detection only fires on pages with actual QR barcodes
// Invalidate: Detection is inherently noisy and can't be tightened

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

test.skip('QR detection requires a minimum confidence or image analysis', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/services/submission/submissionCoordinator.ts'),
    'utf-8',
  );
  // Must have stricter QR detection criteria
  expect(content).toMatch(/qr.*confidence|qr.*threshold|qr.*validate/i);
});
