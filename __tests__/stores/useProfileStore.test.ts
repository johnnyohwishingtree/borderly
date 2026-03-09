import { useProfileStore } from '@/stores/useProfileStore';
import { TravelerProfile } from '@/types/profile';

// Mock the storage services
jest.mock('@/services/storage', () => ({
  keychainService: {
    storeProfile: jest.fn(),
    getProfile: jest.fn(),
    deleteProfile: jest.fn(),
    storeProfileById: jest.fn(),
    getProfileById: jest.fn(),
    deleteProfileById: jest.fn(),
    getAllProfileIds: jest.fn(),
    profileExists: jest.fn(),
    migrateLegacyProfile: jest.fn(),
    generateEncryptionKey: jest.fn(),
    generateProfileEncryptionKey: jest.fn(),
    getEncryptionKey: jest.fn(),
    getProfileEncryptionKey: jest.fn(),
    deleteProfileEncryptionKey: jest.fn(),
    isAvailable: jest.fn(),
    clearSensitiveMemory: jest.fn(),
    secureCleanup: jest.fn(),
  },
  mmkvService: {
    getPreferences: jest.fn(() => ({ onboardingComplete: false })),
    setPreference: jest.fn(),
    getString: jest.fn(),
    setString: jest.fn(),
    delete: jest.fn(),
    clearAll: jest.fn(),
  },
}));

import { keychainService, mmkvService } from '@/services/storage';

// Type cast mocked services for easier use in tests
const mockKeychainService = keychainService as jest.Mocked<typeof keychainService>;
const mockMmkvService = mmkvService as jest.Mocked<typeof mmkvService>;

