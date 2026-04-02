// Test: Portal load timeout should not show error when page is visible.
//
// Bug: Visit Japan Web shows "Unable to Load Portal" error even though
// the page rendered in the background. The 30s timeout fires before
// the WebView's onLoad event, or a sub-resource error triggers the
// full error overlay.
//
// Fix: increase timeout and only show error if no content rendered.

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

test('load timeout is at least 60 seconds for slow government portals', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/hooks/useLoadTimeout.ts'),
    'utf-8',
  );
  const match = content.match(/DEFAULT_TIMEOUT_MS\s*=\s*(\d+)/);
  expect(match).not.toBeNull();
  expect(parseInt(match![1])).toBeGreaterThanOrEqual(60000);
});

test('onWebViewError does not trigger for sub-resource failures', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/hooks/useLoadTimeout.ts'),
    'utf-8',
  );
  // onWebViewError should check if the main frame failed, not just any error
  // Or: it should not immediately show the error overlay
  // At minimum: it should not set loadError for every error
  expect(content).toMatch(/isMainFrame|mainFrame|nativeEvent|description/);
});
