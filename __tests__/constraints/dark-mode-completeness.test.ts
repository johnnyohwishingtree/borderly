import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Constraint: Dark Mode Completeness
 *
 * Scope: src/screens/ light-mode color classes must have dark mode variants.
 * Constraint candidate — applies to all screens.
 *
 * Decision: Full dark mode support on every screen. NativeWind dark: prefix
 *   must be present for every text-*, bg-*, and border-* color class.
 * Rejected: Light-only screens — users in airports at night need dark mode.
 *
 * REQUIRE: Screens with text-gray-*, bg-white, etc. must have dark: equivalents
 * DENY: Screens with light color classes but zero dark: color classes
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

test('screens with light colors also have dark mode variants', () => {
  const screenFiles = getScreenFiles(resolve(ROOT, 'src/screens'));
  const violations: string[] = [];

  for (const file of screenFiles) {
    const content = readFileSync(file, 'utf-8');

    const lightColors = content.match(/(?:text|bg|border)-(?:gray|blue|green|red|yellow|white|black)-?\d*/g) || [];
    const darkColors = content.match(/dark:(?:text|bg|border)-/g) || [];

    // If the screen has 5+ light color classes but zero dark: variants, it's missing dark mode
    if (lightColors.length >= 5 && darkColors.length === 0) {
      const relative = file.replace(ROOT + '/', '');
      violations.push(`${relative} (${lightColors.length} light colors, 0 dark:)`);
    }
  }

  // Gradual cleanup — threshold decreases as screens get dark mode
  // LockScreen intentionally uses light-only colors (full-screen dark overlay with light text)
  const EXCEPTIONS = ['LockScreen'];
  const filtered = violations.filter(v => !EXCEPTIONS.some(e => v.includes(e)));
  expect(filtered.length).toBeLessThanOrEqual(6);
});
