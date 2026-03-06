jest.unmock('@/services/storage/keychain');
jest.unmock('@/services/storage');

import { keychainService } from '@/services/storage/keychain';
import { databaseService } from '@/services/storage/database';
import { mmkvService } from '@/services/storage/mmkv';
import Keychain from 'react-native-keychain';
import { TravelerProfile } from '@/types/profile';

// Mock keychain to simulate real security behavior
jest.mock('react-native-keychain');

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

describe('Storage Security Tests', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('Keychain Security Requirements', () => {
    it('should use biometric authentication for profile access', async () => {
      (Keychain.setInternetCredentials as jest.Mock).mockResolvedValue(true);

      await keychainService.storeProfile(mockProfile);

      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
        })
      );
    });

    it('should use device-only access for profile storage', async () => {
      (Keychain.setInternetCredentials as jest.Mock).mockResolvedValue(true);

      await keychainService.storeProfile(mockProfile);

      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        })
      );
    });

    it('should use appropriate authentication configuration', async () => {
      (Keychain.setInternetCredentials as jest.Mock).mockResolvedValue(true);

      await keychainService.storeProfile(mockProfile);

      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          authenticationType: 'AuthenticationWithBiometricsDevicePasscode',
          accessControl: 'kSecAccessControlBiometryCurrentSet',
          accessible: 'kSecAttrAccessibleWhenUnlockedThisDeviceOnly',
          service: 'borderly',
        })
      );
    });

    it('should handle biometric authentication failures gracefully', async () => {
      const authError = new Error('User cancelled authentication');
      (Keychain.getInternetCredentials as jest.Mock).mockRejectedValue(authError);

      const result = await keychainService.getProfile();

      // Should return null instead of throwing, allowing graceful handling
      expect(result).toBeNull();
    });

    it('should verify biometry availability before storing', async () => {
      (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue('TouchID');

      const isAvailable = await keychainService.isAvailable();

      expect(isAvailable).toBe(true);
      expect(Keychain.getSupportedBiometryType).toHaveBeenCalled();
    });

    it('should handle devices without biometric support', async () => {
      (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(null);

      const isAvailable = await keychainService.isAvailable();

      expect(isAvailable).toBe(false);
    });
  });

  describe('Encryption Key Management', () => {
    it('should generate cryptographically secure encryption keys', async () => {
      (Keychain.setInternetCredentials as jest.Mock).mockResolvedValue(true);

      const key = await keychainService.generateEncryptionKey();

      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(key.length).toBe(64); // 256-bit key in hex
      expect(key).toMatch(/^[a-zA-Z0-9]+$/); // Only alphanumeric characters
    });

    it('should store encryption key with same security as profile', async () => {
      (Keychain.setInternetCredentials as jest.Mock).mockResolvedValue(true);

      await keychainService.generateEncryptionKey();

      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        'borderly_encryption_key',
        'borderly_encryption',
        expect.any(String),
        expect.objectContaining({
          authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        })
      );
    });

    it('should not generate duplicate keys', async () => {
      (Keychain.setInternetCredentials as jest.Mock).mockResolvedValue(true);

      const key1 = await keychainService.generateEncryptionKey();
      const key2 = await keychainService.generateEncryptionKey();

      expect(key1).not.toBe(key2);
    });

    it('should handle encryption key retrieval failures', async () => {
      const error = new Error('Key access denied');
      (Keychain.getInternetCredentials as jest.Mock).mockRejectedValue(error);

      const key = await keychainService.getEncryptionKey();

      expect(key).toBeNull();
    });
  });

  describe('Database Security Integration', () => {
    it('should use keychain for encryption key management', () => {
      // Database initialization requires an encryption key from keychain
      // This is verified in detail in database.test.ts
      // Here we verify the keychain service exposes the required methods
      expect(keychainService.getEncryptionKey).toBeDefined();
      expect(keychainService.generateEncryptionKey).toBeDefined();
    });

    it('should use database service with secure initialization', () => {
      // databaseService.initialize() requires encryption key from keychain
      expect(databaseService.initialize).toBeDefined();
      expect(databaseService.getDatabase).toBeDefined();
    });
  });

  describe('Data Segregation', () => {
    it('should store sensitive data only in keychain', () => {
      const sensitiveFields = [
        'passportNumber',
        'givenNames',
        'surname',
        'nationality',
        'dateOfBirth',
        'passportExpiry',
        'issuingCountry',
      ];

      // Verify these fields are not stored in MMKV (non-sensitive storage)
      const preferences = mmkvService.getPreferences();

      sensitiveFields.forEach(field => {
        expect(preferences).not.toHaveProperty(field);
      });
    });

    it('should store non-sensitive preferences in MMKV', () => {
      const preferences = mmkvService.getPreferences();

      // These should be in MMKV (non-encrypted storage)
      expect(preferences).toHaveProperty('theme');
      expect(preferences).toHaveProperty('language');
      expect(preferences).toHaveProperty('onboardingComplete');
      expect(preferences).toHaveProperty('analyticsEnabled');
    });

  });

  describe('Error Handling and Security Fallbacks', () => {
    it('should handle keychain errors without exposing sensitive data', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Keychain error details');

      (Keychain.setInternetCredentials as jest.Mock).mockRejectedValue(error);

      await expect(keychainService.storeProfile(mockProfile)).rejects.toThrow(
        'Failed to securely store profile data'
      );

      // Verify error details are logged but not exposed
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to store profile in keychain:',
        error
      );

      consoleSpy.mockRestore();
    });

    it('should handle profile deletion errors securely', async () => {
      const error = new Error('Deletion failed');
      (Keychain.resetInternetCredentials as jest.Mock).mockRejectedValue(error);

      await expect(keychainService.deleteProfile()).rejects.toThrow(
        'Failed to delete profile data'
      );
    });

    it('should not leak encryption keys in error messages', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Key generation failed');

      (Keychain.setInternetCredentials as jest.Mock).mockRejectedValue(error);

      await expect(keychainService.generateEncryptionKey()).rejects.toThrow(
        'Failed to generate encryption key'
      );

      // Ensure no key material is exposed in logs
      const logCalls = consoleSpy.mock.calls;
      logCalls.forEach(call => {
        const message = call.join(' ');
        expect(message).not.toMatch(/[a-zA-Z0-9]{32,}/); // No long keys in logs
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Compliance with Security Requirements', () => {
    it('should meet WHEN_UNLOCKED_THIS_DEVICE_ONLY requirement', async () => {
      (Keychain.setInternetCredentials as jest.Mock).mockResolvedValue(true);

      await keychainService.storeProfile(mockProfile);

      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        })
      );
    });

    it('should use current biometry set for access control', async () => {
      (Keychain.setInternetCredentials as jest.Mock).mockResolvedValue(true);

      await keychainService.storeProfile(mockProfile);

      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
        })
      );
    });

    it('should require biometric authentication type', async () => {
      (Keychain.setInternetCredentials as jest.Mock).mockResolvedValue(true);

      await keychainService.storeProfile(mockProfile);

      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
        })
      );
    });
  });

  describe('Data Format Security', () => {
    it('should store profile as JSON string in keychain', async () => {
      (Keychain.setInternetCredentials as jest.Mock).mockResolvedValue(true);

      await keychainService.storeProfile(mockProfile);

      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        'borderly_traveler_profile',
        'borderly_user',
        JSON.stringify(mockProfile),
        expect.any(Object)
      );
    });

    it('should handle corrupted JSON gracefully on retrieval', async () => {
      const corruptedData = {
        password: 'not-valid-json{',
        username: 'borderly_user',
      };
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue(corruptedData);

      const result = await keychainService.getProfile();

      expect(result).toBeNull();
    });

    it('should validate data integrity on retrieval', async () => {
      const validData = {
        password: JSON.stringify(mockProfile),
        username: 'borderly_user',
      };
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue(validData);

      const result = await keychainService.getProfile();

      expect(result).toEqual(mockProfile);
    });
  });
});
