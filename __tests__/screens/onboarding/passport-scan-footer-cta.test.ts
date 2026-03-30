import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

/**
 * Spec: Passport scan screen primary CTA must be in fixed footer.
 * Context: .context/external/cognitive/fewer-fields-higher-completion.md
 *
 * The "Start Camera Scan" and "Continue" buttons should be visible without
 * scrolling. Scanning tips and performance banners push them below fold.
 *
 * Current state: CTAs inside ScrollView
 * Gap: CTAs should be in fixed footer outside ScrollView
 */
test('PassportScanScreen has primary CTA outside ScrollView', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/screens/onboarding/PassportScanScreen/PassportScanScreen.tsx'),
    'utf-8',
  );

  const scrollViewCloseIdx = content.lastIndexOf('</ScrollView>');
  // Continue and Back buttons should be after ScrollView closes (in fixed footer)
  const continueBtnIdx = content.indexOf('passportContinueButton');
  const backBtnIdx = content.indexOf('passportBackButton');

  expect(scrollViewCloseIdx).toBeGreaterThan(-1);
  expect(Math.max(continueBtnIdx, backBtnIdx)).toBeGreaterThan(scrollViewCloseIdx);
});
