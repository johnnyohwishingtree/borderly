/**
 * Maestro flow drift detection.
 *
 * Checks that testIDs referenced in Maestro flows still exist in the source code.
 * When a screen changes its testIDs, this test fails — signaling that Maestro
 * flows need updating.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../../..');
const MAESTRO_DIR = join(ROOT, 'maestro/flows');
const SRC_DIR = join(ROOT, 'src');

function getAllMaestroFiles(): string[] {
  const files: string[] = [];
  function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) files.push(full);
    }
  }
  walk(MAESTRO_DIR);
  return files;
}

function extractTestIDs(yamlContent: string): string[] {
  const ids: string[] = [];
  // Match id: "some-id" patterns (Maestro testID references)
  const idRegex = /id:\s*"([^"]+)"/g;
  let match;
  while ((match = idRegex.exec(yamlContent)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

function findTestIDInSource(testID: string): boolean {
  // Search src/ for testID="..." or testID={`...`} references
  function searchDir(dir: string): boolean {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (searchDir(full)) return true;
      } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
        const content = readFileSync(full, 'utf-8');
        // Check for static testID="exact-match" or dynamic testID={`prefix-${var}`}
        if (content.includes(`"${testID}"`) || content.includes(`'${testID}'`)) return true;
        // Check for dynamic patterns like testID={`leg-${index}-arrival-date`}
        // by looking for the static part of the ID
        const parts = testID.split(/\d+/);
        if (parts.length > 1) {
          const pattern = parts.filter(Boolean).join('');
          if (pattern.length > 5 && content.includes(pattern)) return true;
        }
      }
    }
    return false;
  }
  return searchDir(SRC_DIR);
}

describe('Maestro flow drift detection', () => {
  const maestroFiles = getAllMaestroFiles();

  it('found Maestro flow files to check', () => {
    expect(maestroFiles.length).toBeGreaterThan(0);
  });

  // Check critical testIDs that are referenced in flows
  const criticalTestIDs = [
    // Onboarding
    'take-tutorial-button',
    'skip-tutorial-button',
    'enter-manually-button',
    'passport-number-input',
    'surname-input',
    'given-names-input',
    'dob-input',
    'passport-expiry-input',
    'passport-continue-button',
    'continue-to-security-button',
    'skip-biometric-button',
    // Trip creation
    'create-first-trip-button',
    'add-destination-button',
    'trip-name-input',
    'create-trip-button',
    // Navigation
    'tab-trips',
    'tab-wallet',
    'tab-profile',
    'tab-settings',
  ];

  for (const testID of criticalTestIDs) {
    it(`testID "${testID}" exists in source code`, () => {
      const found = findTestIDInSource(testID);
      expect(found, `testID "${testID}" referenced in Maestro flows but not found in src/`).toBe(true);
    });
  }

  it('tutorial step count in flows matches source', () => {
    const tutorialSrc = readFileSync(join(SRC_DIR, 'screens/onboarding/TutorialScreen.tsx'), 'utf-8');
    const stepCount = (tutorialSrc.match(/id:\s*\d+,\s*\n\s*title:/g) || []).length;

    for (const file of maestroFiles) {
      const content = readFileSync(file, 'utf-8');
      // Only match tutorial step references (near TUTORIAL section comments)
      // Skip submission guide "Step X of Y" references
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const stepMatch = lines[i].match(/Step (\d+) of (\d+)/);
        if (!stepMatch) continue;
        // Check if this is in a tutorial context (look at nearby lines for "tutorial" or "TUTORIAL")
        const context = lines.slice(Math.max(0, i - 5), i + 1).join('\n').toLowerCase();
        if (!context.includes('tutorial')) continue;
        const totalInFlow = parseInt(stepMatch[2], 10);
        expect(
          totalInFlow,
          `${file.split('/').pop()} references "Step ${stepMatch[1]} of ${totalInFlow}" but TutorialScreen has ${stepCount} steps`,
        ).toBe(stepCount);
      }
    }
  });

  it('date fields in flows use DatePickerField interaction (not inputText)', () => {
    const dateTestIDs = ['dob-input', 'passport-expiry-input', 'leg-0-arrival-date', 'leg-0-departure-date'];
    const failures: string[] = [];

    for (const file of maestroFiles) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        for (const dateID of dateTestIDs) {
          if (lines[i].includes(`id: "${dateID}"`) && i + 1 < lines.length) {
            // Check if the next non-empty line uses inputText (old pattern)
            for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
              if (lines[j].includes('inputText:')) {
                failures.push(
                  `${file.split('/').pop()}:${j + 1} — uses inputText after "${dateID}" but DatePickerField needs modal interaction`,
                );
              }
            }
          }
        }
      }
    }

    expect(failures, `Flows using old text input pattern for date fields:\n${failures.join('\n')}`).toEqual([]);
  });
});
