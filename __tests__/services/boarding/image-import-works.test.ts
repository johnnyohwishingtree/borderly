// Test: importBoardingPassFromImage must not depend on uninstalled native modules.
//
// The function calls detectBarcodeInImage which requires
// @react-native-ml-kit/barcode-scanning — a module that fails to install
// (minimum deployment target mismatch). The import must use only
// dependencies that are already in the project.

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

test('detectBarcodeInImage does not require @react-native-ml-kit/barcode-scanning', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/services/boarding/boardingPassImageImport.ts'),
    'utf-8',
  );

  // Must NOT reference ml-kit — it fails to install
  expect(content).not.toMatch(/@react-native-ml-kit/);
});

test('detectBarcodeInImage uses a real native module for barcode detection', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/services/boarding/boardingPassImageImport.ts'),
    'utf-8',
  );

  const fnMatch = content.match(
    /async function detectBarcodeInImage[\s\S]*?\n\}/,
  );
  expect(fnMatch).not.toBeNull();

  // Must call a real native barcode scanner, not be a stub
  expect(fnMatch![0]).toMatch(/ImageBarcodeScanner|BarcodeScanning|scanBarcode/i);
  // Must have a success: true path
  expect(fnMatch![0]).toMatch(/success:\s*true/);
});
