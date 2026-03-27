/**
 * Unit tests for useProfileScreen hook.
 *
 * Tests pure utility functions directly and hook behavior via renderHook.
 * Mocks stores at module level with stable references per test conventions.
 */
import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import {
  useProfileScreen,
  formatDate,
  isPassportExpiringSoon,
  maskPassportNumber,
} from '@/hooks/useProfileScreen';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockLoadProfile = jest.fn();
let mockProfile: Record<string, unknown> | null = null;
let mockFamilyProfiles = { profiles: new Map(), primaryProfileId: '', maxProfiles: 8, version: 1, lastModified: '' };
let mockIsLoading = false;
let mockError: string | null = null;

const mockGetState = jest.fn(() => ({
  loadProfile: mockLoadProfile,
  profile: mockProfile,
}));

jest.mock('../../src/stores/useProfileStore', () => ({
  useProfileStore: Object.assign(
    () => ({
      profile: mockProfile,
      familyProfiles: mockFamilyProfiles,
      loadProfile: mockLoadProfile,
      isLoading: mockIsLoading,
      error: mockError,
    }),
    { getState: () => mockGetState() }
  ),
}));

let mockBiometricEnabled = false;
const mockPreferences = { get biometricEnabled() { return mockBiometricEnabled; } };

jest.mock('../../src/stores/useAppStore', () => ({
  useAppStore: () => ({ preferences: mockPreferences }),
}));

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeProfile(overrides?: Record<string, unknown>) {
  return {
    id: 'test-1',
    passportNumber: 'AB1234567',
    surname: 'Smith',
    givenNames: 'Alice',
    nationality: 'USA',
    dateOfBirth: '1985-03-15',
    gender: 'F',
    passportExpiry: '2030-03-15',
    issuingCountry: 'USA',
    email: 'alice@example.com',
    phoneNumber: '+1 555-0100',
    occupation: 'Engineer',
    homeAddress: {
      line1: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      postalCode: '62701',
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
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockProfile = makeProfile();
  mockIsLoading = false;
  mockError = null;
  mockBiometricEnabled = false;
  mockFamilyProfiles = { profiles: new Map(), primaryProfileId: '', maxProfiles: 8, version: 1, lastModified: '' };
});

// ── formatDate ────────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('formats an ISO date to en-US long format', () => {
    const result = formatDate('2026-01-15');
    expect(result).toBe('January 15, 2026');
  });

  it('formats a date with time component', () => {
    const result = formatDate('2026-07-04T12:00:00Z');
    expect(result).toContain('2026');
    expect(result).toContain('July');
  });
});

// ── isPassportExpiringSoon ────────────────────────────────────────────────────

describe('isPassportExpiringSoon', () => {
  it('returns true when passport expires within 6 months', () => {
    const now = new Date();
    const threeMonths = new Date(now);
    threeMonths.setMonth(now.getMonth() + 3);
    expect(isPassportExpiringSoon(threeMonths.toISOString())).toBe(true);
  });

  it('returns false when passport expires in more than 6 months', () => {
    const now = new Date();
    const nineMonths = new Date(now);
    nineMonths.setMonth(now.getMonth() + 9);
    expect(isPassportExpiringSoon(nineMonths.toISOString())).toBe(false);
  });

  it('returns true when passport is already expired', () => {
    expect(isPassportExpiringSoon('2020-01-01')).toBe(true);
  });

  it('returns true when passport expires exactly at the 6 month boundary', () => {
    const now = new Date();
    const exactlySixMonths = new Date(now);
    exactlySixMonths.setMonth(now.getMonth() + 6);
    expect(isPassportExpiringSoon(exactlySixMonths.toISOString())).toBe(true);
  });
});

// ── maskPassportNumber ────────────────────────────────────────────────────────

