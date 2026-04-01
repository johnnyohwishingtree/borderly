/**
 * Constraint: Brand/accent background colors must use Tailwind color classes,
 * not semantic text tokens.
 *
 * Scope: src/screens/, src/components/
 *
 * Rules:
 *   - DENY: bg-primary (primary is a text color token, not a background)
 *   - DENY: bg-secondary, bg-tertiary, bg-accent as background colors
 *     (these are text tokens — they resolve to text colors like #111827)
 *   - ALLOW: bg-blue-600, bg-green-100, etc. (real Tailwind colors for brand accents)
 *   - ALLOW: bg-surface, bg-surface-secondary, bg-surface-tertiary (proper surface tokens)
 *
 * Why: The design token system defines `primary` as a text color (#111827 light / #f1f5f9 dark).
 * Using `bg-primary` as a background renders a dark gray/white background instead of the
 * intended brand blue. Brand/accent backgrounds should use explicit Tailwind color classes
 * (bg-blue-600) which have proper dark: variants (dark:bg-blue-500).
 *
 * The 60-30-10 rule also requires accent colors to be vibrant — text tokens are neutral by design.
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

test('no screen or component uses text tokens as background colors', () => {
  const files = [
    ...getFiles(resolve(ROOT, 'src/screens')),
    ...getFiles(resolve(ROOT, 'src/components')),
  ];

  const violations: string[] = [];
  // These are text color tokens — must never be used as bg-
  const textTokensAsBackground = /\bbg-primary(?:-\d+)?\b|\bbg-secondary\b|\bbg-tertiary\b|\bbg-accent\b/;

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const name = file.replace(ROOT + '/', '');

    const matches = content.match(new RegExp(textTokensAsBackground, 'g'));
    if (matches) {
      violations.push(`${name}: ${matches.join(', ')}`);
    }
  }

  expect(violations).toEqual([]);
});
