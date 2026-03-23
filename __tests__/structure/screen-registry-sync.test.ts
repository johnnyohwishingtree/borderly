/**
 * Structural test: enforce screen registry ↔ source code sync.
 *
 * The screen registry (maestro/generator/screenRegistry.ts) is the source
 * of truth for Maestro test generation and UI/UX skills. This test ensures
 * every testID and source file in the registry actually exists in the codebase.
 *
 * If this test fails, it means the registry is out of sync — either:
 * 1. A testID was renamed/removed in source but not updated in the registry
 * 2. A screen source file was moved but the registry path wasn't updated
 * 3. A new screen was added to the registry with incorrect metadata
 *
 * Fix: update the registry entry to match the actual source code.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { SCREENS } from '../../maestro/generator/screenRegistry';

const ROOT = resolve(__dirname, '../..');
const SRC_DIR = resolve(ROOT, 'src');

/** Safely read a file, returning empty string if it's a directory or doesn't exist. */
function safeReadFile(filePath: string): string {
  try {
    if (!existsSync(filePath)) return '';
    if (statSync(filePath).isDirectory()) return '';
    return readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

/** Escape special regex characters in a string. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Convert a registry testID to a regex for searching source code.
 * Static testIDs match exactly. Dynamic testIDs (containing ${...})
 * replace the placeholder with a pattern matching template expressions.
 */
function testIDToSearchPattern(testID: string): RegExp {
  if (!testID.includes('${')) {
    return new RegExp(escapeRegex(testID));
  }
  // Dynamic testID: split on ${...} and join with a flexible wildcard
  // e.g., "leg-${index}-arrival-date" → /leg-.*-arrival-date/
  const parts = testID.split(/\$\{[^}]+\}/);
  const pattern = parts.map(escapeRegex).join('.*?');
  return new RegExp(pattern);
}

/**
 * Collect all source code relevant to a screen:
 * - The screen file itself
 * - Other files in the same directory (co-located components)
 * - Hooks imported by the screen (src/hooks/)
 * - Components imported by the screen (src/components/)
 *
 * This is necessary because testIDs and alerts often live in hooks
 * (e.g., usePassportScan) or child components (e.g., PassportPreview),
 * not directly in the screen file.
 */
function collectScreenSource(sourceFile: string): string {
  const sourcePath = resolve(ROOT, sourceFile);
  if (!existsSync(sourcePath)) return '';

  const parts: string[] = [];

  // 1. The screen file itself
  const screenSource = readFileSync(sourcePath, 'utf-8');
  parts.push(screenSource);

  // 2. Other .tsx files in the same directory
  const screenDir = dirname(sourcePath);
  for (const entry of readdirSync(screenDir)) {
    if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
      const p = resolve(screenDir, entry);
      if (p !== sourcePath) {
        parts.push(readFileSync(p, 'utf-8'));
      }
    }
  }

  // 3. Find imported hooks and components from the screen file
  const importPaths = screenSource.match(/from\s+['"]@\/(?:hooks|components)\/[^'"]+['"]/g) ?? [];
  for (const imp of importPaths) {
    const match = imp.match(/from\s+['"]@\/([^'"]+)['"]/);
    if (!match) continue;
    const relPath = match[1];
    const resolvedPath = resolve(SRC_DIR, relPath);

    // If it resolves to a directory (barrel import like @/components/passport),
    // read all .ts/.tsx files in that directory
    if (existsSync(resolvedPath) && statSync(resolvedPath).isDirectory()) {
      for (const f of readdirSync(resolvedPath)) {
        if (f.endsWith('.ts') || f.endsWith('.tsx')) {
          parts.push(safeReadFile(resolve(resolvedPath, f)));
        }
      }
      continue;
    }

    // Try exact file, then with extensions
    for (const ext of ['.ts', '.tsx']) {
      const content = safeReadFile(resolvedPath + ext);
      if (content) {
        parts.push(content);
        break;
      }
    }
  }

  return parts.join('\n');
}

describe('Screen Registry ↔ Source Code Sync', () => {
  const screenEntries = Object.entries(SCREENS);

  it('registry has at least 10 screens', () => {
    expect(screenEntries.length).toBeGreaterThanOrEqual(10);
  });

  for (const [name, screen] of screenEntries) {
    describe(name, () => {
      const sourcePath = resolve(ROOT, screen.sourceFile);

      it(`source file exists: ${screen.sourceFile}`, () => {
        expect(existsSync(sourcePath)).toBe(true);
      });

      // Collect all source relevant to this screen
      const source = collectScreenSource(screen.sourceFile);

      if (source) {
        // Validate field testIDs
        for (const field of screen.fields) {
          it(`field testID "${field.testID}" exists in source`, () => {
            const pattern = testIDToSearchPattern(field.testID);
            expect(source).toMatch(pattern);
          });
        }

        // Validate action button testIDs
        for (const btn of screen.actionButtons) {
          it(`button testID "${btn.testID}" exists in source`, () => {
            const pattern = testIDToSearchPattern(btn.testID);
            expect(source).toMatch(pattern);
          });
        }

        // Validate alert titles appear somewhere in source
        for (const alertSpec of screen.alerts) {
          it(`alert title "${alertSpec.title}" exists in source`, () => {
            expect(source).toContain(alertSpec.title);
          });
        }
      }
    });
  }
});

describe('Screen Registry completeness', () => {
  /**
   * Every screen folder in src/screens/ that has a .tsx file should have
   * a corresponding entry in the registry. This catches new screens that
   * were added to the app but not registered for Maestro testing.
   */
  const SCREENS_DIR = resolve(ROOT, 'src/screens');

  // Known screens that are intentionally NOT in the registry
  // (e.g., modals that aren't standalone screens, or screens not yet testable)
  const EXCLUDED_SCREENS = new Set([
    'AddFamilyMember',      // Sub-flow of FamilyManagement
    'AddQR',                // QR wallet sub-flow
    'BugReport',            // Support sub-flow
    'ExportBackupModal',    // Modal, not a screen
    'FAQ',                  // Help sub-flow
    'Feedback',             // Support sub-flow
    'Help',                 // Support sub-flow
    'Lock',                 // System screen (app lock), not a user flow
    'PortalSubmission',     // WebView-based, not Maestro-testable
    'PrivacyPolicy',        // Static content
    'QRDetail',             // QR wallet sub-flow
    'QRWallet',             // QR wallet
    'RestoreBackupModal',   // Modal, not a screen
    'SubmissionGuide',      // Portal guide
    'Troubleshooting',      // Help sub-flow
  ]);

  function findScreenFolders(dir: string): string[] {
    const fs = require('fs');
    const folders: string[] = [];
    for (const domain of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!domain.isDirectory()) continue;
      const domainPath = resolve(dir, domain.name);
      for (const entry of fs.readdirSync(domainPath, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        // Check if folder contains a matching .tsx file (screen convention)
        const screenFile = resolve(domainPath, entry.name, `${entry.name}.tsx`);
        if (fs.existsSync(screenFile)) {
          // Strip "Screen" suffix to get the screen name
          const screenName = entry.name.replace(/Screen$/, '');
          folders.push(screenName);
        }
      }
    }
    return folders;
  }

  const screenFolders = findScreenFolders(SCREENS_DIR);
  const registeredNames = new Set(Object.keys(SCREENS));

  for (const folderName of screenFolders) {
    if (EXCLUDED_SCREENS.has(folderName)) continue;

    it(`screen "${folderName}" has a registry entry`, () => {
      expect(registeredNames.has(folderName)).toBe(true);
    });
  }
});
