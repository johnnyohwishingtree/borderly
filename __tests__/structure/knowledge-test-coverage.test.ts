/**
 * Constraint: Testable Architecture (Meta-Policy)
 *
 * Scope: .knowledge/, __tests__/structure/, src/ (directory structure)
 *
 * REQUIRE: every testable policy has a structural test in __tests__/structure/
 * REQUIRE: new policies added to POLICY_TEST_MAP in this file
 * REQUIRE: code structured so conventions are greppable (clear directory boundaries)
 * REQUIRE: naming patterns are predictable (structural tests can scan)
 * REQUIRE: metadata is declarative/parseable (JSON, typed objects)
 * DENY:    conventions that can't be tested — restructure until testable
 *
 * When adding a new policy, ask: "Can I write a test in __tests__/structure/
 * that catches violations in under 1 second?"
 * - Yes: write the test, add the policy
 * - No, but could restructure: restructure first
 * - No, subjective: it's a design guideline (mark in DESIGN_GUIDELINES set)
 *
 * Exceptions:
 * - Design guidelines (typography, motion, ux-writing) — not structurally testable
 *
 * Anti-patterns:
 * - Writing a policy without a structural test
 * - Adding a knowledge file without mapping it in this file
 * - Convention expressed as prose that can't be grepped for violations
 *
 * Why: If a constraint can't be tested, it will drift. Structural tests run
 *      in < 1s at pnpm test time and catch violations immediately.
 */

import { existsSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');
const STRUCTURE_DIR = resolve(ROOT, '__tests__/structure');

/**
 * Policies have been absorbed into test file JSDoc headers.
 * Only agent-token-efficiency.md remains as a standalone policy.
 * This map tracks the remaining policy -> test relationship.
 */
const POLICY_TEST_MAP: Record<string, string[]> = {
  'architecture/agent-token-efficiency.md': ['knowledge-graph-integrity.test.ts'],
};

const DESIGN_GUIDELINES = new Set<string>([
]);

describe('Knowledge test coverage', () => {
  it('every testable policy has a structural test', () => {
    const missing: string[] = [];
    for (const [policy, tests] of Object.entries(POLICY_TEST_MAP)) {
      for (const test of tests) {
        if (!existsSync(resolve(STRUCTURE_DIR, test))) {
          missing.push(`${policy} → ${test} (missing)`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('no policies are unmapped', () => {
    const allKnown = new Set([...Object.keys(POLICY_TEST_MAP), ...DESIGN_GUIDELINES]);
    const unmapped: string[] = [];
    const policiesDir = resolve(ROOT, '.knowledge/policies');
    if (!existsSync(policiesDir)) return;

    function walk(dir: string, prefix = '') {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full, `${prefix}${entry}/`);
        } else if (entry.endsWith('.md') && entry !== 'README.md') {
          if (!allKnown.has(`${prefix}${entry}`)) {
            unmapped.push(`policies/${prefix}${entry}`);
          }
        }
      }
    }
    walk(policiesDir);

    if (unmapped.length > 0) {
      throw new Error(
        `Unmapped policies:\n${unmapped.map(u => `  - ${u}`).join('\n')}\n\nAdd to POLICY_TEST_MAP or DESIGN_GUIDELINES.`
      );
    }
  });
});
