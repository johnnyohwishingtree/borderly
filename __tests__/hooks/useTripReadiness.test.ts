/**
 * Unit tests for the useTripReadiness hook.
 *
 * Verifies:
 * - Returns { tripReadiness: null, isLoading: false } for null or empty trips
 * - Sets isLoading to true while computing, then false when done
 * - Calls computeTripReadiness with the correct arguments
 * - Returns the computed TripReadiness when successful
 * - Returns null on error without crashing
 * - Re-runs computation when the trip changes
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useTripReadiness } from '@/hooks/useTripReadiness';
import type { Trip } from '@/types/trip';
import type { TripReadiness } from '@/services/readiness/readinessTypes';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Stable getAllProfiles mock
const mockGetAllProfiles = jest.fn(() => Promise.resolve(new Map()));
jest.mock('../../src/stores/useProfileStore', () => ({
  useProfileStore: (selector: (s: any) => any) =>
    selector({ getAllProfiles: mockGetAllProfiles }),
}));

// Mock getSchemaByCountryCode to return a minimal schema
jest.mock('../../src/schemas', () => ({
  getSchemaByCountryCode: jest.fn((code: string) => {
    if (code === 'SGP') return Promise.resolve(null); // no schema for SGP in tests
    return Promise.resolve({
      countryCode: code,
      countryName: code === 'JPN' ? 'Japan' : 'Unknown',
      version: '1.0.0',
      submissionDeadlineHours: 72,
      passportValidityMonths: 6,
      requiresQRCode: code === 'JPN',
      sections: [],
    });
  }),
}));

// Mock computeTripReadiness and scheduleReadinessCheck
const mockComputeTripReadiness = jest.fn();
const mockScheduleReadinessCheck = jest.fn(() => Promise.resolve());
jest.mock('../../src/services/readiness', () => ({
  computeTripReadiness: (...args: any[]) => mockComputeTripReadiness(...args),
  getOverallStatus: jest.fn(() => 'ok'),
  scheduleReadinessCheck: (...args: any[]) => mockScheduleReadinessCheck(...args),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeLeg(overrides: Partial<any> = {}): any {
  return {
    id: 'leg-1',
    tripId: 'trip-1',
    destinationCountry: 'JPN',
    arrivalDate: '2027-08-01',
    departureDate: '2027-08-10',
    formStatus: 'not_started' as const,
    order: 0,
    qrCodes: [],
    accommodation: {
      name: 'Park Hyatt',
      address: { line1: '3-7-1', city: 'Tokyo', postalCode: '163-1055', country: 'Japan' },
      phone: '',
    },
    ...overrides,
  };
}

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1',
    name: 'Test Trip',
    status: 'upcoming',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    legs: [makeLeg()],
    ...overrides,
  } as Trip;
}

const MOCK_READINESS: TripReadiness = {
  tripId: 'trip-1',
  overallStatus: 'critical',
  items: [
    {
      id: 'form-leg-1',
      category: 'form',
      label: 'Declaration form — Japan',
      status: 'critical',
      detail: 'Form not started',
      actionScreen: 'LegForm',
    },
  ],
  readyCount: 0,
  totalCount: 1,
  departureDate: new Date('2027-08-01'),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useTripReadiness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllProfiles.mockResolvedValue(new Map());
    mockComputeTripReadiness.mockResolvedValue(MOCK_READINESS);
  });

  it('returns null and not loading when trip is null', () => {
    const { result } = renderHook(() => useTripReadiness(null));
    expect(result.current.tripReadiness).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('returns null and not loading when trip has no legs', () => {
    const emptyTrip = makeTrip({ legs: [] });
    const { result } = renderHook(() => useTripReadiness(emptyTrip));
    expect(result.current.tripReadiness).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('sets isLoading to true initially, then resolves with tripReadiness', async () => {
    const trip = makeTrip();
    const { result } = renderHook(() => useTripReadiness(trip));

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tripReadiness).toEqual(MOCK_READINESS);
  });

  it('calls computeTripReadiness with profiles, schemas, and qrCodes', async () => {
    const trip = makeTrip();
    renderHook(() => useTripReadiness(trip));

    await waitFor(() => {
      expect(mockComputeTripReadiness).toHaveBeenCalledTimes(1);
    });

    const [calledTrip, calledProfiles, calledSchemas, calledQrCodes] =
      mockComputeTripReadiness.mock.calls[0];

    expect(calledTrip).toBe(trip);
    expect(Array.isArray(calledProfiles)).toBe(true);
    expect(typeof calledSchemas).toBe('object');
    expect(Array.isArray(calledQrCodes)).toBe(true);
  });

  it('collects qrCodes from leg.qrCodes on the trip', async () => {
    const qr = { id: 'qr-1', legId: 'leg-1', imageUri: 'img', savedAt: '2026-01-01' };
    const trip = makeTrip({ legs: [makeLeg({ qrCodes: [qr] })] });

    renderHook(() => useTripReadiness(trip));

    await waitFor(() => {
      expect(mockComputeTripReadiness).toHaveBeenCalled();
    });

    const calledQrCodes = mockComputeTripReadiness.mock.calls[0][3];
    expect(calledQrCodes).toEqual([qr]);
  });

  it('returns null (not crash) when computeTripReadiness rejects', async () => {
    mockComputeTripReadiness.mockRejectedValue(new Error('Service error'));

    const trip = makeTrip();
    const { result } = renderHook(() => useTripReadiness(trip));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tripReadiness).toBeNull();
  });

  it('re-runs computation when the trip object changes', async () => {
    const tripV1 = makeTrip({ name: 'Version 1' });
    const tripV2 = makeTrip({ name: 'Version 2' });

    const readinessV2: TripReadiness = { ...MOCK_READINESS, tripId: 'trip-1-v2' };
    mockComputeTripReadiness
      .mockResolvedValueOnce(MOCK_READINESS)
      .mockResolvedValueOnce(readinessV2);

    const { result, rerender } = renderHook(
      ({ trip }: { trip: Trip }) => useTripReadiness(trip),
      { initialProps: { trip: tripV1 } },
    );

    await waitFor(() => {
      expect(result.current.tripReadiness).toEqual(MOCK_READINESS);
    });

    rerender({ trip: tripV2 });

    await waitFor(() => {
      expect(result.current.tripReadiness).toEqual(readinessV2);
    });

    expect(mockComputeTripReadiness).toHaveBeenCalledTimes(2);
  });

  it('deduplicates country codes before loading schemas', async () => {
    const { getSchemaByCountryCode } = require('../../src/schemas');
    // Two legs for the same country
    const trip = makeTrip({
      legs: [
        makeLeg({ id: 'leg-a', destinationCountry: 'JPN' }),
        makeLeg({ id: 'leg-b', destinationCountry: 'JPN' }),
      ],
    });

    renderHook(() => useTripReadiness(trip));

    await waitFor(() => {
      expect(mockComputeTripReadiness).toHaveBeenCalled();
    });

    // Schema should only be loaded once for JPN
    const jpnCalls = getSchemaByCountryCode.mock.calls.filter(
      (c: any[]) => c[0] === 'JPN',
    );
    expect(jpnCalls).toHaveLength(1);
  });
});