const mockProfile: TravelerProfile = {
  id: 'test-id',
  passportNumber: 'A12345678',
  givenNames: 'John',
  surname: 'Doe',
  nationality: 'USA',
  dateOfBirth: '1990-01-01',
  gender: 'M',
  passportExpiry: '2030-01-01',
  issuingCountry: 'USA',
  email: 'john@example.com',
  phoneNumber: '+1234567890',
  homeAddress: {
    line1: '123 Main St',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'USA',
  },
  defaultDeclarations: {
    hasItemsToDeclar: false,
    carryingCurrency: false,
    carryingProhibitedItems: false,
    visitedFarm: false,
    hasCriminalRecord: false,
    carryingCommercialGoods: false,
  },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('useProfileStore', () => {
  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock returns
    mockMmkvService.getString.mockReturnValue(undefined);
    mockMmkvService.getPreferences.mockReturnValue({ onboardingComplete: false } as any);
    mockKeychainService.migrateLegacyProfile.mockResolvedValue(null);
    mockKeychainService.storeProfileById.mockResolvedValue();
    mockKeychainService.getProfileById.mockResolvedValue(null);
    mockKeychainService.generateProfileEncryptionKey.mockResolvedValue('mock-encryption-key');
    
    // Reset store state manually
    useProfileStore.setState({
      familyProfiles: {
        profiles: new Map(),
        primaryProfileId: '',
        maxProfiles: 8,
        version: 1,
        lastModified: new Date().toISOString(),
      },
      currentProfile: null,
      currentProfileId: null,
      profile: null,
      isOnboardingComplete: false,
      isLoading: false,
      error: null,
    });
  });

  it('should have initial state', () => {
    const { profile, isOnboardingComplete, isLoading, error } = useProfileStore.getState();
    expect(profile).toBe(null);
    expect(isOnboardingComplete).toBe(false);
    expect(isLoading).toBe(false);
    expect(error).toBe(null);
  });

  it('should handle loading state', async () => {
    const store = useProfileStore.getState();

    // Start loading
    const loadPromise = store.loadProfile();

    // Should be loading immediately (sets loading: true synchronously)
    expect(useProfileStore.getState().isLoading).toBe(true);

    // Wait for load to complete
    await loadPromise;

    // Should be done loading
    expect(useProfileStore.getState().isLoading).toBe(false);
  });

  it('should save and load profile', async () => {
    const store = useProfileStore.getState();

    // Mock successful profile addition and switching
    mockKeychainService.getProfileById.mockResolvedValue(mockProfile);

    // Save profile
    await store.saveProfile(mockProfile);

    // Profile should be set in state
    const savedState = useProfileStore.getState();
    expect(savedState.profile).toMatchObject({
      ...mockProfile,
      updatedAt: expect.any(String),
    });
    expect(mockKeychainService.storeProfileById).toHaveBeenCalledWith(mockProfile.id, mockProfile);
  });

  it('should handle onboarding complete', () => {
    const store = useProfileStore.getState();

    store.setOnboardingComplete(true);
    expect(useProfileStore.getState().isOnboardingComplete).toBe(true);

    store.setOnboardingComplete(false);
    expect(useProfileStore.getState().isOnboardingComplete).toBe(false);
  });

  it('should update profile', async () => {
    const store = useProfileStore.getState();

    // First save the profile
    await store.saveProfile(mockProfile);

    // Update the profile
    const updates = { email: 'newemail@example.com' };
    await store.updateProfile(updates);

    // Profile should be updated
    const updatedState = useProfileStore.getState();
    expect(updatedState.profile?.email).toBe('newemail@example.com');
    expect(updatedState.profile?.updatedAt).not.toBe(mockProfile.updatedAt);
  });

  describe('Multi-profile functionality', () => {
    const mockSpouseProfile: TravelerProfile = {
      ...mockProfile,
      id: 'spouse-id',
      givenNames: 'Jane',
      surname: 'Doe',
      email: 'jane@example.com',
    };

    const mockChildProfile: TravelerProfile = {
      ...mockProfile,
      id: 'child-id',
      givenNames: 'Junior',
      surname: 'Doe',
      email: 'junior@example.com',
      dateOfBirth: '2010-01-01',
    };

    beforeEach(async () => {
      const store = useProfileStore.getState();
      // Clear all family profiles
      const stats = store.getFamilyStats();
      if (stats) {
        // Delete all profiles except primary
        for (const [profileId, metadata] of store.familyProfiles.profiles) {
          if (!metadata.isPrimary) {
            await store.deleteProfile(profileId);
          }
        }
        // Delete primary profile last
        if (stats.primaryProfile) {
          await store.deleteProfile(stats.primaryProfile.id);
        }
      }
    });

    it('should load empty family profiles initially', async () => {
      const store = useProfileStore.getState();
      await store.loadFamilyProfiles();

      const { familyProfiles } = useProfileStore.getState();
      expect(familyProfiles.profiles.size).toBe(0);
      expect(familyProfiles.primaryProfileId).toBe('');
    });

    it('should add primary profile', async () => {
      const store = useProfileStore.getState();
      await store.addProfile(mockProfile, {
        relationship: 'self',
        isPrimary: true,
        isActive: true,
        biometricEnabled: true,
        nickname: 'Me',
      });

      const { familyProfiles } = useProfileStore.getState();
      expect(familyProfiles.profiles.size).toBe(1);
      expect(familyProfiles.primaryProfileId).toBe(mockProfile.id);

      const metadata = familyProfiles.profiles.get(mockProfile.id);
      expect(metadata?.relationship).toBe('self');
      expect(metadata?.isPrimary).toBe(true);
    });

    it('should add spouse profile', async () => {
      const store = useProfileStore.getState();

      // Add primary profile first
      await store.addProfile(mockProfile, {
        relationship: 'self',
        isPrimary: true,
        isActive: true,
        biometricEnabled: true,
        nickname: 'Me',
      });

      // Add spouse profile
      await store.addProfile(mockSpouseProfile, {
        relationship: 'spouse',
        isPrimary: false,
        isActive: true,
        biometricEnabled: true,
        nickname: 'My Spouse',
      });

      const { familyProfiles } = useProfileStore.getState();
      expect(familyProfiles.profiles.size).toBe(2);
      expect(familyProfiles.primaryProfileId).toBe(mockProfile.id);

      const spouseMetadata = familyProfiles.profiles.get(mockSpouseProfile.id);
      expect(spouseMetadata?.relationship).toBe('spouse');
      expect(spouseMetadata?.isPrimary).toBe(false);
    });

    it('should switch between profiles', async () => {
      const store = useProfileStore.getState();

      // Add primary profile
      await store.addProfile(mockProfile, {
        relationship: 'self',
        isPrimary: true,
        isActive: true,
        biometricEnabled: true,
        nickname: 'Me',
      });

      // Add spouse profile
      await store.addProfile(mockSpouseProfile, {
        relationship: 'spouse',
        isPrimary: false,
        isActive: true,
        biometricEnabled: true,
        nickname: 'My Spouse',
      });

      // Switch to spouse profile
      await store.switchToProfile(mockSpouseProfile.id);

      const state = useProfileStore.getState();
      expect(state.currentProfileId).toBe(mockSpouseProfile.id);
      expect(state.currentProfile?.id).toBe(mockSpouseProfile.id);
      expect(state.profile?.id).toBe(mockSpouseProfile.id); // Legacy support
    });

    it('should update profile by ID', async () => {
      const store = useProfileStore.getState();

      // Add primary profile
      await store.addProfile(mockProfile, {
        relationship: 'self',
        isPrimary: true,
        isActive: true,
        biometricEnabled: true,
        nickname: 'Me',
      });

      // Update profile
      const updates = { email: 'updated@example.com' };
      await store.updateProfileById(mockProfile.id, updates);

      // Get updated profile
      const updatedProfile = await store.getProfile(mockProfile.id);
      expect(updatedProfile?.email).toBe('updated@example.com');
    });

    it('should delete non-primary profile', async () => {
      const store = useProfileStore.getState();

      // Add primary and spouse profiles
      await store.addProfile(mockProfile, {
        relationship: 'self',
        isPrimary: true,
        isActive: true,
        biometricEnabled: true,
        nickname: 'Me',
      });

      await store.addProfile(mockSpouseProfile, {
        relationship: 'spouse',
        isPrimary: false,
        isActive: true,
        biometricEnabled: true,
        nickname: 'My Spouse',
      });

      // Delete spouse profile
      await store.deleteProfile(mockSpouseProfile.id);

      const { familyProfiles } = useProfileStore.getState();
      expect(familyProfiles.profiles.size).toBe(1);
      expect(familyProfiles.profiles.has(mockSpouseProfile.id)).toBe(false);
      expect(familyProfiles.profiles.has(mockProfile.id)).toBe(true);
    });

    it('should prevent deleting primary profile when others exist', async () => {
      const store = useProfileStore.getState();

      // Add primary and spouse profiles
      await store.addProfile(mockProfile, {
        relationship: 'self',
        isPrimary: true,
        isActive: true,
        biometricEnabled: true,
        nickname: 'Me',
      });

      await store.addProfile(mockSpouseProfile, {
        relationship: 'spouse',
        isPrimary: false,
        isActive: true,
        biometricEnabled: true,
        nickname: 'My Spouse',
      });

      // Try to delete primary profile - should throw error
      await expect(store.deleteProfile(mockProfile.id)).rejects.toThrow(
        'Cannot delete primary profile. Please set another profile as primary first.'
      );
    });

    it('should set new primary profile', async () => {
      const store = useProfileStore.getState();

      // Add two profiles
      await store.addProfile(mockProfile, {
        relationship: 'self',
        isPrimary: true,
        isActive: true,
        biometricEnabled: true,
        nickname: 'Me',
      });

      await store.addProfile(mockSpouseProfile, {
        relationship: 'spouse',
        isPrimary: false,
        isActive: true,
        biometricEnabled: true,
        nickname: 'My Spouse',
      });

      // Set spouse as primary
      await store.setPrimaryProfile(mockSpouseProfile.id);

      const { familyProfiles } = useProfileStore.getState();
      expect(familyProfiles.primaryProfileId).toBe(mockSpouseProfile.id);
      
      const primaryMetadata = familyProfiles.profiles.get(mockSpouseProfile.id);
      const originalMetadata = familyProfiles.profiles.get(mockProfile.id);
      
      expect(primaryMetadata?.isPrimary).toBe(true);
      expect(originalMetadata?.isPrimary).toBe(false);
    });

    it('should get family stats', async () => {
      const store = useProfileStore.getState();

      // Add multiple profiles
      await store.addProfile(mockProfile, {
        relationship: 'self',
        isPrimary: true,
        isActive: true,
        biometricEnabled: true,
        nickname: 'Me',
      });

      await store.addProfile(mockSpouseProfile, {
        relationship: 'spouse',
        isPrimary: false,
        isActive: true,
        biometricEnabled: true,
        nickname: 'My Spouse',
      });

      await store.addProfile(mockChildProfile, {
        relationship: 'child',
        isPrimary: false,
        isActive: true,
        biometricEnabled: false,
        nickname: 'Junior',
      });

      const stats = store.getFamilyStats();
      expect(stats).toBeDefined();
      expect(stats!.totalProfiles).toBe(3);
      expect(stats!.activeProfiles).toBe(3);
      expect(stats!.primaryProfile.id).toBe(mockProfile.id);
      expect(stats!.profilesByRelationship.self).toBe(1);
      expect(stats!.profilesByRelationship.spouse).toBe(1);
      expect(stats!.profilesByRelationship.child).toBe(1);
    });

    it('should check if can add more profiles', async () => {
      const store = useProfileStore.getState();

      expect(store.canAddProfile()).toBe(true);

      // Add one profile
      await store.addProfile(mockProfile, {
        relationship: 'self',
        isPrimary: true,
        isActive: true,
        biometricEnabled: true,
        nickname: 'Me',
      });

      expect(store.canAddProfile()).toBe(true);

      // Test would require adding 8 profiles to test the limit
      // For now, just verify the basic functionality
      const { familyProfiles } = useProfileStore.getState();
      expect(familyProfiles.profiles.size).toBeLessThan(8);
    });

    it('should enforce maximum profile limit', async () => {
      const store = useProfileStore.getState();

      // Add the maximum number of profiles (8)
      const profiles = Array.from({ length: 8 }, (_, i) => ({
        ...mockProfile,
        id: `profile-${i}`,
        givenNames: `Person${i}`,
      }));

      // Add all 8 profiles
      for (let i = 0; i < 8; i++) {
        await store.addProfile(profiles[i], {
          relationship: i === 0 ? 'self' : 'other',
          isPrimary: i === 0,
          isActive: true,
          biometricEnabled: true,
          nickname: `Person ${i}`,
        });
      }

      expect(store.canAddProfile()).toBe(false);

      // Try to add one more - should throw error
      const extraProfile = { ...mockProfile, id: 'extra-profile' };
      await expect(
        store.addProfile(extraProfile, {
          relationship: 'other',
          isPrimary: false,
          isActive: true,
          biometricEnabled: true,
          nickname: 'Extra Person',
        })
      ).rejects.toThrow('Cannot add more than 8 profiles');
    });

    it('should maintain backward compatibility with legacy methods', async () => {
      const store = useProfileStore.getState();

      // Use legacy saveProfile (should create first profile as primary)
      await store.saveProfile(mockProfile);

      // Should have created a family profile
      const { familyProfiles, profile } = useProfileStore.getState();
      expect(familyProfiles.profiles.size).toBe(1);
      expect(profile?.id).toBe(mockProfile.id);

      // Use legacy updateProfile
      const updates = { email: 'legacy-updated@example.com' };
      await store.updateProfile(updates);

      const updatedProfile = useProfileStore.getState().profile;
      expect(updatedProfile?.email).toBe('legacy-updated@example.com');

      // Use legacy clearProfile
      await store.clearProfile();

      const clearedState = useProfileStore.getState();
      expect(clearedState.profile).toBeNull();
      expect(clearedState.familyProfiles.profiles.size).toBe(0);
    });
  });
});
