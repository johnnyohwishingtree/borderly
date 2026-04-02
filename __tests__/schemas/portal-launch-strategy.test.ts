// Spec: Schemas must indicate portal launch strategy.
//
// Portals that require account/login (like Visit Japan Web) cannot
// work in an in-app WebView. The schema must specify whether to
// use WebView or open in external browser.
//
// Status: hypothesis
// Confirm: Login-required portals open in Safari, others in WebView
// Invalidate: All portals work fine in WebView

import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');
const SCHEMAS_DIR = resolve(ROOT, 'src/schemas');

test('every country schema has a portalLaunchMode field', () => {
  const schemaFiles = readdirSync(SCHEMAS_DIR)
    .filter(f => f.endsWith('.json') && f !== 'manifest.json');

  for (const file of schemaFiles) {
    const schema = JSON.parse(readFileSync(resolve(SCHEMAS_DIR, file), 'utf-8'));
    // Must have portalLaunchMode: 'webview' | 'browser'
    expect(schema.portalLaunchMode).toBeDefined();
    expect(['webview', 'browser']).toContain(schema.portalLaunchMode);
  }
});

test('login-required portals use browser launch mode', () => {
  // Japan requires account creation → must be browser
  const jpn = JSON.parse(readFileSync(resolve(SCHEMAS_DIR, 'JPN.json'), 'utf-8'));
  expect(jpn.portalLaunchMode).toBe('browser');
});
