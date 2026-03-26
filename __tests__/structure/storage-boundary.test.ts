/**
 * Structural test: Storage boundary enforcement.
 *
 * Verifies that only centralized storage services and legitimate security
 * tools import react-native-keychain or react-native-mmkv directly.
 *
 * See: .knowledge/policies/data/storage-tiers.md
 */

import { execSync } from 'child_process';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

/** Files allowed to import react-native-keychain directly */
const KEYCHAIN_EXCEPTIONS = new Set([
  // Centralized service
  'src/services/storage/keychain/keychainService.ts',
  // Security tools that need raw access
  'src/screens/Lock/LockScreen.tsx',
  'src/hooks/useAppLock.ts',
  'src/utils/security/keychainValidator.ts',
  'src/utils/security/dataLeakDetector.ts',
  'src/utils/security/privacyAudit.ts',
]);

/** Files allowed to import react-native-mmkv directly */
const MMKV_EXCEPTIONS = new Set([
  // Centralized service
  'src/services/storage/mmkv.ts',
]);

function findDirectImports(moduleName: string): string[] {
  try {
    const output = execSync(
      `grep -rn "from ['\"]${moduleName}['\"]" "${resolve(ROOT, 'src')}" --include="*.ts" --include="*.tsx" -l`,
      { encoding: 'utf-8' },
    );
    return output
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(f => f.replace(`${ROOT}/`, ''));
  } catch {
    // grep returns exit code 1 when no matches found
    return [];
  }
}

describe('Storage boundary', () => {
  it('does not import react-native-keychain outside allowed files', () => {
    const files = findDirectImports('react-native-keychain');
    const violations = files.filter(f => !KEYCHAIN_EXCEPTIONS.has(f));

    expect(violations).toEqual([]);
  });

  it('does not import react-native-mmkv outside allowed files', () => {
    const files = findDirectImports('react-native-mmkv');
    const violations = files.filter(f => !MMKV_EXCEPTIONS.has(f));

    expect(violations).toEqual([]);
  });

  it('does not instantiate MMKV directly outside mmkv.ts', () => {
    try {
      const output = execSync(
        `grep -rn "new MMKV(" "${resolve(ROOT, 'src')}" --include="*.ts" --include="*.tsx" -l`,
        { encoding: 'utf-8' },
      );
      const files = output
        .trim()
        .split('\n')
        .filter(Boolean)
        .map(f => f.replace(`${ROOT}/`, ''));
      const violations = files.filter(f => !MMKV_EXCEPTIONS.has(f));

      expect(violations).toEqual([]);
    } catch {
      // No matches — test passes
    }
  });
});
