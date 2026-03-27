import { renderHook, act } from '@testing-library/react-native';
import { useTripFilter } from '@/hooks/useTripFilter';
import type { Trip } from '@/types/trip';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockAddListener = jest.fn((_event: string, _callback: () => void) => jest.fn());

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    addListener: mockAddListener,
  }),
}));

// ── Test data ─────────────────────────────────────────────────────────────────

function makeTrip(overrides: Partial<Trip> & { name: string; status: Trip['status'] }): Trip {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    name: overrides.name,
    status: overrides.status,
    legs: overrides.legs ?? [],
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00Z',
  };
}

const TRIPS: Trip[] = [
  makeTrip({ id: '1', name: 'Tokyo Adventure', status: 'upcoming' }),
  makeTrip({ id: '2', name: 'Paris Weekend', status: 'active' }),
  makeTrip({ id: '3', name: 'Bangkok Trip', status: 'completed' }),
  makeTrip({ id: '4', name: 'Tokyo Business', status: 'active' }),
  makeTrip({ id: '5', name: 'Singapore Family', status: 'upcoming' }),
];

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers();
  mockAddListener.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useTripFilter', () => {
  describe('initial state', () => {
    it('returns all trips with no filters', () => {
      const { result } = renderHook(() => useTripFilter(TRIPS));
      expect(result.current.filteredTrips).toHaveLength(5);
      expect(result.current.searchQuery).toBe('');
      expect(result.current.statusFilter).toBe('all');
      expect(result.current.hasActiveFilters).toBe(false);
      expect(result.current.resultCount).toBe(5);
    });
  });

  describe('status filtering', () => {
    it('filters by upcoming status', () => {
      const { result } = renderHook(() => useTripFilter(TRIPS));

      act(() => {
        result.current.setStatusFilter('upcoming');
      });

      expect(result.current.filteredTrips).toHaveLength(2);
      expect(result.current.filteredTrips.every(t => t.status === 'upcoming')).toBe(true);
      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('filters by active status', () => {
      const { result } = renderHook(() => useTripFilter(TRIPS));

      act(() => {
        result.current.setStatusFilter('active');
      });

      expect(result.current.filteredTrips).toHaveLength(2);
      expect(result.current.filteredTrips.every(t => t.status === 'active')).toBe(true);
    });

    it('filters by completed status', () => {
      const { result } = renderHook(() => useTripFilter(TRIPS));

      act(() => {
        result.current.setStatusFilter('completed');
      });

      expect(result.current.filteredTrips).toHaveLength(1);
      expect(result.current.filteredTrips[0].name).toBe('Bangkok Trip');
    });

    it('shows all trips when set back to all', () => {
      const { result } = renderHook(() => useTripFilter(TRIPS));

      act(() => {
        result.current.setStatusFilter('active');
      });
      expect(result.current.filteredTrips).toHaveLength(2);

      act(() => {
        result.current.setStatusFilter('all');
      });
      expect(result.current.filteredTrips).toHaveLength(5);
      expect(result.current.hasActiveFilters).toBe(false);
    });
  });

  describe('search filtering', () => {
    it('filters by trip name (case-insensitive) after debounce', () => {
      const { result } = renderHook(() => useTripFilter(TRIPS));

      act(() => { result.current.setSearchQuery('tokyo'); });

      // Before debounce — still shows all
      expect(result.current.filteredTrips).toHaveLength(5);

      // After debounce
      act(() => { jest.advanceTimersByTime(300); });

      expect(result.current.filteredTrips).toHaveLength(2);
      expect(result.current.filteredTrips.map(t => t.name)).toEqual(
        expect.arrayContaining(['Tokyo Adventure', 'Tokyo Business']),
      );
      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('matches partial substrings', () => {
      const { result } = renderHook(() => useTripFilter(TRIPS));

      act(() => { result.current.setSearchQuery('fam'); });
      act(() => { jest.advanceTimersByTime(300); });

      expect(result.current.filteredTrips).toHaveLength(1);
      expect(result.current.filteredTrips[0].name).toBe('Singapore Family');
    });

    it('returns empty array when no matches', () => {
      const { result } = renderHook(() => useTripFilter(TRIPS));

      act(() => { result.current.setSearchQuery('xyz'); });
      act(() => { jest.advanceTimersByTime(300); });

      expect(result.current.filteredTrips).toHaveLength(0);
      expect(result.current.resultCount).toBe(0);
    });

    it('clearSearch resets search query', () => {
      const { result } = renderHook(() => useTripFilter(TRIPS));

      act(() => { result.current.setSearchQuery('tokyo'); });
      act(() => { jest.advanceTimersByTime(300); });
      expect(result.current.filteredTrips).toHaveLength(2);

      act(() => { result.current.clearSearch(); });
      expect(result.current.searchQuery).toBe('');
      expect(result.current.filteredTrips).toHaveLength(5);
    });

    it('trims whitespace from search query', () => {
      const { result } = renderHook(() => useTripFilter(TRIPS));

      act(() => { result.current.setSearchQuery('  tokyo  '); });
      act(() => { jest.advanceTimersByTime(300); });

      expect(result.current.filteredTrips).toHaveLength(2);
    });
  });

  describe('composed filters (search + status)', () => {
    it('applies both search and status filters', () => {
      const { result } = renderHook(() => useTripFilter(TRIPS));

      act(() => { result.current.setStatusFilter('active'); });
      act(() => { result.current.setSearchQuery('tokyo'); });
      act(() => { jest.advanceTimersByTime(300); });

      expect(result.current.filteredTrips).toHaveLength(1);
      expect(result.current.filteredTrips[0].name).toBe('Tokyo Business');
    });

    it('returns empty when filters compose to no results', () => {
      const { result } = renderHook(() => useTripFilter(TRIPS));

      act(() => { result.current.setStatusFilter('completed'); });
      act(() => { result.current.setSearchQuery('tokyo'); });
      act(() => { jest.advanceTimersByTime(300); });

      expect(result.current.filteredTrips).toHaveLength(0);
    });
  });

  describe('screen focus reset', () => {
    it('registers a focus listener on navigation', () => {
      renderHook(() => useTripFilter(TRIPS));
      expect(mockAddListener).toHaveBeenCalledWith('focus', expect.any(Function));
    });

    it('resets filters when focus listener fires', () => {
      const { result } = renderHook(() => useTripFilter(TRIPS));

      // Apply filters
      act(() => { result.current.setStatusFilter('active'); });
      act(() => { result.current.setSearchQuery('tokyo'); });
      act(() => { jest.advanceTimersByTime(300); });
      expect(result.current.filteredTrips).toHaveLength(1);

      // Simulate focus event
      const focusCallback = mockAddListener.mock.calls[0]?.[1] as (() => void) | undefined;
      expect(typeof focusCallback).toBe('function');
      act(() => { focusCallback!(); });
      act(() => { jest.advanceTimersByTime(300); });

      expect(result.current.searchQuery).toBe('');
      expect(result.current.statusFilter).toBe('all');
      expect(result.current.filteredTrips).toHaveLength(5);
    });
  });

  describe('empty trips array', () => {
    it('handles empty trips gracefully', () => {
      const { result } = renderHook(() => useTripFilter([]));
      expect(result.current.filteredTrips).toHaveLength(0);
      expect(result.current.resultCount).toBe(0);
    });
  });
});
