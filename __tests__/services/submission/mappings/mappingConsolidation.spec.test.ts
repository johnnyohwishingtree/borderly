/**
 * Spec: Country mapping tests should use a shared test runner, not duplicate patterns.
 *
 * Confirm: All 14 country mapping test files use a shared helper for common patterns
 * Invalidate: Country-specific mapping tests can't be separated from shared patterns
 *
 * Found by test-audit: 92 duplicated tests across 14 files. Each file repeats
 * identical checks: non-empty fieldMappings, at least one automation step,
 * core personal info fields, and parameterized field validation.
 */

import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../../..');
const MAPPING_TESTS_DIR = resolve(ROOT, '__tests__/services/submission/mappings');

describe('Spec: mapping test consolidation', () => {
  const countryMappingFiles = readdirSync(MAPPING_TESTS_DIR)
    .filter(f => f.endsWith('.test.ts') && f !== 'mappingConsolidation.spec.test.ts')
    .filter(f => /^[A-Z]{3}\.test\.ts$/.test(f));

  test.skip('all country mapping tests use a shared test runner', () => {
    const notUsingShared: string[] = [];

    for (const file of countryMappingFiles) {
      const content = readFileSync(resolve(MAPPING_TESTS_DIR, file), 'utf-8');
      if (!content.includes('runSharedMappingTests')) {
        notUsingShared.push(file);
      }
    }

    expect(notUsingShared).toEqual([]);
  });

  test.skip('country mapping tests have fewer than 10 test blocks each (shared patterns extracted)', () => {
    const bloated: string[] = [];

    for (const file of countryMappingFiles) {
      const content = readFileSync(resolve(MAPPING_TESTS_DIR, file), 'utf-8');
      const testCount = (content.match(/\bit\(/g) || []).length + (content.match(/\btest\(/g) || []).length;
      if (testCount > 10) {
        bloated.push(`${file}: ${testCount} tests`);
      }
    }

    expect(bloated).toEqual([]);
  });
});
