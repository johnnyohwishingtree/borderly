import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Constraint: One Primary Action
 *
 * Scope: src/screens/
 *
 * Decision: One primary action per screen reduces decision paralysis (Hick's Law).
 * Rejected: Multiple primary buttons — user can't tell which is the main action.
 *
 * Context: .context/external/cognitive/fewer-fields-higher-completion.md
 */

function getScreenFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        results.push(...getScreenFiles(full));
      } else if (full.endsWith('.tsx') && !full.includes('.test.')) {
        results.push(full);
      }
    }
  } catch { /* skip */ }
  return results;
}

test('screens have at most one primary-variant Button', () => {
  const screenFiles = getScreenFiles(resolve(ROOT, 'src/screens'));
  const violations: string[] = [];

  for (const file of screenFiles) {
    const content = readFileSync(file, 'utf-8');
    const primaryCount = (content.match(/variant=["']primary["']/g) || []).length;
    if (primaryCount > 1) {
      const relative = file.replace(ROOT + '/', '');
      violations.push(`${relative} (${primaryCount} primary buttons)`);
    }
  }

  expect(violations).toEqual([]);
});
