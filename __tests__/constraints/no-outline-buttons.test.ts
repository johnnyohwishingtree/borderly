import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Constraint: No Outline Buttons
 *
 * Scope: src/screens/, src/components/
 *
 * Decision: Buttons have two variants — primary (solid fill) and secondary
 *   (text-only, blue text). Outline is for non-button elements (cards, inputs).
 * Rejected: outline on Buttons — thick border looks like a form input.
 *
 * Exceptions:
 * - PassportPreview.tsx — two adjacent outline buttons in a flex-row trigger a
 *   NativeWind compilation crash when changed to secondary. Kept as outline
 *   until the NativeWind bug is resolved.
 *   See: .context/external/tools/nativewind-border-shorthand.md
 */

function getAllTsxFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) results.push(...getAllTsxFiles(full));
      else if (full.endsWith('.tsx') && !full.includes('.test.') && !full.includes('__')) results.push(full);
    }
  } catch { /* skip */ }
  return results;
}

const EXCEPTIONS = ['PassportPreview.tsx'];

test('no Button components use variant="outline" (except known NativeWind bugs)', () => {
  const files = [
    ...getAllTsxFiles(resolve(ROOT, 'src/screens')),
    ...getAllTsxFiles(resolve(ROOT, 'src/components')),
  ];

  const violations: string[] = [];

  for (const file of files) {
    if (EXCEPTIONS.some(e => file.includes(e))) continue;

    const content = readFileSync(file, 'utf-8');
    const staticMatches = [...content.matchAll(/<Button[^>]*variant=["']outline["']/g)];
    const dynamicMatches = [...content.matchAll(/variant=\{[^}]*["']outline["'][^}]*\}/g)];

    const count = staticMatches.length + dynamicMatches.length;
    if (count > 0) {
      const relative = file.replace(ROOT + '/', '');
      violations.push(`${relative} (${count} outline buttons)`);
    }
  }

  expect(violations).toEqual([]);
});
