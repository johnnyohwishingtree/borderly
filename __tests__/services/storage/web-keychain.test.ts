/**
 * Spec: Web keychain implementation encrypts PII at rest using Web Crypto API
 *
 * Status: hypothesis
 * Confirm: A keychainService.web.ts exists that uses IndexedDB for storage
 *   and Web Crypto (AES-GCM + PBKDF2) for encryption, matching the
 *   KeychainService interface from keychainTypes.ts
 * Invalidate: Browser extensions (password manager APIs) provide a better
 *   mechanism than IndexedDB + Web Crypto for PII storage on web
 *
 * Context: On native, react-native-keychain uses the OS secure enclave.
 * On web, the closest equivalent is IndexedDB (persistent, same-origin)
 * with Web Crypto API (AES-GCM) for encryption at rest. The encryption
 * key is derived from a user-provided password via PBKDF2.
 *
 * Security model: PII is encrypted before writing to IndexedDB. The
 * encryption key never touches localStorage or IndexedDB in plaintext.
 * The user must provide a password on each session (or we use a
 * session-scoped key stored in memory only).
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

test('web keychain implementation exists', () => {
  // Could be at service level or in the keychain subdirectory
  const paths = [
    'src/services/storage/keychain/keychainService.web.ts',
    'src/services/storage/keychain/webKeychainService.ts',
    'src/services/storage/webKeychain.ts',
  ];
  const found = paths.some(p => existsSync(resolve(ROOT, p)));
  expect(found).toBe(true);
});

test('web keychain uses Web Crypto for encryption', () => {
  // Find whichever web keychain file exists and check it uses crypto.subtle
  const paths = [
    'src/services/storage/keychain/keychainService.web.ts',
    'src/services/storage/keychain/webKeychainService.ts',
    'src/services/storage/webKeychain.ts',
  ];
  const existing = paths.find(p => existsSync(resolve(ROOT, p)));
  expect(existing).toBeDefined();

  const content = readFileSync(resolve(ROOT, existing!), 'utf-8');

  // Must use Web Crypto for encryption
  expect(content).toMatch(/crypto\.subtle|SubtleCrypto|AES-GCM|PBKDF2/);
  // Must use IndexedDB for persistence
  expect(content).toMatch(/indexedDB|IDBDatabase|idb/i);
});

test('web keychain implements storeProfileById and getProfileById', () => {
  const paths = [
    'src/services/storage/keychain/keychainService.web.ts',
    'src/services/storage/keychain/webKeychainService.ts',
    'src/services/storage/webKeychain.ts',
  ];
  const existing = paths.find(p => existsSync(resolve(ROOT, p)));
  expect(existing).toBeDefined();

  const content = readFileSync(resolve(ROOT, existing!), 'utf-8');
  expect(content).toMatch(/storeProfileById/);
  expect(content).toMatch(/getProfileById/);
});
