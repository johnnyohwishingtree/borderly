import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Constraint: flex-row containers with 2+ children should use gap
 * or space-x for consistent spacing between elements.
 *
 * When elements are placed side-by-side in a flex-row without gap,
 * icons touch text, buttons touch labels. Apple HIG requires minimum
 * 8pt between adjacent interactive/visual elements.
 *
 * The fix: use `gap-2` (8px), `gap-3` (12px), or `space-x-*` on
 * flex-row containers. Individual margins (mr-2, ml-3) work but are
 * harder to maintain consistently.
 *
 * Scope: src/screens/, src/components/ — .tsx files with flex-row
 * Rules:
 *   - flex-row Views with children should have gap-*, space-x-*, or
 *     children with individual margins
 *   - Threshold-based: flag violations above threshold fail
 * Exceptions:
 *   - Single-child flex-row (no spacing needed)
 *   - flex-row used purely for alignment (items-center) with explicit margins
 */

function getAllTsxFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) results.push(...getAllTsxFiles(full));
      else if (entry.name.endsWith('.tsx') && !entry.name.includes('.test.')) results.push(full);
    }
  } catch { /* dir may not exist */ }
  return results;
}

test('flex-row containers use gap or space-x for child spacing', () => {
  const files = [
    ...getAllTsxFiles(resolve(ROOT, 'src/screens')),
    ...getAllTsxFiles(resolve(ROOT, 'src/components')),
  ];

  let totalFlexRows = 0;
  let rowsWithSpacing = 0;

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Find flex-row on View/TouchableOpacity elements
      if (line.includes('flex-row') && (line.includes('className') || line.includes('class='))) {
        totalFlexRows++;
        // Check if this line or the element has gap/space-x
        if (line.includes('gap-') || line.includes('space-x-')) {
          rowsWithSpacing++;
        }
        // Also count if children have individual margins (mr- or ml-)
        // Check next 5 lines for margin indicators
        const block = lines.slice(i, Math.min(lines.length, i + 8)).join(' ');
        if (block.includes('mr-') || block.includes('ml-') || block.includes('marginRight') || block.includes('marginLeft')) {
          rowsWithSpacing++;
        }
      }
    }
  }

  const percentWithSpacing = totalFlexRows > 0 ? (rowsWithSpacing / totalFlexRows) * 100 : 100;

  // At least 66% of flex-row containers should have explicit spacing
  // Threshold increases as we clean up the codebase.
  // New flex-row containers MUST include gap/space-x/margin.
  expect(percentWithSpacing).toBeGreaterThanOrEqual(66);
});
