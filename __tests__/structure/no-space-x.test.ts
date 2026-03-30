/**
 * Constraint: No space-x-* Classes (from Styling policy)
 *
 * Scope: src/components/, src/screens/
 *
 * DENY:    space-x-* Tailwind classes — use gap-* instead
 * REQUIRE: NativeWind className for all styling
 * REQUIRE: Tailwind spacing scale (p-2, p-4) — no arbitrary values (p-[13px])
 *
 * Why: space-x-* uses CSS margins that break when combined with flex-wrap
 *      (wrapped items get an unwanted left margin). gap-* works correctly
 *      in both wrapped and non-wrapped layouts.
 *      See .context/external/tools/nativewind-is-tailwind-for-rn.md
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.resolve(__dirname, '../../src');

function collectTsxFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      results.push(...collectTsxFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('no space-x-* classes', () => {
  const files = collectTsxFiles(SRC_DIR);

  it('should find TSX/TS files to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('no source file should use space-x-* (use gap-* instead)', () => {
    const SPACE_X_PATTERN = /space-x-\d+/g;
    const violations: Array<{ file: string; line: number; text: string }> = [];

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (SPACE_X_PATTERN.test(lines[i])) {
          violations.push({
            file: path.relative(SRC_DIR, filePath),
            line: i + 1,
            text: lines[i].trim(),
          });
          SPACE_X_PATTERN.lastIndex = 0;
        }
      }
    }

    if (violations.length > 0) {
      const report = violations
        .map((v) => `  ${v.file}:${v.line} — ${v.text}`)
        .join('\n');
      throw new Error(
        `Found ${violations.length} use(s) of space-x-* in src/. Use gap-* instead:\n\n${report}\n\n` +
          'space-x-* uses margins that break with flex-wrap. gap-* works correctly in all layouts.'
      );
    }
  });
});
