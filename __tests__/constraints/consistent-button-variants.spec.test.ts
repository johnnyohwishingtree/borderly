import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Spec: Button components should use only the standard variant names.
 * Constraint candidate — applies to all screens and components.
 *
 * Decision: Three Button variants only — primary, outline, secondary.
 * Rejected: "outlined" (typo/inconsistency with "outline"), ad-hoc variant strings.
 *
 * Note: variant= on non-Button components (Card, StatusBadge, LoadingStates, etc.)
 * is excluded — only Button variant usage is constrained.
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

const ALLOWED_BUTTON_VARIANTS = ['primary', 'outline', 'secondary'];

test.skip('Button components only use allowed variants', () => {
  const files = [
    ...getAllTsxFiles(resolve(ROOT, 'src/screens')),
    ...getAllTsxFiles(resolve(ROOT, 'src/components')),
  ];

  const violations: string[] = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    // Find Button components with variant prop
    const buttonVariants = [...content.matchAll(/<Button[^>]*variant=["'](\w+)["']/g)];
    for (const match of buttonVariants) {
      if (!ALLOWED_BUTTON_VARIANTS.includes(match[1])) {
        const relative = file.replace(ROOT + '/', '');
        violations.push(`${relative}: variant="${match[1]}"`);
      }
    }
  }

  expect(violations).toEqual([]);
});
