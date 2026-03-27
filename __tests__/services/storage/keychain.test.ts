import { keychainService } from '@/services/storage/keychain';
import { TravelerProfile } from '@/types/profile';
import Keychain from 'react-native-keychain';

// Mock data
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
    hasItemsToDeclare: false,
    carryingCurrency: false,
    carryingProhibitedItems: false,
    visitedFarm: false,
    hasCriminalRecord: false,
    carryingCommercialGoods: false,
  },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('KeychainService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('storeProfile', () => {
    it('should store profile successfully', async () => {
      (Keychain.setInternetCredentials as jest.Mock).mockResolvedValue(true);

      await keychainService.storeProfile(mockProfile);

      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        'borderly_traveler_profile',
        'borderly_user',
        JSON.stringify(mockProfile),
        expect.objectContaining({
          service: 'borderly',
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        })
      );
    });

    it('should throw error when keychain storage fails', async () => {
      const error = new Error('Keychain error');
      (Keychain.setInternetCredentials as jest.Mock).mockRejectedValue(error);

      await expect(keychainService.storeProfile(mockProfile)).rejects.toThrow(
        'Failed to securely store profile data'
      );
    });
  });

  describe('getProfile', () => {
    it('should retrieve profile successfully', async () => {
      const mockCredentials = {
        password: JSON.stringify(mockProfile),
        username: 'borderly_user',
      };
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue(mockCredentials);

      const result = await keychainService.getProfile();

      expect(result).toEqual(mockProfile);
      expect(Keychain.getInternetCredentials).toHaveBeenCalledWith(
        'borderly_traveler_profile',
        expect.objectContaining({
          service: 'borderly',
        })
      );
    });

    it('should return null when no profile exists', async () => {
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue(false);

      const result = await keychainService.getProfile();

      expect(result).toBeNull();
    });

    it('should return null when keychain access fails', async () => {
      const error = new Error('User cancelled');
      (Keychain.getInternetCredentials as jest.Mock).mockRejectedValue(error);

      const result = await keychainService.getProfile();

      expect(result).toBeNull();
    });

    it('should handle invalid JSON gracefully', async () => {
      const mockCredentials = {
        password: 'invalid-json',
        username: 'borderly_user',
      };
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue(mockCredentials);

      const result = await keychainService.getProfile();

      expect(result).toBeNull();
    });
  });

  describe('deleteProfile', () => {
    it('should delete profile successfully', async () => {
      (Keychain.resetInternetCredentials as jest.Mock).mockResolvedValue(true);

      await keychainService.deleteProfile();

      expect(Keychain.resetInternetCredentials).toHaveBeenCalledWith(
        { server: 'borderly_traveler_profile' }
      );
    });

    it('should throw error when deletion fails', async () => {
      const error = new Error('Keychain error');
      (Keychain.resetInternetCredentials as jest.Mock).mockRejectedValue(error);

      await expect(keychainService.deleteProfile()).rejects.toThrow(
        'Failed to delete profile data'
      );
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate and store encryption key', async () => {
      (Keychain.setInternetCredentials as jest.Mock).mockResolvedValue(true);

      const key = await keychainService.generateEncryptionKey();

      expect(typeof key).toBe('string');
      expect(key.length).toBe(64);
      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        'borderly_encryption_key',
        'borderly_encryption',
        key,
        expect.any(Object)
      );
    });

    it('should throw error when key generation fails', async () => {
      const error = new Error('Keychain error');
      (Keychain.setInternetCredentials as jest.Mock).mockRejectedValue(error);

      await expect(keychainService.generateEncryptionKey()).rejects.toThrow(
        'Failed to generate encryption key'
      );
    });
  });

  describe('getEncryptionKey', () => {
    it('should retrieve encryption key successfully', async () => {
      const mockKey = 'test-encryption-key-12345';
      const mockCredentials = {
        password: mockKey,
        username: 'borderly_encryption',
      };
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue(mockCredentials);

      const result = await keychainService.getEncryptionKey();

      expect(result).toBe(mockKey);
    });

    it('should return null when no key exists', async () => {
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue(false);

      const result = await keychainService.getEncryptionKey();

      expect(result).toBeNull();
    });

    it('should return null when keychain access fails', async () => {
      const error = new Error('User cancelled');
      (Keychain.getInternetCredentials as jest.Mock).mockRejectedValue(error);

      const result = await keychainService.getEncryptionKey();

      expect(result).toBeNull();
    });
  });

  describe('isAvailable', () => {
    it('should return true when keychain functionality works', async () => {
      (Keychain.setInternetCredentials as jest.Mock).mockResolvedValue(true);
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue({ 
        password: 'test', 
        username: 'test' 
      });
      (Keychain.resetInternetCredentials as jest.Mock).mockResolvedValue(true);

      const result = await keychainService.isAvailable();

      expect(result).toBe(true);
      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        'borderly_availability_test',
        'test',
        'test',
        expect.objectContaining({
          service: 'borderly',
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        })
      );
    });

    it('should return false when keychain operations fail', async () => {
      const error = new Error('Keychain unavailable');
      (Keychain.setInternetCredentials as jest.Mock).mockRejectedValue(error);

      const result = await keychainService.isAvailable();

      expect(result).toBe(false);
    });

    it('should return false when keychain returns invalid data', async () => {
      (Keychain.setInternetCredentials as jest.Mock).mockResolvedValue(true);
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue(false);

      const result = await keychainService.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe('security requirements', () => {
    it('should use WHEN_UNLOCKED_THIS_DEVICE_ONLY accessibility', async () => {
      (Keychain.setInternetCredentials as jest.Mock).mockResolvedValue(true);

      await keychainService.storeProfile(mockProfile);

      expect(Keychain.setInternetCredentials).toHaveBeenCalledTimes(1);
      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          service: 'borderly',
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        })
      );
    });
  });

  describe('authenticateWithBiometric', () => {
    it('returns true when biometric auth succeeds', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
        username: 'user',
        password: 'pass',
      });

      const result = await keychainService.authenticateWithBiometric(
        'borderly',
        { title: 'Authenticate', subtitle: 'Verify your identity', cancel: 'Cancel' },
      );

      expect(result).toBe(true);
      expect(Keychain.getGenericPassword).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'borderly',
          authenticationPrompt: { title: 'Authenticate', subtitle: 'Verify your identity', cancel: 'Cancel' },
        }),
      );
    });

    it('returns false when biometric auth is cancelled', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);

      const result = await keychainService.authenticateWithBiometric(
        'borderly',
        { title: 'Auth', subtitle: 'Test', cancel: 'Cancel' },
      );

      expect(result).toBe(false);
    });

    it('returns false when biometric auth throws an error', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockRejectedValue(new Error('Sensor unavailable'));

      const result = await keychainService.authenticateWithBiometric(
        'borderly',
        { title: 'Auth', subtitle: 'Test', cancel: 'Cancel' },
      );

      expect(result).toBe(false);
    });
  });

  describe('clearSensitiveMemory', () => {
    it('resets the sensitive data refs without throwing', () => {
      expect(() => keychainService.clearSensitiveMemory()).not.toThrow();
    });
  });

  describe('secureCleanup', () => {
    it('resets generic password and clears memory', async () => {
      (Keychain.resetGenericPassword as jest.Mock).mockResolvedValue(true);

      await keychainService.secureCleanup();

      expect(Keychain.resetGenericPassword).toHaveBeenCalledWith(
        expect.objectContaining({ service: 'borderly' }),
      );
    });

    it('does not throw when resetGenericPassword fails', async () => {
      (Keychain.resetGenericPassword as jest.Mock).mockRejectedValue(new Error('Reset failed'));

      await expect(keychainService.secureCleanup()).resolves.not.toThrow();
    });
  });
});
