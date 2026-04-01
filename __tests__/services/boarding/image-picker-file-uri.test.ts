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

test('native module handles ph:// URIs from iOS photo picker', () => {
  // Native module must handle ph:// URLs by using PHImageManager
  const nativeModule = readFileSync(
    resolve(ROOT, 'ios/Borderly/ImageBarcodeScanner.m'),
    'utf-8',
  );

  // Must import Photos framework to handle ph:// URIs
  expect(nativeModule).toMatch(/Photos\/Photos\.h|PHImageManager|PHAsset/);
});
