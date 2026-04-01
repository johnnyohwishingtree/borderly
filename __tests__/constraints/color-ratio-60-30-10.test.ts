import { readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Constraint: 60-30-10 color ratio — screens must have accent colors.
 *
 * Apple HIG and Material Design both follow the 60-30-10 principle:
 *   60% dominant (bg-surface — white/gray backgrounds)
 *   30% secondary (bg-surface-secondary — cards, grouped content)
 *   10% accent (bg-blue-*, bg-green-*, bg-amber-* — highlights, status)
 *
 * When every section is the same neutral gray, the UI looks washed out
 * and users can't distinguish important content from background.
 *
 * Scope: src/screens/ — screen files with 20+ lines of JSX
 * Rules:
 *   - Screens with 10+ color classes should have at least 1 accent color
 *   - Accent = any bg-blue-*, bg-green-*, bg-amber-*, bg-indigo-*,
 *     bg-red-*, bg-orange-*, bg-purple-* class
 * Anti-patterns:
 *   - Replacing bg-blue-50 with bg-surface-secondary during token migration
 *   - All-gray screens with no visual hierarchy
 */

function getScreenFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) results.push(...getScreenFiles(full));
      else if (entry.name.endsWith('.tsx') && !entry.name.includes('.test.')) results.push(full);
    }
  } catch { /* skip */ }
  return results;
}

test('screens with significant UI have accent colors (60-30-10 rule)', () => {
  const screenFiles = getScreenFiles(resolve(ROOT, 'src/screens'));
  const violations: string[] = [];

  const SURFACE_PATTERN = /bg-surface|bg-surface-secondary|bg-surface-tertiary/g;
  const ACCENT_PATTERN = /bg-(?:blue|green|amber|indigo|red|orange|purple|emerald|teal|cyan|rose|pink|violet)-\d+/g;

  for (const file of screenFiles) {
    const content = readFileSync(file, 'utf-8');
    const surfaceColors = content.match(SURFACE_PATTERN) || [];
    const accentColors = content.match(ACCENT_PATTERN) || [];

    // Only check screens with significant UI (10+ surface/bg references)
    if (surfaceColors.length >= 10 && accentColors.length === 0) {
      const rel = file.replace(ROOT + '/', '');
      violations.push(`${rel}: ${surfaceColors.length} surface colors, 0 accent — all gray, no visual hierarchy`);
    }
  }

  // 1 screen currently violates (ProfileScreen). Threshold prevents regression.
  expect(violations.length).toBeLessThanOrEqual(1);
});
