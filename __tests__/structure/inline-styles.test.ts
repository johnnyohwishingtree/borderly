import * as fs from 'fs';
import * as path from 'path';

/**
 * Structural test: detect static inline hex colors in style props.
 *
 * NativeWind className should be used for all static styling. Inline styles
 * are only allowed for dynamic/computed values, animated values, SVG rendering
 * (CountryFlag.tsx), and platform-specific layout NativeWind can't express.
 *
 * This test tracks a known violation count. It fails if NEW violations appear
 * (count exceeds baseline) and logs a reminder when violations still exist.
 *
 * See: .knowledge/policies/ui/styling.md
 */

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
        'Migrate to NativeWind className. See .knowledge/policies/ui/styling.md',
      );
    }

    expect(total).toBeLessThanOrEqual(KNOWN_VIOLATION_BASELINE);
  });
});
