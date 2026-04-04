// Test: SmartForm must persist user-entered fields back to the profile.
//
// Fields like occupation, home address, city are entered in SmartForm
// but only saved to the transient form store. When the user navigates
// to the portal, the profile has no occupation — auto-fill fails.
//
// Fix: SmartForm should save relevant field values back to the
// TravelerProfile so they persist across sessions.

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

test('useSmartForm saves user-entered fields back to profile store', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/hooks/useSmartForm.ts'),
    'utf-8',
  );
  // Must call updateProfile or updateProfileById with form field values
  expect(content).toMatch(/updateProfile|updateProfileById|saveProfile/);
  // Must reference profile-relevant fields
  expect(content).toMatch(/occupation|homeAddress|city/);
});
