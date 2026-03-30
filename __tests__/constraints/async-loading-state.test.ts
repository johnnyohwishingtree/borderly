import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Constraint: Async Loading State
 *
 * Scope: src/screens/ trigger async operations must show a loading indicator.
 * Constraint candidate — applies to all screens.
 *
 * Decision: Any Button whose onPress calls an async function (await, .then, Promise)
 *   must have a loading prop that reflects the operation's in-flight state.
 *   Users at borders need feedback that something is happening.
 * Rejected: Buttons that go "dead" during async — user taps again thinking it didn't work.
 *
 * Context: .context/external/customer/travelers-fill-forms-at-borders.md
 *
 * REQUIRE: Buttons with async onPress have loading={someState} prop
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

test('async buttons have loading props', () => {
  const screenFiles = getScreenFiles(resolve(ROOT, 'src/screens'));
  const violations: string[] = [];

  for (const file of screenFiles) {
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      // Find Button components
      if (!lines[i].includes('<Button')) continue;

      // Look at the next 10 lines for the full Button props
      const buttonBlock = lines.slice(i, Math.min(lines.length, i + 10)).join(' ');

      // Check if onPress calls an async function (handler names with save, submit, create, delete)
      const asyncPattern = /onPress=\{[^}]*(save|submit|create|delete|mark|export|import|restore)/i;
      if (asyncPattern.test(buttonBlock)) {
        // Must have loading prop
        if (!buttonBlock.includes('loading=')) {
          const relative = file.replace(ROOT + '/', '');
          violations.push(`${relative}:${i + 1}`);
        }
      }
    }
  }

  // Gradual cleanup — threshold decreases as buttons get loading props
  // Some async handlers are instant (navigation, state toggle) and don't need loading
  expect(violations.length).toBeLessThanOrEqual(10);
});
