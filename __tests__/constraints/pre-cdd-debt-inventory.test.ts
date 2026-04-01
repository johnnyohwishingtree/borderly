import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Constraint: Pre-CDD Technical Debt Inventory
 *
 * This test doesn't enforce — it REPORTS. It scans the codebase for
 * all known categories of pre-CDD debt and outputs a summary. The
 * pipeline uses this to generate spec tests for the worst offenders.
 *
 * Categories:
 * 1. Dark mode: screens with light colors but incomplete dark: variants
 * 2. TouchableOpacity actions: should be Button components
 * 3. Inline styles: should be NativeWind classes
 * 4. Async loading: buttons with async handlers but no loading state
 * 5. flex-row spacing: rows without gap/space-x
 * 6. Missing testIDs: interactive elements without testID
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

test('pre-CDD debt inventory (informational — always passes)', () => {
  const screenFiles = getFiles(resolve(ROOT, 'src/screens'), '.tsx');
  const componentFiles = getFiles(resolve(ROOT, 'src/components'), '.tsx');
  const allUiFiles = [...screenFiles, ...componentFiles];

  const debt: Record<string, string[]> = {
    darkModeIncomplete: [],
    touchableOpacityActions: [],
    flexRowNoSpacing: [],
    noAsyncLoadingState: [],
  };

  for (const file of allUiFiles) {
    const content = readFileSync(file, 'utf-8');
    const rel = file.replace(ROOT + '/', '');

    // Dark mode: 5+ light colors, <3 dark: variants
    const lightColors = content.match(/(?:text|bg|border)-(?:gray|blue|green|red|yellow|white|black)-?\d*/g) || [];
    const darkColors = content.match(/dark:(?:text|bg|border)-/g) || [];
    if (lightColors.length >= 5 && darkColors.length < 3) {
      debt.darkModeIncomplete.push(`${rel} (${lightColors.length} light, ${darkColors.length} dark)`);
    }

    // TouchableOpacity with action verbs (should be Button)
    const actionPattern = /TouchableOpacity[\s\S]*?(Delete|Save|Submit|Create|Remove|Add|Cancel|Confirm)/;
    if (actionPattern.test(content)) {
      const count = (content.match(/<TouchableOpacity/g) || []).length;
      debt.touchableOpacityActions.push(`${rel} (${count} TouchableOpacity)`);
    }

    // flex-row without spacing
    const flexRows = content.match(/flex-row/g) || [];
    const spacedRows = content.match(/flex-row[^"]*(?:gap-|space-x-)/g) || [];
    const unspaced = flexRows.length - spacedRows.length;
    if (unspaced > 3) {
      debt.flexRowNoSpacing.push(`${rel} (${unspaced}/${flexRows.length} rows without gap)`);
    }

    // Async handlers without loading prop
    const asyncHandlers = content.match(/onPress=\{[^}]*async|onPress=\{[^}]*await/g) || [];
    const loadingProps = content.match(/loading[=:{]/g) || [];
    if (asyncHandlers.length > 0 && loadingProps.length === 0) {
      debt.noAsyncLoadingState.push(`${rel} (${asyncHandlers.length} async handlers, no loading)`);
    }
  }

  // Output the inventory
  const totalDebt = Object.values(debt).reduce((sum, arr) => sum + arr.length, 0);

  console.log('\n=== PRE-CDD DEBT INVENTORY ===');
  console.log(`Total: ${totalDebt} issues across ${allUiFiles.length} files\n`);

  for (const [category, items] of Object.entries(debt)) {
    if (items.length > 0) {
      console.log(`${category}: ${items.length} files`);
      items.slice(0, 5).forEach(i => console.log(`  - ${i}`));
      if (items.length > 5) console.log(`  ... and ${items.length - 5} more`);
      console.log();
    }
  }

  // This test always passes — it's informational
  // The debt numbers feed into the pipeline's /implement prioritization
  expect(totalDebt).toBeGreaterThanOrEqual(0);
});
