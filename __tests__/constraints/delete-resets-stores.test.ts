/**
 * Constraint: Data deletion must reload affected Zustand stores.
 *
 * Scope: src/hooks/, src/stores/ — any code that calls deleteAllData or clearAll
 *
 * Rules:
 *   - After deleting persistent data (MMKV, Keychain, DB), the corresponding
 *     Zustand store must be reloaded so stale state (like currentProfileId)
 *     doesn't cause "not found" errors on the next operation.
 *   - deleteAllData must be followed by loadFamilyProfiles (or equivalent)
 *     BEFORE setOnboardingComplete(false).
 *
 * Why: Zustand stores cache data from persistence layers. If you clear MMKV
 * but don't reload the store, stale IDs remain in memory. The next save
 * operation tries to update a deleted record → "Profile data not found".
 *
 * This caused the delete → re-onboard → stuck on confirm bug.
 */

import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

function getFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) results.push(...getFiles(fullPath));
    else if ((entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) && !entry.name.includes('.test.')) {
      results.push(fullPath);
    }
  }
  return results;
}

test('every deleteAllData call is followed by a store reload', () => {
  const files = [
    ...getFiles(resolve(ROOT, 'src/hooks')),
    ...getFiles(resolve(ROOT, 'src/stores')),
    ...getFiles(resolve(ROOT, 'src/screens')),
  ];

  const violations: string[] = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const name = file.replace(ROOT + '/', '');

    // Find all deleteAllData calls
    const deleteIndex = content.indexOf('deleteAllData(');
    if (deleteIndex === -1) continue;

    // The code between deleteAllData and setOnboardingComplete must reload stores
    const afterDelete = content.slice(deleteIndex, deleteIndex + 500);
    if (afterDelete.includes('setOnboardingComplete') &&
        !afterDelete.match(/loadFamilyProfiles|loadProfile|clearProfile/)) {
      violations.push(`${name}: deleteAllData without store reload before setOnboardingComplete`);
    }
  }

  expect(violations).toEqual([]);
});
