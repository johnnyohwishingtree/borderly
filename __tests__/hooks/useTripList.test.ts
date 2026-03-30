import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useTripList } from '@/hooks/useTripList';
import type { Trip } from '@/types/trip';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockFocusCallbacks: Array<() => void> = [];

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (cb: () => void) => {
    mockFocusCallbacks.push(cb);
    cb();
  },
}));

const mockTrips: Trip[] = [
  {
    id: '1',
    name: 'Tokyo Trip',
    status: 'upcoming',
    legs: [{ id: 'leg1', assignedTravelers: ['t1', 't2'] }] as any[],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Paris Trip',
    status: 'active',
    legs: [],
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
];

const mockLoadTrips = jest.fn().mockResolvedValue(undefined);
const mockLoadMoreTrips = jest.fn();
const mockDeleteTrip = jest.fn().mockResolvedValue(undefined);
const mockDuplicateTrip = jest.fn().mockResolvedValue({ id: 'new-trip' });

jest.mock('@/stores/useTripStore', () => ({
  useTripStore: () => ({
    trips: mockTrips,
    isLoading: false,
    isLoadingMore: false,
    error: null,
    hasMoreTrips: false,
    loadTrips: mockLoadTrips,
    loadMoreTrips: mockLoadMoreTrips,
    deleteTrip: mockDeleteTrip,
    duplicateTrip: mockDuplicateTrip,
  }),
}));

const mockGetAllProfiles = jest.fn().mockResolvedValue(new Map([
  ['t1', { id: 't1', firstName: 'Alice', relationship: 'self' }],
  ['t2', { id: 't2', firstName: 'Bob', relationship: 'spouse' }],
]));
const mockLoadFamilyProfiles = jest.fn().mockResolvedValue(undefined);

jest.mock('@/stores/useProfileStore', () => ({
  useProfileStore: () => ({
    getAllProfiles: mockGetAllProfiles,
    loadFamilyProfiles: mockLoadFamilyProfiles,
  }),
}));

jest.mock('@/stores/useAppStore', () => ({
  useAppStore: () => ({
    lastSchemaRefreshTime: null,
    schemaRefreshCountries: [],
    schemaBannerDismissedAt: null,
    dismissSchemaBanner: jest.fn(),
    loadPersistedAppState: jest.fn(),
    hasSeenFirstRunPrompt: true,
    dismissFirstRunPrompt: jest.fn(),
  }),
}));

jest.mock('@/hooks/useTripListDeadlines', () => ({
  useTripListDeadlines: () => ({
    urgencyByTripId: {},
    schemas: {},
  }),
}));

jest.mock('@/hooks/useDeadlineSummary', () => ({
  useDeadlineSummary: () => ({
    items: [],
    hasUrgentItems: false,
    isExpanded: false,
    toggleExpanded: jest.fn(),
  }),
}));

jest.mock('@/components/ui/LoadingStates', () => ({
  useLoadingState: () => ({
    state: 'success',
    setLoading: jest.fn(),
    setLoadingError: jest.fn(),
    setLoadingSuccess: jest.fn(),
    reset: jest.fn(),
  }),
}));

jest.mock('@/components/ui/HapticFeedback', () => ({
  HapticFeedback: {
    navigation: jest.fn(),
    button: jest.fn(),
    refresh: jest.fn(),
  },
}));

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockFocusCallbacks.length = 0;
  // Restore default mock implementations after clearAllMocks
  mockLoadTrips.mockResolvedValue(undefined);
  mockDeleteTrip.mockResolvedValue(undefined);
  mockDuplicateTrip.mockResolvedValue({ id: 'new-trip' });
  mockGetAllProfiles.mockResolvedValue(new Map([
    ['t1', { id: 't1', firstName: 'Alice', relationship: 'self' }],
    ['t2', { id: 't2', firstName: 'Bob', relationship: 'spouse' }],
  ]));
  mockLoadFamilyProfiles.mockResolvedValue(undefined);
});

