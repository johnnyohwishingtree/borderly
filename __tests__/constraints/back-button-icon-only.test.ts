/**
 * Constraint: Back buttons must show chevron icon only, not previous screen title.
 *
 * Scope: src/app/navigation/ — all stack navigator files
 *
 * Rules:
 *   - Every stack navigator must set headerBackButtonDisplayMode: 'minimal' in screenOptions
 *   - This shows only the chevron (<) without the previous screen's title
 *
 * Why: Apple HIG navigation bar guidelines — when the previous screen has a long
 * title (e.g., "Where are you going?"), React Navigation renders it as the back
 * button label, consuming more space than the current screen's title. The back
 * chevron alone is universally understood and keeps the nav bar clean.
 *
 * Anti-patterns:
 *   - Default React Navigation back button (shows full previous title)
 *   - Custom headerLeft with text label duplicating the chevron
 */

import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');
const NAV_DIR = resolve(ROOT, 'src/app/navigation');

function getStackFiles(): string[] {
  return readdirSync(NAV_DIR)
    .filter(f => f.endsWith('Stack.tsx'))
    .map(f => resolve(NAV_DIR, f));
}

test('all stack navigators hide back button title (chevron only)', () => {
  const stackFiles = getStackFiles();
  expect(stackFiles.length).toBeGreaterThan(0);

  const violations: string[] = [];

  for (const file of stackFiles) {
    const content = readFileSync(file, 'utf-8');
    const name = file.replace(ROOT + '/', '');

    // Must have screenOptions with headerBackButtonDisplayMode: 'minimal'
    if (!content.includes('headerBackButtonDisplayMode')) {
      violations.push(`${name}: missing headerBackButtonDisplayMode: 'minimal' in screenOptions`);
    } else if (!content.match(/headerBackButtonDisplayMode\s*:\s*['"]minimal['"]/)) {
      violations.push(`${name}: headerBackButtonDisplayMode must be 'minimal'`);
    }
  }

  expect(violations).toEqual([]);
});
