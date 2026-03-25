/**
 * Unit tests for useTripDetail hook.
 *
 * Tests business logic via renderHook — no full React Native component rendering
 * needed. Each section verifies one concern: trip derivation, progress computation,
 * submission progress, duplicate flow, mark-as-submitted, and status helpers.
 */
import { renderHook, act } from '@testing-library/react-native';
import { useTripDetail } from '@/hooks/useTripDetail';
import type { Trip, TripLeg } from '@/types/trip';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockDeleteTrip = jest.fn().mockResolvedValue(undefined);
const mockUpdateLegSubmissionStatus = jest.fn().mockResolvedValue(undefined);
const mockDuplicateTrip = jest.fn().mockResolvedValue({ id: 'trip_dup_1', name: 'Duplicated Trip' });

let mockTrips: Trip[] = [];

jest.mock('../../src/stores/useTripStore', () => ({
  useTripStore: (selector?: (state: { trips: Trip[] }) => unknown) => {
    const state = {
      trips: mockTrips,
      deleteTrip: mockDeleteTrip,
      updateLegSubmissionStatus: mockUpdateLegSubmissionStatus,
      duplicateTrip: mockDuplicateTrip,
    };
    if (typeof selector === 'function') return selector(state);
    return state;
  },
}));

const mockGetAllProfiles = jest.fn().mockResolvedValue(new Map());
const mockLoadFamilyProfiles = jest.fn().mockResolvedValue(undefined);

jest.mock('../../src/stores/useProfileStore', () => ({
  useProfileStore: () => ({
    getAllProfiles: mockGetAllProfiles,
    loadFamilyProfiles: mockLoadFamilyProfiles,
    currentProfileId: 'profile_primary',
  }),
}));

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
    useFocusEffect: (cb: () => void) => { useEffect(() => { cb(); }, [cb]); },
  };
});

// Mock delegated hooks
const mockEditHookReturn = {
  editName: 'Asia Summer 2026',
  setEditName: jest.fn(),
  handleUpdateTripName: jest.fn(),
  errors: {},
};
jest.mock('../../src/hooks/useEditTrip', () => ({
  useEditTrip: () => mockEditHookReturn,
}));

jest.mock('../../src/hooks/useTripReadiness', () => ({
  useTripReadiness: () => ({ tripReadiness: null, isLoading: false }),
}));

// Mock schemas + deadline service
jest.mock('../../src/schemas', () => ({
  getSchemaByCountryCode: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../src/services/deadline/deadlineService', () => ({
  computeTripDeadlines: jest.fn().mockReturnValue([]),
}));

