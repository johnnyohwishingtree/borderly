import type { TravelerProfile, FamilyMember } from '@/types/profile';
import type {
  FamilyProfileCollection,
  ProfileMetadata,
  FamilyRelationship,
  SerializableFamilyProfileCollection,
  FamilyProfileStats,
} from '@/types/family';

// Constants
export const FAMILY_PROFILES_KEY = 'family_profiles';
export const CURRENT_PROFILE_ID_KEY = 'current_profile_id';
export const MAX_PROFILES = 8;
export const FAMILY_PROFILES_VERSION = 1;

// Helper functions
export const createEmptyFamilyCollection = (): FamilyProfileCollection => ({
  profiles: new Map(),
  primaryProfileId: '',
  maxProfiles: MAX_PROFILES,
  version: FAMILY_PROFILES_VERSION,
  lastModified: new Date().toISOString(),
});

export const serializeFamilyCollection = (collection: FamilyProfileCollection): SerializableFamilyProfileCollection => ({
  profiles: Object.fromEntries(collection.profiles),
  primaryProfileId: collection.primaryProfileId,
  maxProfiles: collection.maxProfiles,
  version: collection.version,
  lastModified: collection.lastModified,
});

export const deserializeFamilyCollection = (data: SerializableFamilyProfileCollection): FamilyProfileCollection => ({
  profiles: new Map(Object.entries(data.profiles)),
  primaryProfileId: data.primaryProfileId,
  maxProfiles: data.maxProfiles,
  version: data.version,
  lastModified: data.lastModified,
});

export const createProfileMetadata = (
  profileId: string,
  metadata: Omit<ProfileMetadata, 'id' | 'createdAt' | 'updatedAt'>
): ProfileMetadata => ({
  ...metadata,
  id: profileId,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export function buildFamilyMembers(
  familyProfiles: FamilyProfileCollection,
  profileMap: Map<string, TravelerProfile>,
): FamilyMember[] {
  const members: FamilyMember[] = [];
  for (const [profileId, metadata] of familyProfiles.profiles) {
    const profile = profileMap.get(profileId);
    if (profile) {
      members.push({ ...profile, relationship: metadata.relationship as FamilyMember['relationship'] });
    }
  }
  const primaryId = familyProfiles.primaryProfileId;
  members.sort((a, b) => {
    if (a.id === primaryId) return -1;
    if (b.id === primaryId) return 1;
    return 0;
  });
  return members;
}

export function computeFamilyStats(familyProfiles: FamilyProfileCollection): FamilyProfileStats | null {
  if (familyProfiles.profiles.size === 0) return null;

  const profilesByRelationship: Record<FamilyRelationship, number> = {
    self: 0, spouse: 0, child: 0, parent: 0, sibling: 0, other: 0,
  };

  let lastAccessedProfile: ProfileMetadata | undefined;
  let activeProfiles = 0;
  let primaryProfile: ProfileMetadata | undefined;

  for (const metadata of familyProfiles.profiles.values()) {
    profilesByRelationship[metadata.relationship]++;
    if (metadata.isActive) activeProfiles++;
    if (metadata.isPrimary) primaryProfile = metadata;
    if (!lastAccessedProfile ||
        (metadata.lastAccessed && metadata.lastAccessed > (lastAccessedProfile.lastAccessed || ''))) {
      lastAccessedProfile = metadata;
    }
  }

  if (!primaryProfile) return null;

  return {
    totalProfiles: familyProfiles.profiles.size,
    activeProfiles,
    primaryProfile,
    lastAccessedProfile,
    profilesByRelationship,
  };
}
