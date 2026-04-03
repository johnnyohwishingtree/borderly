/**
 * Constraint: QR image fallback detection must require nearby context text.
 *
 * Scope: src/services/automation/qrDetection.ts
 *
 * Rules:
 *   - The square-image fallback (method C) must NOT match any roughly-square
 *     image — it must also verify nearby parent text contains QR-related words
 *   - Methods A (canvas) and B (QR-labelled img) are fine as-is
 *
 * Why: The loose "any square image 100-600px" matcher triggered QR detection
 * on every portal page (logos, icons, decorative graphics are all square).
 * Now requires text like "qr", "barcode", "scan code" near the image.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

test('QR image fallback checks for QR-related context text in parent elements', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/services/automation/qrDetection.ts'),
    'utf-8',
  );
  expect(content).toMatch(/hasQRContext/);
  expect(content).toMatch(/qr\|barcode/);
});
