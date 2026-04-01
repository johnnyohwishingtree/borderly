import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Constraint: Icon and image components must include built-in spacing.
 *
 * When a reusable component renders a small visual element (icon, flag,
 * avatar, badge) that's typically placed inline next to text, it must
 * include marginRight or gap so consumers don't need to add their own
 * spacing. Without this, the icon touches adjacent text — violating
 * Apple HIG's content spacing guidelines (minimum 8pt between elements).
 *
 * Scope: src/components/ — any component that renders a fixed-size
 *   visual element (Image, SvgXml, View with fixed width/height)
 * Rules:
 *   - Components rendering icons/flags/avatars must have margin or gap
 *     on the outermost element or the visual element itself
 * Anti-patterns:
 *   - CountryFlag renders a 24x16 flag with no marginRight — consumers
 *     must add their own ml-2 to the adjacent Text
 */

/** Icon-like components that render inline visual elements */
const ICON_COMPONENTS = [
  { file: 'src/components/trips/CountryFlag.tsx', name: 'CountryFlag' },
];

test('icon/image components include built-in spacing', () => {
  const violations: string[] = [];

  for (const { file, name } of ICON_COMPONENTS) {
    const content = readFileSync(resolve(ROOT, file), 'utf-8');

    // Check that the visual element (Image, SvgXml, or fixed-size View)
    // has marginRight, mr-, or gap in its parent
    const hasSpacing =
      content.includes('marginRight') ||
      content.includes('mr-') ||
      content.includes('gap-') ||
      content.includes('space-x-');

    if (!hasSpacing) {
      violations.push(
        `${file}: ${name} renders a visual element without built-in spacing. ` +
        `Add marginRight to the icon/image so consumers don't need to add their own.`,
      );
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `${violations.length} icon component(s) missing built-in spacing:\n\n` +
      violations.join('\n'),
    );
  }
});
