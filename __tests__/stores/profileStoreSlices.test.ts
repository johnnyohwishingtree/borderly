/**
 * Tests for profileStoreSlices: createProfileAccessSlice,
 * createFamilyManagementSlice, createLegacySlice
 */

import type { FamilyProfileCollection, ProfileMetadata } from '../../src/types/family';

// ---------------------------------------------------------------------------
// Mock dependencies — must be before import of the module under test
// ---------------------------------------------------------------------------

const mockGetProfileById = jest.fn();
const mockSetString = jest.fn();
const mockSetPreference = jest.fn();

jest.mock('@/services/storage', () => ({
  keychainService: {
    getProfileById: (...args: unknown[]) => mockGetProfileById(...args),
  },
  mmkvService: {
    setString: (...args: unknown[]) => mockSetString(...args),
    setPreference: (...args: unknown[]) => mockSetPreference(...args),
  },
}));

import {
  createProfileAccessSlice,
  createFamilyManagementSlice,
  createLegacySlice,
} from '../../src/stores/profileStoreSlices';

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function createMetadata(overrides: Partial<ProfileMetadata> = {}): ProfileMetadata {
  return {
    id: 'p1',
    relationship: 'self',
    isPrimary: false,
    isActive: true,
    biometricEnabled: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createFamilyCollection(
  entries: [string, ProfileMetadata][] = [],
  primaryId = '',
): FamilyProfileCollection {
  return {
    profiles: new Map(entries),
    primaryProfileId: primaryId,
    maxProfiles: 8,
    version: 1,
    lastModified: '2025-06-01T00:00:00.000Z',
  };
}

// ---------------------------------------------------------------------------
// createProfileAccessSlice
// ---------------------------------------------------------------------------

describe('createProfileAccessSlice', () => {
  let set: jest.Mock;
  let get: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    set = jest.fn();
    get = jest.fn();
  });

  describe('getProfile', () => {
    it('returns profile from keychainService', async () => {
      const profile = { id: 'p1', surname: 'Doe' };
      mockGetProfileById.mockResolvedValue(profile);

      const slice = createProfileAccessSlice(set, get);
      const result = await slice.getProfile('p1');

      expect(mockGetProfileById).toHaveBeenCalledWith('p1');
      expect(result).toBe(profile);
    });

    it('returns null on error', async () => {
      mockGetProfileById.mockRejectedValue(new Error('keychain fail'));

      const slice = createProfileAccessSlice(set, get);
      const result = await slice.getProfile('p1');

      expect(result).toBeNull();
    });
  });

  describe('getAllProfiles', () => {
    it('fetches all profiles from family collection', async () => {
      const meta1 = createMetadata({ id: 'p1' });
      const meta2 = createMetadata({ id: 'p2' });
      const collection = createFamilyCollection([['p1', meta1], ['p2', meta2]]);

      get.mockReturnValue({ familyProfiles: collection });
      mockGetProfileById.mockImplementation((id: string) =>
        Promise.resolve({ id, surname: `Surname_${id}` }),
      );

      const slice = createProfileAccessSlice(set, get);
      const result = await slice.getAllProfiles();

      expect(result.size).toBe(2);
      expect(result.get('p1')).toEqual({ id: 'p1', surname: 'Surname_p1' });
    });

    it('returns empty map on error', async () => {
      const collection = createFamilyCollection([['p1', createMetadata()]]);
      get.mockReturnValue({ familyProfiles: collection });
      mockGetProfileById.mockRejectedValue(new Error('fail'));

      const slice = createProfileAccessSlice(set, get);
      const result = await slice.getAllProfiles();

      expect(result.size).toBe(0);
    });
  });

  describe('getProfileMetadata', () => {
    it('returns metadata for existing profile', () => {
      const meta = createMetadata({ id: 'p1' });
      const collection = createFamilyCollection([['p1', meta]]);
      get.mockReturnValue({ familyProfiles: collection });

      const slice = createProfileAccessSlice(set, get);
      expect(slice.getProfileMetadata('p1')).toBe(meta);
    });

    it('returns null for nonexistent profile', () => {
      const collection = createFamilyCollection([]);
      get.mockReturnValue({ familyProfiles: collection });

      const slice = createProfileAccessSlice(set, get);
      expect(slice.getProfileMetadata('missing')).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// createFamilyManagementSlice
// ---------------------------------------------------------------------------

describe('createFamilyManagementSlice', () => {
  let set: jest.Mock;
  let get: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    set = jest.fn();
    get = jest.fn();
  });

  describe('setPrimaryProfile', () => {
    it('updates primary profile and persists to MMKV', async () => {
      const meta1 = createMetadata({ id: 'p1', isPrimary: true });
      const meta2 = createMetadata({ id: 'p2', isPrimary: false });
      const collection = createFamilyCollection([['p1', meta1], ['p2', meta2]], 'p1');
      get.mockReturnValue({ familyProfiles: collection });

      const slice = createFamilyManagementSlice(set, get);
      await slice.setPrimaryProfile('p2');

      expect(mockSetString).toHaveBeenCalledWith(
        'family_profiles',
        expect.any(String),
      );
      expect(set).toHaveBeenCalled();
      const setArg = set.mock.calls[0][0] as { familyProfiles: FamilyProfileCollection };
      expect(setArg.familyProfiles.primaryProfileId).toBe('p2');
    });

    it('throws when profile not found', async () => {
      const collection = createFamilyCollection([], '');
      get.mockReturnValue({ familyProfiles: collection });

      const slice = createFamilyManagementSlice(set, get);
      await expect(slice.setPrimaryProfile('missing')).rejects.toThrow('Profile not found');
    });
  });

  describe('getFamilyStats', () => {
    it('delegates to computeFamilyStats', () => {
      const meta = createMetadata({ id: 'p1', isPrimary: true, relationship: 'self' });
      const collection = createFamilyCollection([['p1', meta]], 'p1');
      get.mockReturnValue({ familyProfiles: collection });

      const slice = createFamilyManagementSlice(set, get);
      const stats = slice.getFamilyStats();

      expect(stats).not.toBeNull();
      expect(stats!.totalProfiles).toBe(1);
    });
  });

  describe('canAddProfile', () => {
    it('returns true when under max', () => {
      const collection = createFamilyCollection([['p1', createMetadata()]], 'p1');
      get.mockReturnValue({ familyProfiles: collection });

      const slice = createFamilyManagementSlice(set, get);
      expect(slice.canAddProfile()).toBe(true);
    });

    it('returns false when at max', () => {
      const entries: [string, ProfileMetadata][] = Array.from({ length: 8 }, (_, i) => [
        `p${i}`,
        createMetadata({ id: `p${i}` }),
      ]);
      const collection = createFamilyCollection(entries, 'p0');
      get.mockReturnValue({ familyProfiles: collection });

      const slice = createFamilyManagementSlice(set, get);
      expect(slice.canAddProfile()).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// createLegacySlice
// ---------------------------------------------------------------------------

describe('createLegacySlice', () => {
  let set: jest.Mock;
  let get: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    set = jest.fn();
    get = jest.fn();
  });

  describe('updateProfile', () => {
    it('throws when no current profile', async () => {
      get.mockReturnValue({ currentProfileId: null });

      const slice = createLegacySlice(set, get);
      await expect(slice.updateProfile({ surname: 'X' })).rejects.toThrow('No current profile to update');
    });

    it('delegates to updateProfileById', async () => {
      const mockUpdateById = jest.fn().mockResolvedValue(undefined);
      get.mockReturnValue({
        currentProfileId: 'p1',
        updateProfileById: mockUpdateById,
      });

      const slice = createLegacySlice(set, get);
      await slice.updateProfile({ surname: 'NewName' });

      expect(mockUpdateById).toHaveBeenCalledWith('p1', { surname: 'NewName' });
    });
  });

  describe('setOnboardingComplete', () => {
    it('persists to MMKV and updates store', () => {
      const slice = createLegacySlice(set, get);
      slice.setOnboardingComplete(true);

      expect(mockSetPreference).toHaveBeenCalledWith('onboardingComplete', true);
      expect(set).toHaveBeenCalledWith({ isOnboardingComplete: true });
    });

    it('can set to false', () => {
      const slice = createLegacySlice(set, get);
      slice.setOnboardingComplete(false);

      expect(mockSetPreference).toHaveBeenCalledWith('onboardingComplete', false);
      expect(set).toHaveBeenCalledWith({ isOnboardingComplete: false });
    });
  });

  describe('clearProfile', () => {
    it('calls deleteProfile and resets onboarding when currentProfileId exists', async () => {
      const mockDeleteProfile = jest.fn().mockResolvedValue(undefined);
      get.mockReturnValue({
        currentProfileId: 'p1',
        deleteProfile: mockDeleteProfile,
      });

      const slice = createLegacySlice(set, get);
      await slice.clearProfile();

      expect(mockDeleteProfile).toHaveBeenCalledWith('p1');
      expect(mockSetPreference).toHaveBeenCalledWith('onboardingComplete', false);
      expect(set).toHaveBeenCalledWith({ isOnboardingComplete: false });
    });

    it('still resets onboarding when no current profile', async () => {
      get.mockReturnValue({ currentProfileId: null });

      const slice = createLegacySlice(set, get);
      await slice.clearProfile();

      expect(mockSetPreference).toHaveBeenCalledWith('onboardingComplete', false);
    });
  });

  describe('loadProfile', () => {
    it('delegates to loadFamilyProfiles', async () => {
      const mockLoadFamilyProfiles = jest.fn().mockResolvedValue(undefined);
      get.mockReturnValue({ loadFamilyProfiles: mockLoadFamilyProfiles });

      const slice = createLegacySlice(set, get);
      await slice.loadProfile();

      expect(mockLoadFamilyProfiles).toHaveBeenCalled();
    });
  });
});
