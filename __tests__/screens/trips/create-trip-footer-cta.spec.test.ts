import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

/**
 * Spec: Create trip screen primary CTA must be in fixed footer.
 * Context: .context/external/cognitive/fewer-fields-higher-completion.md
 *
 * "Create Trip" button is inside ScrollView. When multiple destinations are
 * added, the button scrolls off screen. Should be fixed footer.
 *
 * Current state: Create Trip button inside ScrollView
 * Gap: Create Trip button in fixed footer outside ScrollView
 */
test.skip('CreateTripScreen has Create Trip button outside ScrollView', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/screens/trips/CreateTripScreen/CreateTripScreen.tsx'),
    'utf-8',
  );

  const scrollViewCloseIdx = content.lastIndexOf('</ScrollView>');
  // Create Trip button should be after ScrollView closes
  const createBtnIdx = content.indexOf('createTripButton');

  expect(scrollViewCloseIdx).toBeGreaterThan(-1);
  expect(createBtnIdx).toBeGreaterThan(scrollViewCloseIdx);
});
