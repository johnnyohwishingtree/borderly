// Test: DynamicForm must not infinite-loop when onFormDataChange triggers a re-render.
//
// The bug: useEffect depended on onFormDataChange callback identity.
// When parent re-renders (e.g., from a store update triggered by onFormDataChange),
// the callback gets a new reference → useEffect fires again → infinite loop.
//
// Fix: use a ref for the callback so the effect only fires on formData/form changes.

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');
const content = readFileSync(
  resolve(ROOT, 'src/components/forms/DynamicForm.tsx'),
  'utf-8',
);

test('onFormDataChange effect does not depend on callback identity', () => {
  // The useEffect that calls onFormDataChange must NOT include
  // onFormDataChange in its dependency array — that causes infinite loops
  // when the parent re-renders with a new callback reference.

  // Find the useEffect that calls onFormDataChange
  const effectMatch = content.match(
    /useEffect\(\(\)\s*=>\s*\{[^}]*onFormDataChange[^}]*\},\s*\[([^\]]*)\]/s,
  );
  expect(effectMatch).not.toBeNull();

  const deps = effectMatch![1];
  expect(deps).not.toMatch(/onFormDataChange/);
});

test('onFormDataChange is accessed via a stable ref', () => {
  // Must use a ref pattern to keep callback stable
  expect(content).toMatch(/onFormDataChangeRef/);
  expect(content).toMatch(/useRef\(onFormDataChange\)/);
});
