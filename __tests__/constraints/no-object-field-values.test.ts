/**
 * Constraint: Form field values must be primitives, never objects.
 *
 * Scope: src/services/forms/formEngine/formEngine.ts
 *
 * Rules:
 *   - isValidFieldValue must reject typeof === 'object'
 *   - Prevents [object Object] display in form fields
 *
 * Why: When an autoFillSource resolves to an object (e.g., address: {line1, city}),
 * displaying it shows "[object Object]". All field values must be strings,
 * numbers, or booleans.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

test('isValidFieldValue rejects object values', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/services/forms/formEngine/formEngine.ts'),
    'utf-8',
  );

  const fnMatch = content.match(/function isValidFieldValue[\s\S]*?\n\}/);
  expect(fnMatch).not.toBeNull();
  expect(fnMatch![0]).toMatch(/typeof.*===.*'object'/);
});
