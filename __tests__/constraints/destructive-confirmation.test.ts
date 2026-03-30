import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Constraint: Destructive Confirmation
 *
 * Scope: src/hooks/, src/screens/ (delete, remove, clear data) must show a confirmation
 * dialog before executing.
 * Constraint candidate — applies to all hooks and screens.
 *
 * Decision: All delete/remove handlers call Alert.alert() for confirmation before
 *   performing the destructive action. Users at borders are distracted — accidental
 *   taps on "Delete Trip" must be recoverable.
 * Rejected: Immediate deletion without confirmation — too easy to lose data accidentally.
 *
 * Context: .context/external/customer/travelers-fill-forms-at-borders.md
 *
 * REQUIRE: Functions named handle*Delete*, handle*Remove*, or delete* that call
 *   a store/service delete method must also call Alert.alert
 */

function getAllTsFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) results.push(...getAllTsFiles(full));
      else if ((full.endsWith('.ts') || full.endsWith('.tsx')) && !full.includes('.test.') && !full.includes('__')) results.push(full);
    }
  } catch { /* skip */ }
  return results;
}

test('destructive actions show confirmation before executing', () => {
  const files = [
    ...getAllTsFiles(resolve(ROOT, 'src/hooks')),
    ...getAllTsFiles(resolve(ROOT, 'src/screens')),
  ];

  const violations: string[] = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');

    // Find functions that look like delete/remove handlers
    const destructivePatterns = [
      ...content.matchAll(/(?:handle|on)(?:Delete|Remove)\w*\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{([\s\S]*?)(?:\n  \};|\n  \})/g),
      ...content.matchAll(/(?:handle|on)(?:Delete|Remove)\w*\s*=\s*useCallback\(\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{([\s\S]*?)(?:\n  \},|\n  \})/g),
    ];

    for (const match of destructivePatterns) {
      const body = match[1];
      // Must contain Alert.alert or Alert before calling delete/remove on store/service
      if (!body.includes('Alert.alert') && !body.includes('Alert(')) {
        const relative = file.replace(ROOT + '/', '');
        violations.push(`${relative}: ${match[0].slice(0, 60).trim()}...`);
      }
    }
  }

  expect(violations).toEqual([]);
});
