/**
 * Constraint: Auto-filled form fields must remain editable.
 *
 * Scope: src/components/forms/FormField.tsx
 *
 * Rules:
 *   - DENY: Disabling fields based on source === 'auto'
 *   - Auto-filled fields show the green badge but users can modify them
 *
 * Why: Users may need to correct auto-filled values (name spelling,
 * wrong nationality). Making them read-only forces users to go back
 * to their profile to fix a single form field.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

test('FormField does not disable auto-filled fields', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/components/forms/FormField.tsx'),
    'utf-8',
  );

  expect(content).not.toMatch(/source\s*===\s*['"]auto['"]\s*&&\s*!field\.needsUserInput/);
  expect(content).not.toMatch(/source\s*===\s*['"]auto['"].*disabled/);
});
