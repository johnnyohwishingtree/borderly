import { create } from 'zustand';
import { TravelerProfile } from '@/types/profile';
import {
  FamilyProfileCollection,
  ProfileMetadata,
  SerializableFamilyProfileCollection,
} from '@/types/family';
import { keychainService, mmkvService } from '@/services/storage';
import {
  schedulePassportExpiryNotifications,
  cancelPassportExpiryNotifications,
} from '@/services/deadline/passportExpiryNotifications';

import type { ProfileStore } from './useProfileStoreTypes';
import {
  FAMILY_PROFILES_KEY,
  CURRENT_PROFILE_ID_KEY,
  MAX_PROFILES,
  createEmptyFamilyCollection,
  serializeFamilyCollection,
  deserializeFamilyCollection,
  createProfileMetadata,
} from './profileStoreHelpers';
import {
  createProfileAccessSlice,
  createFamilyManagementSlice,
  createLegacySlice,
} from './profileStoreSlices';

export type { ProfileStore } from './useProfileStoreTypes';

export const useProfileStore = create<ProfileStore>((set, get) => ({
  // State initialization
  familyProfiles: createEmptyFamilyCollection(),
  currentProfile: null,
  currentProfileId: null,
  profile: null, // Legacy support
  isOnboardingComplete: false,
  isLoading: false,
  error: null,

  // Multi-profile operations
  loadFamilyProfiles: async () => {
    set({ isLoading: true, error: null });
    try {
      // Load family profile collection from MMKV
      const storedDataString = mmkvService.getString(FAMILY_PROFILES_KEY);
      const currentProfileId = mmkvService.getString(CURRENT_PROFILE_ID_KEY);

      let storedData: SerializableFamilyProfileCollection | null = null;
      if (storedDataString) {
        try {
          storedData = JSON.parse(storedDataString) as SerializableFamilyProfileCollection;
        } catch (error) {
          console.error('Failed to parse family profiles data:', error);
        }
      }
      const isOnboardingComplete = mmkvService.getPreferences().onboardingComplete;

      let familyProfiles: FamilyProfileCollection;
      if (storedData) {
        familyProfiles = deserializeFamilyCollection(storedData);
      } else {
        // Try to migrate legacy profile
        const migratedProfileId = await keychainService.migrateLegacyProfile();
        if (migratedProfileId) {
          const migratedProfile = await keychainService.getProfileById(migratedProfileId);
          if (migratedProfile) {
            familyProfiles = createEmptyFamilyCollection();
            const metadata = createProfileMetadata(migratedProfileId, {
              relationship: 'self',
              isPrimary: true,
              isActive: true,
              biometricEnabled: true,
              nickname: `${migratedProfile.givenNames} ${migratedProfile.surname}`,
            });
            familyProfiles.profiles.set(migratedProfileId, metadata);
            familyProfiles.primaryProfileId = migratedProfileId;
          } else {
            familyProfiles = createEmptyFamilyCollection();
          }
        } else {
          familyProfiles = createEmptyFamilyCollection();
        }
      }

      // Load current profile if available
      let currentProfile: TravelerProfile | null = null;
      if (currentProfileId && familyProfiles.profiles.has(currentProfileId)) {
        currentProfile = await keychainService.getProfileById(currentProfileId);
        // Update last accessed time
        const metadata = familyProfiles.profiles.get(currentProfileId)!;
        metadata.lastAccessed = new Date().toISOString();
        familyProfiles.profiles.set(currentProfileId, metadata);
      }

      set({
        familyProfiles,
        currentProfile,
        currentProfileId: currentProfileId || null,
        profile: currentProfile, // Legacy support
        isOnboardingComplete,
        isLoading: false,
      });

      // Save updated family collection
      const currentSerialized = JSON.stringify(serializeFamilyCollection(familyProfiles));
      if (storedDataString !== currentSerialized) {
        mmkvService.setString(FAMILY_PROFILES_KEY, currentSerialized);
      }
    } catch (error) {
      console.error('Failed to load family profiles:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load family profiles',
        isLoading: false,
      });
    }
  },

  addProfile: async (profile: TravelerProfile, metadata) => {
    const { familyProfiles } = get();

    if (familyProfiles.profiles.size >= MAX_PROFILES) {
      throw new Error(`Cannot add more than ${MAX_PROFILES} profiles`);
    }

    set({ isLoading: true, error: null });
    try {
      // Store profile in keychain
      await keychainService.storeProfileById(profile.id, profile);
      await keychainService.generateProfileEncryptionKey(profile.id);

      // Schedule passport expiry notifications for the new profile
      schedulePassportExpiryNotifications(profile).catch(err => {
        if (__DEV__) {
          console.warn('[useProfileStore] Failed to schedule passport expiry notifications:', err);
        }
      });

      // Create metadata
      const profileMetadata = createProfileMetadata(profile.id, metadata);

      // Update family collection
      const updatedProfiles = new Map(familyProfiles.profiles);
      updatedProfiles.set(profile.id, profileMetadata);

      // If this is the first profile, make it primary
      let primaryProfileId = familyProfiles.primaryProfileId;
      if (!primaryProfileId || !updatedProfiles.has(primaryProfileId)) {
        primaryProfileId = profile.id;
        profileMetadata.isPrimary = true;
      }

      const updatedFamilyProfiles: FamilyProfileCollection = {
        ...familyProfiles,
        profiles: updatedProfiles,
        primaryProfileId,
        lastModified: new Date().toISOString(),
      };

      // Save to MMKV
      mmkvService.setString(FAMILY_PROFILES_KEY, JSON.stringify(serializeFamilyCollection(updatedFamilyProfiles)));

      set({
        familyProfiles: updatedFamilyProfiles,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to add profile:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to add profile',
        isLoading: false,
      });
      throw error;
    }
  },

  updateProfileById: async (profileId: string, updates: Partial<TravelerProfile>) => {
    const { familyProfiles, currentProfileId } = get();

    if (!familyProfiles.profiles.has(profileId)) {
      throw new Error('Profile not found');
    }

    set({ isLoading: true, error: null });
    try {
      // Get current profile
      const currentProfile = await keychainService.getProfileById(profileId);
      if (!currentProfile) {
        throw new Error('Profile data not found in keychain');
      }

      // Apply updates (prevent id mutation)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, ...safeUpdates } = updates;
      const updatedProfile = {
        ...currentProfile,
        ...safeUpdates,
        id: currentProfile.id,
        updatedAt: new Date().toISOString(),
      };

      // Store updated profile
      await keychainService.storeProfileById(profileId, updatedProfile);

      // Reschedule passport expiry notifications for updated passport data
      schedulePassportExpiryNotifications(updatedProfile).catch(err => {
        if (__DEV__) {
          console.warn('[useProfileStore] Failed to reschedule passport expiry notifications:', err);
        }
      });

      // Update metadata timestamp
      const metadata = familyProfiles.profiles.get(profileId)!;
      metadata.updatedAt = new Date().toISOString();

      const updatedFamilyProfiles: FamilyProfileCollection = {
        ...familyProfiles,
        lastModified: new Date().toISOString(),
      };

      // Save to MMKV
      mmkvService.setString(FAMILY_PROFILES_KEY, JSON.stringify(serializeFamilyCollection(updatedFamilyProfiles)));

      // Update current profile if it's the one being updated
      const newCurrentProfile = profileId === currentProfileId ? updatedProfile : get().currentProfile;

      set({
        familyProfiles: updatedFamilyProfiles,
        currentProfile: newCurrentProfile,
        profile: newCurrentProfile, // Legacy support
        isLoading: false,
      });
    } catch (error) {
      console.error(`Failed to update profile ${profileId}:`, error);
      set({
        error: error instanceof Error ? error.message : 'Failed to update profile',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteProfile: async (profileId: string) => {
    const { familyProfiles, currentProfileId } = get();

    if (!familyProfiles.profiles.has(profileId)) {
      throw new Error('Profile not found');
    }

    const metadata = familyProfiles.profiles.get(profileId)!;
    if (metadata.isPrimary && familyProfiles.profiles.size > 1) {
      throw new Error('Cannot delete primary profile. Please set another profile as primary first.');
    }

    set({ isLoading: true, error: null });
    try {
      // Delete from keychain
      await keychainService.deleteProfileById(profileId);

      // Cancel passport expiry notifications for the deleted profile
      cancelPassportExpiryNotifications(profileId).catch(err => {
        if (__DEV__) {
          console.warn('[useProfileStore] Failed to cancel passport expiry notifications:', err);
        }
      });

      // Remove from family collection
      const updatedProfiles = new Map(familyProfiles.profiles);
      updatedProfiles.delete(profileId);

      // Update primary profile if necessary
      let primaryProfileId = familyProfiles.primaryProfileId;
      if (primaryProfileId === profileId && updatedProfiles.size > 0) {
        // Set the first remaining profile as primary
        const firstProfile = updatedProfiles.values().next().value as ProfileMetadata;
        primaryProfileId = firstProfile.id;
        firstProfile.isPrimary = true;
      }

      const updatedFamilyProfiles: FamilyProfileCollection = {
        ...familyProfiles,
        profiles: updatedProfiles,
        primaryProfileId,
        lastModified: new Date().toISOString(),
      };

      // Save to MMKV
      mmkvService.setString(FAMILY_PROFILES_KEY, JSON.stringify(serializeFamilyCollection(updatedFamilyProfiles)));

      // Clear current profile if it was the deleted one
      let newCurrentProfileId = currentProfileId;
      let newCurrentProfile = get().currentProfile;
      if (currentProfileId === profileId) {
        newCurrentProfileId = null;
        newCurrentProfile = null;
        mmkvService.delete(CURRENT_PROFILE_ID_KEY);
      }

      set({
        familyProfiles: updatedFamilyProfiles,
        currentProfileId: newCurrentProfileId,
        currentProfile: newCurrentProfile,
        profile: newCurrentProfile, // Legacy support
        isLoading: false,
      });
    } catch (error) {
      console.error(`Failed to delete profile ${profileId}:`, error);
      set({
        error: error instanceof Error ? error.message : 'Failed to delete profile',
        isLoading: false,
      });
      throw error;
    }
  },

  switchToProfile: async (profileId: string) => {
    const { familyProfiles } = get();

    if (!familyProfiles.profiles.has(profileId)) {
      throw new Error('Profile not found');
    }

    set({ isLoading: true, error: null });
    try {
      // Load profile from keychain
      const profile = await keychainService.getProfileById(profileId);

      if (!profile) {
        throw new Error('Profile data not found in keychain');
      }

      // Update last accessed time
      const metadata = familyProfiles.profiles.get(profileId)!;
      metadata.lastAccessed = new Date().toISOString();

      const updatedFamilyProfiles: FamilyProfileCollection = {
        ...familyProfiles,
        lastModified: new Date().toISOString(),
      };

      // Save current profile ID and family collection
      mmkvService.setString(CURRENT_PROFILE_ID_KEY, profileId);
      mmkvService.setString(FAMILY_PROFILES_KEY, JSON.stringify(serializeFamilyCollection(updatedFamilyProfiles)));

      set({
        familyProfiles: updatedFamilyProfiles,
        currentProfileId: profileId,
        currentProfile: profile,
        profile, // Legacy support
        isLoading: false,
      });
    } catch (error) {
      console.error(`Failed to switch to profile ${profileId}:`, error);
      set({
        error: error instanceof Error ? error.message : 'Failed to switch profile',
        isLoading: false,
      });
    }
  },

  updateProfileMetadata: async (profileId: string, metadataUpdates: Partial<ProfileMetadata>) => {
    const { familyProfiles } = get();

    if (!familyProfiles.profiles.has(profileId)) {
      throw new Error('Profile not found');
    }

    const currentMetadata = familyProfiles.profiles.get(profileId)!;
    const updatedMetadata = {
      ...currentMetadata,
      ...metadataUpdates,
      updatedAt: new Date().toISOString(),
    };

    const updatedProfiles = new Map(familyProfiles.profiles);
    updatedProfiles.set(profileId, updatedMetadata);

    const updatedFamilyProfiles: FamilyProfileCollection = {
      ...familyProfiles,
      profiles: updatedProfiles,
      lastModified: new Date().toISOString(),
    };

    // Save to MMKV
    mmkvService.setString(FAMILY_PROFILES_KEY, JSON.stringify(serializeFamilyCollection(updatedFamilyProfiles)));

    set({
      familyProfiles: updatedFamilyProfiles,
    });
  },

  // Profile access methods (extracted to profileStoreSlices.ts)
  ...createProfileAccessSlice(set, get),

  // Family management (extracted to profileStoreSlices.ts)
  ...createFamilyManagementSlice(set, get),

  // Legacy operations, migration, and onboarding (extracted to profileStoreSlices.ts)
  ...createLegacySlice(set, get),
}));