describe('useTripList', () => {
  it('returns trips from the store', () => {
    const { result } = renderHook(() => useTripList());
    expect(result.current.trips).toHaveLength(2);
    expect(result.current.trips[0].name).toBe('Tokyo Trip');
  });

  it('calls loadTrips on mount', () => {
    renderHook(() => useTripList());
    expect(mockLoadTrips).toHaveBeenCalledWith({ refresh: true });
  });

  it('resolves travelers per trip from family members', async () => {
    const { result } = renderHook(() => useTripList());
    await waitFor(() => {
      expect(result.current.travelers.travelersByTripId['1']).toHaveLength(2);
    });
    expect(result.current.travelers.travelersByTripId['1']![0].id).toBe('t1');
    expect(result.current.travelers.travelersByTripId['1']![1].id).toBe('t2');
  });

  it('does not show schema banner when no refresh occurred', () => {
    const { result } = renderHook(() => useTripList());
    expect(result.current.schemaBanner.showSchemaBanner).toBe(false);
  });

  describe('navigation handlers', () => {
    it('handleTripPress navigates to TripDetail', () => {
      const { result } = renderHook(() => useTripList());
      act(() => {
        result.current.navigation.handleTripPress(mockTrips[0]);
      });
      expect(mockNavigate).toHaveBeenCalledWith('TripDetail', { tripId: '1' });
    });

    it('handleCreateTrip navigates to CreateTrip', () => {
      const { result } = renderHook(() => useTripList());
      act(() => {
        result.current.navigation.handleCreateTrip();
      });
      expect(mockNavigate).toHaveBeenCalledWith('CreateTrip');
    });


    it('handleGoToForm navigates to LegForm with tripId and legId', () => {
      const { result } = renderHook(() => useTripList());
      act(() => {
        result.current.navigation.handleGoToForm('trip-1', 'leg-1');
      });
      expect(mockNavigate).toHaveBeenCalledWith('LegForm', { tripId: 'trip-1', legId: 'leg-1' });
    });
  });

  describe('duplicate trip flow', () => {
    it('opens and closes the duplicate modal', () => {
      const { result } = renderHook(() => useTripList());
      expect(result.current.duplicate.duplicateTargetId).toBeNull();

      act(() => {
        result.current.duplicate.handleOpenDuplicateModal(mockTrips[0]);
      });
      expect(result.current.duplicate.duplicateTargetId).toBe('1');

      act(() => {
        result.current.duplicate.handleCloseDuplicateModal();
      });
      expect(result.current.duplicate.duplicateTargetId).toBeNull();
    });

    it('handleConfirmDuplicate calls duplicateTrip and navigates', async () => {
      const { result } = renderHook(() => useTripList());
      act(() => {
        result.current.duplicate.handleOpenDuplicateModal(mockTrips[0]);
      });
      expect(result.current.duplicate.duplicateTargetId).toBe('1');

      // Fire and forget — the async callback will update state
      act(() => {
        void result.current.duplicate.handleConfirmDuplicate('2026-06-01');
      });

      await waitFor(() => {
        expect(mockDuplicateTrip).toHaveBeenCalledWith('1', '2026-06-01');
      });
      expect(mockNavigate).toHaveBeenCalledWith('TripDetail', { tripId: 'new-trip' });
    });

    it('handleConfirmDuplicate sets error on failure', async () => {
      const { result } = renderHook(() => useTripList());
      act(() => {
        result.current.duplicate.handleOpenDuplicateModal(mockTrips[0]);
      });
      expect(result.current.duplicate.duplicateTargetId).toBe('1');

      mockDuplicateTrip.mockRejectedValueOnce(new Error('fail'));
      act(() => {
        void result.current.duplicate.handleConfirmDuplicate('2026-06-01');
      });

      await waitFor(() => {
        expect(result.current.duplicate.duplicateError).toBe('Failed to duplicate trip. Please try again.');
      });
    });
  });

  describe('delete trip', () => {
    it('handleDeleteTrip shows an Alert', () => {
      const { Alert } = require('react-native');
      const { result } = renderHook(() => useTripList());
      act(() => {
        result.current.navigation.handleDeleteTrip(mockTrips[0]);
      });
      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Trip',
        expect.stringContaining('Tokyo Trip'),
        expect.any(Array),
      );
    });
  });
});
