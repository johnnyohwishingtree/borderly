import { keychainService } from '@/services/storage/keychain';
import { TravelerProfile } from '@/types/profile';

const mockProfile1: TravelerProfile = {
  id: 'profile-1',
  passportNumber: 'A12345678',
  givenNames: 'John',
  surname: 'Doe',
  nationality: 'USA',
  dateOfBirth: '1990-01-01',
  gender: 'M',
  passportExpiry: '2030-01-01',
  issuingCountry: 'USA',
  email: 'john@example.com',
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

// Additional profile for multi-profile testing (if needed later)
// const mockProfile2: TravelerProfile = {
//   ...mockProfile1,
//   id: 'profile-2',
//   givenNames: 'Jane',
//   email: 'jane@example.com',
//   passportNumber: 'B12345678',
// };

// Mock react-native-keychain
jest.mock('react-native-keychain', () => ({
  setInternetCredentials: jest.fn(),
  getInternetCredentials: jest.fn(),
  resetInternetCredentials: jest.fn(),
  getSupportedBiometryType: jest.fn(),
  ACCESS_CONTROL: {
    BIOMETRY_CURRENT_SET: 'BiometryCurrentSet',
  },
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WhenUnlockedThisDeviceOnly',
  },
  AUTHENTICATION_TYPE: {
    BIOMETRICS: 'Biometrics',
  },
}));

import * as Keychain from 'react-native-keychain';

