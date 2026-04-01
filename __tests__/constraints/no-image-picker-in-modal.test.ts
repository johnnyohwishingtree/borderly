/**
 * Constraint: launchImageLibrary must never be called from inside a Modal.
 *
 * Scope: src/components/ — all component files that could render inside Modal
 *
 * Rules:
 *   - DENY: Any component that imports launchImageLibrary AND is rendered
 *     inside a Modal (Modal creates an isolated view controller tree on iOS)
 *   - Image picker must be called from screen-level code (src/screens/)
 *     or from a hook that runs at screen level
 *
 * Why: react-native-image-picker's launchImageLibrary uses native-interop
 * to present from the current view controller. Inside a Modal, this crashes
 * with "Couldn't find a navigation context" because Modal creates a new
 * component tree without NavigationContainer.
 *
 * The fix: screens handle the "Import from Photo" action directly (outside
 * the Modal), and only open the Modal for camera scanning.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');


test('no component imports both launchImageLibrary and is used inside Modal', () => {
  // The BoardingPassScanner component must NOT import or call
  // launchImageLibrary — that should happen at the screen level
  const scannerFile = resolve(ROOT, 'src/components/boarding/BoardingPassScanner.tsx');
  const content = readFileSync(scannerFile, 'utf-8');

  expect(content).not.toMatch(/launchImageLibrary/);
  expect(content).not.toMatch(/importBoardingPassFromImage/);
});

test('useBoardingPassScanner hook does not call image picker directly', () => {
  // The hook runs inside Modal context too — image picker must be external
  const hookFile = resolve(ROOT, 'src/hooks/useBoardingPassScanner.ts');
  const content = readFileSync(hookFile, 'utf-8');

  expect(content).not.toMatch(/launchImageLibrary/);
  expect(content).not.toMatch(/importBoardingPassFromImage/);
});
