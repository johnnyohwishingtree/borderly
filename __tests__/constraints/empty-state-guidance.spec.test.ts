import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Spec: Screens that render lists must handle the empty state with guidance text.
 * Constraint candidate — applies to all screens with FlatList or array.map.
 *
 * Decision: Every list/collection must show helpful empty state (icon + text + CTA)
 *   when the data is empty. Users should never see a blank screen.
 * Rejected: Blank space when no data — user thinks the app is broken.
 *
 * Context: .context/external/customer/travelers-fill-forms-at-borders.md
 *
 * REQUIRE: Screens with FlatList must use ListEmptyComponent or equivalent
 * REQUIRE: Screens with .map() must have a conditional empty state
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

test.skip('screens with lists have empty state handling', () => {
  const screenFiles = getScreenFiles(resolve(ROOT, 'src/screens'));
  const violations: string[] = [];

  for (const file of screenFiles) {
    const content = readFileSync(file, 'utf-8');

    // Check FlatList usage
    if (content.includes('<FlatList')) {
      if (!content.includes('ListEmptyComponent') && !content.includes('emptyState') && !content.includes('EmptyState')) {
        const relative = file.replace(ROOT + '/', '');
        violations.push(`${relative}: FlatList without ListEmptyComponent`);
      }
    }

    // Check array.map with data that could be empty
    // Look for patterns like: items.map(, legs.map(, trips.map(
    const mapPatterns = content.match(/\b(items|legs|trips|members|profiles|forms|travelers|qrCodes|results)\b\.map\(/g);
    if (mapPatterns && mapPatterns.length > 0) {
      // Must have a length check or empty state nearby
      if (!content.includes('.length === 0') && !content.includes('.length < 1') && !content.includes('emptyState') && !content.includes('EmptyState') && !content.includes('No ') && !content.includes('no ')) {
        const relative = file.replace(ROOT + '/', '');
        violations.push(`${relative}: .map() without empty state check`);
      }
    }
  }

  expect(violations).toEqual([]);
});
