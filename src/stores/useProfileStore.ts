import { create } from 'zustand';
import { TravelerProfile, TravelProfile } from '@/types/profile';
import { keychainService, mmkvService } from '@/services/storage';

interface ProfileStore {
  // New MVP profile interface
  profile: TravelerProfile | null;

  // Legacy profile for backward compatibility
  legacyProfile: TravelProfile | null;

  // Profile operations
  loadProfile: () => Promise<void>;
  saveProfile: (profile: TravelerProfile) => Promise<void>;
  updateProfile: (updates: Partial<TravelerProfile>) => Promise<void>;
  clearProfile: () => Promise<void>;

  // Onboarding state
  isOnboardingComplete: boolean;
  setOnboardingComplete: (complete: boolean) => void;

  // Loading state
  isLoading: boolean;
  error: string | null;
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
  profile: null,
  legacyProfile: null,
  isOnboardingComplete: false,
  isLoading: false,
  error: null,

  loadProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const profile = await keychainService.getProfile();
      const isOnboardingComplete = mmkvService.getPreferences().onboardingComplete;

      set({
        profile,
        isOnboardingComplete,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load profile',
        isLoading: false,
      });
    }
  },

  saveProfile: async (profile: TravelerProfile) => {
    set({ isLoading: true, error: null });
    try {
      const profileWithTimestamps = {
        ...profile,
        updatedAt: new Date().toISOString(),
        createdAt: profile.createdAt || new Date().toISOString(),
      };

      await keychainService.storeProfile(profileWithTimestamps);

      set({
        profile: profileWithTimestamps,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to save profile:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to save profile',
        isLoading: false,
      });
    }
  },

  updateProfile: async (updates: Partial<TravelerProfile>) => {
    const currentProfile = get().profile;
    if (!currentProfile) {
      throw new Error('No profile to update');
    }

    const updatedProfile = {
      ...currentProfile,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await get().saveProfile(updatedProfile);
  },

  clearProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      await keychainService.deleteProfile();
      mmkvService.setPreference('onboardingComplete', false);

      set({
        profile: null,
        legacyProfile: null,
        isOnboardingComplete: false,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to clear profile:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to clear profile',
        isLoading: false,
      });
    }
  },

  setOnboardingComplete: (complete: boolean) => {
    mmkvService.setPreference('onboardingComplete', complete);
    set({ isOnboardingComplete: complete });
  },
}));
