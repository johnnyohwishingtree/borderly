/**
 * Constraint: Utils Boundary
 *
 * Scope: src/utils/, src/services/
 *
 * REQUIRE: utils are pure functions — no state, no storage, no side effects
 * REQUIRE: utils are stateless — same input always produces same output
 * DENY:    utils creating MMKV/storage instances (use src/services/storage/)
 * DENY:    utils with their own lifecycle (init, cleanup, sessions)
 * DENY:    utils with 5+ files in a subdirectory — promote to a service
 *
 * What belongs in utils/: pure transformers, formatters, validators, constants, test helpers
 * What belongs in services/: anything with state, storage, lifecycle, or 5+ files
 *
 * Exceptions:
 * - theme.ts uses reactive state for dark mode — OK because it's a React hook re-exported from hooks/
 * - piiSanitizer.ts manages a field list — borderline but stateless (list is constant)
 * - testHelpers and validation subdirectories are exempt from the 5-file limit
 *
 * Anti-patterns:
 * - `new MMKV({ id: 'custom' })` in utils — belongs in a service
 * - `performanceOptimization/` (5 files, own MMKV) — is a service, not a utility
 * - `automation/` (6 files) — duplicates src/services/automation/
 * - `portal/` (5 files, detection logic) — overlaps src/services/portal/
 *
 * Why: Utils must be pure so they're trivially testable and have no hidden
 *      dependencies. Stateful code belongs in services with explicit lifecycle.
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
