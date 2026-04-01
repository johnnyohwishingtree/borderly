// Test: Auto-filled fields must be editable, not disabled/read-only.
//
// Users may need to correct auto-filled values (e.g., name spelling,
// wrong nationality). Making auto-filled fields read-only forces users
// to go back to their profile to fix a single form field.

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

test('FormField does not disable auto-filled fields', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/components/forms/FormField.tsx'),
    'utf-8',
  );

  // Must NOT have logic that disables fields based on source === 'auto'
  expect(content).not.toMatch(/source\s*===\s*['"]auto['"]\s*&&\s*!field\.needsUserInput/);
  expect(content).not.toMatch(/source\s*===\s*['"]auto['"].*disabled/);
});
