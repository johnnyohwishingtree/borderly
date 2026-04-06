/**
 * Spec: Portal submission on web opens government site in new tab
 *
 * Status: hypothesis
 * Confirm: PortalSubmissionScreen detects web platform and uses
 *   window.open / Linking.openURL instead of embedded WebView.
 *   Auto-fill data is offered via clipboard copy or bookmarklet.
 * Invalidate: A proxy approach (server-side fetch + render) works
 *   better than new-tab + bookmarklet
 *
 * Context: Government portals block iframe embedding via X-Frame-Options
 * and CSP frame-ancestors. On native, WebView works because it's not an
 * iframe — it's a real browser instance. On web, we cannot embed the portal.
 * Instead: open the portal in a new tab, and provide the user with a way
 * to auto-fill (bookmarklet, clipboard with JS snippet, or browser extension).
 *
 * The heuristic filler script (buildHeuristicFillScript) already generates
 * standalone JavaScript — it just needs to be delivered to the user.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

test.skip('portal screen has web-specific launch behavior', () => {
  // Either a .web.tsx variant exists, or the main screen checks Platform.OS
  const webVariant = existsSync(
    resolve(ROOT, 'src/screens/submission/PortalSubmission/PortalSubmissionScreen.web.tsx')
  );
  if (webVariant) {
    // Web variant handles opening in new tab
    const content = readFileSync(
      resolve(ROOT, 'src/screens/submission/PortalSubmission/PortalSubmissionScreen.web.tsx'),
      'utf-8',
    );
    expect(content).toMatch(/window\.open|Linking\.openURL|openURL/);
  } else {
    // Main screen has platform detection
    const content = readFileSync(
      resolve(ROOT, 'src/screens/submission/PortalSubmission/PortalSubmissionScreen.tsx'),
      'utf-8',
    );
    expect(content).toMatch(/Platform\.OS.*web|isWeb/);
  }
});

test.skip('web portal provides auto-fill data to user', () => {
  // On web, auto-fill can't inject into a cross-origin page.
  // Must offer: bookmarklet, clipboard copy of fill script, or browser extension.
  // Check that the heuristic filler script can be exported/copied.
  const paths = [
    'src/screens/submission/PortalSubmission/PortalSubmissionScreen.web.tsx',
    'src/screens/submission/PortalSubmission/PortalSubmissionScreen.tsx',
    'src/components/submission/WebAutoFillHelper.tsx',
  ];
  const found = paths.find(p => existsSync(resolve(ROOT, p)));
  expect(found).toBeDefined();

  const content = readFileSync(resolve(ROOT, found!), 'utf-8');
  // Must reference clipboard, bookmarklet, or extension mechanism
  expect(content).toMatch(/clipboard|bookmarklet|copy.*script|extension/i);
});
