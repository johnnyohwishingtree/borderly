/**
 * Unit tests for usePortalProfiles hook.
 *
 * Tests profile loading, selection, fallback behavior, and effective profile
 * resolution via renderHook. Store dependencies are fully mocked.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { usePortalProfiles } from '../../src/hooks/usePortalProfiles';
import type { TravelerProfile } from '../../src/types/profile';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetAllProfiles = jest.fn();

const mockStoreState = {
  profile: null as TravelerProfile | null,
  getAllProfiles: mockGetAllProfiles,
  familyProfiles: {
    primaryProfileId: '',
    profiles: new Map<string, { relationship: string }>(),
  },
};

jest.mock('../../src/stores/useProfileStore', () => ({
  useProfileStore: () => mockStoreState,
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeProfile = (overrides: Partial<TravelerProfile> = {}): TravelerProfile => ({
  id: 'profile_1',
  passportNumber: 'AB1234567',
  surname: 'Smith',
  givenNames: 'Alice',
  nationality: 'USA',
  dateOfBirth: '1990-01-15',
  gender: 'F',
  passportExpiry: '2030-06-01',
  issuingCountry: 'USA',
  defaultDeclarations: {
    hasItemsToDeclare: false,
    carryingCurrency: false,
    carryingProhibitedItems: false,
    visitedFarm: false,
    hasCriminalRecord: false,
    carryingCommercialGoods: false,
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const profileAlice = makeProfile({ id: 'alice_1', givenNames: 'Alice', surname: 'Smith' });
const profileBob = makeProfile({ id: 'bob_2', givenNames: 'Bob', surname: 'Smith' });

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockStoreState.profile = null;
  mockStoreState.familyProfiles = {
    primaryProfileId: '',
    profiles: new Map(),
  };
  mockGetAllProfiles.mockResolvedValue(new Map());
});

// ── Profile loading ───────────────────────────────────────────────────────────

describe('usePortalProfiles — loading profiles on mount', () => {
  it('loads all profiles via getAllProfiles on mount', async () => {
    const allProfiles = new Map([['alice_1', profileAlice]]);
    mockGetAllProfiles.mockResolvedValue(allProfiles);
    mockStoreState.familyProfiles = {
      primaryProfileId: 'alice_1',
      profiles: new Map([['alice_1', { relationship: 'self' }]]),
    };

    const { result } = renderHook(() => usePortalProfiles());
    await waitFor(() => {
      expect(result.current.availableProfiles).toHaveLength(1);
    });

    expect(mockGetAllProfiles).toHaveBeenCalledTimes(1);
  });
});

// ── Building available profiles ───────────────────────────────────────────────

describe('usePortalProfiles — availableProfiles list', () => {
  it('builds ProfileOption list with correct name and relationship from metadata', async () => {
    const allProfiles = new Map([
      ['alice_1', profileAlice],
      ['bob_2', profileBob],
    ]);
    mockGetAllProfiles.mockResolvedValue(allProfiles);
    mockStoreState.familyProfiles = {
      primaryProfileId: 'alice_1',
      profiles: new Map([
        ['alice_1', { relationship: 'self' }],
        ['bob_2', { relationship: 'spouse' }],
      ]),
    };

    const { result } = renderHook(() => usePortalProfiles());
    await waitFor(() => {
      expect(result.current.availableProfiles).toHaveLength(2);
    });

    expect(result.current.availableProfiles).toEqual([
      { id: 'alice_1', name: 'Alice Smith', relationship: 'self' },
      { id: 'bob_2', name: 'Bob Smith', relationship: 'spouse' },
    ]);
  });

  it('falls back to "other" when metadata has no relationship', async () => {
    const allProfiles = new Map([['alice_1', profileAlice]]);
    mockGetAllProfiles.mockResolvedValue(allProfiles);
    mockStoreState.familyProfiles = {
      primaryProfileId: 'alice_1',
      profiles: new Map(), // no metadata for alice_1
    };

    const { result } = renderHook(() => usePortalProfiles());
    await waitFor(() => {
      expect(result.current.availableProfiles).toHaveLength(1);
    });

    expect(result.current.availableProfiles[0].relationship).toBe('other');
  });
});

// ── Default selection ─────────────────────────────────────────────────────────

describe('usePortalProfiles — default selected profile', () => {
  it('defaults to primary profile ID when available', async () => {
    const allProfiles = new Map([
      ['alice_1', profileAlice],
      ['bob_2', profileBob],
    ]);
    mockGetAllProfiles.mockResolvedValue(allProfiles);
    mockStoreState.familyProfiles = {
      primaryProfileId: 'alice_1',
      profiles: new Map([
        ['alice_1', { relationship: 'self' }],
        ['bob_2', { relationship: 'spouse' }],
      ]),
    };

    const { result } = renderHook(() => usePortalProfiles());
    await waitFor(() => {
      expect(result.current.selectedProfileId).toBe('alice_1');
    });
  });

  it('falls back to first profile when primary ID not in loaded profiles', async () => {
    const allProfiles = new Map([['bob_2', profileBob]]);
    mockGetAllProfiles.mockResolvedValue(allProfiles);
    mockStoreState.familyProfiles = {
      primaryProfileId: 'nonexistent_id',
      profiles: new Map([['bob_2', { relationship: 'spouse' }]]),
    };

    const { result } = renderHook(() => usePortalProfiles());
    await waitFor(() => {
      expect(result.current.selectedProfileId).toBe('bob_2');
    });
  });
});

// ── handleProfileChange ───────────────────────────────────────────────────────

describe('usePortalProfiles — handleProfileChange', () => {
  it('updates selectedProfileId and lastUsedProfileRef', async () => {
    const allProfiles = new Map([
      ['alice_1', profileAlice],
      ['bob_2', profileBob],
    ]);
    mockGetAllProfiles.mockResolvedValue(allProfiles);
    mockStoreState.familyProfiles = {
      primaryProfileId: 'alice_1',
      profiles: new Map([
        ['alice_1', { relationship: 'self' }],
        ['bob_2', { relationship: 'spouse' }],
      ]),
    };

    const { result } = renderHook(() => usePortalProfiles());
    await waitFor(() => {
      expect(result.current.selectedProfileId).toBe('alice_1');
    });

    act(() => {
      result.current.handleProfileChange('bob_2');
    });

    expect(result.current.selectedProfileId).toBe('bob_2');
    expect(result.current.lastUsedProfileRef.current).toBe('bob_2');
  });
});

// ── effectiveProfile ──────────────────────────────────────────────────────────

describe('usePortalProfiles — effectiveProfile', () => {
  it('returns the correct TravelerProfile for the selected ID', async () => {
    const allProfiles = new Map([
      ['alice_1', profileAlice],
      ['bob_2', profileBob],
    ]);
    mockGetAllProfiles.mockResolvedValue(allProfiles);
    mockStoreState.familyProfiles = {
      primaryProfileId: 'alice_1',
      profiles: new Map([
        ['alice_1', { relationship: 'self' }],
        ['bob_2', { relationship: 'spouse' }],
      ]),
    };

    const { result } = renderHook(() => usePortalProfiles());
    await waitFor(() => {
      expect(result.current.effectiveProfile).not.toBeNull();
    });

    expect(result.current.effectiveProfile).toBe(profileAlice);

    act(() => {
      result.current.handleProfileChange('bob_2');
    });

    expect(result.current.effectiveProfile).toBe(profileBob);
  });

  it('falls back to store profile when selectedProfileId is not in loaded profiles', async () => {
    const storeProfile = makeProfile({ id: 'store_profile', givenNames: 'Store', surname: 'User' });
    mockStoreState.profile = storeProfile;
    mockGetAllProfiles.mockResolvedValue(new Map());

    const { result } = renderHook(() => usePortalProfiles());
    await act(async () => {});

    expect(result.current.effectiveProfile).toBe(storeProfile);
  });
});

// ── Error fallback ────────────────────────────────────────────────────────────

describe('usePortalProfiles — error fallback', () => {
  it('falls back to single profile on getAllProfiles error', async () => {
    const singleProfile = makeProfile({ id: 'fallback_1', givenNames: 'Fallback', surname: 'User' });
    mockStoreState.profile = singleProfile;
    mockGetAllProfiles.mockRejectedValue(new Error('Storage error'));

    const { result } = renderHook(() => usePortalProfiles());
    await waitFor(() => {
      expect(result.current.availableProfiles).toHaveLength(1);
    });

    expect(result.current.availableProfiles[0]).toEqual({
      id: 'fallback_1',
      name: 'Fallback User',
      relationship: 'self',
    });
    expect(result.current.selectedProfileId).toBe('fallback_1');
    expect(result.current.effectiveProfile).toBe(singleProfile);
  });

  it('returns empty state when getAllProfiles errors and no store profile exists', async () => {
    mockStoreState.profile = null;
    mockGetAllProfiles.mockRejectedValue(new Error('Storage error'));

    const { result } = renderHook(() => usePortalProfiles());
    await act(async () => {});

    expect(result.current.availableProfiles).toEqual([]);
    expect(result.current.selectedProfileId).toBe('');
    expect(result.current.effectiveProfile).toBeNull();
  });
});
