// Test: Auto-fill must never display [object Object] in a form field.
//
// When an autoFillSource resolves to an object (e.g., address: {line1, city}),
// the form engine must reject it. And when AccommodationAutocomplete resolves
// an address, FormField must format it as a string before setting formData.

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

test('isValidFieldValue rejects object values (prevents [object Object])', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/services/forms/formEngine/formEngine.ts'),
    'utf-8',
  );

  const fnMatch = content.match(
    /function isValidFieldValue[\s\S]*?\n\}/,
  );
  expect(fnMatch).not.toBeNull();

  // Must explicitly check for typeof object and reject it
  expect(fnMatch![0]).toMatch(/typeof.*===.*'object'/);
});

test('FormField formats address object to string before setting form value', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/components/forms/FormField.tsx'),
    'utf-8',
  );

  // onAddressResolved must NOT pass raw address object to onValueChange.
  // It must extract formattedAddress or join address parts into a string.
  const resolvedBlock = content.match(
    /onAddressResolved=\{([\s\S]*?)\}\s*\n/,
  );
  expect(resolvedBlock).not.toBeNull();
  const callback = resolvedBlock![1];

  // Must reference formattedAddress or join/filter to build a string
  expect(callback).toMatch(/formattedAddress|join|filter/);
  // Must NOT pass raw address object directly
  expect(callback).not.toMatch(/onValueChange\(\w+,\s*address\s*\)/);
});
