import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Spec: No screen or component should import from gluestack wrappers.
 * Constraint candidate — applies to all source files.
 *
 * Decision: Standardize on custom @/components/ui components (35+ production-hardened
 *   components with accessibility, haptics, dark mode). Gluestack wrappers are unused
 *   dead code — delete them.
 * Rejected: Migrating to Gluestack UI — custom components are more capable and already
 *   used by 100% of screens.
 */

function getAllTsxFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) results.push(...getAllTsxFiles(full));
      else if (full.endsWith('.tsx') && !full.includes('.test.')) results.push(full);
    }
  } catch { /* skip */ }
  return results;
}

test.skip('no imports from gluestack wrappers', () => {
  const files = [
    ...getAllTsxFiles(resolve(ROOT, 'src/screens')),
    ...getAllTsxFiles(resolve(ROOT, 'src/components')),
  ];

  const violations: string[] = [];
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    if (content.includes('from') && content.includes('gluestack')) {
      const relative = file.replace(ROOT + '/', '');
      violations.push(relative);
    }
  }

  expect(violations).toEqual([]);
});

test.skip('gluestack wrapper directory does not exist', () => {
  expect(existsSync(resolve(ROOT, 'src/components/ui/gluestack'))).toBe(false);
});
