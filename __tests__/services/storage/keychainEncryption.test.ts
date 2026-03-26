/**
 * Tests for keychain/keychainEncryption
 */

import {
  generateEncryptionKey,
  getEncryptionKey,
  generateProfileEncryptionKey,
  getProfileEncryptionKey,
  deleteProfileEncryptionKey,
  KeychainOps,
} from '@/services/storage/keychain/keychainEncryption';

// ---------------------------------------------------------------------------
// Test fixtures
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

// ---------------------------------------------------------------------------
// generateEncryptionKey
// ---------------------------------------------------------------------------
describe('generateEncryptionKey', () => {
  it('stores a generated hex key in keychain', async () => {
    const ops = makeMockOps();
    const key = await generateEncryptionKey(ops);

    expect(typeof key).toBe('string');
    expect(key).toMatch(/^[0-9a-f]{64}$/); // 32 bytes = 64 hex chars
    expect(ops.storeInKeychain).toHaveBeenCalledWith(
      'borderly_encryption_key',
      'borderly_encryption',
      key,
    );
  });

  it('throws when keychain store fails', async () => {
    const ops = makeMockOps({
      storeInKeychain: jest.fn().mockRejectedValue(new Error('Keychain locked')),
    });
    await expect(generateEncryptionKey(ops)).rejects.toThrow('Failed to generate encryption key');
  });
});

// ---------------------------------------------------------------------------
// getEncryptionKey
// ---------------------------------------------------------------------------
describe('getEncryptionKey', () => {
  it('returns the stored key when it exists', async () => {
    const ops = makeMockOps({
      getFromKeychain: jest.fn().mockResolvedValue('abc123'),
    });
    const key = await getEncryptionKey(ops);
    expect(key).toBe('abc123');
  });

  it('returns null when no key is stored', async () => {
    const ops = makeMockOps();
    const key = await getEncryptionKey(ops);
    expect(key).toBeNull();
  });

  it('returns null on keychain error', async () => {
    const ops = makeMockOps({
      getFromKeychain: jest.fn().mockRejectedValue(new Error('access denied')),
    });
    const key = await getEncryptionKey(ops);
    expect(key).toBeNull();
  });

  it('schedules clearSensitiveMemory when key exists', async () => {
    jest.useFakeTimers();
    const ops = makeMockOps({
      getFromKeychain: jest.fn().mockResolvedValue('secret'),
    });
    await getEncryptionKey(ops);
    expect(ops.clearSensitiveMemory).not.toHaveBeenCalled();
    jest.advanceTimersByTime(60000);
    expect(ops.clearSensitiveMemory).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// generateProfileEncryptionKey
// ---------------------------------------------------------------------------
describe('generateProfileEncryptionKey', () => {
  it('stores a per-profile hex key with profile-specific keychain key', async () => {
    const ops = makeMockOps();
    const key = await generateProfileEncryptionKey(ops, 'profile-42');

    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(ops.storeInKeychain).toHaveBeenCalledWith(
      'borderly_profile_enc_profile-42',
      'borderly_encryption',
      key,
    );
  });

  it('throws when store fails', async () => {
    const ops = makeMockOps({
      storeInKeychain: jest.fn().mockRejectedValue(new Error('fail')),
    });
    await expect(generateProfileEncryptionKey(ops, 'p1')).rejects.toThrow('Failed to generate encryption key');
  });
});

// ---------------------------------------------------------------------------
// getProfileEncryptionKey
// ---------------------------------------------------------------------------
describe('getProfileEncryptionKey', () => {
  it('returns the stored profile key', async () => {
    const ops = makeMockOps({
      getFromKeychain: jest.fn().mockResolvedValue('profileKey'),
    });
    const key = await getProfileEncryptionKey(ops, 'p1');
    expect(key).toBe('profileKey');
    expect(ops.getFromKeychain).toHaveBeenCalledWith('borderly_profile_enc_p1');
  });

  it('returns null when no key exists', async () => {
    const ops = makeMockOps();
    const key = await getProfileEncryptionKey(ops, 'p1');
    expect(key).toBeNull();
  });

  it('returns null on error', async () => {
    const ops = makeMockOps({
      getFromKeychain: jest.fn().mockRejectedValue(new Error('locked')),
    });
    const key = await getProfileEncryptionKey(ops, 'p1');
    expect(key).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// deleteProfileEncryptionKey
// ---------------------------------------------------------------------------
describe('deleteProfileEncryptionKey', () => {
  it('deletes the profile-specific keychain entry', async () => {
    const ops = makeMockOps();
    await deleteProfileEncryptionKey(ops, 'p1');
    expect(ops.deleteFromKeychain).toHaveBeenCalledWith('borderly_profile_enc_p1');
  });

  it('throws when delete fails', async () => {
    const ops = makeMockOps({
      deleteFromKeychain: jest.fn().mockRejectedValue(new Error('fail')),
    });
    await expect(deleteProfileEncryptionKey(ops, 'p1')).rejects.toThrow('Failed to delete encryption key');
  });
});
