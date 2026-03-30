import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Spec: Red color classes should only appear near destructive/error content.
 * Constraint candidate — applies to all screens.
 *
 * Decision: Red = destructive actions + error states only.
 * Rejected: Red for decorative icons, badges, or emphasis — confuses users about severity.
 *
 * Note: This checks that text-red/bg-red usage is near error/delete/remove/warning context,
 * not used for visual decoration.
 */

function getScreenFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        results.push(...getScreenFiles(full));
      } else if (full.endsWith('.tsx') && !full.includes('.test.')) {
        results.push(full);
      }
    }
  } catch { /* skip */ }
  return results;
}

test.skip('red color classes only appear in error/destructive contexts', () => {
  const screenFiles = getScreenFiles(resolve(ROOT, 'src/screens'));
  const violations: string[] = [];

  const errorContext = /error|delete|remove|destroy|warning|invalid|fail|danger|destructive|expired|reject/i;

  for (const file of screenFiles) {
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (/text-red|bg-red/.test(lines[i])) {
        // Check surrounding lines (±5) for error/destructive context
        const context = lines.slice(Math.max(0, i - 5), Math.min(lines.length, i + 6)).join(' ');
        if (!errorContext.test(context)) {
          const relative = file.replace(ROOT + '/', '');
          violations.push(`${relative}:${i + 1}: red used without error/destructive context`);
        }
      }
    }
  }

  expect(violations).toEqual([]);
});
