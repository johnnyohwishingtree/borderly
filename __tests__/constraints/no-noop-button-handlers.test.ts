/**
 * Constraint: No buttons with no-op or stub onPress handlers in screens.
 *
 * Scope: src/screens/ — all screen files
 *
 * Rules:
 *   - DENY: empty onPress handlers
 *   - DENY: onPress with TODO comment inside
 *
 * Why: Users tap buttons expecting an action. No-op handlers are silent
 * failures — the user thinks the app is broken.
 */

import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

function getScreenFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) results.push(...getScreenFiles(fullPath));
    else if (entry.name.endsWith('.tsx') && !entry.name.includes('.test.')) results.push(fullPath);
  }
  return results;
}

test('no screen has empty or TODO onPress handlers', () => {
  const files = getScreenFiles(resolve(ROOT, 'src/screens'));
  const violations: string[] = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const name = file.replace(ROOT + '/', '');

    // Empty handler: onPress={() => {}}
    if (content.match(/onPress=\{\(\)\s*=>\s*\{\s*\}\}/)) {
      violations.push(`${name}: empty onPress={() => {}}`);
    }
    // TODO handler: onPress={() => {/* ... */}}
    if (content.match(/onPress=\{\(\)\s*=>\s*\{\s*\/\*/)) {
      violations.push(`${name}: TODO onPress handler`);
    }
  }

  expect(violations).toEqual([]);
});
