/**
 * Multi-profile Keychain operations.
 *
 * Handles storing, retrieving, and deleting profiles by ID,
 * as well as migrating legacy single-profile data.
 */

import { TravelerProfile } from '@/types/profile';
import type { KeychainOps } from './keychainEncryption';

const LEGACY_PROFILE_KEY = 'borderly_traveler_profile';
const PROFILE_KEY_PREFIX = 'borderly_profile_';

function getProfileKeychainKey(profileId: string): string {
  return `${PROFILE_KEY_PREFIX}${profileId}`;
}

export async function storeProfileById(
  ops: KeychainOps,
  profileId: string,
  profile: TravelerProfile,
): Promise<void> {
  try {
    const profileJson = JSON.stringify(profile);
    const keychainKey = getProfileKeychainKey(profileId);
    await ops.storeInKeychain(keychainKey, 'borderly_user', profileJson);
  } catch (error) {
    console.error(`Failed to store profile ${profileId}:`, error);
    throw new Error(`Failed to securely store profile data for ${profileId}`);
  }
}

export async function getProfileById(
  ops: KeychainOps,
  sensitiveDataRefs: WeakSet<object>,
  profileId: string,
): Promise<TravelerProfile | null> {
  try {
    const keychainKey = getProfileKeychainKey(profileId);
    const profileJson = await ops.getFromKeychain(keychainKey);

    if (!profileJson) {
      return null;
    }

    const profile = JSON.parse(profileJson) as TravelerProfile;
    sensitiveDataRefs.add(profile);
    return profile;
  } catch (error) {
    console.error(`Failed to retrieve profile ${profileId}:`, error);
    return null;
  }
}

export async function deleteProfileById(
  ops: KeychainOps,
  profileId: string,
  deleteProfileEncryptionKey: (profileId: string) => Promise<void>,
  deleteAllPortalCredentials: (profileId: string) => Promise<void>,
): Promise<void> {
  try {
    const keychainKey = getProfileKeychainKey(profileId);
    await ops.deleteFromKeychain(keychainKey);
    await deleteProfileEncryptionKey(profileId);
    await deleteAllPortalCredentials(profileId);
  } catch (error) {
    console.error(`Failed to delete profile ${profileId}:`, error);
    throw new Error(`Failed to delete profile data for ${profileId}`);
  }
}

export async function profileExists(
  ops: KeychainOps,
  profileId: string,
): Promise<boolean> {
  try {
    const keychainKey = getProfileKeychainKey(profileId);
    const data = await ops.getFromKeychain(keychainKey);
    return data !== null;
  } catch (error) {
    console.error(`Failed to check if profile ${profileId} exists:`, error);
    return false;
  }
}

export async function migrateLegacyProfile(
  ops: KeychainOps,
  storeById: (profileId: string, profile: TravelerProfile) => Promise<void>,
  generateProfileEncKey: (profileId: string) => Promise<string>,
): Promise<string | null> {
  try {
    const legacyProfile = await ops.getFromKeychain(LEGACY_PROFILE_KEY);
    if (!legacyProfile) {
      return null;
    }

    const profile = JSON.parse(legacyProfile) as TravelerProfile;
    const profileId = profile.id;

    await storeById(profileId, profile);
    await generateProfileEncKey(profileId);
    await ops.deleteFromKeychain(LEGACY_PROFILE_KEY);

    console.log(`Migrated legacy profile to multi-profile system: ${profileId}`);
    return profileId;
  } catch (error) {
    console.error('Failed to migrate legacy profile:', error);
    return null;
  }
}
