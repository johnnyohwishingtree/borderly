/**
 * Constraint: No Inline Hex Colors (from Styling policy)
 *
 * Scope: src/components/, src/screens/
 *
 * REQUIRE: NativeWind className for all styling
 * REQUIRE: Tailwind color tokens — no inline hex colors
 * DENY:    style={{}} for static values expressible in Tailwind
 * ALLOW:   style={{}} for animated values, computed dimensions, dynamic transforms
 * ALLOW:   style={{}} for SVG-like rendering (CountryFlag)
 * ALLOW:   style={{}} for platform-specific layout NativeWind can't express
 *
 * Exceptions:
 * - Lucide icon color prop accepts inline hex — component library requirement
 * - CountryFlag.tsx — pixel-precise SVG flag rendering requires inline styles
 *
 * Anti-patterns:
 * - style={{ marginTop: 16 }} when className="mt-4" works
 * - #3B82F6 inline when text-blue-500 exists
 * - Mixing StyleSheet.create() and className in the same file
 *
 * Why: Inline hex colors bypass the design system's color tokens and make
 *      theme changes impossible. NativeWind className is the single source.
 *      NativeWind (Tailwind for RN) is the styling framework — inline hex colors bypass it.
 */

import * as fs from 'fs';
import * as path from 'path';

const COMPONENTS_DIR = path.resolve(__dirname, '../../src/components');
const SCREENS_DIR = path.resolve(__dirname, '../../src/screens');

/**
 * Known baseline of inline hex color violations. Decrease this number as files
 * are migrated. The test fails if the count exceeds this baseline.
 */
const KNOWN_VIOLATION_BASELINE = 60;

/** Files explicitly exempt from this rule. */
const EXEMPT_FILES = new Set([
  'CountryFlag.tsx', // Pixel-precise SVG flag rendering requires inline styles
]);

function collectTsxFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      results.push(...collectTsxFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

function countInlineHexViolations(content: string): number {
  let count = 0;
  for (const line of content.split('\n')) {
    // Skip Lucide icon color props (allowed by policy)
    if (/color=["']#[0-9A-Fa-f]{3,8}["']/.test(line) && !/style/.test(line)) continue;
    if (/style=\{\{[^}]*#[0-9A-Fa-f]{3,8}/.test(line)) {
      count++;
    }
  }
  return count;
}

describe('inline hex color violations in style props', () => {
  const files = [...collectTsxFiles(COMPONENTS_DIR), ...collectTsxFiles(SCREENS_DIR)];

  it('does not exceed the known violation baseline', () => {
    let total = 0;
    for (const filePath of files) {
      if (EXEMPT_FILES.has(path.basename(filePath))) continue;
      const content = fs.readFileSync(filePath, 'utf-8');
      total += countInlineHexViolations(content);
    }

    if (total > 0) {
      console.warn(
        `${total} inline hex color violations remain (baseline: ${KNOWN_VIOLATION_BASELINE}). ` +
        'Migrate to NativeWind className. See JSDoc at top of this file for styling rules.',
      );
    }

    expect(total).toBeLessThanOrEqual(KNOWN_VIOLATION_BASELINE);
  });
});
