/**
 * Structural test: hook return value limit.
 *
 * Hooks must not return more than 10 top-level keys.
 * Oversized return types should be grouped into named objects.
 *
 * See: .knowledge/policies/state/hook-conventions.md
 */

import { readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');
const HOOKS_DIR = resolve(ROOT, 'src/hooks');
const MAX_RETURN_KEYS = 10;

/**
 * Pre-existing violations that need future stories to fix.
 * Each entry should be removed once the hook is refactored.
 * Adding a NEW hook here is not allowed — fix the hook instead.
 */
const KNOWN_VIOLATIONS = new Set<string>();

/**
 * Parse the top-level return keys from a hook file.
 * Looks for `return {` and counts top-level keys (lines with a word
 * followed by a colon or comma at the base indent level).
 */
function countReturnKeys(filePath: string): { hookName: string; count: number } | null {
  const content = readFileSync(filePath, 'utf-8');
  const hookName = filePath.split('/').pop()!.replace('.ts', '');

  // Find the last `return {` (the hook's return statement)
  const lines = content.split('\n');
  let returnStartIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^\s*return\s*\{/.test(lines[i])) {
      returnStartIdx = i;
      break;
    }
  }

  if (returnStartIdx === -1) return null;

  let keyCount = 0;
  let braceDepth = 0;

  for (let i = returnStartIdx; i < lines.length; i++) {
    const line = lines[i];

    // Track brace depth relative to the return statement
    for (const ch of line) {
      if (ch === '{') braceDepth++;
      if (ch === '}') braceDepth--;
    }

    // Only count keys at depth 1 (directly inside the return object)
    if (braceDepth === 1 && i > returnStartIdx) {
      const trimmed = line.trim();
      // Skip empty lines, comments, and spread operators
      if (trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('...')) continue;
      // Match key patterns: `keyName,` or `keyName: value,` or `keyName` (last key without comma)
      if (/^[a-zA-Z_]\w*\s*[,:}]/.test(trimmed) || /^[a-zA-Z_]\w*$/.test(trimmed)) {
        keyCount++;
      }
    }

    // Stop when we've closed the return object
    if (braceDepth === 0 && i > returnStartIdx) break;
  }

  return { hookName, count: keyCount };
}

function getHookFiles(): string[] {
  return readdirSync(HOOKS_DIR)
    .filter(f =>
      f.endsWith('.ts') &&
      f.startsWith('use') &&
      f !== 'index.ts' &&
      !f.endsWith('.test.ts') &&
      !f.includes('Types') &&
      !f.includes('Helpers'),
    )
    .map(f => resolve(HOOKS_DIR, f));
}

describe('Hook return value limit', () => {
  it('no NEW hook returns more than 10 top-level keys', () => {
    const hookFiles = getHookFiles();
    const violations: string[] = [];

    for (const filePath of hookFiles) {
      const result = countReturnKeys(filePath);
      if (result && result.count > MAX_RETURN_KEYS && !KNOWN_VIOLATIONS.has(result.hookName)) {
        violations.push(`${result.hookName} returns ${result.count} top-level keys (max ${MAX_RETURN_KEYS})`);
      }
    }

    expect(violations).toEqual([]);
  });

  it('known violations list does not include hooks that are already compliant', () => {
    const hookFiles = getHookFiles();
    const stillViolating = new Set<string>();

    for (const filePath of hookFiles) {
      const result = countReturnKeys(filePath);
      if (result && result.count > MAX_RETURN_KEYS) {
        stillViolating.add(result.hookName);
      }
    }

    const staleEntries = [...KNOWN_VIOLATIONS].filter(name => !stillViolating.has(name));
    if (staleEntries.length > 0) {
      throw new Error(
        `These hooks are now compliant — remove them from KNOWN_VIOLATIONS:\n` +
        staleEntries.map(e => `  - ${e}`).join('\n'),
      );
    }
  });
});
