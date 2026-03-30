/**
 * Constraint: Bare React Native Workflow
 *
 * Decision: Use bare React Native workflow (not Expo managed) to allow direct native
 *   module integration for passport MRZ scanning (camera + ML Kit), biometric-protected
 *   Keychain storage, and potentially NFC e-passport reading.
 * Rejected: Expo managed workflow — restricts native module usage, no direct access to
 *   CocoaPods/Gradle configuration. Expo Go for prototyping — must build to
 *   simulator/device, but gains unrestricted native access.
 *
 * DENY:    expo packages in production dependencies
 * REQUIRE: native module access for camera, ML Kit, Keychain, and NFC
 *
 * Why: Bare RN gives full control over native modules and build configuration.
 *      Trade-off: must manage CocoaPods, Xcode, and Gradle manually, and every
 *      native dependency needs three implementations (native + web mock + Jest mock).
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

describe('Bare React Native', () => {
  it('no expo packages in production dependencies', () => {
    const pkgPath = resolve(ROOT, 'package.json');
    expect(existsSync(pkgPath)).toBe(true);

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const prodDeps = Object.keys(pkg.dependencies || {});

    const violations = prodDeps.filter(dep =>
      dep === 'expo' || dep.startsWith('expo-'),
    );

    expect(violations).toEqual([]);
  });
});
