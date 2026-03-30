import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Spec: Every screen must use ScreenContainer or SafeAreaView to respect safe area insets.
 * Constraint candidate — applies to all screens.
 *
 * Decision: All screens wrap content in ScreenContainer (which handles safe area insets,
 *   max-width on web/tablet, and responsive padding). Prevents content from rendering
 *   behind the notch, home indicator, or status bar.
 * Rejected: Raw View as root — content clips behind system UI on notched devices.
 *
 * REQUIRE: Every screen's root component is ScreenContainer or SafeAreaView
 */

function getScreenFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) results.push(...getScreenFiles(full));
      else if (full.endsWith('.tsx') && !full.includes('.test.') && full.includes('Screen.tsx')) results.push(full);
    }
  } catch { /* skip */ }
  return results;
}

test.skip('every screen uses ScreenContainer or SafeAreaView', () => {
  const screenFiles = getScreenFiles(resolve(ROOT, 'src/screens'));
  const violations: string[] = [];

  for (const file of screenFiles) {
    const content = readFileSync(file, 'utf-8');
    const hasSafeArea =
      content.includes('ScreenContainer') ||
      content.includes('SafeAreaView');

    if (!hasSafeArea) {
      const relative = file.replace(ROOT + '/', '');
      violations.push(relative);
    }
  }

  expect(violations).toEqual([]);
});
