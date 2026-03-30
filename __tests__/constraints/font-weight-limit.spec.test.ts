import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Spec: Each screen file should use at most 3 distinct font weight classes.
 * Constraint candidate — applies to all screen files.
 *
 * Decision: font-bold for headings, font-semibold for emphasis, font-medium for labels.
 * Rejected: font-light, font-normal mixed in with bold/semibold — competing hierarchy.
 *
 * Context: .context/external/cognitive/three-font-sizes-max.md
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

const FONT_WEIGHTS = ['font-thin', 'font-extralight', 'font-light', 'font-normal', 'font-medium', 'font-semibold', 'font-bold', 'font-extrabold', 'font-black'];

test.skip('screen files use at most 3 distinct font weights', () => {
  const screenFiles = getScreenFiles(resolve(ROOT, 'src/screens'));
  const violations: string[] = [];

  for (const file of screenFiles) {
    const content = readFileSync(file, 'utf-8');
    const weightsUsed = FONT_WEIGHTS.filter(w => content.includes(w));
    if (weightsUsed.length > 3) {
      const relative = file.replace(ROOT + '/', '');
      violations.push(`${relative} (${weightsUsed.length} weights: ${weightsUsed.join(', ')})`);
    }
  }

  expect(violations).toEqual([]);
});
