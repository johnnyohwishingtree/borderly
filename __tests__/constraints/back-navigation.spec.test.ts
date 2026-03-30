import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Spec: Every non-root screen must have back navigation available.
 * Constraint candidate — applies to all screens except tab roots.
 *
 * Decision: Users must always be able to go back. Either the native header
 *   back button (headerShown: true, default in stack navigators) or an
 *   explicit back/close button in the screen.
 * Rejected: Screens with no way to go back — user is trapped.
 *
 * Root screens (TripList, QRWallet, Profile, Settings) are tab destinations
 * and don't need back navigation — the tab bar provides it.
 */

function getScreenFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) results.push(...getScreenFiles(full));
      else if (full.endsWith('.tsx') && !full.includes('.test.') && full.includes('Screen.tsx')) results.push(full);
    }
  } catch { /* skip */ }
  return results;
}

const TAB_ROOT_SCREENS = [
  'TripListScreen',
  'QRWalletScreen',
  'ProfileScreen',
  'SettingsScreen',
  'WelcomeScreen',
];

test.skip('non-root screens have back navigation', () => {
  const screenFiles = getScreenFiles(resolve(ROOT, 'src/screens'));
  const violations: string[] = [];

  for (const file of screenFiles) {
    // Skip tab root screens
    if (TAB_ROOT_SCREENS.some(r => file.includes(r))) continue;

    const content = readFileSync(file, 'utf-8');

    const hasBackNav =
      content.includes('goBack') ||
      content.includes('navigation.pop') ||
      content.includes('back-button') ||
      content.includes('go-back') ||
      content.includes('close-') ||
      content.includes('headerShown');

    if (!hasBackNav) {
      const relative = file.replace(ROOT + '/', '');
      violations.push(relative);
    }
  }

  expect(violations).toEqual([]);
});
