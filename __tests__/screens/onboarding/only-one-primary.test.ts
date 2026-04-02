// Test: Only one profile can be primary in the family summary.
//
// Bug: All profiles show as "Primary Profile" with green outline.
// The isPrimary flag is set based on addedProfiles.length === 0,
// but the state closure is stale — each save sees length 0.

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

test('navigateAfterSave uses functional state update to check if first profile', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/hooks/usePassportScan.ts'),
    'utf-8',
  );

  // Must use setAddedProfiles(prev => ...) with prev.length check,
  // NOT addedProfiles.length (stale closure)
  const navBlock = content.match(/navigateAfterSave[\s\S]*?setMode\('add_another'\)/);
  expect(navBlock).not.toBeNull();

  // Must use prev.length inside the functional updater, not outer addedProfiles.length
  expect(navBlock![0]).toMatch(/prev\.length\s*===\s*0|prev\.length\s*<\s*1/);
});
