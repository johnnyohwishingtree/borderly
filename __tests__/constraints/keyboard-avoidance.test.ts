import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Constraint: Keyboard Avoidance
 *
 * Scope: src/screens/ inputs must handle keyboard avoidance.
 * Constraint candidate — applies to all screens with form inputs.
 *
 * Decision: Any screen that renders Input, TextInput, or SearchableSelect must
 *   use KeyboardAvoidingView or keyboardDismissMode on ScrollView.
 * Rejected: No keyboard handling — inputs get hidden behind the keyboard on iOS,
 *   users can't see what they're typing.
 *
 * Context: .context/external/customer/travelers-fill-forms-at-borders.md
 *
 * REQUIRE: Screens with <Input or <TextInput must have KeyboardAvoidingView
 *   or ScrollView with keyboardDismissMode
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

test('screens with text inputs have keyboard avoidance', () => {
  const screenFiles = getScreenFiles(resolve(ROOT, 'src/screens'));
  const violations: string[] = [];

  for (const file of screenFiles) {
    const content = readFileSync(file, 'utf-8');

    const hasInputs = content.includes('<Input') || content.includes('<TextInput') || content.includes('<SearchableSelect');
    if (!hasInputs) continue;

    // Sub-components rendered inside parent screens that have keyboard handling
    if (file.includes('LegCard') || file.includes('Destinations')) continue;

    const hasKeyboardHandling =
      content.includes('KeyboardAvoidingView') ||
      content.includes('keyboardDismissMode') ||
      content.includes('keyboardShouldPersistTaps');

    if (!hasKeyboardHandling) {
      const relative = file.replace(ROOT + '/', '');
      violations.push(relative);
    }
  }

  expect(violations).toEqual([]);
});
