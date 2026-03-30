/**
 * Constraint: Testable Architecture (Meta-Constraint)
 *
 * Scope: __tests__/structure/, .context/, src/
 *
 * REQUIRE: every architectural constraint has a structural test in __tests__/structure/
 * REQUIRE: code structured so conventions are greppable (clear directory boundaries)
 * REQUIRE: naming patterns are predictable (structural tests can scan)
 * DENY:    conventions that can't be tested — restructure until testable
 *
 * When adding a new constraint, ask: "Can I write a test in __tests__/structure/
 * that catches violations in under 1 second?"
 * - Yes: write the test with a JSDoc constraint header
 * - No, but could restructure: restructure first
 * - No, subjective: it's a design guideline, not a constraint
 *
 * Anti-patterns:
 * - Writing a constraint without a structural test
 * - Convention expressed as prose that can't be grepped for violations
 *
 * Why: If a constraint can't be tested, it will drift. Structural tests run
 *      in < 1s at pnpm test time and catch violations immediately.
 */

import { readdirSync, readFileSync } from 'fs';
import { resolve, join } from 'path';

const STRUCTURE_DIR = resolve(__dirname);

describe('Constraint coverage', () => {
  it('every structural test has a Constraint JSDoc header', () => {
    const testFiles = readdirSync(STRUCTURE_DIR)
      .filter(f => f.endsWith('.test.ts'));

    const missing: string[] = [];
    for (const file of testFiles) {
      const content = readFileSync(join(STRUCTURE_DIR, file), 'utf-8');
      // Every structural test should have a JSDoc with "Constraint:" in the header
      if (!content.includes('* Constraint:') && !content.includes('* constraint:')) {
        missing.push(file);
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `Structural tests without Constraint JSDoc header:\n${missing.map(m => `  - ${m}`).join('\n')}\n\nEvery test in __tests__/structure/ should have a /** Constraint: ... */ header.`
      );
    }
  });
});
