/**
 * Spec: Country schema tests should use shared test runner, not duplicate patterns.
 *
 * Confirm: All 14 country schema test files use runSharedSchemaTests() for common patterns
 * Invalidate: Country-specific tests can't be separated from shared patterns cleanly
 *
 * Found by test-audit: 231 duplicated tests across 14 files. Only 3/14 use
 * the existing runSharedSchemaTests() helper. The other 11 copy-paste the same
 * 15+ test patterns (metadata, sections, field IDs, submission guide, etc.)
 */

import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');
const SCHEMA_TESTS_DIR = resolve(ROOT, '__tests__/schemas');

describe('Spec: schema test consolidation', () => {
  const countryTestFiles = readdirSync(SCHEMA_TESTS_DIR)
    .filter(f => f.endsWith('.test.ts') && f !== 'schemaValidation.test.ts' && f !== 'schemaConsolidation.spec.test.ts')
    .filter(f => /^[A-Z]{3}\.test\.ts$/.test(f));

  test('all country schema tests use runSharedSchemaTests()', () => {
    const notUsingShared: string[] = [];

    for (const file of countryTestFiles) {
      const content = readFileSync(resolve(SCHEMA_TESTS_DIR, file), 'utf-8');
      if (!content.includes('runSharedSchemaTests')) {
        notUsingShared.push(file);
      }
    }

    expect(notUsingShared).toEqual([]);
  });

  test('country schema tests have fewer than 20 test blocks each (shared patterns extracted)', () => {
    const bloated: string[] = [];

    for (const file of countryTestFiles) {
      const content = readFileSync(resolve(SCHEMA_TESTS_DIR, file), 'utf-8');
      const testCount = (content.match(/\bit\(/g) || []).length + (content.match(/\btest\(/g) || []).length;
      if (testCount > 20) {
        bloated.push(`${file}: ${testCount} tests`);
      }
    }

    expect(bloated).toEqual([]);
  });
});
