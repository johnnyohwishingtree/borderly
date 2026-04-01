// Test: ImageBarcodeScanner native module must be registered and accessible.
//
// The "Barcode scanning not available on this platform" error means
// NativeModules.ImageBarcodeScanner is undefined at runtime. This happens
// when the native module isn't properly linked — either missing from the
// Xcode project, or the .m file isn't in the correct build target.
//
// The native module file must exist and be added to the Xcode project.

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

test('ImageBarcodeScanner.m exists in ios/Borderly/', () => {
  const path = resolve(ROOT, 'ios/Borderly/ImageBarcodeScanner.m');
  expect(existsSync(path)).toBe(true);
});

test('ImageBarcodeScanner.m exports methods and uses CIDetector (simulator-safe)', () => {
  const content = readFileSync(
    resolve(ROOT, 'ios/Borderly/ImageBarcodeScanner.m'),
    'utf-8',
  );
  expect(content).toMatch(/RCT_EXPORT_MODULE/);
  expect(content).toMatch(/RCT_EXPORT_METHOD/);
  expect(content).toMatch(/scanBarcodesInImage/);
  // Must use CIDetector (CPU-based, works on simulator)
  // Vision framework is optional fallback only
  expect(content).toMatch(/CIDetector/);
});

test('ImageBarcodeScanner.m is included in Xcode project with correct path', () => {
  const pbxproj = readFileSync(
    resolve(ROOT, 'ios/Borderly.xcodeproj/project.pbxproj'),
    'utf-8',
  );
  expect(pbxproj).toMatch(/ImageBarcodeScanner\.m/);
  // Path must point to Borderly/ subdirectory, not project root
  expect(pbxproj).toMatch(/path\s*=\s*Borderly\/ImageBarcodeScanner\.m/);
});
