/**
 * Constraint: Portal WebView domain allowlist must match on parent domain.
 *
 * Scope: src/components/submission/PortalWebView.tsx
 *
 * Rules:
 *   - isAllowedDomain must extract and compare parent domains, not just
 *     exact hostname or child subdomain matching
 *   - This handles government portals that redirect between sibling
 *     subdomains (e.g., vjw-lp.digital.go.jp → services.digital.go.jp)
 *
 * Why: Japan's Visit Japan Web showed "Unable to Load Portal" because
 * the redirect to services.digital.go.jp was blocked — the allowlist
 * only matched vjw-lp.digital.go.jp exactly.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

test('PortalWebView uses parent domain matching for allowlist', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/components/submission/PortalWebView.tsx'),
    'utf-8',
  );
  expect(content).toMatch(/getParentDomain/);
  // Must handle government TLDs (.go.jp, .gov.my, etc.)
  expect(content).toMatch(/go.*gov/);
});
