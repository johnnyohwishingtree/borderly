import * as fs from 'fs';
import * as path from 'path';

/**
 * Ensures every custom hook in src/hooks/ that calls a store write method
 * has a corresponding test file in __tests__/hooks/.
 *
 * Hooks that mutate store state are critical data paths. Without tests,
 * bugs like "saveProfile overwrites primary profile in familyMode" go
 * undetected until a user hits them.
 */

const ROOT = path.resolve(__dirname, '../..');
const HOOKS_DIR = path.join(ROOT, 'src/hooks');
const HOOKS_TESTS_DIR = path.join(ROOT, '__tests__/hooks');

// Store methods that write/mutate state
const WRITE_METHODS = [
  'saveProfile',
  'addProfile',
  'updateProfile',
  'updateProfileById',
  'deleteProfile',
  'createTrip',
  'addLeg',
  'updateLeg',
  'deleteLeg',
  'updateField',
  'generateForm',
  'setOnboardingComplete',
];

const WRITE_PATTERN = new RegExp(`\\b(${WRITE_METHODS.join('|')})\\b`);

describe('hook test coverage', () => {
  it('every hook that writes to a store must have a test file', () => {
    const hookFiles = fs
      .readdirSync(HOOKS_DIR)
      .filter((f) => f.startsWith('use') && f.endsWith('.ts') && f !== 'index.ts');

    expect(hookFiles.length).toBeGreaterThan(0);

    const hooksWithWrites = hookFiles.filter((f) => {
      const content = fs.readFileSync(path.join(HOOKS_DIR, f), 'utf8');
      return WRITE_PATTERN.test(content);
    });

    const testFiles = fs.existsSync(HOOKS_TESTS_DIR)
      ? fs.readdirSync(HOOKS_TESTS_DIR).filter((f) => f.endsWith('.test.ts'))
      : [];

    const untested = hooksWithWrites.filter((hookFile) => {
      const baseName = hookFile.replace('.ts', '');
      return !testFiles.some((t) => t.includes(baseName));
    });

    if (untested.length > 0) {
      throw new Error(
        `Found ${untested.length} hook(s) that write to stores but have no test:\n\n` +
          untested.map((f) => `  - src/hooks/${f} → missing __tests__/hooks/${f.replace('.ts', '.test.ts')}`).join('\n') +
          '\n\n' +
          'Hooks that mutate state are critical data paths and must have tests.\n' +
          'At minimum, test that the correct store method is called with the right args.'
      );
    }
  });
});
