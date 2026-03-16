/**
 * Family-aware portal credential resolver.
 *
 * Government portals have different account models for families:
 *  - 'companion'  — one account covers the whole family (e.g. Visit Japan Web).
 *                   All family member submissions use the primary profile's credential.
 *  - 'individual' — every traveller needs their own account.
 *                   Looks up the credential for the specific profile.
 *  - 'none'       — no account / login required for this portal.
 *                   Returns null immediately.
 */

import { keychainService } from '@/services/storage/keychain';
import { FamilyPolicyType } from '@/types/submission';

/** The raw credential returned after resolution — contains the plaintext password. */
export interface ResolvedCredential {
  username: string;
  password: string;
}

/**
 * Resolves which stored credential to use for a given portal submission.
 *
 * @param profileId        - The profile that is being submitted (may be a family member).
 * @param primaryProfileId - The primary (account-holder) profile on this device.
 * @param portalCode       - The country/portal code (e.g. 'JPN').
 * @param familyPolicyType - The portal's declared family policy.
 * @returns The resolved credential, or null if none is stored / not required.
 */
export async function resolvePortalCredential(
  profileId: string,
  primaryProfileId: string,
  portalCode: string,
  familyPolicyType: FamilyPolicyType,
): Promise<ResolvedCredential | null> {
  switch (familyPolicyType) {
    case 'none':
      // No account needed — portal accepts unauthenticated submissions.
      return null;

    case 'companion':
      // Family members travel under the primary profile's account.
      return keychainService.getPortalCredential(primaryProfileId, portalCode);

    case 'individual':
      // Each traveller needs their own account.
      return keychainService.getPortalCredential(profileId, portalCode);

    default:
      return null;
  }
}

/**
 * Convenience wrapper: returns true if a usable credential exists for the
 * given profile × portal combination (respecting family policy).
 */
export async function hasResolvedCredential(
  profileId: string,
  primaryProfileId: string,
  portalCode: string,
  familyPolicyType: FamilyPolicyType,
): Promise<boolean> {
  const credential = await resolvePortalCredential(
    profileId,
    primaryProfileId,
    portalCode,
    familyPolicyType,
  );
  return credential !== null;
}
