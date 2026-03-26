/**
 * Portal credential Keychain operations.
 *
 * Handles storing, retrieving, and deleting portal credentials
 * from the OS Keychain, coordinating with the MMKV metadata index.
 */

import * as Keychain from 'react-native-keychain';
import { PortalCredential } from '@/types/submission';
import type { KeychainOps } from './keychainEncryption';
import {
  getPortalCredentialKey,
  getPortalCredentialIndex,
  savePortalCredentialIndex,
  deletePortalCredentialIndexEntry,
} from './keychainPortalCredentials';

export async function storePortalCredential(
  ops: KeychainOps,
  profileId: string,
  portalCode: string,
  username: string,
  password: string,
  email?: string,
): Promise<void> {
  try {
    const key = getPortalCredentialKey(profileId, portalCode);
    await ops.storeInKeychain(key, username, password);

    const now = new Date().toISOString();
    const index = getPortalCredentialIndex(profileId);
    const existingIdx = index.findIndex(c => c.portalCode === portalCode);
    const entry: PortalCredential = {
      portalCode,
      profileId,
      username,
      ...(email !== undefined && { email }),
      createdAt: existingIdx >= 0 ? index[existingIdx].createdAt : now,
      lastUsed: now,
    };

    if (existingIdx >= 0) {
      index[existingIdx] = entry;
    } else {
      index.push(entry);
    }
    savePortalCredentialIndex(profileId, index);
  } catch (error) {
    console.error(`Failed to store portal credential for ${profileId}/${portalCode}:`, error);
    throw new Error('Failed to securely store portal credential');
  }
}

export async function getPortalCredential(
  profileId: string,
  portalCode: string,
  keychainGetOptions: Keychain.GetOptions,
): Promise<{ username: string; password: string } | null> {
  try {
    const key = getPortalCredentialKey(profileId, portalCode);
    const credentials = await Keychain.getInternetCredentials(key, keychainGetOptions);

    if (!credentials || typeof credentials === 'boolean') {
      return null;
    }

    const index = getPortalCredentialIndex(profileId);
    const existingIdx = index.findIndex(c => c.portalCode === portalCode);
    if (existingIdx >= 0) {
      index[existingIdx] = {
        ...index[existingIdx],
        lastUsed: new Date().toISOString(),
      };
      savePortalCredentialIndex(profileId, index);
    }

    return { username: credentials.username, password: credentials.password };
  } catch (error) {
    console.error(`Failed to retrieve portal credential for ${profileId}/${portalCode}:`, error);
    return null;
  }
}

export async function deletePortalCredential(
  ops: KeychainOps,
  profileId: string,
  portalCode: string,
): Promise<void> {
  try {
    const key = getPortalCredentialKey(profileId, portalCode);
    await ops.deleteFromKeychain(key);

    const index = getPortalCredentialIndex(profileId);
    const updated = index.filter(c => c.portalCode !== portalCode);
    savePortalCredentialIndex(profileId, updated);
  } catch (error) {
    console.error(`Failed to delete portal credential for ${profileId}/${portalCode}:`, error);
    throw new Error('Failed to delete portal credential');
  }
}

export async function deleteAllPortalCredentialsForProfile(
  ops: KeychainOps,
  profileId: string,
): Promise<void> {
  try {
    const credentials = getPortalCredentialIndex(profileId);

    await Promise.all(
      credentials.map(cred =>
        ops.deleteFromKeychain(
          getPortalCredentialKey(profileId, cred.portalCode),
        ).catch(err => {
          console.warn(
            `Failed to delete portal credential ${cred.portalCode} for ${profileId}:`,
            err,
          );
        }),
      ),
    );

    deletePortalCredentialIndexEntry(profileId);
  } catch (error) {
    console.error(`Failed to delete all portal credentials for profile ${profileId}:`, error);
    throw new Error(`Failed to delete portal credentials for profile ${profileId}`);
  }
}
