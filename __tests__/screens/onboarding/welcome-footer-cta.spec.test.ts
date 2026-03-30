import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

/**
 * Spec: Welcome screen CTA must be visible without scrolling.
 * Context: .context/external/cognitive/fewer-fields-higher-completion.md
 * Found by ux-audit: "Get Started" button is below 14 country flags,
 * requiring scroll to reach. Country list should be collapsed or removed.
 *
 * Current state: Country flags grid renders before CTA, pushing it below fold
 * Gap: CTA should be in fixed footer. Country list collapsed to one line or moved.
 */
test.skip('WelcomeScreen has CTA outside ScrollView as fixed footer', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/screens/onboarding/WelcomeScreen/WelcomeScreen.tsx'),
    'utf-8',
  );

  // The primary CTA (Get Started) should be AFTER the ScrollView closes,
  // not inside it
  const scrollViewCloseIdx = content.lastIndexOf('</ScrollView>');
  const ctaIdx = content.indexOf('Get Started');

  expect(scrollViewCloseIdx).toBeGreaterThan(-1);
  expect(ctaIdx).toBeGreaterThan(scrollViewCloseIdx);
});

test.skip('WelcomeScreen country list is collapsed (not a full grid)', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/screens/onboarding/WelcomeScreen/WelcomeScreen.tsx'),
    'utf-8',
  );

  // Should NOT render individual flag components in a grid for all countries
  // Instead: summary text like "14 countries supported" or a collapsible section
  const flagCount = (content.match(/CountryFlag/g) || []).length;
  // At most 4 inline flags (preview) — not 14+
  expect(flagCount).toBeLessThanOrEqual(4);
});
