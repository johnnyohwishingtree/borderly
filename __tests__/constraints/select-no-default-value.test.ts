/**
 * Constraint: Select/dropdown fields must not pre-select the first option.
 *
 * Scope: src/services/forms/formEngine/formEngine.ts
 *
 * Rules:
 *   - getDefaultValue for 'select' and 'searchable_select' must return ''
 *   - DENY: options?.[0]?.value as default — misleads users into thinking
 *     they chose something
 *
 * Why: Showing "Company employee" when the user never selected anything
 * is misleading. Select fields should show placeholder text until the
 * user makes an explicit choice.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

test('getDefaultValue does not default select fields to first option', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/services/forms/formEngine/formEngine.ts'),
    'utf-8',
  );

  const fnMatch = content.match(/function getDefaultValue[\s\S]*?\n\}/);
  expect(fnMatch).not.toBeNull();
  expect(fnMatch![0]).not.toMatch(/options\?\.\[0\]/);
});
