/**
 * Unit tests for portal credential CRUD operations in KeychainService.
 *
 * These tests use a real KeychainServiceImpl but with mocked native modules
 * (react-native-keychain and react-native-mmkv) so they run in Jest without
 * any native code.
 */

import * as KeychainModule from 'react-native-keychain';
import { mmkvService } from '@/services/storage/mmkv';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-keychain', () => ({
  setInternetCredentials: jest.fn(),
  getInternetCredentials: jest.fn(),
  resetInternetCredentials: jest.fn(),
  getSupportedBiometryType: jest.fn().mockResolvedValue(null),
  canImplyAuthentication: jest.fn().mockResolvedValue(false),
  ACCESS_CONTROL: {
    BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE: 'BiometryCurrentSetOrDevicePasscode',
    DEVICE_PASSCODE: 'DevicePasscode',
  },
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WhenUnlockedThisDeviceOnly',
  },
  AUTHENTICATION_TYPE: {
    DEVICE_PASSCODE_OR_BIOMETRICS: 'DevicePasscodeOrBiometrics',
  },
}));

// Mock @/services/storage/mmkv so we can control the MMKV index independently
// of the Keychain mock.
jest.mock('@/services/storage/mmkv', () => ({
  mmkvService: {
    getString: jest.fn(),
    setString: jest.fn(),
    delete: jest.fn(),
  },
}));

// ── Import after mocks are in place ──────────────────────────────────────────
import { keychainService } from '@/services/storage/keychain';
import { PortalCredential } from '@/types/submission';

// ── Helpers ───────────────────────────────────────────────────────────────────

const PROFILE_ID = 'profile-abc';
const PORTAL_CODE = 'JPN';
const USERNAME = 'traveller@example.com';
const PASSWORD = 'super-secret-pw';
const CREDENTIAL_KEY = `borderly_portal_cred_${PROFILE_ID}_${PORTAL_CODE}`;
const INDEX_KEY = `borderly_portal_cred_index_${PROFILE_ID}`;

