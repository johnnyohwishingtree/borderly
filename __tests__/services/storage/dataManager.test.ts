/**
 * Tests for src/services/storage/dataManager.ts
 *
 * Covers:
 *   - buildDataExport: produces sanitised JSON (no passportNumber / raw MRZ)
 *   - exportUserData: triggers Share sheet and returns correct boolean
 *   - deleteAllData: clears Keychain, WatermelonDB, and MMKV
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────
// jest.mock calls are hoisted before imports. Do NOT reference outer
// variables inside factory closures — they are undefined at hoist-time.

jest.mock('react-native', () => ({
  Share: {
    share: jest.fn(),
    dismissedAction: 'dismissedAction',
  },
  Alert: { alert: jest.fn() },
}));

jest.mock('@/services/storage/keychain', () => ({
  keychainService: {
    getProfileById: jest.fn(),
    deleteProfileById: jest.fn(),
    deleteProfile: jest.fn(),
  },
}));

jest.mock('@/services/storage/database', () => ({
  databaseService: {
    getTrips: jest.fn(),
    getTripLegs: jest.fn(),
    reset: jest.fn(),
  },
}));

jest.mock('@/services/storage/mmkv', () => ({
  mmkvService: {
    clearAll: jest.fn(),
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { buildDataExport, exportUserData, deleteAllData } from '@/services/storage/dataManager';
import { TravelerProfile } from '@/types/profile';

// Access mocks via jest.requireMock to avoid stale references after clearAllMocks
function getShareMock() {
  return jest.requireMock<{ Share: { share: jest.Mock; dismissedAction: string } }>('react-native').Share;
}
function getKeychainMock() {
  return jest.requireMock<{ keychainService: { getProfileById: jest.Mock; deleteProfileById: jest.Mock; deleteProfile: jest.Mock } }>('@/services/storage/keychain').keychainService;
}
function getDbMock() {
  return jest.requireMock<{ databaseService: { getTrips: jest.Mock; getTripLegs: jest.Mock; reset: jest.Mock } }>('@/services/storage/database').databaseService;
}
function getMmkvMock() {
  return jest.requireMock<{ mmkvService: { clearAll: jest.Mock } }>('@/services/storage/mmkv').mmkvService;
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockProfile: TravelerProfile = {
  id: 'profile-1',
  passportNumber: 'AB1234567', // must be stripped from export
  surname: 'Smith',
  givenNames: 'Alice',
  nationality: 'GBR',
  dateOfBirth: '1985-06-15',
  gender: 'F',
  passportExpiry: '2032-06-15',
  issuingCountry: 'GBR',
  email: 'alice@example.com',
  phoneNumber: '+447700900000',
  occupation: 'Engineer',
  relationship: 'self',
  defaultDeclarations: {
    hasItemsToDeclar: false,
    carryingCurrency: false,
    carryingProhibitedItems: false,
    visitedFarm: false,
    hasCriminalRecord: false,
    carryingCommercialGoods: false,
  },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
};

const mockDbTrip = {
  id: 'trip-1',
  name: 'Asia Trip 2025',
  status: 'upcoming',
  createdAt: new Date('2024-03-01T00:00:00.000Z'),
  updatedAt: new Date('2024-03-02T00:00:00.000Z'),
};

const mockDbLeg = {
  id: 'leg-1',
  destinationCountry: 'JPN',
  arrivalDate: new Date('2025-04-01T00:00:00.000Z'),
  departureDate: new Date('2025-04-10T00:00:00.000Z'),
  flightNumber: 'JL001',
  formStatus: 'not_started' as const,
  order: 0,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('buildDataExport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an export object with correct shape', async () => {
    getKeychainMock().getProfileById.mockResolvedValue(mockProfile);
    getDbMock().getTrips.mockResolvedValue([mockDbTrip]);
    getDbMock().getTripLegs.mockResolvedValue([mockDbLeg]);

    const result = await buildDataExport(['profile-1']);

    expect(result).toMatchObject({
      appVersion: expect.any(String),
      profiles: expect.any(Array),
      trips: expect.any(Array),
    });
    expect(typeof result.exportedAt).toBe('string');
  });

  it('excludes passportNumber from exported profile', async () => {
    getKeychainMock().getProfileById.mockResolvedValue(mockProfile);
    getDbMock().getTrips.mockResolvedValue([]);
    getDbMock().getTripLegs.mockResolvedValue([]);

    const result = await buildDataExport(['profile-1']);

    expect(result.profiles).toHaveLength(1);
    const exportedProfile = result.profiles[0];

    // passportNumber must not appear in the exported object
    expect(exportedProfile).not.toHaveProperty('passportNumber');

    // Parsed fields must be present
    expect(exportedProfile.givenNames).toBe('Alice');
    expect(exportedProfile.surname).toBe('Smith');
    expect(exportedProfile.nationality).toBe('GBR');
  });

  it('includes trip and leg data', async () => {
    getKeychainMock().getProfileById.mockResolvedValue(mockProfile);
    getDbMock().getTrips.mockResolvedValue([mockDbTrip]);
    getDbMock().getTripLegs.mockResolvedValue([mockDbLeg]);

    const result = await buildDataExport(['profile-1']);

    expect(result.trips).toHaveLength(1);
    expect(result.trips[0]).toMatchObject({
      id: 'trip-1',
      name: 'Asia Trip 2025',
      status: 'upcoming',
    });
    expect(result.trips[0].legs).toHaveLength(1);
    expect(result.trips[0].legs[0]).toMatchObject({
      id: 'leg-1',
      destinationCountry: 'JPN',
    });
  });

  it('skips profiles that cannot be found in keychain', async () => {
    getKeychainMock().getProfileById.mockResolvedValue(null);
    getDbMock().getTrips.mockResolvedValue([]);
    getDbMock().getTripLegs.mockResolvedValue([]);

    const result = await buildDataExport(['missing-id']);

    expect(result.profiles).toHaveLength(0);
  });

  it('handles database errors gracefully and still returns profiles', async () => {
    getKeychainMock().getProfileById.mockResolvedValue(mockProfile);
    getDbMock().getTrips.mockRejectedValue(new Error('DB error'));

    const result = await buildDataExport(['profile-1']);

    expect(result.profiles).toHaveLength(1);
    expect(result.trips).toHaveLength(0);
  });

  it('handles multiple profiles', async () => {
    const profile2: TravelerProfile = {
      ...mockProfile,
      id: 'profile-2',
      givenNames: 'Bob',
      surname: 'Jones',
    };
    getKeychainMock().getProfileById
      .mockResolvedValueOnce(mockProfile)
      .mockResolvedValueOnce(profile2);
    getDbMock().getTrips.mockResolvedValue([]);
    getDbMock().getTripLegs.mockResolvedValue([]);

    const result = await buildDataExport(['profile-1', 'profile-2']);

    expect(result.profiles).toHaveLength(2);
    expect(result.profiles.map(p => p.givenNames)).toEqual(['Alice', 'Bob']);
  });
});

describe('exportUserData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getDbMock().getTrips.mockResolvedValue([]);
    getDbMock().getTripLegs.mockResolvedValue([]);
  });

  it('calls Share.share with JSON string and returns true when shared', async () => {
    getKeychainMock().getProfileById.mockResolvedValue(mockProfile);
    getShareMock().share.mockResolvedValue({ action: 'sharedAction' });

    const result = await exportUserData(['profile-1']);

    expect(getShareMock().share).toHaveBeenCalledTimes(1);
    const [shareArg] = getShareMock().share.mock.calls[0];
    expect(shareArg).toHaveProperty('title', 'Borderly Data Export');
    expect(typeof shareArg.message).toBe('string');

    // The JSON must NOT contain passport number
    const parsed = JSON.parse(shareArg.message);
    expect(parsed.profiles[0]).not.toHaveProperty('passportNumber');

    expect(result).toBe(true);
  });

  it('returns false when share dialog is dismissed', async () => {
    getKeychainMock().getProfileById.mockResolvedValue(mockProfile);
    getShareMock().share.mockResolvedValue({ action: 'dismissedAction' });

    const result = await exportUserData(['profile-1']);

    expect(result).toBe(false);
  });

  it('re-throws if Share.share throws', async () => {
    getKeychainMock().getProfileById.mockResolvedValue(mockProfile);
    getShareMock().share.mockRejectedValue(new Error('share error'));

    await expect(exportUserData(['profile-1'])).rejects.toThrow('share error');
  });
});

describe('deleteAllData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes each profile from keychain', async () => {
    getKeychainMock().deleteProfileById.mockResolvedValue(undefined);
    getKeychainMock().deleteProfile.mockResolvedValue(undefined);
    getDbMock().reset.mockResolvedValue(undefined);
    getMmkvMock().clearAll.mockReturnValue(undefined);

    await deleteAllData(['profile-1', 'profile-2']);

    expect(getKeychainMock().deleteProfileById).toHaveBeenCalledWith('profile-1');
    expect(getKeychainMock().deleteProfileById).toHaveBeenCalledWith('profile-2');
    expect(getKeychainMock().deleteProfileById).toHaveBeenCalledTimes(2);
  });

  it('also clears the legacy keychain entry', async () => {
    getKeychainMock().deleteProfileById.mockResolvedValue(undefined);
    getKeychainMock().deleteProfile.mockResolvedValue(undefined);
    getDbMock().reset.mockResolvedValue(undefined);
    getMmkvMock().clearAll.mockReturnValue(undefined);

    await deleteAllData([]);

    expect(getKeychainMock().deleteProfile).toHaveBeenCalledTimes(1);
  });

  it('resets the WatermelonDB database', async () => {
    getKeychainMock().deleteProfileById.mockResolvedValue(undefined);
    getKeychainMock().deleteProfile.mockResolvedValue(undefined);
    getDbMock().reset.mockResolvedValue(undefined);
    getMmkvMock().clearAll.mockReturnValue(undefined);

    await deleteAllData(['profile-1']);

    expect(getDbMock().reset).toHaveBeenCalledTimes(1);
  });

  it('clears all MMKV keys', async () => {
    getKeychainMock().deleteProfileById.mockResolvedValue(undefined);
    getKeychainMock().deleteProfile.mockResolvedValue(undefined);
    getDbMock().reset.mockResolvedValue(undefined);
    getMmkvMock().clearAll.mockReturnValue(undefined);

    await deleteAllData(['profile-1']);

    expect(getMmkvMock().clearAll).toHaveBeenCalledTimes(1);
  });

  it('throws after collecting errors if storage tiers fail', async () => {
    getKeychainMock().deleteProfileById.mockRejectedValue(new Error('keychain fail'));
    getKeychainMock().deleteProfile.mockResolvedValue(undefined);
    getDbMock().reset.mockRejectedValue(new Error('db fail'));
    getMmkvMock().clearAll.mockReturnValue(undefined);

    await expect(deleteAllData(['profile-1'])).rejects.toThrow(
      'Data deletion had errors',
    );
  });

  it('still clears MMKV even if keychain deletion fails', async () => {
    getKeychainMock().deleteProfileById.mockRejectedValue(new Error('keychain fail'));
    getKeychainMock().deleteProfile.mockResolvedValue(undefined);
    getDbMock().reset.mockResolvedValue(undefined);
    getMmkvMock().clearAll.mockReturnValue(undefined);

    try {
      await deleteAllData(['profile-1']);
    } catch {
      // expected
    }

    expect(getMmkvMock().clearAll).toHaveBeenCalledTimes(1);
  });

  it('handles empty profile list without error', async () => {
    getKeychainMock().deleteProfile.mockResolvedValue(undefined);
    getDbMock().reset.mockResolvedValue(undefined);
    getMmkvMock().clearAll.mockReturnValue(undefined);

    await expect(deleteAllData([])).resolves.toBeUndefined();
    expect(getKeychainMock().deleteProfileById).not.toHaveBeenCalled();
  });
});
