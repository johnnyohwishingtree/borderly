import { create } from 'zustand';
import { TravelProfile } from '@/types/profile';

interface ProfileStore {
  profile: TravelProfile | null;
  setProfile: (profile: TravelProfile) => void;
  clearProfile: () => void;
  isOnboardingComplete: boolean;
  setOnboardingComplete: (complete: boolean) => void;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  clearProfile: () => set({ profile: null }),
  isOnboardingComplete: false,
  setOnboardingComplete: (complete) => set({ isOnboardingComplete: complete }),
}));
