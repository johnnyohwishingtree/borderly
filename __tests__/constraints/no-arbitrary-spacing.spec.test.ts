import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Spec: All spacing must use Tailwind scale classes, not arbitrary bracket values.
 * Constraint candidate — applies to all screens and components.
 *
 * Decision: 4px/8px spacing grid via Tailwind classes (p-1=4px, p-2=8px, p-4=16px).
 * Rejected: Arbitrary pixel values like p-[11px] or m-[13px] — breaks visual rhythm.
 *
 * Context: Apple HIG and Material Design both specify 8pt grid systems.
 */

function getAllTsxFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        results.push(...getAllTsxFiles(full));
      } else if (full.endsWith('.tsx') && !full.includes('.test.') && !full.includes('__')) {
        results.push(full);
      }
    }
  } catch { /* skip */ }
  return results;
}

test.skip('no arbitrary spacing values in className props', () => {
  const files = [
    ...getAllTsxFiles(resolve(ROOT, 'src/screens')),
    ...getAllTsxFiles(resolve(ROOT, 'src/components')),
  ];

  const violations: string[] = [];
  // Match p-[, m-[, px-[, py-[, pt-[, pb-[, pl-[, pr-[, mx-[, my-[, mt-[, mb-[, ml-[, mr-[, gap-[
  const arbitrarySpacing = /(?:^|\s)(p|m|px|py|pt|pb|pl|pr|mx|my|mt|mb|ml|mr|gap)-\[\d+px\]/;

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (arbitrarySpacing.test(lines[i])) {
        const relative = file.replace(ROOT + '/', '');
        violations.push(`${relative}:${i + 1}: ${lines[i].trim()}`);
      }
    }
  }

  expect(violations).toEqual([]);
});
