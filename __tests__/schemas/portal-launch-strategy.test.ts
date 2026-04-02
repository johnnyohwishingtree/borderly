// Schemas must have a portalLaunchMode field for future use.
// Currently all portals use WebView with auto-fill pill.

import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');
const SCHEMAS_DIR = resolve(ROOT, 'src/schemas');

test('every country schema has a portalLaunchMode field', () => {
  const schemaFiles = readdirSync(SCHEMAS_DIR)
    .filter(f => f.endsWith('.json') && f !== 'manifest.json');

  for (const file of schemaFiles) {
    const schema = JSON.parse(readFileSync(resolve(SCHEMAS_DIR, file), 'utf-8'));
    expect(schema.portalLaunchMode).toBeDefined();
    expect(['webview', 'browser']).toContain(schema.portalLaunchMode);
  }
});
