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

test('QR image fallback requires nearby QR-related text, not just square shape', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/services/automation/qrDetection.ts'),
    'utf-8',
  );
  // The fallback (C) square-image detection must check for QR context text
  // in parent elements — not just any square image
  expect(content).toMatch(/hasQRContext|qr.*context|nearQRText/);
  expect(content).toMatch(/qr\|barcode\|scan.*code/);
});
