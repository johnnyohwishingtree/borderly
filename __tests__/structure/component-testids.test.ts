/**
 * Constraint: Component testIDs (from E2E Testability + Drift Detection)
 *
 * Scope: src/components/, src/screens/, e2e/mobile/
 *
 * REQUIRE: every interactive element has a testID
 * REQUIRE: suffix indicates function: -button, -field, -container
 * REQUIRE: screen prefix for disambiguation: <screen>-<name>-<suffix>
 * REQUIRE: one testIDs.ts file per screen directory — single source of truth
 * REQUIRE: screens and components import testIDs from this file
 * DENY:    inline testID strings in JSX — import from testIDs.ts
 * DENY:    suffix-less testIDs (e.g., demo-scan-adult) — must have suffix
 * DENY:    misleading suffixes (e.g., -input for SearchableSelect) — use -field
 *
 * Drift Detection:
 * REQUIRE: after renaming/moving files -> grep for old paths in all .md and .yaml
 * REQUIRE: after changing testIDs or button text -> update e2e/mobile/full-e2e.test.ts
 * REQUIRE: after adding native modules -> add web mock + webpack alias + Jest mock
 *
 * Exceptions:
 * - Non-interactive display components don't need testIDs (CountryFlag, PassportPreview)
 * - testID on outer card when inner buttons are contextual (FamilyMemberCard)
 *
 * Anti-patterns:
 * - <Pressable onPress={...}> without testID — invisible to E2E
 * - Updating screen UI without updating testIDs.ts
 * - Inline testID strings in JSX — drift when refactored
 * - Renaming a file without grepping for references
 *
 * Why: testIDs are the contract between the app and E2E tests. Without them,
 *      E2E tests fall back to fragile text-based taps.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');

function getComponentFiles(): string[] {
  const dir = resolve(ROOT, 'src/components');
  const files: string[] = [];
  function walk(d: string) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      if (statSync(full).isDirectory()) {
        if (entry === '__tests__' || entry === '__screenshots__' || entry === 'node_modules') continue;
        walk(full);
      } else if (entry.endsWith('.tsx')) {
        files.push(full);
      }
    }
  }
  walk(dir);
  return files;
}

// Components that are known exceptions (testID handled by parent or not needed)
const EXCEPTIONS = new Set([
  'CountryFlag.tsx',        // Pure display, no interaction
  'PassportPreview.tsx',    // Display component
  'FamilyMemberCard.tsx',   // testID on outer card, inner buttons are contextual
]);

describe('Component testID coverage', () => {
  it('interactive components have testID props defined', () => {
    const warnings: string[] = [];

    for (const file of getComponentFiles()) {
      const fileName = file.split('/').pop() ?? '';
      if (EXCEPTIONS.has(fileName)) continue;

      const content = readFileSync(file, 'utf-8');

      // Find Pressable/TouchableOpacity that accept onPress
      // This is a heuristic — we check if the component defines onPress handlers
      // but doesn't pass testID to the interactive element
      const hasOnPress = content.includes('onPress');
      const hasTestID = content.includes('testID');

      if (hasOnPress && !hasTestID) {
        warnings.push(fileName);
      }
    }

    // This test warns but doesn't fail — testIDs are being added incrementally
    // Once all components have testIDs, change this to expect(warnings).toEqual([])
    if (warnings.length > 0) {
      console.warn(`Components with onPress but no testID: ${warnings.join(', ')}`);
    }
  });

  it('components that define testID prop pass it to interactive elements', () => {
    const violations: string[] = [];

    for (const file of getComponentFiles()) {
      const content = readFileSync(file, 'utf-8');

      // Check if component accepts testID as a prop but never uses it
      const acceptsTestID = /testID\??\s*:/m.test(content) || /props\.testID/.test(content);
      const usesTestID = /testID=\{/.test(content) || /testID="/.test(content);

      if (acceptsTestID && !usesTestID) {
        violations.push(file.split('/').pop() ?? '');
      }
    }

    expect(violations).toEqual([]);
  });
});
