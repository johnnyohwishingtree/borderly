/**
 * Encryption key management for the Keychain service.
 *
 * Handles generation, retrieval, and deletion of encryption keys
 * stored in the OS Keychain — both legacy single-key and per-profile keys.
 */

import 'react-native-get-random-values';

const ENCRYPTION_KEY = 'borderly_encryption_key';
const PROFILE_ENCRYPTION_KEY_PREFIX = 'borderly_profile_enc_';

export interface KeychainOps {
  storeInKeychain(key: string, username: string, data: string): Promise<void>;
  getFromKeychain(key: string): Promise<string | null>;
  deleteFromKeychain(key: string): Promise<void>;
  clearSensitiveMemory(): void;
}

function getProfileEncryptionKeychainKey(profileId: string): string {
  return `${PROFILE_ENCRYPTION_KEY_PREFIX}${profileId}`;
}

function generateHexKey(): string {
  const keyBytes = new Uint8Array(32);
  crypto.getRandomValues(keyBytes);
  return Array.from(keyBytes)
    .map((byte: number) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function generateEncryptionKey(ops: KeychainOps): Promise<string> {
  try {
    const key = generateHexKey();
    await ops.storeInKeychain(ENCRYPTION_KEY, 'borderly_encryption', key);
    return key;
  } catch (error) {
    console.error('Failed to generate encryption key:', error);
    throw new Error('Failed to generate encryption key');
  }
}

export async function getEncryptionKey(ops: KeychainOps): Promise<string | null> {
  try {
    const key = await ops.getFromKeychain(ENCRYPTION_KEY);

    if (key) {
      setTimeout(() => {
        ops.clearSensitiveMemory();
      }, 60000);
    }

    return key;
  } catch (error) {
    console.error('Failed to retrieve encryption key:', error);
    return null;
  }
}

export async function generateProfileEncryptionKey(
  ops: KeychainOps,
  profileId: string,
): Promise<string> {
  try {
    const key = generateHexKey();
    const keychainKey = getProfileEncryptionKeychainKey(profileId);
    await ops.storeInKeychain(keychainKey, 'borderly_encryption', key);
    return key;
  } catch (error) {
    console.error(`Failed to generate encryption key for profile ${profileId}:`, error);
    throw new Error(`Failed to generate encryption key for profile ${profileId}`);
  }
}

export async function getProfileEncryptionKey(
  ops: KeychainOps,
  profileId: string,
): Promise<string | null> {
  try {
    const keychainKey = getProfileEncryptionKeychainKey(profileId);
    const key = await ops.getFromKeychain(keychainKey);

    if (key) {
      setTimeout(() => {
        ops.clearSensitiveMemory();
      }, 60000);
    }

    return key;
  } catch (error) {
    console.error(`Failed to retrieve encryption key for profile ${profileId}:`, error);
    return null;
  }
}

export async function deleteProfileEncryptionKey(
  ops: KeychainOps,
  profileId: string,
): Promise<void> {
  try {
    const keychainKey = getProfileEncryptionKeychainKey(profileId);
    await ops.deleteFromKeychain(keychainKey);
  } catch (error) {
    console.error(`Failed to delete encryption key for profile ${profileId}:`, error);
    throw new Error(`Failed to delete encryption key for profile ${profileId}`);
  }
}
