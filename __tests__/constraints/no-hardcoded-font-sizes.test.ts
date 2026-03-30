import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Constraint: No Hardcoded Font Sizes
 *
 * Scope: src/screens/, src/components/ font sizes — use Tailwind text scale only.
 * Constraint candidate — applies to all screens and components.
 *
 * Decision: Use Tailwind text classes (text-xs, text-sm, text-base, text-lg, text-xl,
 *   text-2xl, text-3xl) which respect Dynamic Type accessibility scaling.
 * Rejected: Arbitrary pixel font sizes like text-[13px] — they don't scale with
 *   system font size preferences, violating Apple HIG Dynamic Type requirement.
 *
 * DENY: text-[Npx] or text-[Nrem] in className strings
 * REQUIRE: Tailwind text scale classes only
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

test('no hardcoded font sizes in className strings', () => {
  const files = [
    ...getAllTsxFiles(resolve(ROOT, 'src/screens')),
    ...getAllTsxFiles(resolve(ROOT, 'src/components')),
  ];

  const violations: string[] = [];
  const arbitraryFont = /text-\[\d+px\]|text-\[\d+rem\]/;

  // CountryFlag uses text-[8px] for tiny fallback "??" on unknown flags — acceptable exception
  const EXCEPTIONS = ['CountryFlag.tsx'];

  for (const file of files) {
    if (EXCEPTIONS.some(e => file.includes(e))) continue;
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (arbitraryFont.test(lines[i])) {
        const relative = file.replace(ROOT + '/', '');
        violations.push(`${relative}:${i + 1}`);
      }
    }
  }

  expect(violations).toEqual([]);
});
