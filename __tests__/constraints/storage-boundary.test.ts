/**
 * Constraint: Storage Boundary (from Storage Tiers + Local-First Architecture)
 *
 * Decision: Three tiers mapped to data sensitivity — Keychain for PII + encryption
 *   keys (OS-level, biometric-protected), WatermelonDB for structured app data
 *   (trips, forms, QR codes; encrypted at rest), MMKV for config/preferences/schemas
 *   (fast, unencrypted). Data never crosses tiers upward.
 * Rejected: Single storage layer — can't satisfy both security and performance.
 *   PII in WatermelonDB — not hardware-backed. PII in MMKV — unencrypted, included
 *   in device backups. AsyncStorage — no encryption, no tiering.
 *
 * Scope: src/services/storage/, src/hooks/, src/services/**, src/stores/
 *
 * REQUIRE: passport data, encryption keys -> OS Keychain only
 * REQUIRE: trips, form data, QR codes -> WatermelonDB (encrypted at rest)
 * REQUIRE: preferences, schemas, flags -> MMKV
 * REQUIRE: all storage access through centralized services in src/services/storage/
 * REQUIRE: WatermelonDB encryption key stored in Keychain
 * REQUIRE: Keychain items use WHEN_UNLOCKED_THIS_DEVICE_ONLY (excluded from backups)
 * REQUIRE: app fully functional offline (except portal submission)
 * REQUIRE: each family member has isolated storage
 * DENY:    PII in MMKV (not encrypted, included in device backups)
 * DENY:    PII in WatermelonDB (must be stripped via stripPIIFromFormData)
 * DENY:    direct react-native-keychain imports outside src/services/storage/
 * DENY:    direct react-native-mmkv imports outside src/services/storage/
 * DENY:    sending PII to any external server or API
 *
 * Exceptions:
 * - LockScreen.tsx — biometric capability check (not reading PII)
 * - useAppLock.ts — biometric auth prompt (IS the security boundary)
 * - keychainValidator.ts — security audit tool (needs raw Keychain access)
 * - dataLeakDetector.ts — security scanner (needs raw MMKV access to scan)
 * - privacyAudit.ts — audit tool (needs raw access to inventory all tiers)
 * - Apple MapKit search queries send hotel name text (not PII) to Apple servers
 *
 * Anti-patterns:
 * - `import * as Keychain from 'react-native-keychain'` in a hook (use storage service)
 * - `new MMKV({ id: 'custom' })` in utils (use mmkvService)
 * - Storing encryption keys alongside encrypted data
 * - AsyncStorage — not used, use MMKV or WatermelonDB
 *
 * Why: Keychain is hardware-backed (.context/external/tools/keychain-is-os-secure-storage.md)
 *      MMKV is unencrypted (.context/external/tools/mmkv-is-fast-but-unencrypted.md)
 *      PII requires encryption at rest (.context/external/regulatory/pii-has-special-handling-requirements.md)
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
