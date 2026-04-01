/**
 * Constraint: Destructive action buttons must use a red/danger variant.
 *
 * Scope: src/screens/, src/components/
 *
 * Rules:
 *   - Buttons with titles containing "Delete", "Remove", "Clear", "Reset",
 *     or "Erase" must use variant="outline" with a red/danger style,
 *     NOT variant="primary" or "secondary" (which renders blue).
 *   - The Button component must support a "danger" variant.
 *
 * Why: Apple HIG and Material Design both require destructive actions to be
 * visually distinct from constructive ones. A blue "Delete All Data" button
 * looks like a normal action — users may tap it without realizing it's
 * irreversible.
 */

import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

function getFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) results.push(...getFiles(fullPath));
    else if (entry.name.endsWith('.tsx') && !entry.name.includes('.test.')) results.push(fullPath);
  }
  return results;
}

test('Button component supports a danger variant', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/components/ui/Button.tsx'),
    'utf-8',
  );
  expect(content).toMatch(/danger/);
});

test('destructive buttons use variant="danger", not primary/secondary', () => {
  const files = [
    ...getFiles(resolve(ROOT, 'src/screens')),
    ...getFiles(resolve(ROOT, 'src/components')),
  ];

  const destructiveWords = /Delete|Remove All|Clear All|Reset All|Erase/i;
  const violations: string[] = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const name = file.replace(ROOT + '/', '');

    // Find Button components with destructive titles
    const buttonMatches = content.matchAll(/title="([^"]+)"[^>]*variant="(primary|secondary)"/g);
    for (const match of buttonMatches) {
      if (destructiveWords.test(match[1])) {
        violations.push(`${name}: "${match[1]}" uses variant="${match[2]}" (should be "danger")`);
      }
    }

    // Also check reverse order: variant before title
    const reverseMatches = content.matchAll(/variant="(primary|secondary)"[^>]*title="([^"]+)"/g);
    for (const match of reverseMatches) {
      if (destructiveWords.test(match[2])) {
        violations.push(`${name}: "${match[2]}" uses variant="${match[1]}" (should be "danger")`);
      }
    }
  }

  expect(violations).toEqual([]);
});
