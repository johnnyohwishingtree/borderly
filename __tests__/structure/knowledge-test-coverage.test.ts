/**
 * Meta-test: every testable policy has a structural test.
 *
 * Maps each policy file to its enforcing test(s). Fails if a policy
 * has no test or if a new policy is added without being mapped.
 *
 * See: .knowledge/policies/architecture/testable-architecture.md
 */

import { existsSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');
const STRUCTURE_DIR = resolve(ROOT, '__tests__/structure');

const POLICY_TEST_MAP: Record<string, string[]> = {
  'architecture/dependency-direction.md': ['dependency-direction.test.ts'],
  'architecture/file-boundaries.md': ['hooks-barrel.test.ts', 'screen-folder-convention.test.ts'],
  'architecture/local-first.md': ['pii-boundary.test.ts'],
  'architecture/testable-architecture.md': ['knowledge-test-coverage.test.ts'],
  'data/storage-tiers.md': ['pii-boundary.test.ts'],
  'data/pii-boundary.md': ['pii-boundary.test.ts'],
  'state/hook-conventions.md': ['hooks-barrel.test.ts'],
  'state/store-boundaries.md': ['dependency-direction.test.ts'],
  'testing/e2e-testability.md': ['component-testids.test.ts'],
  'testing/drift-detection.md': ['component-testids.test.ts'],
  'architecture/agent-token-efficiency.md': ['knowledge-graph-integrity.test.ts'],
  'platform/native-modules.md': ['native-module-mocks.test.ts'],
  'platform/navigation.md': ['screen-folder-convention.test.ts'],
  'ui/styling.md': ['no-space-x.test.ts', 'smart-component-usage.test.ts'],
  'ui/accessibility.md': ['accessibility-props.test.ts'],
};

const DESIGN_GUIDELINES = new Set([
  'ui/typography.md',
  'ui/motion.md',
  'ui/ux-writing.md',
  'testing/test-conventions.md',
  'testing/test-quality.md', // enforced by test-quality-audit.test.ts (pending)
  'data/schema-fields.md',
  'architecture/utils-boundary.md', // structural test pending (story #853)
  'workflow/verification.md', // process policy — enforced by skills, not structural tests
  'workflow/learning.md', // process policy — enforced by skills
  'workflow/self-review.md', // process policy — enforced by skills
  'workflow/fix-strategy.md', // process policy — rules/fix-strategy.md is the auto-loaded pointer
  'workflow/bug-fix.md', // process policy — rules/bug-fix-workflow.md is the auto-loaded pointer
  'workflow/story-implementation.md', // process policy — enforced by pipeline skills
  'workflow/epic-planning.md', // process policy — enforced by pipeline Step 9
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
