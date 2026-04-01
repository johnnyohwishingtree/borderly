import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Spec: Design Token Architecture
 *
 * Screens and components should use semantic color tokens (text-primary,
 * bg-surface, border-default) instead of raw Tailwind colors (text-gray-900,
 * bg-white, border-gray-200). Semantic tokens auto-resolve light/dark mode
 * via CSS variables — no per-element dark: classes needed.
 *
 * This eliminates the "42 screens missing dark mode" debt by making dark
 * mode automatic. It also ensures visual consistency — every "primary text"
 * is the same color, not whatever gray the developer picked.
 *
 * Token mapping (defined once in tailwind.config.js):
 *   text-primary     → gray-900 / white
 *   text-secondary   → gray-600 / gray-400
 *   text-tertiary    → gray-500 / gray-500
 *   text-muted       → gray-400 / gray-600
 *   bg-surface       → white / gray-900
 *   bg-surface-secondary → gray-50 / gray-800
 *   bg-surface-tertiary  → gray-100 / gray-700
 *   border-default   → gray-200 / gray-700
 *   border-light     → gray-100 / gray-800
 *   text-accent      → blue-600 / blue-400
 *   bg-accent        → blue-50 / blue-950
 *   text-error       → red-600 / red-400
 *   text-success     → green-600 / green-400
 *
 * Confirm: dark mode works on every screen without any dark: classes
 * Invalidate: NativeWind CSS variables don't work on RN (fallback to dark: prefix)
 */

function getFiles(dir: string, ext: string): string[] {
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) results.push(...getFiles(full, ext));
      else if (entry.name.endsWith(ext) && !entry.name.includes('.test.')) results.push(full);
    }
  } catch { /* skip */ }
  return results;
}

test.skip('tailwind.config.js defines semantic color tokens with CSS variables', () => {
  const config = readFileSync(resolve(ROOT, 'tailwind.config.js'), 'utf-8');

  // Must define semantic tokens, not just raw color scales
  expect(config).toMatch(/text-primary|textPrimary|'primary'/);
  expect(config).toMatch(/surface|bg-surface/);
  expect(config).toMatch(/border-default|borderDefault/);

  // Must use CSS variable syntax for light/dark auto-resolution
  // NativeWind uses var(--color-X) or cssvar pattern
  expect(config).toMatch(/var\(--|cssInterop|colorScheme/);
});

test.skip('semantic tokens cover all common UI patterns', () => {
  const config = readFileSync(resolve(ROOT, 'tailwind.config.js'), 'utf-8');

  // Text hierarchy
  expect(config).toMatch(/primary/); // headings, main content
  expect(config).toMatch(/secondary/); // subtitles, descriptions
  expect(config).toMatch(/muted/); // placeholders, hints

  // Surfaces
  expect(config).toMatch(/surface/); // card/screen backgrounds

  // Borders
  expect(config).toMatch(/border/); // dividers, outlines

  // Semantic status colors
  expect(config).toMatch(/accent/); // links, CTAs
  expect(config).toMatch(/error/); // errors, destructive
  expect(config).toMatch(/success/); // success states
});

test.skip('screens use semantic tokens instead of raw gray/white/black classes', () => {
  const screenFiles = getFiles(resolve(ROOT, 'src/screens'), '.tsx');

  const RAW_COLOR_PATTERN = /(?:text|bg|border)-(?:gray|white|black)-?\d*/g;

  let totalRawColors = 0;
  const violations: string[] = [];

  for (const file of screenFiles) {
    const content = readFileSync(file, 'utf-8');
    const rawColors = content.match(RAW_COLOR_PATTERN) || [];

    if (rawColors.length > 5) {
      totalRawColors += rawColors.length;
      const rel = file.replace(ROOT + '/', '');
      violations.push(`${rel}: ${rawColors.length} raw color classes`);
    }
  }

  // Target: zero screens with >5 raw color classes
  // All should use semantic tokens instead
  expect(violations.length).toBe(0);
});

test.skip('components use semantic tokens instead of raw gray/white/black classes', () => {
  const componentFiles = getFiles(resolve(ROOT, 'src/components'), '.tsx');

  const RAW_COLOR_PATTERN = /(?:text|bg|border)-(?:gray|white|black)-?\d*/g;

  const violations: string[] = [];

  for (const file of componentFiles) {
    const content = readFileSync(file, 'utf-8');
    const rawColors = content.match(RAW_COLOR_PATTERN) || [];

    if (rawColors.length > 5) {
      const rel = file.replace(ROOT + '/', '');
      violations.push(`${rel}: ${rawColors.length} raw color classes`);
    }
  }

  // Target: zero components with >5 raw color classes
  expect(violations.length).toBe(0);
});

test.skip('no screen uses dark: prefix for colors (tokens handle it automatically)', () => {
  const screenFiles = getFiles(resolve(ROOT, 'src/screens'), '.tsx');
  const violations: string[] = [];

  for (const file of screenFiles) {
    const content = readFileSync(file, 'utf-8');
    const darkPrefixes = content.match(/dark:(?:text|bg|border)-/g) || [];

    if (darkPrefixes.length > 0) {
      const rel = file.replace(ROOT + '/', '');
      violations.push(`${rel}: ${darkPrefixes.length} dark: color prefixes (should be automatic via tokens)`);
    }
  }

  // When tokens are in place, dark: prefixes for colors are unnecessary
  expect(violations.length).toBe(0);
});

test.skip('a global.css or theme file defines CSS variables for light and dark modes', () => {
  // NativeWind v4 uses a global CSS file for CSS variable definitions
  const possiblePaths = [
    'src/global.css',
    'src/styles/global.css',
    'src/theme.css',
    'src/styles/theme.css',
  ];

  const found = possiblePaths.find(p => existsSync(resolve(ROOT, p)));
  expect(found).toBeDefined();

  const css = readFileSync(resolve(ROOT, found!), 'utf-8');

  // Must define variables for both light and dark
  expect(css).toMatch(/:root/);
  expect(css).toMatch(/\.dark|@media.*prefers-color-scheme.*dark/);
  expect(css).toMatch(/--color-/);
});
