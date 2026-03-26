/**
 * Structural test: utils boundary enforcement.
 *
 * Verifies the 3 core rules from the utils-boundary policy:
 * 1. No MMKV/Keychain/storage imports in src/utils/
 * 2. No utils subdirectory with 5+ .ts/.tsx files (must be a service)
 * 3. No lifecycle methods (init, cleanup, connect, disconnect exports) in utils
 *
 * See: .knowledge/policies/architecture/utils-boundary.md
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');
const UTILS_DIR = resolve(ROOT, 'src/utils');

/** Subdirectories exempt from the 5-file limit */
const EXEMPT_DIRS = new Set(['testHelpers', 'validation']);

function getAllUtilsFiles(): { path: string; content: string }[] {
  const results: { path: string; content: string }[] = [];

  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      if (statSync(fullPath).isDirectory()) {
        walk(fullPath);
      } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
        results.push({
          path: fullPath.replace(`${ROOT}/`, ''),
          content: readFileSync(fullPath, 'utf-8'),
        });
      }
    }
  }

  walk(UTILS_DIR);
  return results;
}

describe('Utils boundary', () => {
  const allFiles = getAllUtilsFiles();

  it('does not import react-native-mmkv or react-native-keychain in src/utils/', () => {
    const storageImport = /from\s+['"]react-native-(mmkv|keychain)['"]/;
    const violations = allFiles
      .filter(f => storageImport.test(f.content))
      .map(f => f.path);

    expect(violations).toEqual([]);
  });

  it('does not have utils subdirectories with 5+ files (must be a service)', () => {
    const entries = readdirSync(UTILS_DIR);
    const violations: string[] = [];

    for (const entry of entries) {
      const fullPath = join(UTILS_DIR, entry);
      if (!statSync(fullPath).isDirectory()) continue;
      if (EXEMPT_DIRS.has(entry)) continue;

      const files = readdirSync(fullPath).filter(
        f => (f.endsWith('.ts') || f.endsWith('.tsx')) && f !== 'index.ts',
      );

      if (files.length >= 5) {
        violations.push(`src/utils/${entry}/ has ${files.length} non-index files (max 4)`);
      }
    }

    expect(violations).toEqual([]);
  });

  it('does not export lifecycle methods from src/utils/', () => {
    const lifecyclePattern = /export\s+(async\s+)?function\s+(init|cleanup|connect|disconnect)\b/;
    const violations = allFiles
      .filter(f => lifecyclePattern.test(f.content))
      .map(f => f.path);

    expect(violations).toEqual([]);
  });
});
