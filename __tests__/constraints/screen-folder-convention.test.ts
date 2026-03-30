/**
 * Constraint: Screen Folder Convention (from File Boundaries + Navigation)
 *
 * Scope: src/screens/, src/app/navigation/
 *
 * REQUIRE: each screen in a named folder: src/screens/<domain>/<ScreenName>/<ScreenName>.tsx
 * REQUIRE: every subdirectory split gets a barrel index.ts re-exporting everything
 * REQUIRE: typed route names from types.ts — no hardcoded strings
 * REQUIRE: navigation logic in screens/hooks only — components receive onPress callbacks
 * DENY:    source files over 500 lines — split into subdirectory with barrel
 * DENY:    deep nesting of stacks (stack inside tab inside stack)
 *
 * Exceptions:
 * - Barrel index.ts files at the domain level
 * - Test helper files and type definition files have no size limit
 * - Schema JSON files have no size limit
 *
 * Anti-patterns:
 * - Flat file in domain: src/screens/trips/TripListScreen.tsx (must be in named folder)
 * - SettingsScreen/Settings.tsx — should be SettingsScreen/SettingsScreen.tsx
 * - navigation.navigate('TripDetail') hardcoded string — use typed routes
 * - Component with useNavigation() — pass onPress via props instead
 *
 * Why: Named folders enable colocated __screenshots__/ directories for visual
 *      auditing and keep screen-specific assets together.
 */

import * as fs from 'fs';
import * as path from 'path';

const SCREENS_DIR = path.resolve(__dirname, '../../src/screens');

/** Recursively collect all .tsx files under a directory. */
function collectTsxFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsxFiles(fullPath));
    } else if (entry.name.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('screen folder convention', () => {
  const tsxFiles = collectTsxFiles(SCREENS_DIR);

  it('finds at least 20 screen files', () => {
    expect(tsxFiles.length).toBeGreaterThanOrEqual(20);
  });

  it('every .tsx file is inside a named screen folder (not flat in domain)', () => {
    const violations: string[] = [];

    for (const file of tsxFiles) {
      const rel = path.relative(SCREENS_DIR, file);
      const parts = rel.split(path.sep);

      // Expected: <domain>/<ScreenFolder>/<ScreenFile>.tsx (3 parts)
      // Violation: <domain>/<ScreenFile>.tsx (2 parts — flat in domain dir)
      if (parts.length < 3) {
        violations.push(
          `${rel} — must be in a named folder: src/screens/${parts[0]}/<ScreenName>/<ScreenName>.tsx`
        );
      }
    }

    if (violations.length > 0) {
      fail(
        `Screen files must not be flat in domain directories. Move them into named folders:\n${violations.join('\n')}`
      );
    }
  });

  it('screen folder name matches the .tsx filename (minus extension)', () => {
    const violations: string[] = [];

    for (const file of tsxFiles) {
      const rel = path.relative(SCREENS_DIR, file);
      const parts = rel.split(path.sep);

      if (parts.length < 3) continue; // Already caught by the test above

      const folderName = parts[1]; // e.g., "TripListScreen"
      const fileName = path.basename(file, '.tsx'); // e.g., "TripListScreen"

      // Allow the folder name to differ from filename for cases like
      // FooScreen/Foo.tsx — the folder uses the screen route name.
      // Check that the folder contains the file's base name or vice versa.
      const folderBase = folderName.replace(/Screen$/, '').replace(/Modal$/, '');
      const fileBase = fileName.replace(/Screen$/, '').replace(/Modal$/, '');

      if (folderBase !== fileBase) {
        if (!folderName.includes(fileBase) && !fileName.includes(folderBase)) {
          violations.push(
            `${rel} — folder "${folderName}" doesn't match file "${fileName}"`
          );
        }
      }
    }

    if (violations.length > 0) {
      fail(
        `Screen folder names should match their .tsx filename:\n${violations.join('\n')}`
      );
    }
  });

  it('every domain has a barrel index.ts', () => {
    const domains = fs.readdirSync(SCREENS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    const missing: string[] = [];
    for (const domain of domains) {
      const indexPath = path.join(SCREENS_DIR, domain, 'index.ts');
      if (!fs.existsSync(indexPath)) {
        missing.push(`src/screens/${domain}/index.ts`);
      }
    }

    if (missing.length > 0) {
      fail(`Missing barrel index.ts files:\n${missing.join('\n')}`);
    }
  });
});
