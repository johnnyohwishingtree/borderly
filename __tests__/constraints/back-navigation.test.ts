import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Constraint: Back Navigation
 *
 * Scope: src/app/navigation/, src/screens/
 *
 * Decision: Every screen has back navigation. Stack navigators provide a header
 *   back button by default. Screens that hide the header (headerShown: false)
 *   must provide their own close/back button.
 * Rejected: Screens with no way to go back — user is trapped.
 *
 * REQUIRE: Screens with headerShown: false must have goBack/close in their code
 */

function getAllTsxFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) results.push(...getAllTsxFiles(full));
      else if (full.endsWith('.tsx') && !full.includes('.test.')) results.push(full);
    }
  } catch { /* skip */ }
  return results;
}

test('screens with hidden headers have their own back/close button', () => {
  // Find all navigator files and extract screens with headerShown: false
  const navFiles = getAllTsxFiles(resolve(ROOT, 'src/app/navigation'));
  const hiddenHeaderScreens: string[] = [];

  for (const file of navFiles) {
    const content = readFileSync(file, 'utf-8');
    // Match: name="ScreenName" ... headerShown: false
    const matches = [...content.matchAll(/name="(\w+)"[^>]*headerShown:\s*false/g)];
    for (const m of matches) {
      hiddenHeaderScreens.push(m[1]);
    }
  }

  // For each hidden-header screen, check that the screen file has back/close navigation
  const screenFiles = getAllTsxFiles(resolve(ROOT, 'src/screens'));
  const violations: string[] = [];

  for (const screenName of hiddenHeaderScreens) {
    const screenFile = screenFiles.find(f => f.includes(`${screenName}Screen.tsx`) || f.includes(`${screenName}.tsx`));
    if (!screenFile) continue;

    const content = readFileSync(screenFile, 'utf-8');
    const hasBackNav =
      content.includes('goBack') ||
      content.includes('navigation.pop') ||
      content.includes('close-') ||
      content.includes('dismiss');

    if (!hasBackNav) {
      violations.push(`${screenName} (headerShown: false but no back/close button)`);
    }
  }

  expect(violations).toEqual([]);
});
