// Test: City name fields must be searchable, not plain text inputs.
//
// Typing "San" should show suggestions like "San Francisco", "San Diego".
// Plain text inputs for cities are error-prone (typos, wrong format).
// City fields should use searchable_select with optionsSource="cities"
// or a similar autocomplete mechanism.

import { readFileSync} from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

test('FormField supports optionsSource="cities" for city lookups', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/components/forms/FormField.tsx'),
    'utf-8',
  );

  // Must handle 'cities' as an optionsSource, like countries/airports
  expect(content).toMatch(/['"]cities['"]/);
});

test('a cities dataset exists in constants', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/constants/cities.ts'),
    'utf-8',
  );

  // Must export ALL_CITIES with value/label format
  expect(content).toMatch(/ALL_CITIES/);
  expect(content).toMatch(/value.*label|label.*value/);
});
