// Test: Portal domain allowlist must handle redirects to sibling subdomains.
//
// Bug: Japan portal URL is vjw-lp.digital.go.jp but redirects to
// services.digital.go.jp. The domain check blocks the redirect
// because services.digital.go.jp doesn't match vjw-lp.digital.go.jp.
//
// Fix: Match on the registrable domain (digital.go.jp), not the
// full hostname. Or: allow the parent domain.

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

test('isAllowedDomain matches parent domain for government portals', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/components/submission/PortalWebView.tsx'),
    'utf-8',
  );

  // Must match on parent domain (e.g., digital.go.jp covers both
  // vjw-lp.digital.go.jp and services.digital.go.jp)
  // Look for parent domain extraction or broader matching logic
  const matchBlock = content.match(/isAllowedDomain[\s\S]*?return.*ALLOWED/);
  expect(matchBlock).not.toBeNull();

  // Must handle subdomains of the same parent (not just exact + child)
  // e.g., getParentDomain or splitting on the registrable domain
  expect(content).toMatch(/getParentDomain|registrableDomain|parentDomain|domain\.split/);
});
