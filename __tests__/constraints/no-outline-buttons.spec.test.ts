import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Spec: No Button component should use variant="outline".
 * Constraint candidate — applies to all screens and components.
 *
 * Decision: Buttons have two variants only — primary (solid fill) and secondary
 *   (text-only, blue text). Outline is for non-button elements (cards, inputs).
 * Rejected: outline on Buttons — thick grey border looks like a form input,
 *   competes visually with primary, inconsistent across screens.
 *
 * Note: Full sweep triggers a NativeWind style sheet compilation crash.
 * Implement in batches, testing E2E after each batch to isolate the
 * problematic file. See .context/external/tools/nativewind-border-shorthand.md
 *
 * Confirm: App looks cleaner with primary + text-only secondary everywhere
 * Invalidate: NativeWind crash cannot be isolated and requires keeping outline
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

test.skip('no Button components use variant="outline"', () => {
  const files = [
    ...getAllTsxFiles(resolve(ROOT, 'src/screens')),
    ...getAllTsxFiles(resolve(ROOT, 'src/components')),
  ];

  const violations: string[] = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    // Static variant="outline" on Button
    const staticMatches = [...content.matchAll(/<Button[^>]*variant=["']outline["']/g)];
    // Dynamic variant with outline
    const dynamicMatches = [...content.matchAll(/variant=\{[^}]*["']outline["'][^}]*\}/g)];

    const count = staticMatches.length + dynamicMatches.length;
    if (count > 0) {
      const relative = file.replace(ROOT + '/', '');
      violations.push(`${relative} (${count} outline buttons)`);
    }
  }

  expect(violations).toEqual([]);
});
