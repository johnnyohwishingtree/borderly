import { keychainService } from '@/services/storage/keychain';
import {
  APP_GROUP_IDENTIFIER,
  SHARED_KEYCHAIN_ACCESS_GROUP,
  KEYCHAIN_SERVICE,
} from '@/services/storage/keychain/sharedAccessConfig';
import { TravelerProfile } from '@/types/profile';
import Keychain from 'react-native-keychain';

const mockProfile: TravelerProfile = {
  id: 'shared-test-id',
  passportNumber: 'X98765432',
  givenNames: 'Jane',
  surname: 'Smith',
  nationality: 'GBR',
  dateOfBirth: '1985-06-15',
  gender: 'F',
  passportExpiry: '2031-06-15',
  issuingCountry: 'GBR',
  email: 'jane@example.com',
  phoneNumber: '+447700900000',
  homeAddress: {
    line1: '10 Downing St',
    city: 'London',
    state: '',
    postalCode: 'SW1A 2AA',
    country: 'GBR',
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

describe('Shared Keychain Access Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constants', () => {
    it('exports the App Group identifier', () => {
      expect(APP_GROUP_IDENTIFIER).toBe('group.com.borderly.shared');
    });

    it('exports the shared Keychain access group', () => {
      expect(SHARED_KEYCHAIN_ACCESS_GROUP).toBe('com.borderly.shared-keychain');
    });

    it('exports the Keychain service identifier', () => {
      expect(KEYCHAIN_SERVICE).toBe('borderly');
    });
  });

  describe('storeProfile passes shared accessGroup', () => {
    it('includes accessGroup in setInternetCredentials options', async () => {
      (Keychain.setInternetCredentials as jest.Mock).mockResolvedValue(true);

      await keychainService.storeProfile(mockProfile);

      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          service: KEYCHAIN_SERVICE,
          accessGroup: SHARED_KEYCHAIN_ACCESS_GROUP,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }),
      );
    });
  });

  describe('getProfile passes shared accessGroup', () => {
    it('includes accessGroup in getInternetCredentials options', async () => {
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue({
        password: JSON.stringify(mockProfile),
        username: 'borderly_user',
      });

      await keychainService.getProfile();

      expect(Keychain.getInternetCredentials).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          service: KEYCHAIN_SERVICE,
          accessGroup: SHARED_KEYCHAIN_ACCESS_GROUP,
        }),
      );
    });
  });

  describe('storeProfileById passes shared accessGroup', () => {
    it('includes accessGroup when storing a profile by ID', async () => {
      (Keychain.setInternetCredentials as jest.Mock).mockResolvedValue(true);

      await keychainService.storeProfileById('profile-123', mockProfile);

      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          accessGroup: SHARED_KEYCHAIN_ACCESS_GROUP,
        }),
      );
    });
  });

  describe('getProfileById passes shared accessGroup', () => {
    it('includes accessGroup when retrieving a profile by ID', async () => {
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue({
        password: JSON.stringify(mockProfile),
        username: 'borderly_user',
      });

      await keychainService.getProfileById('profile-123');

      expect(Keychain.getInternetCredentials).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          accessGroup: SHARED_KEYCHAIN_ACCESS_GROUP,
        }),
      );
    });
  });

  describe('isAvailable passes shared accessGroup', () => {
    it('includes accessGroup in availability test', async () => {
      (Keychain.setInternetCredentials as jest.Mock).mockResolvedValue(true);
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue({
        password: 'test',
        username: 'test',
      });
      (Keychain.resetInternetCredentials as jest.Mock).mockResolvedValue(true);

      await keychainService.isAvailable();

      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        'borderly_availability_test',
        'test',
        'test',
        expect.objectContaining({
          service: KEYCHAIN_SERVICE,
          accessGroup: SHARED_KEYCHAIN_ACCESS_GROUP,
        }),
      );
    });
  });

  describe('encryption key operations pass shared accessGroup', () => {
    it('includes accessGroup when generating encryption key', async () => {
      (Keychain.setInternetCredentials as jest.Mock).mockResolvedValue(true);

      await keychainService.generateEncryptionKey();

      expect(Keychain.setInternetCredentials).toHaveBeenCalledWith(
        'borderly_encryption_key',
        'borderly_encryption',
        expect.any(String),
        expect.objectContaining({
          accessGroup: SHARED_KEYCHAIN_ACCESS_GROUP,
        }),
      );
    });

    it('includes accessGroup when retrieving encryption key', async () => {
      (Keychain.getInternetCredentials as jest.Mock).mockResolvedValue({
        password: 'test-key',
        username: 'borderly_encryption',
      });

      await keychainService.getEncryptionKey();

      expect(Keychain.getInternetCredentials).toHaveBeenCalledWith(
        'borderly_encryption_key',
        expect.objectContaining({
          accessGroup: SHARED_KEYCHAIN_ACCESS_GROUP,
        }),
      );
    });
  });
});
