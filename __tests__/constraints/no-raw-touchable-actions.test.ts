import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Constraint: No Raw Touchable Actions
 *
 * Scope: src/screens/
 *
 * DENY: TouchableOpacity for primary/secondary actions must use the Button component, not raw TouchableOpacity.
 * Constraint candidate — applies to all screens.
 *
 * Decision: All interactive actions go through @/components/ui Button which provides
 *   consistent variants, accessibility props, haptic feedback, and design tokens.
 * Rejected: Raw TouchableOpacity for actions — no variant consistency, no haptics,
 *   no accessibility defaults.
 *
 * Exceptions: TouchableOpacity is allowed for:
 * - Navigation list rows (settings items, profile rows)
 * - Card press handlers (entire card is tappable)
 * - Custom interactive elements that aren't buttons (swipe areas, drag handles)
 * - Tab/filter selectors with dynamic styling
 *
 * The test checks for TouchableOpacity with button-like text content (action verbs).
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

test('screens do not use TouchableOpacity for primary/secondary actions', () => {
  const screenFiles = getScreenFiles(resolve(ROOT, 'src/screens'));
  const violations: string[] = [];

  // Action verbs that indicate a button, not a navigation row
  const actionPattern = /TouchableOpacity[\s\S]*?(Delete|Save|Submit|Create|Remove|Add|Cancel|Confirm|Mark|Enable|Skip|Continue|Start|Fill|Edit)/;

  for (const file of screenFiles) {
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('<TouchableOpacity')) {
        // Check next 10 lines for action text
        const block = lines.slice(i, Math.min(lines.length, i + 10)).join(' ');
        if (actionPattern.test(block)) {
          // Exclude if it has accessibilityRole="link" or is a navigation row
          if (block.includes('accessibilityRole="link"') || block.includes('navigate(')) continue;
          const relative = file.replace(ROOT + '/', '');
          violations.push(`${relative}:${i + 1}`);
        }
      }
    }
  }

  // Gradual cleanup — threshold decreases as screens are migrated to Button
  expect(violations.length).toBeLessThanOrEqual(12);
});
