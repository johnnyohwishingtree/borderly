/**
 * Constraint: Dark mode CSS variables must use @media (prefers-color-scheme: dark)
 *
 * Scope: src/app/global.css
 *
 * Rules:
 *   - Light-mode variables MUST be in a bare :root { } selector
 *   - Dark-mode variables MUST be in @media (prefers-color-scheme: dark) { :root { } }
 *   - NEVER use standalone .dark { } for CSS variables — NativeWind's CSS interop
 *     only recognizes :root inside @media (prefers-color-scheme: dark) or .dark:root
 *   - Every light variable must have a dark counterpart
 *
 * Why: NativeWind's react-native-css-interop (normalize-selectors.js) checks:
 *   1. isRootVariableSelector (:root) + isDarkModeMediaQuery (@media prefers-color-scheme: dark)
 *   2. isRootDarkVariableSelector (.dark:root)
 *   Standalone .dark { } is NOT recognized — variables silently stay at light values.
 *
 * Anti-patterns:
 *   .dark { --color-bg-surface: #111827; }           — NOT recognized by CSS interop
 *   @layer base { .dark { --color-bg-surface: ... } } — same issue, @layer doesn't help
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');
const globalCss = readFileSync(resolve(ROOT, 'src/app/global.css'), 'utf-8');

// Extract all CSS variable declarations (--color-*)
function extractVarNames(block: string): string[] {
  const matches = block.match(/--color-[\w-]+(?=\s*:)/g) || [];
  return [...new Set(matches)].sort();
}

test('light-mode variables are in bare :root selector (not inside @media)', () => {
  // Match :root { ... } blocks that are NOT inside @media
  // Strategy: find :root blocks, check they're not preceded by @media on the same nesting level
  const rootBlockRegex = /(?<!@media[^{]*\{[^}]*):root\s*\{([^}]+)\}/g;
  const matches = [...globalCss.matchAll(rootBlockRegex)];

  // There should be at least one bare :root block with CSS variables
  const bareRootVars = matches.flatMap(m => extractVarNames(m[1]));
  expect(bareRootVars.length).toBeGreaterThan(0);
  expect(bareRootVars).toContain('--color-bg-surface');
  expect(bareRootVars).toContain('--color-text-primary');
});

test('dark-mode variables use @media (prefers-color-scheme: dark) { :root { } }', () => {
  // Must contain @media (prefers-color-scheme: dark) with :root inside
  const darkMediaRegex = /@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)\s*\{[^}]*:root\s*\{([^}]+)\}/;
  const match = globalCss.match(darkMediaRegex);

  expect(match).not.toBeNull();

  const darkVars = extractVarNames(match![1]);
  expect(darkVars.length).toBeGreaterThan(0);
  expect(darkVars).toContain('--color-bg-surface');
  expect(darkVars).toContain('--color-text-primary');
});

test('NEVER use standalone .dark { } for CSS variables', () => {
  // Match .dark { } that is NOT .dark:root
  // This pattern is silently ignored by NativeWind's CSS interop
  const standaloneDarkRegex = /(?<!\w)\.dark\s*\{[^}]*--color-/;
  expect(globalCss).not.toMatch(standaloneDarkRegex);
});

test('every light variable has a dark counterpart', () => {
  // Extract light variables from bare :root
  const lightSection = globalCss.match(/:root\s*\{([^}]+)\}/)?.[1] || '';
  const lightVars = extractVarNames(lightSection);

  // Extract dark variables from @media block
  const darkMediaRegex = /@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)\s*\{[^}]*:root\s*\{([^}]+)\}/;
  const darkSection = globalCss.match(darkMediaRegex)?.[1] || '';
  const darkVars = extractVarNames(darkSection);

  // Every light var must have a dark counterpart
  for (const v of lightVars) {
    expect(darkVars).toContain(v);
  }

  // Every dark var must have a light counterpart (no orphans)
  for (const v of darkVars) {
    expect(lightVars).toContain(v);
  }
});

test('dark surface colors are sufficiently different from light', () => {
  // Extract hex values for --color-bg-surface in both modes
  const lightSurface = globalCss.match(/:root\s*\{[^}]*--color-bg-surface:\s*(#[0-9a-fA-F]+)/)?.[1];
  const darkMediaRegex = /@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)\s*\{[^}]*:root\s*\{[^}]*--color-bg-surface:\s*(#[0-9a-fA-F]+)/;
  const darkSurface = globalCss.match(darkMediaRegex)?.[1];

  expect(lightSurface).toBeDefined();
  expect(darkSurface).toBeDefined();

  // Light and dark surface must be different
  expect(lightSurface).not.toBe(darkSurface);
});
