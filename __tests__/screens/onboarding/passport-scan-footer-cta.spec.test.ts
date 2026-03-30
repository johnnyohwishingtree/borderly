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
test.skip('PassportScanScreen has primary CTA outside ScrollView', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/screens/onboarding/PassportScanScreen/PassportScanScreen.tsx'),
    'utf-8',
  );

  const scrollViewCloseIdx = content.lastIndexOf('</ScrollView>');
  // Primary CTA (Start Camera Scan or Continue) should be after ScrollView closes
  const scanBtnIdx = content.indexOf('Start Camera Scan');
  const continueBtnIdx = content.indexOf('takeCameraScanButton');

  const ctaIdx = Math.max(scanBtnIdx, continueBtnIdx);
  expect(scrollViewCloseIdx).toBeGreaterThan(-1);
  expect(ctaIdx).toBeGreaterThan(scrollViewCloseIdx);
});
