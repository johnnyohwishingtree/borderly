import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

/**
 * Spec: Button secondary variant should be text-only (no fill, no border).
 *
 * Decision: Secondary buttons are plain tinted text — Apple HIG "plain" style.
 *   Primary = solid blue fill. Secondary = blue text only. Outline = reserved
 *   for toggle/selection states (not paired with primary).
 * Rejected: Gray-filled secondary buttons — compete visually with primary,
 *   thick borders make outline look like a card.
 *
 * Confirm: Button pairs look cleaner with solid + text-only
 * Invalidate: Text-only buttons are too hard to discover as tappable
 */
test('Button secondary variant has no background fill', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/components/ui/Button.tsx'),
    'utf-8',
  );

  // Secondary should NOT have bg-gray or bg-* fill (except bg-transparent)
  const secondaryMatch = content.match(/secondary:\s*['"]([^'"]+)['"]/);
  expect(secondaryMatch).toBeTruthy();
  expect(secondaryMatch![1]).not.toMatch(/bg-gray|bg-blue|bg-\w+-\d/);
  expect(secondaryMatch![1]).toMatch(/bg-transparent|^[^b]/);
});

test('Button secondary variant has no border', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/components/ui/Button.tsx'),
    'utf-8',
  );

  const secondaryMatch = content.match(/secondary:\s*['"]([^'"]+)['"]/);
  expect(secondaryMatch).toBeTruthy();
  expect(secondaryMatch![1]).not.toMatch(/border-\d|border-\w+-\d/);
});

test('Button secondary text is tinted (not white)', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/components/ui/Button.tsx'),
    'utf-8',
  );

  // At least one secondary text style line should reference blue, not white
  expect(content).toMatch(/secondary:.*text-blue/);
});
