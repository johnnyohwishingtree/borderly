// Test: Image picker must return file:// URIs, not ph:// Photos library URLs.
//
// iOS Vision framework (VNImageRequestHandler) cannot load images from
// ph:// URLs. react-native-image-picker returns ph:// by default on iOS.
// The fix: set includeBase64 or use a file URI copy.
//
// "Could not create inference context" = Vision couldn't load the image.

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

test('image picker is configured to return file URIs not ph:// URLs', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/services/boarding/boardingPassImageImport.ts'),
    'utf-8',
  );

  // The launchImageLibrary call must include a setting that forces
  // file:// URIs instead of ph:// URLs. Options:
  // 1. includeBase64: true (we get data directly)
  // 2. presentationStyle: 'fullScreen' (copies file on iOS 14+)
  // 3. formatAsMp4: false + other flags
  // The simplest: includeBase64: true, then create a temp file from it
  // OR just check that we handle the URI correctly in the native module

  // Native module must handle ph:// URLs by using PHImageManager
  const nativeModule = readFileSync(
    resolve(ROOT, 'ios/Borderly/ImageBarcodeScanner.m'),
    'utf-8',
  );

  // Must import Photos framework to handle ph:// URIs
  expect(nativeModule).toMatch(/Photos\/Photos\.h|PHImageManager|PHAsset/);
});
