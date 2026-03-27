import type { TravelerProfile } from '../../../src/types/profile';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSetInternetCredentials = jest.fn().mockResolvedValue(true);
const mockGetInternetCredentials = jest.fn();
const mockResetInternetCredentials = jest.fn().mockResolvedValue(true);
const mockGetSupportedBiometryType = jest.fn().mockResolvedValue('FaceID');
const mockCanImplyAuthentication = jest.fn().mockResolvedValue(true);
const mockGetGenericPassword = jest.fn();
const mockResetGenericPassword = jest.fn().mockResolvedValue(true);
const mockSetGenericPassword = jest.fn().mockResolvedValue(true);

jest.mock('react-native-keychain', () => ({
  setInternetCredentials: mockSetInternetCredentials,
  getInternetCredentials: mockGetInternetCredentials,
  resetInternetCredentials: mockResetInternetCredentials,
  getSupportedBiometryType: mockGetSupportedBiometryType,
  canImplyAuthentication: mockCanImplyAuthentication,
  getGenericPassword: mockGetGenericPassword,
  resetGenericPassword: mockResetGenericPassword,
  setGenericPassword: mockSetGenericPassword,
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WhenUnlockedThisDeviceOnly',
  },
  ACCESS_CONTROL: {
    BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE: 'BiometryCurrentSetOrDevicePasscode',
    DEVICE_PASSCODE: 'DevicePasscode',
  },
  AUTHENTICATION_TYPE: {
    DEVICE_PASSCODE_OR_BIOMETRICS: 'AuthenticationWithBiometricsDevicePasscode',
  },
}));

jest.mock('react-native-get-random-values', () => {});

const mockGenEncKey = jest.fn().mockResolvedValue('enc-key-123');
const mockGetEncKey = jest.fn().mockResolvedValue('enc-key-123');
const mockGenProfileEncKey = jest.fn().mockResolvedValue('profile-enc-key');
const mockGetProfileEncKey = jest.fn().mockResolvedValue('profile-enc-key');
const mockDelProfileEncKey = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../src/services/storage/keychain/keychainEncryption', () => ({
  generateEncryptionKey: mockGenEncKey,
  getEncryptionKey: mockGetEncKey,
  generateProfileEncryptionKey: mockGenProfileEncKey,
  getProfileEncryptionKey: mockGetProfileEncKey,
  deleteProfileEncryptionKey: mockDelProfileEncKey,
}));

const mockStoreById = jest.fn().mockResolvedValue(undefined);
const mockGetById = jest.fn().mockResolvedValue(null);
const mockDeleteById = jest.fn().mockResolvedValue(undefined);
const mockCheckExists = jest.fn().mockResolvedValue(false);
const mockMigrateLegacy = jest.fn().mockResolvedValue(null);

jest.mock('../../../src/services/storage/keychain/keychainMultiProfile', () => ({
  storeProfileById: mockStoreById,
  getProfileById: mockGetById,
  deleteProfileById: mockDeleteById,
  profileExists: mockCheckExists,
  migrateLegacyProfile: mockMigrateLegacy,
}));

const mockStorePortalCred = jest.fn().mockResolvedValue(undefined);
const mockGetPortalCred = jest.fn().mockResolvedValue(null);
const mockDeletePortalCred = jest.fn().mockResolvedValue(undefined);
const mockDeleteAllPortalCreds = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../src/services/storage/keychain/keychainPortalOps', () => ({
  storePortalCredential: mockStorePortalCred,
  getPortalCredential: mockGetPortalCred,
  deletePortalCredential: mockDeletePortalCred,
  deleteAllPortalCredentialsForProfile: mockDeleteAllPortalCreds,
}));

const mockGetPortalCredIndex = jest.fn().mockResolvedValue([]);
jest.mock('../../../src/services/storage/keychain/keychainPortalCredentials', () => ({
  getPortalCredentialIndex: mockGetPortalCredIndex,
}));

