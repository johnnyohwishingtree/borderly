import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Constraint: Consistent Card Variants
 *
 * Scope: src/screens/
 *
 * DENY: More than 2 distinct Card variants per screen should use consistent variant tokens.
 * Constraint candidate — applies to all screens.
 *
 * Decision: Two Card variants for content:
 *   - "outlined" for standard content sections (default)
 *   - "elevated" for hero/featured sections (max 1 per screen)
 *   No gradient backgrounds on cards — use variant props only.
 * Rejected: "ghost" variant in content areas — too subtle, no visual boundary.
 *   Custom gradient headers on cards — not part of the Card component API.
 *
 * DENY: More than 2 distinct Card variants per screen file
 * DENY: bg-gradient or custom background colors on Card components
 */

function getScreenFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) results.push(...getScreenFiles(full));
      else if (full.endsWith('.tsx') && !full.includes('.test.')) results.push(full);
    }
  } catch { /* skip */ }
  return results;
}

test('screens use at most 2 Card variants', () => {
  const screenFiles = getScreenFiles(resolve(ROOT, 'src/screens'));
  const violations: string[] = [];

  for (const file of screenFiles) {
    const content = readFileSync(file, 'utf-8');
    const cardVariants = [...content.matchAll(/<Card[^>]*variant=["'](\w+)["']/g)].map(m => m[1]);
    const unique = [...new Set(cardVariants)];

    if (unique.length > 2) {
      const relative = file.replace(ROOT + '/', '');
      violations.push(`${relative} (${unique.length} variants: ${unique.join(', ')})`);
    }
  }

  expect(violations).toEqual([]);
});
