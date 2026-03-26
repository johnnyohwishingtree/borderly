/**
 * Meta-test: every testable .knowledge/ convention has a structural test.
 *
 * Maps each convention file to its enforcing test(s). Fails if a testable
 * convention has no structural test.
 *
 * See: .knowledge/concepts/testable-architecture.md
 */

import { existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');
const STRUCTURE_DIR = resolve(ROOT, '__tests__/structure');

/**
 * Convention → test file mapping.
 * Every testable convention must have at least one test listed here.
 * When you add a new convention, add it to this map.
 */
const CONVENTION_TEST_MAP: Record<string, string[]> = {
  // conventions/
  'e2e-testability.md': ['maestro-registry-sync.test.ts', 'component-testids.test.ts'],
  'native-modules.md': ['native-module-mocks.test.ts'],
  'navigation.md': ['screen-folder-convention.test.ts'],
  'state-management.md': ['hooks-barrel.test.ts'],
  'storage.md': ['pii-boundary.test.ts'],
  'styling.md': ['no-space-x.test.ts', 'smart-component-usage.test.ts'],
  'accessibility/component-props.md': ['accessibility-props.test.ts'],
  'accessibility/core-principles.md': ['accessibility-props.test.ts'],

  // concepts/
  'dependency-direction.md': ['dependency-direction.test.ts'],
  'security-boundary.md': ['pii-boundary.test.ts'],
  'drift-detection.md': ['maestro-registry-sync.test.ts'],
};

/** Conventions that are design guidelines — not structurally testable */
const DESIGN_GUIDELINES = new Set([
  'typography.md',
  'motion.md',
  'ux-writing.md',
  'testing.md',           // meta — testing conventions about how to write tests
  'accessibility/testing-patterns.md', // patterns, not rules
]);

/** Concepts that are architectural principles — not structurally testable */
const PRINCIPLES = new Set([
  'local-first.md',
  'testable-architecture.md',
]);

describe('Knowledge test coverage', () => {
  it('every testable convention has a structural test', () => {
    const missing: string[] = [];

    for (const [convention, tests] of Object.entries(CONVENTION_TEST_MAP)) {
      for (const test of tests) {
        if (!existsSync(resolve(STRUCTURE_DIR, test))) {
          missing.push(`${convention} → ${test} (test file missing)`);
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it('no testable conventions are unmapped', () => {
    // This test fails when a new convention is added but not mapped.
    // Add it to CONVENTION_TEST_MAP, DESIGN_GUIDELINES, or PRINCIPLES.
    const allKnown = new Set([
      ...Object.keys(CONVENTION_TEST_MAP),
      ...DESIGN_GUIDELINES,
      ...PRINCIPLES,
    ]);

    const unmapped: string[] = [];

    // Check conventions/
    const { readdirSync, statSync } = require('fs');
    const convDir = resolve(ROOT, '.knowledge/conventions');
    function walkConventions(dir: string, prefix = '') {
      for (const entry of readdirSync(dir)) {
        const full = resolve(dir, entry);
        if (statSync(full).isDirectory()) {
          walkConventions(full, `${prefix}${entry}/`);
        } else if (entry.endsWith('.md') && entry !== 'README.md') {
          const key = `${prefix}${entry}`;
          if (!allKnown.has(key)) {
            unmapped.push(`.knowledge/conventions/${key}`);
          }
        }
      }
    }
    walkConventions(convDir);

    // Check concepts/
    const conceptDir = resolve(ROOT, '.knowledge/concepts');
    for (const entry of readdirSync(conceptDir)) {
      if (entry.endsWith('.md') && entry !== 'README.md') {
        if (!allKnown.has(entry)) {
          unmapped.push(`.knowledge/concepts/${entry}`);
        }
      }
    }

    if (unmapped.length > 0) {
      throw new Error(
        `Knowledge files not mapped in knowledge-test-coverage.test.ts:\n` +
        unmapped.map(u => `  - ${u}`).join('\n') +
        `\n\nAdd each to CONVENTION_TEST_MAP, DESIGN_GUIDELINES, or PRINCIPLES.`
      );
    }
  });
});
