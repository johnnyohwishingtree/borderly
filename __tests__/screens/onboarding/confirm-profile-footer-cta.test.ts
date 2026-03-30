import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

/**
 * Spec: Confirm profile screen primary CTA must be in fixed footer.
 * Context: .context/external/cognitive/fewer-fields-higher-completion.md
 *
 * "Continue" button is currently inside ScrollView below the security notice.
 * Should be fixed footer so user can confirm immediately after reviewing data.
 *
 * Current state: Continue + Edit buttons inside ScrollView
 * Gap: Continue in fixed footer, Edit can stay in scroll content
 */
test('ConfirmProfileScreen has Continue button outside ScrollView', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/screens/onboarding/ConfirmProfileScreen/ConfirmProfileScreen.tsx'),
    'utf-8',
  );

  const scrollViewCloseIdx = content.lastIndexOf('</ScrollView>');
  // Continue button should be after ScrollView closes
  const continueBtnIdx = content.indexOf('continueToSecurityButton');

  expect(scrollViewCloseIdx).toBeGreaterThan(-1);
  expect(continueBtnIdx).toBeGreaterThan(scrollViewCloseIdx);
});