jest.mock('../../src/services/trips/tripTemplateService', () => ({
  tripTemplateService: {
    saveFromTrip: jest.fn(),
  },
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeLeg = (overrides: Partial<TripLeg> = {}): TripLeg => ({
  id: 'leg_1',
  tripId: 'trip_1',
  destinationCountry: 'JPN',
  arrivalDate: '2026-04-01',
  departureDate: '2026-04-10',
  flightNumber: 'NH123',
  airlineCode: 'NH',
  arrivalAirport: 'NRT',
  accommodation: {
    name: 'Park Hyatt Tokyo',
    address: { line1: '3-7-1-2 Nishi-Shinjuku', line2: '', city: 'Tokyo', state: '', postalCode: '163-1055', country: 'JPN' },
    phone: '+81-3-5322-1234',
  },
  formStatus: 'not_started',
  submissionStatus: 'not_started',
  order: 0,
  assignedTravelers: ['profile_primary'],
  travelerFormsData: [],
  ...overrides,
});

const makeTrip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 'trip_1',
  name: 'Asia Summer 2026',
  status: 'upcoming',
  legs: [makeLeg()],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockTrips = [makeTrip()];
});

// ── Trip derivation ───────────────────────────────────────────────────────────

describe('useTripDetail — trip derivation', () => {
  it('returns null trip when tripId does not match any trip', () => {
    const { result } = renderHook(() => useTripDetail({ tripId: 'nonexistent' }));
    expect(result.current.trip).toBeNull();
  });

  it('returns the matching trip when tripId exists', () => {
    const { result } = renderHook(() => useTripDetail({ tripId: 'trip_1' }));
    expect(result.current.trip).not.toBeNull();
    expect(result.current.trip?.id).toBe('trip_1');
    expect(result.current.trip?.name).toBe('Asia Summer 2026');
  });
});

// ── Progress computation ──────────────────────────────────────────────────────

describe('useTripDetail — progress', () => {
  it('computes 0% progress when all legs are not_started', () => {
    mockTrips = [makeTrip({
      legs: [
        makeLeg({ id: 'leg_1', formStatus: 'not_started' }),
        makeLeg({ id: 'leg_2', formStatus: 'not_started' }),
      ],
    })];

    const { result } = renderHook(() => useTripDetail({ tripId: 'trip_1' }));

    expect(result.current.progress.completed).toBe(0);
    expect(result.current.progress.total).toBe(2);
    expect(result.current.progress.percentage).toBe(0);
  });

  it('computes 50% progress when 1 of 2 legs is ready', () => {
    mockTrips = [makeTrip({
      legs: [
        makeLeg({ id: 'leg_1', formStatus: 'ready' }),
        makeLeg({ id: 'leg_2', formStatus: 'not_started' }),
      ],
    })];

    const { result } = renderHook(() => useTripDetail({ tripId: 'trip_1' }));

    expect(result.current.progress.completed).toBe(1);
    expect(result.current.progress.total).toBe(2);
    expect(result.current.progress.percentage).toBe(50);
  });

  it('computes 100% progress when all legs are submitted', () => {
    mockTrips = [makeTrip({
      legs: [
        makeLeg({ id: 'leg_1', formStatus: 'submitted' }),
        makeLeg({ id: 'leg_2', formStatus: 'submitted' }),
      ],
    })];

    const { result } = renderHook(() => useTripDetail({ tripId: 'trip_1' }));

    expect(result.current.progress.completed).toBe(2);
    expect(result.current.progress.total).toBe(2);
    expect(result.current.progress.percentage).toBe(100);
  });

  it('counts both ready and submitted legs as completed', () => {
    mockTrips = [makeTrip({
      legs: [
        makeLeg({ id: 'leg_1', formStatus: 'ready' }),
        makeLeg({ id: 'leg_2', formStatus: 'submitted' }),
        makeLeg({ id: 'leg_3', formStatus: 'in_progress' }),
      ],
    })];

    const { result } = renderHook(() => useTripDetail({ tripId: 'trip_1' }));

    expect(result.current.progress.completed).toBe(2);
    expect(result.current.progress.total).toBe(3);
    expect(result.current.progress.percentage).toBeCloseTo(66.67, 1);
  });

  it('returns zero progress when trip has no legs', () => {
    mockTrips = [makeTrip({ legs: [] })];

    const { result } = renderHook(() => useTripDetail({ tripId: 'trip_1' }));

    expect(result.current.progress).toEqual({ completed: 0, total: 0, percentage: 0, readyCount: 0 });
  });
});

// ── Submission progress ───────────────────────────────────────────────────────

describe('useTripDetail — submissionProgress', () => {
  it('computes correct submission counts when some legs are submitted', () => {
    mockTrips = [makeTrip({
      legs: [
        makeLeg({ id: 'leg_1', submissionStatus: 'submitted' }),
        makeLeg({ id: 'leg_2', submissionStatus: 'not_started' }),
        makeLeg({ id: 'leg_3', submissionStatus: 'submitted' }),
      ],
    })];

    const { result } = renderHook(() => useTripDetail({ tripId: 'trip_1' }));

    expect(result.current.submissionProgress.submitted).toBe(2);
    expect(result.current.submissionProgress.total).toBe(3);
  });

  it('returns 0 submitted when no legs are submitted', () => {
    mockTrips = [makeTrip({
      legs: [
        makeLeg({ id: 'leg_1', submissionStatus: 'not_started' }),
        makeLeg({ id: 'leg_2', submissionStatus: 'in_progress' }),
      ],
    })];

    const { result } = renderHook(() => useTripDetail({ tripId: 'trip_1' }));

    expect(result.current.submissionProgress.submitted).toBe(0);
    expect(result.current.submissionProgress.total).toBe(2);
  });

  it('returns zero totals when trip has no legs', () => {
    mockTrips = [makeTrip({ legs: [] })];

    const { result } = renderHook(() => useTripDetail({ tripId: 'trip_1' }));

    expect(result.current.submissionProgress).toEqual({ submitted: 0, total: 0 });
  });
});

// ── handleMarkAsSubmitted ─────────────────────────────────────────────────────

describe('useTripDetail — handleMarkAsSubmitted', () => {
  it('calls updateLegSubmissionStatus with the correct legId and status', async () => {
    const { result } = renderHook(() => useTripDetail({ tripId: 'trip_1' }));

    await act(async () => {
      await result.current.handleMarkAsSubmitted('leg_1');
    });

    expect(mockUpdateLegSubmissionStatus).toHaveBeenCalledWith('leg_1', 'submitted');
    expect(mockUpdateLegSubmissionStatus).toHaveBeenCalledTimes(1);
  });
});

// ── handleConfirmDuplicate ────────────────────────────────────────────────────

describe('useTripDetail — handleConfirmDuplicate', () => {
  it('sets isDuplicating, calls duplicateTrip, and resets on success', async () => {
    const { result } = renderHook(() => useTripDetail({ tripId: 'trip_1' }));

    expect(result.current.isDuplicating).toBe(false);

    let newTrip: unknown;
    await act(async () => {
      newTrip = await result.current.handleConfirmDuplicate('2026-06-01');
    });

    expect(mockDuplicateTrip).toHaveBeenCalledWith('trip_1', '2026-06-01');
    expect(newTrip).toEqual({ id: 'trip_dup_1', name: 'Duplicated Trip' });
    expect(result.current.isDuplicating).toBe(false);
    expect(result.current.duplicateError).toBeNull();
  });

  it('sets duplicateError on failure and resets isDuplicating', async () => {
    mockDuplicateTrip.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useTripDetail({ tripId: 'trip_1' }));

    let newTrip: unknown;
    await act(async () => {
      newTrip = await result.current.handleConfirmDuplicate('2026-06-01');
    });

    expect(newTrip).toBeNull();
    expect(result.current.duplicateError).toBe('Failed to duplicate trip. Please try again.');
    expect(result.current.isDuplicating).toBe(false);
  });

  it('resetDuplicateError clears the error', async () => {
    mockDuplicateTrip.mockRejectedValueOnce(new Error('fail'));

    const { result } = renderHook(() => useTripDetail({ tripId: 'trip_1' }));

    await act(async () => {
      await result.current.handleConfirmDuplicate('2026-06-01');
    });

    expect(result.current.duplicateError).not.toBeNull();

    act(() => {
      result.current.resetDuplicateError();
    });

    expect(result.current.duplicateError).toBeNull();
  });
});

