import { PortalCredential } from '@/types/submission';
import { mmkvService } from './mmkv';

/**
 * Helper functions for managing portal credential metadata in MMKV.
 * The actual secrets (username/password) are stored in OS Keychain;
 * these helpers manage the non-secret index stored in MMKV.
 */

export function getPortalCredentialKey(profileId: string, portalCode: string): string {
  return `borderly_portal_cred_${profileId}_${portalCode}`;
}

export function getPortalCredentialIndexKey(profileId: string): string {
  return `borderly_portal_cred_index_${profileId}`;
}

export function getPortalCredentialIndex(profileId: string): PortalCredential[] {
  try {
    const raw = mmkvService.getString(getPortalCredentialIndexKey(profileId));
    if (raw) {
      return JSON.parse(raw) as PortalCredential[];
    }
  } catch (error) {
    console.warn(`Failed to read portal credential index for ${profileId}:`, error);
  }
  return [];
}

export function savePortalCredentialIndex(profileId: string, credentials: PortalCredential[]): void {
  try {
    mmkvService.setString(
      getPortalCredentialIndexKey(profileId),
      JSON.stringify(credentials),
    );
  } catch (error) {
    console.error(`Failed to save portal credential index for ${profileId}:`, error);
    throw error;
  }
}

export function deletePortalCredentialIndexEntry(profileId: string): void {
  mmkvService.delete(getPortalCredentialIndexKey(profileId));
}
