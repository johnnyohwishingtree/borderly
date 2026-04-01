/**
 * Constraint: useEffect must not depend on callback prop identity.
 *
 * Scope: src/components/, src/hooks/ — all files using useEffect with callbacks
 *
 * Rules:
 *   - When a useEffect calls a callback prop (like onFormDataChange),
 *     the callback must be accessed via useRef, not included in deps
 *   - Including callback props in deps causes infinite loops when the
 *     parent re-renders with a new function reference
 *
 * Why: DynamicForm had an infinite loop because useEffect depended on
 * onFormDataChange identity. Parent re-renders → new reference → effect
 * fires → parent re-renders → loop. Ref pattern breaks the cycle.
 *
 * This constraint checks DynamicForm specifically since it's the known
 * case. A general static analysis of all useEffect deps would have too
 * many false positives.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

test('DynamicForm onFormDataChange effect uses ref, not dep', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/components/forms/DynamicForm.tsx'),
    'utf-8',
  );

  // Must use ref pattern for the callback
  expect(content).toMatch(/onFormDataChangeRef/);
  expect(content).toMatch(/useRef\(onFormDataChange\)/);

  // The useEffect that calls the ref must NOT have onFormDataChange in deps
  const effectMatch = content.match(
    /useEffect\(\(\)\s*=>\s*\{[^}]*onFormDataChange[^}]*\},\s*\[([^\]]*)\]/s,
  );
  expect(effectMatch).not.toBeNull();
  expect(effectMatch![1]).not.toMatch(/onFormDataChange/);
});
