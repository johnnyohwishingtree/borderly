// Test: Select/dropdown fields must not pre-select the first option.
//
// Showing "Company employee" when the user never chose anything is misleading.
// Select fields without an auto-fill value should show the placeholder text,
// not silently default to the first option.

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

test('getDefaultValue does not default select fields to first option', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/services/forms/formEngine/formEngine.ts'),
    'utf-8',
  );

  const fnMatch = content.match(
    /function getDefaultValue[\s\S]*?\n\}/,
  );
  expect(fnMatch).not.toBeNull();

  // select and searchable_select must NOT use options[0] as default
  expect(fnMatch![0]).not.toMatch(/options\?\.\[0\]/);
});
