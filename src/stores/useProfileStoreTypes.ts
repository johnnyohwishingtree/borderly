import type { TravelerProfile, FamilyMember } from '@/types/profile';
import type {
  FamilyProfileCollection,
  ProfileMetadata,
  FamilyProfileStats,
} from '@/types/family';

export interface ProfileStore {
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
  getAllFamilyProfiles: () => Promise<FamilyMember[]>;
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
