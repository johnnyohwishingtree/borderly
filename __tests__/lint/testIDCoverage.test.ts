import * as fs from 'fs';
import * as path from 'path';

/**
 * Ensures interactive elements in screen files have testID props.
 *
 * Maestro E2E tests rely on testIDs for reliable element targeting.
 * Text-based taps are fragile — they break on label changes, duplicate
 * matches, and iOS text recognition failures.
 *
 * This test has two layers:
 * 1. STRICT: Screens covered by Maestro E2E flows must have testID on
 *    every <Button> and <Select>. These fail the build if violated.
 * 2. RATCHET: All other screens are tracked with a count. The count
 *    can only go down — adding new buttons without testIDs fails.
 */

const SCREENS_DIR = path.resolve(__dirname, '../../src/screens');

// Components that must have testID when used in screen files
const INTERACTIVE_COMPONENTS = ['Button', 'Select'];

// Screens covered by Maestro E2E flows — strictly enforced
const E2E_COVERED_SCREENS = [
  'src/screens/onboarding/WelcomeScreen.tsx',
  'src/screens/onboarding/TutorialScreen.tsx',
  'src/screens/onboarding/PassportScanScreen.tsx',
  'src/screens/onboarding/ConfirmProfileScreen.tsx',
  'src/screens/onboarding/BiometricSetupScreen.tsx',
  'src/screens/trips/TripListScreen.tsx',
  'src/screens/trips/CreateTripScreen.tsx',
  'src/screens/trips/TripDetailScreen.tsx',
  'src/screens/trips/LegFormScreen.tsx',
  'src/screens/profile/ProfileScreen.tsx',
  'src/screens/profile/FamilyManagementScreen.tsx',
  'src/screens/profile/AddFamilyMemberScreen.tsx',
];

// Ratchet: max allowed missing testIDs across all non-E2E screens.
// This number must only go down over time. When you add testIDs to
// existing screens, lower this number to lock in the improvement.
const MAX_MISSING_IN_OTHER_SCREENS = 61;

function getAllScreenFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllScreenFiles(fullPath));
    } else if (entry.name.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

interface ComponentUsage {
  file: string;
  line: number;
  snippet: string;
  hasTestID: boolean;
}

/**
 * Find all JSX usages of a component and check for testID.
 * Handles multiline JSX by scanning from the opening tag to /> or >.
 */
function findComponentUsages(
  filePath: string,
  content: string,
  componentName: string
): ComponentUsage[] {
  const usages: ComponentUsage[] = [];
  const lines = content.split('\n');
  const relPath = path.relative(path.resolve(__dirname, '../..'), filePath);

  const tagPattern = new RegExp(`<${componentName}(?:\\s|$|>|\\/)`, 'g');

  for (let i = 0; i < lines.length; i++) {
    tagPattern.lastIndex = 0;
    if (!tagPattern.test(lines[i])) continue;

    // Collect the full JSX element (from <Component to /> or >)
    let jsxBlock = '';
    let foundEnd = false;

    for (let j = i; j < lines.length && !foundEnd; j++) {
      jsxBlock += lines[j] + '\n';
      if (lines[j].includes('/>') || (j > i && lines[j].trim().startsWith('>'))) {
        foundEnd = true;
      }
      if (j - i > 20) break;
    }

    usages.push({
      file: relPath,
      line: i + 1,
      snippet: lines[i].trim(),
      hasTestID: /testID[=:]/.test(jsxBlock),
    });
  }

  return usages;
}

describe('testID coverage for interactive elements', () => {
  const rootDir = path.resolve(__dirname, '../..');
  const screenFiles = getAllScreenFiles(SCREENS_DIR);

  const e2eCoveredAbsolute = new Set(
    E2E_COVERED_SCREENS.map((p) => path.resolve(rootDir, p))
  );

  it('should find screen files to scan', () => {
    expect(screenFiles.length).toBeGreaterThan(0);
  });

  it('should have testID on all interactive elements in E2E-covered screens', () => {
    const missing: ComponentUsage[] = [];

    for (const file of screenFiles) {
      if (!e2eCoveredAbsolute.has(file)) continue;

      const content = fs.readFileSync(file, 'utf8');
      for (const component of INTERACTIVE_COMPONENTS) {
        const usages = findComponentUsages(file, content, component);
        missing.push(...usages.filter((u) => !u.hasTestID));
      }
    }

    if (missing.length > 0) {
      const report = missing
        .map((m) => `  ${m.file}:${m.line} — ${m.snippet}`)
        .join('\n');

      throw new Error(
        `Found ${missing.length} interactive element(s) without testID in E2E-covered screens:\n\n` +
          report +
          '\n\n' +
          'All <Button> and <Select> in E2E-covered screens must have testID for Maestro reliability.'
      );
    }
  });

  it(`should not exceed ${MAX_MISSING_IN_OTHER_SCREENS} missing testIDs in other screens (ratchet)`, () => {
    const missing: ComponentUsage[] = [];

    for (const file of screenFiles) {
      if (e2eCoveredAbsolute.has(file)) continue;

      const content = fs.readFileSync(file, 'utf8');
      for (const component of INTERACTIVE_COMPONENTS) {
        const usages = findComponentUsages(file, content, component);
        missing.push(...usages.filter((u) => !u.hasTestID));
      }
    }

    // If you've improved coverage, lower MAX_MISSING_IN_OTHER_SCREENS
    if (missing.length < MAX_MISSING_IN_OTHER_SCREENS) {
      console.log(
        `\n  testID ratchet: ${missing.length} missing (limit: ${MAX_MISSING_IN_OTHER_SCREENS}).` +
          `\n  You can tighten the ratchet to ${missing.length}!\n`
      );
    }

    if (missing.length > MAX_MISSING_IN_OTHER_SCREENS) {
      const report = missing
        .map((m) => `  ${m.file}:${m.line} — ${m.snippet}`)
        .join('\n');

      throw new Error(
        `testID ratchet exceeded: found ${missing.length} missing testIDs ` +
          `(max allowed: ${MAX_MISSING_IN_OTHER_SCREENS}).\n\n` +
          `New interactive elements must have testID. Missing:\n\n` +
          report
      );
    }
  });
});
