/**
 * Constraint: Injected JavaScript fill scripts must declare variables before use.
 *
 * Scope: src/services/submission/heuristicFiller.ts
 *
 * Rules:
 *   - Variables used in the fill script (filled, total, results, usedKeys)
 *     must be declared BEFORE any code that references them
 *   - The date group detection section must come AFTER variable declarations
 *
 * Why: JavaScript var hoisting makes undeclared variables `undefined` instead
 * of throwing an error. `filled += 3` silently becomes `NaN += 3` → `NaN`,
 * breaking the entire fill result tracking without any visible error.
 *
 * This caused the auto-fill pill to silently stop working after adding
 * the smart date group detection code.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

test('fill script declares filled/total/results before date group code', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/services/submission/heuristicFiller.ts'),
    'utf-8',
  );

  // Extract the template literal content
  const scriptMatch = content.match(/return `\(function\(\)\{[\s\S]*?\}\)\(\);`/);
  expect(scriptMatch).not.toBeNull();
  const script = scriptMatch![0];

  // var filled=0 must appear BEFORE fillDateGroup or dateGroups
  const varDeclIndex = script.indexOf('var filled=0');
  const dateGroupIndex = script.indexOf('fillDateGroup');

  expect(varDeclIndex).toBeGreaterThan(-1);
  expect(dateGroupIndex).toBeGreaterThan(-1);
  expect(varDeclIndex).toBeLessThan(dateGroupIndex);
});

test('fill script does not have duplicate var filled declarations', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/services/submission/heuristicFiller.ts'),
    'utf-8',
  );

  const scriptMatch = content.match(/return `\(function\(\)\{[\s\S]*?\}\)\(\);`/);
  expect(scriptMatch).not.toBeNull();
  const script = scriptMatch![0];

  // Should have exactly one "var filled=0" in the outer scope
  const matches = script.match(/var filled=0/g);
  expect(matches).not.toBeNull();
  expect(matches!.length).toBe(1);
});