describe('maskPassportNumber', () => {
  it('masks all but last 4 characters', () => {
    expect(maskPassportNumber('AB1234567')).toBe('*****4567');
  });

  it('returns short passport numbers unchanged', () => {
    expect(maskPassportNumber('AB12')).toBe('AB12');
  });

  it('returns single character unchanged', () => {
    expect(maskPassportNumber('A')).toBe('A');
  });

  it('returns empty string unchanged', () => {
    expect(maskPassportNumber('')).toBe('');
  });

  it('masks a 5-character passport correctly', () => {
    expect(maskPassportNumber('ABCDE')).toBe('*BCDE');
  });
});

// ── useProfileScreen hook ─────────────────────────────────────────────────────

describe('useProfileScreen', () => {
  it('calls loadProfile on mount', () => {
    renderHook(() => useProfileScreen());
    expect(mockLoadProfile).toHaveBeenCalledWith();
  });

  it('returns profile data from store', () => {
    const { result } = renderHook(() => useProfileScreen());
    expect(result.current.data.profile).toEqual(mockProfile);
    expect(result.current.state.isLoading).toBe(false);
    expect(result.current.state.error).toBeNull();
  });

  describe('completeness', () => {
    it('returns 100% for a complete profile', () => {
      const { result } = renderHook(() => useProfileScreen());
      expect(result.current.data.completeness.percentage).toBe(100);
      expect(result.current.data.completeness.missing).toEqual([]);
    });

    it('returns 0% when profile is null', () => {
      mockProfile = null;
      const { result } = renderHook(() => useProfileScreen());
      expect(result.current.data.completeness.percentage).toBe(0);
    });

    it('reports missing fields for incomplete profile', () => {
      mockProfile = makeProfile({ email: undefined, phoneNumber: undefined });
      const { result } = renderHook(() => useProfileScreen());
      expect(result.current.data.completeness.percentage).toBe(50);
      expect(result.current.data.completeness.missing).toContain('Email');
      expect(result.current.data.completeness.missing).toContain('Phone Number');
    });

    it('detects incomplete home address', () => {
      mockProfile = makeProfile({ homeAddress: { line1: '', city: '', country: '' } });
      const { result } = renderHook(() => useProfileScreen());
      expect(result.current.data.completeness.missing).toContain('Home Address');
      expect(result.current.data.completeness.percentage).toBe(75);
    });

    it('detects missing home address', () => {
      mockProfile = makeProfile({ homeAddress: undefined });
      const { result } = renderHook(() => useProfileScreen());
      expect(result.current.data.completeness.missing).toContain('Home Address');
    });
  });

  describe('handleUnlockProfile', () => {
    it('sets isUnlocked immediately when biometric is disabled', async () => {
      mockBiometricEnabled = false;
      const { result } = renderHook(() => useProfileScreen());

      expect(result.current.state.isUnlocked).toBe(false);

      await act(async () => {
        await result.current.actions.handleUnlockProfile();
      });

      expect(result.current.state.isUnlocked).toBe(true);
      expect(result.current.data.secureProfile).toEqual(mockProfile);
    });

    it('loads fresh profile via getState when biometric is enabled', async () => {
      mockBiometricEnabled = true;
      const freshProfile = makeProfile({ passportNumber: 'FRESH123' });
      mockGetState.mockReturnValue({
        loadProfile: mockLoadProfile.mockResolvedValue(undefined),
        profile: freshProfile,
      });

      const { result } = renderHook(() => useProfileScreen());

      await act(async () => {
        await result.current.actions.handleUnlockProfile();
      });

      expect(result.current.state.isUnlocked).toBe(true);
      expect(result.current.data.secureProfile).toEqual(freshProfile);
    });

    it('shows alert when biometric authentication fails', async () => {
      mockBiometricEnabled = true;
      mockGetState.mockReturnValue({
        loadProfile: jest.fn().mockRejectedValue(new Error('Auth failed')),
        profile: null,
      });

      const { result } = renderHook(() => useProfileScreen());

      await act(async () => {
        await result.current.actions.handleUnlockProfile();
      });

      expect(result.current.state.isUnlocked).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Authentication Failed',
        'Could not authenticate. Please try again.',
        [{ text: 'OK' }]
      );
    });
  });
});
