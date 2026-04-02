// Spec: Portal launch button adapts to portalLaunchMode.
//
// When portalLaunchMode is 'browser', the button should say
// "Open in Browser" and use Linking.openURL instead of navigating
// to the in-app WebView PortalSubmission screen.
//
// Status: hypothesis
// Confirm: Browser portals open Safari, WebView portals open in-app
// Invalidate: Single launch mode works for all portals

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

test.skip('usePortalLinks checks portalLaunchMode before navigating', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/hooks/usePortalLinks.ts'),
    'utf-8',
  );
  // Must check portalLaunchMode and use Linking.openURL for browser mode
  expect(content).toMatch(/portalLaunchMode/);
  expect(content).toMatch(/Linking\.openURL|openURL/);
});

test.skip('PortalLinksScreen shows "Open in Browser" for browser-mode portals', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/screens/forms/PortalLinksScreen/PortalLinksScreen.tsx'),
    'utf-8',
  );
  expect(content).toMatch(/Open in Browser/);
});
