/**
 * Constraint: Customs declaration fields must never be auto-filled.
 *
 * Scope: src/services/forms/autoFillLogic/autoFillLogic.ts
 *
 * Rules:
 *   - Fields with IDs containing 'declare', 'carrying', or 'bringing'
 *     must return null from intelligentAutoFill (no auto-fill, no default)
 *   - These are per-trip questions that change every journey
 *
 * Why: Auto-filling "No" to "Are you carrying commercial goods?" risks
 * a false customs declaration. These must always require explicit user input.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

test('intelligentAutoFill blocks declaration fields before all auto-fill paths', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/services/forms/autoFillLogic/autoFillLogic.ts'),
    'utf-8',
  );

  // The declaration guard must appear BEFORE tryStandardAutoFill
  const guardIndex = content.indexOf("declare') || fieldId.includes('carrying') || fieldId.includes('bringing')");
  const standardIndex = content.indexOf('tryStandardAutoFill');

  expect(guardIndex).toBeGreaterThan(-1);
  expect(standardIndex).toBeGreaterThan(-1);
  expect(guardIndex).toBeLessThan(standardIndex);
});
