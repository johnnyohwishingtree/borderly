import { create } from 'zustand';
import { TravelerProfile } from '@/types/profile';
import { 
  FamilyProfileCollection, 
  ProfileMetadata, 
  FamilyRelationship, 
  SerializableFamilyProfileCollection,
  FamilyProfileStats 
} from '@/types/family';
import { keychainService, mmkvService } from '@/services/storage';

// Constants
const FAMILY_PROFILES_KEY = 'family_profiles';
const CURRENT_PROFILE_ID_KEY = 'current_profile_id';
const MAX_PROFILES = 8;
const FAMILY_PROFILES_VERSION = 1;

// Helper functions
const createEmptyFamilyCollection = (): FamilyProfileCollection => ({
  profiles: new Map(),
  primaryProfileId: '',
  maxProfiles: MAX_PROFILES,
  version: FAMILY_PROFILES_VERSION,
  lastModified: new Date().toISOString(),
});

const serializeFamilyCollection = (collection: FamilyProfileCollection): SerializableFamilyProfileCollection => ({
  profiles: Object.fromEntries(collection.profiles),
  primaryProfileId: collection.primaryProfileId,
  maxProfiles: collection.maxProfiles,
  version: collection.version,
  lastModified: collection.lastModified,
});

const deserializeFamilyCollection = (data: SerializableFamilyProfileCollection): FamilyProfileCollection => ({
  profiles: new Map(Object.entries(data.profiles)),
  primaryProfileId: data.primaryProfileId,
  maxProfiles: data.maxProfiles,
  version: data.version,
  lastModified: data.lastModified,
});

const createProfileMetadata = (
  profileId: string,
  metadata: Omit<ProfileMetadata, 'id' | 'createdAt' | 'updatedAt'>
): ProfileMetadata => ({
  ...metadata,
  id: profileId,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

interface ProfileStore {
  // Multi-profile state
  familyProfiles: FamilyProfileCollection;
  currentProfile: TravelerProfile | null;
  currentProfileId: string | null;

  // Legacy single-profile support (for backward compatibility)
  profile: TravelerProfile | null;

  // Multi-profile operations
  loadFamilyProfiles: () => Promise<void>;
  addProfile: (profile: TravelerProfile, metadata: Omit<ProfileMetadata, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProfileById: (profileId: string, updates: Partial<TravelerProfile>) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;
  switchToProfile: (profileId: string) => Promise<void>;
  updateProfileMetadata: (profileId: string, metadata: Partial<ProfileMetadata>) => Promise<void>;

  // Profile access
  getProfile: (profileId: string) => Promise<TravelerProfile | null>;
  getAllProfiles: () => Promise<Map<string, TravelerProfile>>;
  getProfileMetadata: (profileId: string) => ProfileMetadata | null;
  
  // Family management
  setPrimaryProfile: (profileId: string) => Promise<void>;
  getFamilyStats: () => FamilyProfileStats | null;
  canAddProfile: () => boolean;

  // Legacy operations (for backward compatibility)
  loadProfile: () => Promise<void>;
  saveProfile: (profile: TravelerProfile) => Promise<void>;
  updateProfile: (updates: Partial<TravelerProfile>) => Promise<void>;
  clearProfile: () => Promise<void>;

  // Migration
  migrateLegacyProfile: () => Promise<void>;

  // Onboarding state
  isOnboardingComplete: boolean;
  setOnboardingComplete: (complete: boolean) => void;

  // Loading state
  isLoading: boolean;
  error: string | null;
}

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

  // Profile access methods
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

  getProfileMetadata: (profileId: string) => {
    const { familyProfiles } = get();
    return familyProfiles.profiles.get(profileId) || null;
  },

  // Family management
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
    const { familyProfiles } = get();
    
    if (familyProfiles.profiles.size === 0) {
      return null;
    }

    const profilesByRelationship: Record<FamilyRelationship, number> = {
      self: 0,
      spouse: 0,
      child: 0,
      parent: 0,
      sibling: 0,
      other: 0,
    };

    let lastAccessedProfile: ProfileMetadata | undefined;
    let activeProfiles = 0;
    let primaryProfile: ProfileMetadata | undefined;

    for (const metadata of familyProfiles.profiles.values()) {
      profilesByRelationship[metadata.relationship]++;
      
      if (metadata.isActive) {
        activeProfiles++;
      }
      
      if (metadata.isPrimary) {
        primaryProfile = metadata;
      }
      
      if (!lastAccessedProfile || 
          (metadata.lastAccessed && metadata.lastAccessed > (lastAccessedProfile.lastAccessed || ''))) {
        lastAccessedProfile = metadata;
      }
    }

    if (!primaryProfile) {
      return null;
    }

    return {
      totalProfiles: familyProfiles.profiles.size,
      activeProfiles,
      primaryProfile,
      lastAccessedProfile,
      profilesByRelationship,
    };
  },

  canAddProfile: () => {
    const { familyProfiles } = get();
    return familyProfiles.profiles.size < MAX_PROFILES;
  },

  // Legacy operations (for backward compatibility)
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
}));