// ── getStatusColor and getStatusText ──────────────────────────────────────────

describe('useTripDetail — status helpers', () => {
  it('getStatusColor returns correct color for each status', () => {
    const { result } = renderHook(() => useTripDetail({ tripId: 'trip_1' }));

    expect(result.current.getStatusColor('upcoming')).toBe('info');
    expect(result.current.getStatusColor('active')).toBe('success');
    expect(result.current.getStatusColor('completed')).toBe('neutral');
  });

  it('getStatusColor returns neutral for unknown status', () => {
    const { result } = renderHook(() => useTripDetail({ tripId: 'trip_1' }));

    // Cast to simulate an unexpected value
    expect(result.current.getStatusColor('archived' as Trip['status'])).toBe('neutral');
  });

  it('getStatusText returns correct text for each status', () => {
    const { result } = renderHook(() => useTripDetail({ tripId: 'trip_1' }));

    expect(result.current.getStatusText('upcoming')).toBe('Upcoming');
    expect(result.current.getStatusText('active')).toBe('Active');
    expect(result.current.getStatusText('completed')).toBe('Completed');
  });

  it('getStatusText returns Unknown for unexpected status', () => {
    const { result } = renderHook(() => useTripDetail({ tripId: 'trip_1' }));

    expect(result.current.getStatusText('archived' as Trip['status'])).toBe('Unknown');
  });
});