jest.mock('../../../src/services/storage/keychain/sharedAccessConfig', () => ({
  SHARED_KEYCHAIN_ACCESS_GROUP: 'com.borderly.shared',
  KEYCHAIN_SERVICE: 'borderly',
}));

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeProfile(overrides?: Partial<TravelerProfile>): TravelerProfile {
  return {
    id: 'profile-1',
    firstName: 'John',
    lastName: 'Doe',
    passportNumber: 'AB1234567',
    nationality: 'USA',
    dateOfBirth: '1990-01-01',
    ...overrides,
  } as TravelerProfile;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('KeychainServiceImpl', () => {
  let keychainService: typeof import('../../../src/services/storage/keychain/keychainService').keychainService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    (globalThis as Record<string, unknown>).__DEV__ = false;
  });

  async function loadService() {
    const mod = await import('../../../src/services/storage/keychain/keychainService');
    keychainService = mod.keychainService;
    return keychainService;
  }

  describe('storeProfile', () => {
    it('stores profile in keychain', async () => {
      const svc = await loadService();
      const profile = makeProfile();

      await svc.storeProfile(profile);

      expect(mockSetInternetCredentials).toHaveBeenCalledWith(
        'borderly_traveler_profile',
        'borderly_user',
        JSON.stringify(profile),
        expect.objectContaining({ service: 'borderly' }),
      );
    });

    it('throws on keychain failure', async () => {
      mockSetInternetCredentials.mockRejectedValueOnce(new Error('Keychain error'));

      const svc = await loadService();
      await expect(svc.storeProfile(makeProfile())).rejects.toThrow(
        'Failed to securely store profile data',
      );
    });
  });

  describe('getProfile', () => {
    it('retrieves and parses stored profile', async () => {
      const profile = makeProfile();
      mockGetInternetCredentials.mockResolvedValue({
        password: JSON.stringify(profile),
      });

      const svc = await loadService();
      const result = await svc.getProfile();

      expect(result).toEqual(profile);
    });

    it('returns null when no profile stored', async () => {
      mockGetInternetCredentials.mockResolvedValue(false);

      const svc = await loadService();
      const result = await svc.getProfile();

      expect(result).toBeNull();
    });

    it('returns null on keychain error', async () => {
      mockGetInternetCredentials.mockRejectedValue(new Error('Keychain error'));

      const svc = await loadService();
      const result = await svc.getProfile();

      expect(result).toBeNull();
    });

    it('returns null when credentials is boolean false', async () => {
      mockGetInternetCredentials.mockResolvedValue(false);

      const svc = await loadService();
      const result = await svc.getProfile();

      expect(result).toBeNull();
    });
  });

  describe('deleteProfile', () => {
    it('deletes profile from keychain', async () => {
      const svc = await loadService();
      await svc.deleteProfile();

      expect(mockResetInternetCredentials).toHaveBeenCalledWith({
        server: 'borderly_traveler_profile',
      });
    });

    it('throws on deletion failure', async () => {
      mockResetInternetCredentials.mockRejectedValueOnce(new Error('Delete error'));

      const svc = await loadService();
      await expect(svc.deleteProfile()).rejects.toThrow('Failed to delete profile data');
    });
  });

  describe('portal credentials', () => {
    it('storePortalCredential delegates to portal ops', async () => {
      const svc = await loadService();
      await svc.storePortalCredential('profile-1', 'VJW', 'user', 'pass', 'user@example.com');

      expect(mockStorePortalCred).toHaveBeenCalledWith(
        expect.any(Object),
        'profile-1',
        'VJW',
        'user',
        'pass',
        'user@example.com',
      );
    });

    it('getPortalCredential delegates to portal ops', async () => {
      mockGetPortalCred.mockResolvedValue({ username: 'user', password: 'pass' });

      const svc = await loadService();
      const result = await svc.getPortalCredential('profile-1', 'VJW');

      expect(result).toEqual({ username: 'user', password: 'pass' });
    });

    it('getPortalCredential returns null when not found', async () => {
      mockGetPortalCred.mockResolvedValue(null);

      const svc = await loadService();
      const result = await svc.getPortalCredential('profile-1', 'UNKNOWN');

      expect(result).toBeNull();
    });

    it('deletePortalCredential delegates to portal ops', async () => {
      const svc = await loadService();
      await svc.deletePortalCredential('profile-1', 'VJW');

      expect(mockDeletePortalCred).toHaveBeenCalledWith(
        expect.any(Object),
        'profile-1',
        'VJW',
      );
    });

    it('getPortalCredentialsForProfile returns credential list', async () => {
      const creds = [{ portalCode: 'VJW', username: 'user' }];
      mockGetPortalCredIndex.mockResolvedValue(creds);

      const svc = await loadService();
      const result = await svc.getPortalCredentialsForProfile('profile-1');

      expect(result).toEqual(creds);
    });

    it('deleteAllPortalCredentialsForProfile delegates to portal ops', async () => {
      const svc = await loadService();
      await svc.deleteAllPortalCredentialsForProfile('profile-1');

      expect(mockDeleteAllPortalCreds).toHaveBeenCalledWith(
        expect.any(Object),
        'profile-1',
      );
    });
  });

  describe('encryption keys', () => {
    it('generateEncryptionKey delegates to encryption module', async () => {
      const svc = await loadService();
      const key = await svc.generateEncryptionKey();

      expect(key).toBe('enc-key-123');
      expect(mockGenEncKey).toHaveBeenCalledWith(expect.any(Object));
    });

    it('getEncryptionKey delegates to encryption module', async () => {
      const svc = await loadService();
      const key = await svc.getEncryptionKey();

      expect(key).toBe('enc-key-123');
      expect(mockGetEncKey).toHaveBeenCalledWith(expect.any(Object));
    });

    it('getEncryptionKey returns null when no key exists', async () => {
      mockGetEncKey.mockResolvedValueOnce(null);

      const svc = await loadService();
      const key = await svc.getEncryptionKey();

      expect(key).toBeNull();
    });

    it('generateProfileEncryptionKey delegates with profileId', async () => {
      const svc = await loadService();
      const key = await svc.generateProfileEncryptionKey('profile-1');

      expect(key).toBe('profile-enc-key');
      expect(mockGenProfileEncKey).toHaveBeenCalledWith(expect.any(Object), 'profile-1');
    });

    it('getProfileEncryptionKey delegates with profileId', async () => {
      const svc = await loadService();
      const key = await svc.getProfileEncryptionKey('profile-1');

      expect(key).toBe('profile-enc-key');
    });

    it('deleteProfileEncryptionKey delegates with profileId', async () => {
      const svc = await loadService();
      await svc.deleteProfileEncryptionKey('profile-1');

      expect(mockDelProfileEncKey).toHaveBeenCalledWith(expect.any(Object), 'profile-1');
    });
  });

  describe('multi-profile methods', () => {
    it('storeProfileById delegates to multi-profile module', async () => {
      const svc = await loadService();
      const profile = makeProfile();

      await svc.storeProfileById('profile-1', profile);

      expect(mockStoreById).toHaveBeenCalledWith(
        expect.any(Object),
        'profile-1',
        profile,
      );
    });

    it('getProfileById delegates to multi-profile module', async () => {
      const profile = makeProfile();
      mockGetById.mockResolvedValue(profile);

      const svc = await loadService();
      const result = await svc.getProfileById('profile-1');

      expect(result).toEqual(profile);
    });

    it('getProfileById returns null when profile not found', async () => {
      mockGetById.mockResolvedValue(null);

      const svc = await loadService();
      const result = await svc.getProfileById('nonexistent');

      expect(result).toBeNull();
    });

    it('deleteProfileById delegates deletion', async () => {
      const svc = await loadService();
      await svc.deleteProfileById('profile-1');

      expect(mockDeleteById).toHaveBeenCalledWith(
        expect.any(Object),
        'profile-1',
        expect.any(Function),
        expect.any(Function),
      );
    });

    it('profileExists delegates to multi-profile module', async () => {
      mockCheckExists.mockResolvedValue(true);

      const svc = await loadService();
      const exists = await svc.profileExists('profile-1');

      expect(exists).toBe(true);
    });

    it('profileExists returns false for nonexistent profile', async () => {
      mockCheckExists.mockResolvedValue(false);

      const svc = await loadService();
      const exists = await svc.profileExists('nonexistent');

      expect(exists).toBe(false);
    });

    it('getAllProfileIds returns empty array', async () => {
      const svc = await loadService();
      const ids = await svc.getAllProfileIds();

      expect(ids).toEqual([]);
    });
  });

  describe('biometric authentication', () => {
    it('returns true on successful biometric auth', async () => {
      mockGetGenericPassword.mockResolvedValue({ password: 'data' });

      const svc = await loadService();
      const result = await svc.authenticateWithBiometric('test-service', {
        title: 'Authenticate',
        subtitle: 'Use biometrics',
        cancel: 'Cancel',
      });

      expect(result).toBe(true);
    });

    it('returns false when biometric auth fails', async () => {
      mockGetGenericPassword.mockResolvedValue(false);

      const svc = await loadService();
      const result = await svc.authenticateWithBiometric('test-service', {
        title: 'Authenticate',
        subtitle: 'Use biometrics',
        cancel: 'Cancel',
      });

      expect(result).toBe(false);
    });

    it('returns false on biometric error', async () => {
      mockGetGenericPassword.mockRejectedValue(new Error('Biometric error'));

      const svc = await loadService();
      const result = await svc.authenticateWithBiometric('test-service', {
        title: 'Authenticate',
        subtitle: 'Use biometrics',
        cancel: 'Cancel',
      });

      expect(result).toBe(false);
    });
  });

  describe('isAvailable', () => {
    it('returns true when keychain is functional', async () => {
      mockSetInternetCredentials.mockResolvedValue(true);
      mockGetInternetCredentials.mockResolvedValue({ password: 'test' });
      mockResetInternetCredentials.mockResolvedValue(true);

      const svc = await loadService();
      const available = await svc.isAvailable();

      expect(available).toBe(true);
    });

    it('returns false when keychain test fails', async () => {
      mockSetInternetCredentials.mockRejectedValue(new Error('Not available'));

      const svc = await loadService();
      const available = await svc.isAvailable();

      expect(available).toBe(false);
    });

    it('returns false when retrieved data does not match', async () => {
      mockSetInternetCredentials.mockResolvedValue(true);
      mockGetInternetCredentials.mockResolvedValue({ password: 'wrong' });
      mockResetInternetCredentials.mockResolvedValue(true);

      const svc = await loadService();
      const available = await svc.isAvailable();

      expect(available).toBe(false);
    });
  });

  describe('clearSensitiveMemory', () => {
    it('resets sensitive data refs without error', async () => {
      const svc = await loadService();
      expect(() => svc.clearSensitiveMemory()).not.toThrow();
    });
  });

  describe('secureCleanup', () => {
    it('resets generic password and clears memory', async () => {
      const svc = await loadService();
      await svc.secureCleanup();

      expect(mockResetGenericPassword).toHaveBeenCalledWith({ service: 'borderly' });
    });

    it('does not throw on cleanup failure', async () => {
      mockResetGenericPassword.mockRejectedValueOnce(new Error('Cleanup failed'));

      const svc = await loadService();
      await expect(svc.secureCleanup()).resolves.toBeUndefined();
    });
  });

  describe('migrateLegacyProfile', () => {
    it('delegates to migration module', async () => {
      mockMigrateLegacy.mockResolvedValue('migrated-id');

      const svc = await loadService();
      const result = await svc.migrateLegacyProfile();

      expect(result).toBe('migrated-id');
      expect(mockMigrateLegacy).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Function),
        expect.any(Function),
      );
    });

    it('returns null when no legacy profile exists', async () => {
      mockMigrateLegacy.mockResolvedValue(null);

      const svc = await loadService();
      const result = await svc.migrateLegacyProfile();

      expect(result).toBeNull();
    });
  });
});
