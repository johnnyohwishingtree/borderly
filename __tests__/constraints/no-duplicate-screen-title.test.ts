import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Constraint: Screens should not duplicate the navigation header title
 * in the body content.
 *
 * The React Navigation header already shows the screen title. Repeating
 * it as a large heading in the body wastes vertical space and looks
 * like a rendering bug. If a screen needs a subtitle or description,
 * put it below the nav header without repeating the title text.
 *
 * Related: Apple HIG — navigation bars already provide context,
 * redundant titles add visual clutter.
 *
 * Scope: src/screens/ — all screen files
 * Rules:
 *   - DENY: Screen body contains a heading that matches the navigation
 *     title (e.g., nav says "Family Members" and body has <Text>"Family Members"</Text>)
 *   - Detected by: screen file has both an options={{ title: 'X' }} in the
 *     stack navigator AND a large heading text 'X' in the component
 * Exceptions:
 *   - Welcome/onboarding screens (no nav header, headerShown: false)
 *   - Modal screens that don't use the nav header
 */

function getScreenFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...getScreenFiles(fullPath));
      } else if (entry.name.endsWith('.tsx') && !entry.name.includes('.test.')) {
        results.push(fullPath);
      }
    }
  } catch { /* directory may not exist */ }
  return results;
}

test('screens do not have redundant body headings that duplicate nav title', () => {
  // Read FormsStack and other navigators to get screen titles
  const navigators = [
    'src/app/navigation/FormsStack.tsx',
    'src/app/navigation/ProfileStack.tsx',
    'src/app/navigation/WalletStack.tsx',
    'src/app/navigation/SettingsStack.tsx',
  ];

  const titleMap = new Map<string, string>(); // screenName → title

  for (const navFile of navigators) {
    try {
      const content = readFileSync(resolve(ROOT, navFile), 'utf-8');
      // Match: name="ScreenName" options={{ title: 'Some Title' }}
      const matches = content.matchAll(/name="(\w+)"[^>]*options=\{\{[^}]*title:\s*['"]([^'"]+)['"]/g);
      for (const m of matches) {
        titleMap.set(m[1], m[2]);
      }
    } catch { /* navigator may not exist */ }
  }

  const violations: string[] = [];
  const screenFiles = getScreenFiles(resolve(ROOT, 'src/screens'));

  for (const file of screenFiles) {
    const content = readFileSync(file, 'utf-8');
    const relative = file.replace(ROOT + '/', '');

    // Skip screens with headerShown: false (they manage their own titles)
    // We check the screen file, not the navigator — some screens set header options
    if (content.includes('headerShown: false') || content.includes("headerShown:false")) continue;

    for (const [screenName, navTitle] of titleMap) {
      // Only check if this file matches the screen name
      if (!relative.includes(screenName)) continue;

      // Check if the body contains the same title as a heading
      // Look for text-2xl or text-xl font-bold with the nav title
      const titlePattern = new RegExp(
        `(text-2xl|text-xl).*font-bold[^>]*>[\\s\\n]*${navTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
        's',
      );
      if (titlePattern.test(content)) {
        violations.push(`${relative}: body heading duplicates nav title "${navTitle}"`);
      }
    }
  }

  // Gradual cleanup — start with threshold, reduce as screens are fixed
  // Gradual: 15 screens currently duplicate. Decrease as screens are cleaned up.
  expect(violations.length).toBeLessThanOrEqual(15);
});
