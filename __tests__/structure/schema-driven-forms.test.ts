/**
 * Constraint: Schema-Driven Form Engine
 *
 * Decision: Country forms are defined as JSON schema files (src/schemas/<ISO>.json)
 *   rendered by a single DynamicForm component. Adding a new country requires only a
 *   JSON file and a knowledge file — no new React components. Auto-fill uses
 *   dot-notation paths resolved at form generation time.
 * Rejected: Per-country React Native form screens — doesn't scale as country count
 *   grows. Each new country would need custom components, review, and testing.
 *   Hardcoded field lists — field semantics are stable but labels vary by country.
 *
 * REQUIRE: all form rendering goes through DynamicForm
 * DENY:    hardcoded per-country form components in src/screens/ or src/components/forms/
 *
 * Why: Adding a country should be a data task, not a code task. Schema changes
 *      don't require app rebuilds (OTA updates via manifest).
 */

import { execSync } from 'child_process';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * ISO 3166-1 alpha-3 country codes pattern — matches filenames like JPN, MYS, SGP, etc.
 * We look for components named after country codes that render form fields directly.
 */
const COUNTRY_CODE_PATTERN = /^[A-Z]{3}(Form|Screen|Fields|Declaration|Customs|Immigration)/;

function listFiles(dir: string, extensions: string[]): string[] {
  const extArgs = extensions.map(e => `--include="*.${e}"`).join(' ');
  try {
    const output = execSync(`find "${dir}" -type f ${extArgs.replace(/--include=/g, '-name ')}`, {
      encoding: 'utf-8',
    });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

describe('Schema-driven forms', () => {
  it('no hardcoded per-country form components in src/screens/', () => {
    const screensDir = resolve(ROOT, 'src/screens');
    const files = listFiles(screensDir, ['tsx', 'ts']);

    const violations = files
      .map(f => f.replace(`${ROOT}/`, ''))
      .filter(f => {
        const basename = f.split('/').pop() || '';
        return COUNTRY_CODE_PATTERN.test(basename.replace(/\.(tsx?|jsx?)$/, ''));
      });

    expect(violations).toEqual([]);
  });

  it('no hardcoded per-country form components in src/components/forms/', () => {
    const formsDir = resolve(ROOT, 'src/components/forms');
    const files = listFiles(formsDir, ['tsx', 'ts']);

    const violations = files
      .map(f => f.replace(`${ROOT}/`, ''))
      .filter(f => {
        const basename = f.split('/').pop() || '';
        return COUNTRY_CODE_PATTERN.test(basename.replace(/\.(tsx?|jsx?)$/, ''));
      });

    expect(violations).toEqual([]);
  });

  it('DynamicForm.tsx exists as the single form renderer', () => {
    const { existsSync } = require('fs');
    const dynamicFormPath = resolve(ROOT, 'src/components/forms/DynamicForm.tsx');
    expect(existsSync(dynamicFormPath)).toBe(true);
  });
});
