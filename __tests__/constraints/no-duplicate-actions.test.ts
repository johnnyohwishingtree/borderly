/**
 * Constraint: No duplicate action entry points on the same screen view.
 *
 * Scope: src/screens/ — all screen files
 *
 * Rules:
 *   - DENY: The same onPress handler appears on two or more interactive
 *     elements within the same render branch (e.g., a "+" icon button AND
 *     a "Add Item" CTA that both call handleAdd).
 *   - A render branch is a contiguous JSX return — either the main return
 *     or an early return (empty state, loading, error).
 *
 * Why: Duplicate entry points for the same action add cognitive load and
 * visual clutter. Users must decide which button to tap, slowing them down.
 * One clear CTA per action per view.
 * See: .context/external/cognitive/fewer-fields-higher-completion.md
 *
 * Exceptions:
 *   - The same action appearing in DIFFERENT render branches (e.g., empty
 *     state has "Add" and populated state also has "Add") is fine — only
 *     one branch renders at a time.
 *   - FAB + contextual menu (different interaction patterns) is acceptable
 *     if they serve different purposes (e.g., FAB = quick add, menu = batch).
 *
 * Anti-patterns:
 *   - Header "+" icon AND body "Add Item" button in same view
 *   - Two "Save" buttons visible simultaneously
 *   - Icon button in toolbar AND text button in content for same action
 */

import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Split a screen file's default export into its JSX render branches.
 * Each early `return (` and the final `return (` is a separate branch.
 */
function extractRenderBranches(content: string): string[] {
  const branches: string[] = [];

  // Find the default export function body
  const exportMatch = content.match(
    /export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{/,
  );
  if (!exportMatch) return branches;

  const fnStart = exportMatch.index! + exportMatch[0].length;
  const afterExport = content.slice(fnStart);

  // Split on `return (` — each is a render branch
  const returnParts = afterExport.split(/\breturn\s*\(/);
  // Skip the first part (code before any return)
  for (let i = 1; i < returnParts.length; i++) {
    // Take content up to the matching closing paren
    // (approximate — good enough for structural analysis)
    branches.push(returnParts[i]);
  }

  return branches;
}

/**
 * Find all onPress handler names used in a render branch.
 * Returns a map of handler name → count of interactive elements using it.
 */
function findOnPressHandlers(branch: string): Map<string, number> {
  const handlers = new Map<string, number>();

  // Match onPress={handlerName} or onPress={() => handlerName(...)}
  const directPattern = /onPress=\{(\w+)\}/g;
  const arrowPattern = /onPress=\{(?:\(\)\s*=>|(?:\([^)]*\)\s*=>))\s*\{?\s*(\w+)\s*\(/g;

  for (const match of branch.matchAll(directPattern)) {
    const name = match[1];
    handlers.set(name, (handlers.get(name) || 0) + 1);
  }

  for (const match of branch.matchAll(arrowPattern)) {
    const name = match[1];
    handlers.set(name, (handlers.get(name) || 0) + 1);
  }

  return handlers;
}

function getScreenFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getScreenFiles(fullPath));
    } else if (entry.name.endsWith('.tsx') && !entry.name.includes('.test.')) {
      results.push(fullPath);
    }
  }
  return results;
}

test('no screen has duplicate onPress handlers in the same render branch', () => {
  const screenFiles = getScreenFiles(resolve(ROOT, 'src/screens'));
  const violations: string[] = [];

  for (const file of screenFiles) {
    const content = readFileSync(file, 'utf-8');
    const relPath = file.replace(ROOT + '/', '');
    const branches = extractRenderBranches(content);

    for (let i = 0; i < branches.length; i++) {
      const handlers = findOnPressHandlers(branches[i]);

      for (const [handler, count] of handlers) {
        // Skip generic/framework handlers and modal patterns
        if (['navigation', 'goBack', 'setIsOpen', 'onPress'].includes(handler)) continue;
        // Skip state setters — same setter is often called with different args
        if (handler.startsWith('set')) continue;
        // Skip modal close/reset patterns (backdrop + X button is standard)
        if (['handleClose', 'handleCloseFilterModal', 'handleCloseFullScreen',
             'reset', 'clearSearch', 'onClose', 'onDismiss'].includes(handler)) continue;
        // Skip inline arrow functions that aren't handler references
        if (handler === 'e' || handler === 'item' || handler === 'opt') continue;

        if (count > 1) {
          violations.push(
            `${relPath} branch ${i}: "${handler}" used ${count} times`,
          );
        }
      }
    }
  }

  expect(violations).toEqual([]);
});
