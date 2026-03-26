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

/**
 * Known violations that will be fixed by future stories (#947, #948).
 * Each entry is removed as the directory is promoted to a service.
 */
const KNOWN_VIOLATIONS = new Set(['portal', 'performanceOptimization']);

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

function isInKnownViolation(filePath: string): boolean {
  for (const dir of KNOWN_VIOLATIONS) {
    if (filePath.includes(`utils/${dir}/`)) return true;
  }
  return false;
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
      if (KNOWN_VIOLATIONS.has(entry)) continue;

      const files = readdirSync(fullPath).filter(
        f => (f.endsWith('.ts') || f.endsWith('.tsx')) && f !== 'index.ts',
      );

      if (files.length >= 5) {
        violations.push(`src/utils/${entry}/ has ${files.length} non-index files (max 4)`);
      }
    }

    expect(violations).toEqual([]);
  });

  it('known violations still exist (remove from KNOWN_VIOLATIONS when fixed)', () => {
    for (const dir of KNOWN_VIOLATIONS) {
      const fullPath = join(UTILS_DIR, dir);
      expect(statSync(fullPath).isDirectory()).toBe(true);
    }
  });

  it('does not export lifecycle methods from src/utils/', () => {
    const lifecyclePattern = /export\s+(async\s+)?function\s+(init|cleanup|connect|disconnect)\b/;
    const violations = allFiles
      .filter(f => !isInKnownViolation(f.path) && lifecyclePattern.test(f.content))
      .map(f => f.path);

    expect(violations).toEqual([]);
  });
});
