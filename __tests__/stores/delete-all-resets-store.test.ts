// Test: Delete All Data must reset Zustand profile store state.
//
// Bug: After delete, currentProfileId and familyProfiles stay in Zustand.
// Re-onboarding tries updateProfileById (stale ID) → "not found in keychain".

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

test('useSettings handleDeleteAllData reloads profile store after clearing data', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/hooks/useSettings.ts'),
    'utf-8',
  );

  // After deleteAllData(), must reload/reset the profile store so stale
  // currentProfileId is cleared. loadFamilyProfiles re-reads from MMKV
  // (now empty) → resets Zustand state.
  const deleteBlock = content.slice(
    content.indexOf('await deleteAllData('),
    content.indexOf('setOnboardingComplete(false)') + 30,
  );
  expect(deleteBlock).toMatch(/loadFamilyProfiles|loadProfile|clearProfile/);
});
