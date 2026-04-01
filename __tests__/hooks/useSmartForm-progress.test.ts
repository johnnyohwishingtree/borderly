// Test: SmartForm progress must update as fields are filled.
//
// The overallProgress and countrySections.remainingFields must recalculate
// when handleFieldChange is called. Currently they're computed once on mount
// and never update — the percentage stays frozen.

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

const content = readFileSync(
  resolve(ROOT, 'src/hooks/useSmartForm.ts'),
  'utf-8',
);

test('handleFieldChange triggers recalculation of country sections', () => {
  // handleFieldChange must update countrySections state (not just call formStore)
  // so that overallProgress recomputes.
  //
  // Either: handleFieldChange calls setCountrySections, or
  // countrySections is derived from formStore state that changes on updateField.

  // The handleFieldChange must do more than just formStore.updateField —
  // it must also update the local remainingFields/totalFields counts.
  const handleFieldBlock = content.match(
    /const handleFieldChange[\s\S]*?(?=\n\n\s*const )/,
  );
  expect(handleFieldBlock).not.toBeNull();

  // Must reference setCountrySections or recalculate remaining fields
  expect(handleFieldBlock![0]).toMatch(/setCountrySections|remainingFields|recalculate|sections/i);
});
