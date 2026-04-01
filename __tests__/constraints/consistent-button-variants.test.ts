import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Constraint: Consistent Button Variants
 *
 * Scope: src/screens/, src/components/
 *
 * Decision: Two Button variants only — primary and secondary.
 *   Primary = solid fill (main action). Secondary = text-only (supporting action).
 * Rejected: "outline" on Buttons — border makes them look like form inputs, not actions.
 *   Outline is reserved for non-button elements (cards, inputs, toggles).
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

const ALLOWED_BUTTON_VARIANTS = ['primary', 'secondary', 'danger'];

test('Button components only use allowed variants', () => {
  const files = [
    ...getAllTsxFiles(resolve(ROOT, 'src/screens')),
    ...getAllTsxFiles(resolve(ROOT, 'src/components')),
  ];

  const violations: string[] = [];

  // PassportPreview.tsx uses outline due to NativeWind crash bug
  const EXCEPTIONS = ['PassportPreview.tsx'];

  for (const file of files) {
    if (EXCEPTIONS.some(e => file.includes(e))) continue;
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
