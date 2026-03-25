import type { TravelerProfile, FamilyMember } from '@/types/profile';
import type { FamilyProfileCollection } from '@/types/family';
import { keychainService, mmkvService } from '@/services/storage';

import type { ProfileStore } from './useProfileStoreTypes';
import {
  FAMILY_PROFILES_KEY,
  MAX_PROFILES,
  serializeFamilyCollection,
  computeFamilyStats,
  buildFamilyMembers,
} from './profileStoreHelpers';

type Set = (partial: Partial<ProfileStore>) => void;
type Get = () => ProfileStore;

/**
 * Profile access methods: getProfile, getAllProfiles, getAllFamilyProfiles, getProfileMetadata
 */
export const createProfileAccessSlice = (_set: Set, get: Get) => ({
  getProfile: async (profileId: string) => {
    try {
      return await keychainService.getProfileById(profileId);
    } catch (error) {
      console.error(`Failed to get profile ${profileId}:`, error);
      return null;
    }
  },

  getAllProfiles: async () => {
    const { familyProfiles } = get();
    const profileMap = new Map<string, TravelerProfile>();

    try {
      for (const [profileId] of familyProfiles.profiles) {
        const profile = await keychainService.getProfileById(profileId);
        if (profile) {
          profileMap.set(profileId, profile);
        }
      }
    } catch (error) {
      console.error('Failed to get all profiles:', error);
    }

    return profileMap;
  },

  getAllFamilyProfiles: async () => {
    const { familyProfiles } = get();
    const profileMap = await get().getAllProfiles();
    return buildFamilyMembers(familyProfiles, profileMap) as FamilyMember[];
  },

  getProfileMetadata: (profileId: string) => {
    const { familyProfiles } = get();
    return familyProfiles.profiles.get(profileId) || null;
  },
});

/**
 * Family management: setPrimaryProfile, getFamilyStats, canAddProfile
 */
export const createFamilyManagementSlice = (set: Set, get: Get) => ({
  setPrimaryProfile: async (profileId: string) => {
    const { familyProfiles } = get();

    if (!familyProfiles.profiles.has(profileId)) {
      throw new Error('Profile not found');
    }

    // Update all profiles to mark the new primary
    const updatedProfiles = new Map(familyProfiles.profiles);
    for (const [id, metadata] of updatedProfiles) {
      metadata.isPrimary = id === profileId;
      metadata.updatedAt = new Date().toISOString();
    }

    const updatedFamilyProfiles: FamilyProfileCollection = {
      ...familyProfiles,
      profiles: updatedProfiles,
      primaryProfileId: profileId,
      lastModified: new Date().toISOString(),
    };

    // Save to MMKV
    mmkvService.setString(FAMILY_PROFILES_KEY, JSON.stringify(serializeFamilyCollection(updatedFamilyProfiles)));

    set({
      familyProfiles: updatedFamilyProfiles,
    });
  },

  getFamilyStats: () => {
    return computeFamilyStats(get().familyProfiles);
  },

  canAddProfile: () => {
    const { familyProfiles } = get();
    return familyProfiles.profiles.size < MAX_PROFILES;
  },
});

/**
 * Legacy operations (backward compatibility): loadProfile, updateProfile, saveProfile, clearProfile
 * Migration: migrateLegacyProfile
 * Onboarding: setOnboardingComplete
 */
export const createLegacySlice = (set: Set, get: Get) => ({
  loadProfile: async () => {
    // Just load the current profile using the new system
    await get().loadFamilyProfiles();
  },

  updateProfile: async (updates: Partial<TravelerProfile>) => {
    const { currentProfileId } = get();
    if (!currentProfileId) {
      throw new Error('No current profile to update');
    }
    await get().updateProfileById(currentProfileId, updates);
  },

  saveProfile: async (profile: TravelerProfile) => {
    const { familyProfiles, currentProfileId } = get();

    if (currentProfileId && familyProfiles.profiles.has(currentProfileId)) {
      // Update existing profile
      await get().updateProfileById(currentProfileId, profile);
    } else {
      // Add as new profile (first time or no current profile set)
      await get().addProfile(profile, {
        relationship: 'self',
        isPrimary: familyProfiles.profiles.size === 0,
        isActive: true,
        biometricEnabled: true,
        nickname: `${profile.givenNames} ${profile.surname}`,
      });
      await get().switchToProfile(profile.id);
    }
  },

  clearProfile: async () => {
    const { currentProfileId } = get();
    if (currentProfileId) {
      await get().deleteProfile(currentProfileId);
    }

    // Also clear onboarding state
    mmkvService.setPreference('onboardingComplete', false);
    set({ isOnboardingComplete: false });
  },

  // Migration
  migrateLegacyProfile: async () => {
    // This is handled automatically in loadFamilyProfiles
    await get().loadFamilyProfiles();
  },

  // Onboarding state
  setOnboardingComplete: (complete: boolean) => {
    mmkvService.setPreference('onboardingComplete', complete);
    set({ isOnboardingComplete: complete });
  },
});