function makeIndex(entries: Partial<PortalCredential>[] = []): string {
  const full = entries.map((e, i) => {
    const entry: Record<string, string> = {
      portalCode: e.portalCode ?? PORTAL_CODE,
      profileId: e.profileId ?? PROFILE_ID,
      username: e.username ?? USERNAME,
      createdAt: e.createdAt ?? `2024-01-0${i + 1}T00:00:00.000Z`,
    };
    if (e.lastUsed !== undefined) {
      entry.lastUsed = e.lastUsed;
    }
    return entry;
  });
  return JSON.stringify(full);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('KeychainService — portal credentials', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // By default the index is empty
    (mmkvService.getString as jest.Mock).mockReturnValue(undefined);
  });

  // ── storePortalCredential ────────────────────────────────────────────────────

  describe('storePortalCredential', () => {
    it('stores credentials with WHEN_UNLOCKED_THIS_DEVICE_ONLY security', async () => {
      (KeychainModule.setInternetCredentials as jest.Mock).mockResolvedValue(true);

      await keychainService.storePortalCredential(PROFILE_ID, PORTAL_CODE, USERNAME, PASSWORD);

      expect(KeychainModule.setInternetCredentials).toHaveBeenCalledWith(
        CREDENTIAL_KEY,
        USERNAME,
        PASSWORD,
        expect.objectContaining({
          accessible: KeychainModule.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }),
      );
    });

    it('uses the correct key format: borderly_portal_cred_{profileId}_{portalCode}', async () => {
      (KeychainModule.setInternetCredentials as jest.Mock).mockResolvedValue(true);

      await keychainService.storePortalCredential('prof-1', 'SGP', 'user@test.com', 'pw');

      expect(KeychainModule.setInternetCredentials).toHaveBeenCalledWith(
        'borderly_portal_cred_prof-1_SGP',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });

    it('writes a metadata entry to the MMKV index', async () => {
      (KeychainModule.setInternetCredentials as jest.Mock).mockResolvedValue(true);

      await keychainService.storePortalCredential(PROFILE_ID, PORTAL_CODE, USERNAME, PASSWORD);

      expect(mmkvService.setString).toHaveBeenCalledWith(
        INDEX_KEY,
        expect.stringContaining(PORTAL_CODE),
      );

      // The stored JSON must NOT contain the password
      const [[, storedJson]] = (mmkvService.setString as jest.Mock).mock.calls;
      const stored = JSON.parse(storedJson) as PortalCredential[];
      expect(stored).toHaveLength(1);
      expect(stored[0].portalCode).toBe(PORTAL_CODE);
      expect(stored[0].username).toBe(USERNAME);
      expect((stored[0] as unknown as Record<string, unknown>).password).toBeUndefined();
    });

    it('stores optional email in the MMKV index', async () => {
      (KeychainModule.setInternetCredentials as jest.Mock).mockResolvedValue(true);

      await keychainService.storePortalCredential(
        PROFILE_ID, PORTAL_CODE, USERNAME, PASSWORD, 'alt@email.com',
      );

      const [[, storedJson]] = (mmkvService.setString as jest.Mock).mock.calls;
      const stored = JSON.parse(storedJson) as PortalCredential[];
      expect(stored[0].email).toBe('alt@email.com');
    });

    it('preserves createdAt when updating an existing credential', async () => {
      const originalCreatedAt = '2024-01-01T00:00:00.000Z';
      (KeychainModule.setInternetCredentials as jest.Mock).mockResolvedValue(true);
      (mmkvService.getString as jest.Mock).mockReturnValue(
        makeIndex([{ createdAt: originalCreatedAt }]),
      );

      await keychainService.storePortalCredential(PROFILE_ID, PORTAL_CODE, USERNAME, 'new-pw');

      const [[, storedJson]] = (mmkvService.setString as jest.Mock).mock.calls;
      const stored = JSON.parse(storedJson) as PortalCredential[];
      expect(stored[0].createdAt).toBe(originalCreatedAt);
    });

    it('throws when Keychain write fails', async () => {
      (KeychainModule.setInternetCredentials as jest.Mock).mockRejectedValue(
        new Error('Keychain locked'),
      );

      await expect(
        keychainService.storePortalCredential(PROFILE_ID, PORTAL_CODE, USERNAME, PASSWORD),
      ).rejects.toThrow('Failed to securely store portal credential');
    });
  });

  // ── getPortalCredential ──────────────────────────────────────────────────────

  describe('getPortalCredential', () => {
    it('returns username and password when credential exists', async () => {
      (KeychainModule.getInternetCredentials as jest.Mock).mockResolvedValue({
        username: USERNAME,
        password: PASSWORD,
      });
      (mmkvService.getString as jest.Mock).mockReturnValue(makeIndex([{}]));

      const result = await keychainService.getPortalCredential(PROFILE_ID, PORTAL_CODE);

      expect(result).toEqual({ username: USERNAME, password: PASSWORD });
    });

    it('returns null when no credential is stored', async () => {
      (KeychainModule.getInternetCredentials as jest.Mock).mockResolvedValue(false);

      const result = await keychainService.getPortalCredential(PROFILE_ID, PORTAL_CODE);

      expect(result).toBeNull();
    });

    it('returns null when Keychain throws (e.g. user cancelled biometric)', async () => {
      (KeychainModule.getInternetCredentials as jest.Mock).mockRejectedValue(
        new Error('User cancelled'),
      );

      const result = await keychainService.getPortalCredential(PROFILE_ID, PORTAL_CODE);

      expect(result).toBeNull();
    });

    it('updates lastUsed in the MMKV index after successful retrieval', async () => {
      (KeychainModule.getInternetCredentials as jest.Mock).mockResolvedValue({
        username: USERNAME,
        password: PASSWORD,
      });
      (mmkvService.getString as jest.Mock).mockReturnValue(
        makeIndex([{ lastUsed: '2024-01-01T00:00:00.000Z' }]),
      );

      await keychainService.getPortalCredential(PROFILE_ID, PORTAL_CODE);

      expect(mmkvService.setString).toHaveBeenCalledWith(INDEX_KEY, expect.any(String));
      const [[, json]] = (mmkvService.setString as jest.Mock).mock.calls;
      const updated = JSON.parse(json) as PortalCredential[];
      expect(updated[0].lastUsed).not.toBe('2024-01-01T00:00:00.000Z');
    });
  });

  // ── deletePortalCredential ───────────────────────────────────────────────────

  describe('deletePortalCredential', () => {
    it('removes the Keychain entry', async () => {
      (KeychainModule.resetInternetCredentials as jest.Mock).mockResolvedValue(true);
      (mmkvService.getString as jest.Mock).mockReturnValue(makeIndex([{}]));

      await keychainService.deletePortalCredential(PROFILE_ID, PORTAL_CODE);

      expect(KeychainModule.resetInternetCredentials).toHaveBeenCalledWith({
        server: CREDENTIAL_KEY,
      });
    });

    it('removes the entry from the MMKV index', async () => {
      (KeychainModule.resetInternetCredentials as jest.Mock).mockResolvedValue(true);
      (mmkvService.getString as jest.Mock).mockReturnValue(
        makeIndex([{ portalCode: 'JPN' }, { portalCode: 'SGP' }]),
      );

      await keychainService.deletePortalCredential(PROFILE_ID, 'JPN');

      const [[, json]] = (mmkvService.setString as jest.Mock).mock.calls;
      const remaining = JSON.parse(json) as PortalCredential[];
      expect(remaining.map(c => c.portalCode)).not.toContain('JPN');
      expect(remaining.map(c => c.portalCode)).toContain('SGP');
    });

    it('throws when Keychain deletion fails', async () => {
      (KeychainModule.resetInternetCredentials as jest.Mock).mockRejectedValue(
        new Error('Keychain error'),
      );
      (mmkvService.getString as jest.Mock).mockReturnValue(makeIndex([{}]));

      await expect(
        keychainService.deletePortalCredential(PROFILE_ID, PORTAL_CODE),
      ).rejects.toThrow('Failed to delete portal credential');
    });
  });

  // ── getPortalCredentialsForProfile ───────────────────────────────────────────

  describe('getPortalCredentialsForProfile', () => {
    it('returns all stored portal credentials for a profile', async () => {
      const index = [
        { portalCode: 'JPN', username: 'user@j.com', createdAt: '2024-01-01T00:00:00.000Z' },
        { portalCode: 'SGP', username: 'user@s.com', createdAt: '2024-01-02T00:00:00.000Z' },
      ];
      (mmkvService.getString as jest.Mock).mockReturnValue(JSON.stringify(index));

      const result = await keychainService.getPortalCredentialsForProfile(PROFILE_ID);

      expect(result).toHaveLength(2);
      expect(result.map(c => c.portalCode)).toEqual(['JPN', 'SGP']);
    });

    it('returns an empty array when no credentials are stored', async () => {
      (mmkvService.getString as jest.Mock).mockReturnValue(undefined);

      const result = await keychainService.getPortalCredentialsForProfile(PROFILE_ID);

      expect(result).toEqual([]);
    });

    it('returns an empty array when the MMKV index contains invalid JSON', async () => {
      (mmkvService.getString as jest.Mock).mockReturnValue('not-json');

      const result = await keychainService.getPortalCredentialsForProfile(PROFILE_ID);

      expect(result).toEqual([]);
    });
  });

  // ── deleteAllPortalCredentialsForProfile ──────────────────────────────────────

  describe('deleteAllPortalCredentialsForProfile', () => {
    it('deletes all Keychain entries and clears the MMKV index', async () => {
      (KeychainModule.resetInternetCredentials as jest.Mock).mockResolvedValue(true);
      (mmkvService.getString as jest.Mock).mockReturnValue(
        makeIndex([{ portalCode: 'JPN' }, { portalCode: 'SGP' }]),
      );

      await keychainService.deleteAllPortalCredentialsForProfile(PROFILE_ID);

      expect(KeychainModule.resetInternetCredentials).toHaveBeenCalledTimes(2);
      expect(KeychainModule.resetInternetCredentials).toHaveBeenCalledWith({
        server: `borderly_portal_cred_${PROFILE_ID}_JPN`,
      });
      expect(KeychainModule.resetInternetCredentials).toHaveBeenCalledWith({
        server: `borderly_portal_cred_${PROFILE_ID}_SGP`,
      });
      expect(mmkvService.delete).toHaveBeenCalledWith(INDEX_KEY);
    });

    it('still clears the MMKV index when no credentials are stored', async () => {
      (mmkvService.getString as jest.Mock).mockReturnValue(undefined);

      await keychainService.deleteAllPortalCredentialsForProfile(PROFILE_ID);

      expect(KeychainModule.resetInternetCredentials).not.toHaveBeenCalled();
      expect(mmkvService.delete).toHaveBeenCalledWith(INDEX_KEY);
    });

    it('continues deleting other credentials if one Keychain deletion fails', async () => {
      (KeychainModule.resetInternetCredentials as jest.Mock)
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce(true);
      (mmkvService.getString as jest.Mock).mockReturnValue(
        makeIndex([{ portalCode: 'JPN' }, { portalCode: 'SGP' }]),
      );

      // Should not throw
      await expect(
        keychainService.deleteAllPortalCredentialsForProfile(PROFILE_ID),
      ).resolves.not.toThrow();

      // Both were attempted
      expect(KeychainModule.resetInternetCredentials).toHaveBeenCalledTimes(2);
      // Index still cleared
      expect(mmkvService.delete).toHaveBeenCalledWith(INDEX_KEY);
    });
  });

  // ── Cascade delete via deleteProfileById ─────────────────────────────────────

  describe('deleteProfileById cascade', () => {
    it('deletes portal credentials when a profile is deleted', async () => {
      (KeychainModule.resetInternetCredentials as jest.Mock).mockResolvedValue(true);
      (mmkvService.getString as jest.Mock).mockReturnValue(makeIndex([{ portalCode: 'JPN' }]));

      await keychainService.deleteProfileById(PROFILE_ID);

      // Portal credential should be deleted
      expect(KeychainModule.resetInternetCredentials).toHaveBeenCalledWith(
        expect.objectContaining({ server: expect.stringContaining('borderly_portal_cred') }),
      );
      // MMKV index should be cleared
      expect(mmkvService.delete).toHaveBeenCalledWith(INDEX_KEY);
    });
  });

  // ── Security level ────────────────────────────────────────────────────────────

  describe('security requirements', () => {
    it('uses same security level as passport data (WHEN_UNLOCKED_THIS_DEVICE_ONLY)', async () => {
      (KeychainModule.setInternetCredentials as jest.Mock).mockResolvedValue(true);

      await keychainService.storePortalCredential(PROFILE_ID, PORTAL_CODE, USERNAME, PASSWORD);

      const [, , , options] = (KeychainModule.setInternetCredentials as jest.Mock).mock.calls[0];
      expect(options.accessible).toBe(KeychainModule.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY);
    });
  });
});
