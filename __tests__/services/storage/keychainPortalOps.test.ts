/**
 * Tests for keychain/keychainPortalOps
 */

import {
  storePortalCredential,
  deletePortalCredential,
  deleteAllPortalCredentialsForProfile,
} from '@/services/storage/keychain/keychainPortalOps';
import { KeychainOps } from '@/services/storage/keychain/keychainEncryption';

// Mock portal credential index helpers
const mockIndex: Array<{ portalCode: string; profileId: string; username: string; createdAt: string; lastUsed: string }> = [];

jest.mock('@/services/storage/keychain/keychainPortalCredentials', () => ({
  getPortalCredentialKey: (profileId: string, portalCode: string) => `portal_${profileId}_${portalCode}`,
  getPortalCredentialIndex: jest.fn(() => [...mockIndex]),
  savePortalCredentialIndex: jest.fn(),
  deletePortalCredentialIndexEntry: jest.fn(),
}));

const {
  getPortalCredentialIndex,
  savePortalCredentialIndex,
  deletePortalCredentialIndexEntry,
} = jest.requireMock('@/services/storage/keychain/keychainPortalCredentials') as {
  getPortalCredentialIndex: jest.Mock;
  savePortalCredentialIndex: jest.Mock;
  deletePortalCredentialIndexEntry: jest.Mock;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockOps(overrides?: Partial<KeychainOps>): KeychainOps {
  return {
    storeInKeychain: jest.fn().mockResolvedValue(undefined),
    getFromKeychain: jest.fn().mockResolvedValue(null),
    deleteFromKeychain: jest.fn().mockResolvedValue(undefined),
    clearSensitiveMemory: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  mockIndex.length = 0;
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// storePortalCredential
// ---------------------------------------------------------------------------
describe('storePortalCredential', () => {
  it('stores credential in keychain and updates index', async () => {
    const ops = makeMockOps();
    await storePortalCredential(ops, 'prof1', 'JPN', 'user@test.com', 'pass123');

    expect(ops.storeInKeychain).toHaveBeenCalledWith('portal_prof1_JPN', 'user@test.com', 'pass123');
    expect(savePortalCredentialIndex).toHaveBeenCalledWith('prof1', expect.arrayContaining([
      expect.objectContaining({ portalCode: 'JPN', username: 'user@test.com' }),
    ]));
  });

  it('updates existing index entry instead of duplicating', async () => {
    mockIndex.push({
      portalCode: 'JPN',
      profileId: 'prof1',
      username: 'old@test.com',
      createdAt: '2025-01-01T00:00:00Z',
      lastUsed: '2025-01-01T00:00:00Z',
    });
    getPortalCredentialIndex.mockReturnValue([...mockIndex]);

    const ops = makeMockOps();
    await storePortalCredential(ops, 'prof1', 'JPN', 'new@test.com', 'newpass');

    const savedIndex = savePortalCredentialIndex.mock.calls[0][1];
    expect(savedIndex).toHaveLength(1);
    expect(savedIndex[0].username).toBe('new@test.com');
    expect(savedIndex[0].createdAt).toBe('2025-01-01T00:00:00Z'); // preserved
  });

  it('throws when keychain store fails', async () => {
    const ops = makeMockOps({
      storeInKeychain: jest.fn().mockRejectedValue(new Error('fail')),
    });
    await expect(storePortalCredential(ops, 'p', 'JPN', 'u', 'p')).rejects.toThrow('Failed to securely store');
  });
});

// ---------------------------------------------------------------------------
// deletePortalCredential
// ---------------------------------------------------------------------------
describe('deletePortalCredential', () => {
  it('deletes from keychain and removes from index', async () => {
    mockIndex.push({
      portalCode: 'JPN',
      profileId: 'prof1',
      username: 'u',
      createdAt: '2025-01-01T00:00:00Z',
      lastUsed: '2025-01-01T00:00:00Z',
    });
    getPortalCredentialIndex.mockReturnValue([...mockIndex]);

    const ops = makeMockOps();
    await deletePortalCredential(ops, 'prof1', 'JPN');

    expect(ops.deleteFromKeychain).toHaveBeenCalledWith('portal_prof1_JPN');
    const savedIndex = savePortalCredentialIndex.mock.calls[0][1];
    expect(savedIndex).toHaveLength(0);
  });

  it('throws when keychain delete fails', async () => {
    const ops = makeMockOps({
      deleteFromKeychain: jest.fn().mockRejectedValue(new Error('fail')),
    });
    await expect(deletePortalCredential(ops, 'p', 'JPN')).rejects.toThrow('Failed to delete portal credential');
  });
});

// ---------------------------------------------------------------------------
// deleteAllPortalCredentialsForProfile
// ---------------------------------------------------------------------------
describe('deleteAllPortalCredentialsForProfile', () => {
  it('deletes all credentials for a profile and clears the index', async () => {
    mockIndex.push(
      { portalCode: 'JPN', profileId: 'prof1', username: 'u1', createdAt: '', lastUsed: '' },
      { portalCode: 'MYS', profileId: 'prof1', username: 'u2', createdAt: '', lastUsed: '' },
    );
    getPortalCredentialIndex.mockReturnValue([...mockIndex]);

    const ops = makeMockOps();
    await deleteAllPortalCredentialsForProfile(ops, 'prof1');

    expect(ops.deleteFromKeychain).toHaveBeenCalledTimes(2);
    expect(ops.deleteFromKeychain).toHaveBeenCalledWith('portal_prof1_JPN');
    expect(ops.deleteFromKeychain).toHaveBeenCalledWith('portal_prof1_MYS');
    expect(deletePortalCredentialIndexEntry).toHaveBeenCalledWith('prof1');
  });

  it('still clears index even if individual deletes fail', async () => {
    mockIndex.push(
      { portalCode: 'JPN', profileId: 'prof1', username: 'u1', createdAt: '', lastUsed: '' },
    );
    getPortalCredentialIndex.mockReturnValue([...mockIndex]);

    const ops = makeMockOps({
      deleteFromKeychain: jest.fn().mockRejectedValue(new Error('fail')),
    });
    // Should not throw — individual failures are caught
    await deleteAllPortalCredentialsForProfile(ops, 'prof1');
    expect(deletePortalCredentialIndexEntry).toHaveBeenCalledWith('prof1');
  });
});
