/**
 * Constraint: Components must not render Modal with navigation-dependent children.
 *
 * Scope: src/components/ — all component files
 *
 * Rules:
 *   - DENY: Importing Modal AND importing a scanner/screen component
 *     in the same file (components don't have navigation context)
 *   - Modals with scanners/screens must be owned by screen files (src/screens/)
 *
 * Why: React Native Modal creates an isolated component tree. Components
 * under src/components/ don't have NavigationContainer context, so any
 * child that uses useNavigation/useRoute will crash.
 */

import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

function getComponentFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getComponentFiles(fullPath));
    } else if (entry.name.endsWith('.tsx') && !entry.name.includes('.test.')) {
      results.push(fullPath);
    }
  }
  return results;
}

test('no component file renders Modal containing a Scanner component', () => {
  const files = getComponentFiles(resolve(ROOT, 'src/components'));
  const violations: string[] = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const name = file.replace(ROOT + '/', '');

    const hasModal = content.includes("from 'react-native'") && content.includes('<Modal');
    const hasScanner = content.match(/import.*(?:Scanner|Screen).*from/);

    if (hasModal && hasScanner) {
      violations.push(`${name}: renders Modal with scanner/screen (needs navigation context)`);
    }
  }

  expect(violations).toEqual([]);
});
