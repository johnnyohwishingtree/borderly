import * as fs from 'fs';
import * as path from 'path';

/**
 * Ensures every .spec.ts file in e2e/tests/ is included in at least one
 * project's testMatch in playwright.config.ts.
 *
 * Without this, new E2E tests can be added but never run in CI — silently
 * rotting as the codebase evolves. This test catches that immediately.
 */

const ROOT = path.resolve(__dirname, '../..');
const E2E_TESTS_DIR = path.join(ROOT, 'e2e/tests');
const PLAYWRIGHT_CONFIG = path.join(ROOT, 'playwright.config.ts');

describe('no orphaned E2E tests', () => {
  it('every .spec.ts in e2e/tests/ must appear in playwright.config.ts testMatch', () => {
    const specFiles = fs
      .readdirSync(E2E_TESTS_DIR)
      .filter((f) => f.endsWith('.spec.ts'));

    expect(specFiles.length).toBeGreaterThan(0);

    const configContent = fs.readFileSync(PLAYWRIGHT_CONFIG, 'utf8');

    const orphaned = specFiles.filter(
      (f) => !new RegExp(`['"]${f}['"]`).test(configContent)
    );

    if (orphaned.length > 0) {
      throw new Error(
        `Found ${orphaned.length} E2E spec file(s) not in any playwright.config.ts project:\n\n` +
          orphaned.map((f) => `  - ${f}`).join('\n') +
          '\n\n' +
          'Add each file to a testMatch array in playwright.config.ts so it runs in CI.'
      );
    }
  });
});