describe('Keychain Service Multi-Profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Multi-profile storage', () => {
    it('should store profile by ID', async () => {
      (Keychain.setInternetCredentials as jest.Mock).mockResolvedValue(true);

      await keychainService.storeProfileById('profile-1', mockProfile1);

      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        'borderly_profile_profile-1',
        'borderly_user',
        JSON.stringify(mockProfile1),
        expect.objectContaining({
          service: 'borderly',
          authenticationType: 'Biometrics',
        })
      );
    });

    it('should retrieve profile by ID', async () => {
      const mockCredentials = {
        username: 'borderly_user',
        password: JSON.stringify(mockProfile1),
      };
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue(mockCredentials);

      const profile = await keychainService.getProfileById('profile-1');

      expect(Keychain.getInternetCredentials).toHaveBeenCalledWith(
        'borderly_profile_profile-1',
        expect.objectContaining({
          service: 'borderly',
          authenticationType: 'Biometrics',
        })
      );
      expect(profile).toEqual(mockProfile1);
    });

    it('should return null for non-existent profile', async () => {
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue(false);

      const profile = await keychainService.getProfileById('non-existent');

      expect(profile).toBeNull();
    });

    it('should delete profile by ID', async () => {
      (Keychain.resetInternetCredentials as jest.Mock).mockResolvedValue(true);

      await keychainService.deleteProfileById('profile-1');

      expect(Keychain.resetInternetCredentials).toHaveBeenCalledWith({
        service: 'borderly_profile_profile-1'
      });
    });

    it('should check if profile exists', async () => {
      // Profile exists
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue({
        username: 'user',
        password: 'data'
      });

      const exists = await keychainService.profileExists('profile-1');
      expect(exists).toBe(true);

      // Profile doesn't exist
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue(false);

      const notExists = await keychainService.profileExists('profile-2');
      expect(notExists).toBe(false);
    });
  });

  describe('Profile encryption keys', () => {
    it('should generate profile encryption key', async () => {
      (Keychain.setInternetCredentials as jest.Mock).mockResolvedValue(true);

      const key = await keychainService.generateProfileEncryptionKey('profile-1');

      expect(typeof key).toBe('string');
      expect(key.length).toBe(64); // 32 bytes * 2 chars per byte
      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        'borderly_profile_enc_profile-1',
        'borderly_encryption',
        key,
        expect.objectContaining({
          service: 'borderly',
          authenticationType: 'Biometrics',
        })
      );
    });

    it('should retrieve profile encryption key', async () => {
      const mockKey = 'a'.repeat(64);
      const mockCredentials = {
        username: 'borderly_encryption',
        password: mockKey,
      };
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue(mockCredentials);

      const key = await keychainService.getProfileEncryptionKey('profile-1');

      expect(Keychain.getInternetCredentials).toHaveBeenCalledWith(
        'borderly_profile_enc_profile-1',
        expect.objectContaining({
          service: 'borderly',
          authenticationType: 'Biometrics',
        })
      );
      expect(key).toBe(mockKey);
    });

    it('should delete profile encryption key', async () => {
      (Keychain.resetInternetCredentials as jest.Mock).mockResolvedValue(true);

      await keychainService.deleteProfileEncryptionKey('profile-1');

      expect(Keychain.resetInternetCredentials).toHaveBeenCalledWith({
        service: 'borderly_profile_enc_profile-1'
      });
    });
  });

  describe('Legacy profile migration', () => {
    it('should migrate legacy profile when it exists', async () => {
      // Mock legacy profile exists
      const legacyProfileData = JSON.stringify(mockProfile1);
      (Keychain.getInternetCredentials as jest.Mock)
        .mockResolvedValueOnce({
          username: 'user',
          password: legacyProfileData
        }) // For migrateLegacyProfile
        .mockResolvedValueOnce(true) // For storeProfileById
        .mockResolvedValueOnce(true) // For generateProfileEncryptionKey
        .mockResolvedValueOnce(true); // For deleteFromKeychain

      (Keychain.setInternetCredentials as jest.Mock).mockResolvedValue(true);
      (Keychain.resetInternetCredentials as jest.Mock).mockResolvedValue(true);

      const migratedProfileId = await keychainService.migrateLegacyProfile();

      expect(migratedProfileId).toBe(mockProfile1.id);
      
      // Should store profile with new multi-profile key
      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        `borderly_profile_${mockProfile1.id}`,
        'borderly_user',
        legacyProfileData,
        expect.anything()
      );

      // Should generate encryption key for profile
      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        `borderly_profile_enc_${mockProfile1.id}`,
        'borderly_encryption',
        expect.any(String),
        expect.anything()
      );

      // Should delete legacy profile
      expect(Keychain.resetInternetCredentials).toHaveBeenCalledWith({
        service: 'borderly_traveler_profile'
      });
    });

    it('should return null when no legacy profile exists', async () => {
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue(false);

      const migratedProfileId = await keychainService.migrateLegacyProfile();

      expect(migratedProfileId).toBeNull();
    });

    it('should handle migration errors gracefully', async () => {
      (Keychain.getInternetCredentials as jest.Mock).mockRejectedValue(new Error('Access denied'));

      const migratedProfileId = await keychainService.migrateLegacyProfile();

      expect(migratedProfileId).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('should handle storage errors', async () => {
      (Keychain.setInternetCredentials as jest.Mock).mockRejectedValue(new Error('Storage failed'));

      await expect(
        keychainService.storeProfileById('profile-1', mockProfile1)
      ).rejects.toThrow('Failed to securely store profile data for profile-1');
    });

    it('should handle retrieval errors gracefully', async () => {
      (Keychain.getInternetCredentials as jest.Mock).mockRejectedValue(new Error('Access denied'));

      const profile = await keychainService.getProfileById('profile-1');
      expect(profile).toBeNull();
    });

    it('should handle deletion errors', async () => {
      (Keychain.resetInternetCredentials as jest.Mock).mockRejectedValue(new Error('Deletion failed'));

      await expect(
        keychainService.deleteProfileById('profile-1')
      ).rejects.toThrow('Failed to delete profile data for profile-1');
    });
  });

  describe('Backward compatibility', () => {
    it('should maintain legacy profile operations', async () => {
      const mockCredentials = {
        username: 'borderly_user',
        password: JSON.stringify(mockProfile1),
      };

      // Test legacy getProfile
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue(mockCredentials);
      const profile = await keychainService.getProfile();
      expect(profile).toEqual(mockProfile1);

      // Test legacy storeProfile
      (Keychain.setInternetCredentials as jest.Mock).mockResolvedValue(true);
      await keychainService.storeProfile(mockProfile1);
      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        'borderly_traveler_profile',
        'borderly_user',
        JSON.stringify(mockProfile1),
        expect.anything()
      );

      // Test legacy deleteProfile
      (Keychain.resetInternetCredentials as jest.Mock).mockResolvedValue(true);
      await keychainService.deleteProfile();
      expect(Keychain.resetInternetCredentials).toHaveBeenCalledWith({
        service: 'borderly_traveler_profile'
      });
    });
  });
});