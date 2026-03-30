import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Constraint: No Border Shorthand in Button Component
 *
 * Scope: src/components/ui/Button.tsx
 *
 * DENY: bare `border` class (without width number) in Button variant styles
 * REQUIRE: use `border-2`, `border-0`, etc. — always explicit width
 *
 * Context: .context/external/tools/nativewind-border-shorthand.md
 *
 * NativeWind's bare `border` shorthand causes runtime crashes during React Navigation
 * stack transitions when the component unmounts. The Button component renders on every
 * screen and is active during navigator switches, making it the highest-risk component
 * for this bug. Always use explicit border widths in Button variant strings.
 */
test('Button variant styles use explicit border widths, not bare border', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/components/ui/Button.tsx'),
    'utf-8',
  );

  // Extract all variant style strings
  const variantStrings = [...content.matchAll(/(?:primary|secondary|outline):\s*'([^']+)'/g)].map(m => m[1]);

  for (const style of variantStrings) {
    // Split into individual classes
    const classes = style.split(/\s+/);
    for (const cls of classes) {
      // bare `border` without a dash suffix is the dangerous one
      if (cls === 'border') {
        throw new Error(
          `Found bare "border" class in Button variant: "${style}". ` +
          `Use "border-2" or "border-0" instead. See .context/external/tools/nativewind-border-shorthand.md`
        );
      }
    }
  }
});
