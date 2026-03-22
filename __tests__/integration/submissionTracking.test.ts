/**
 * Integration test: Submission Status Tracking full lifecycle.
 *
 * Verifies the full mark-as-submitted flow using the real useTripStore
 * with databaseService mocked.
 *
 * Scenarios covered:
 *   1. Leg starts with submissionStatus 'not_started'
 *   2. updateLegSubmissionStatus(legId, 'submitted') transitions it to 'submitted'
 *   3. TripDetailScreen submission progress summary (submitted count) updates reactively
 *   4. Intermediate 'in_progress' state is correctly persisted
 *   5. Multiple legs — only the targeted leg transitions
 *   6. updateLegSubmissionStatus sets error state when database throws
 *   7. markLegAsSubmitted delegates to updateTripLeg (sets formStatus to 'submitted')
 */

import { act } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

const mockUpdateTripLeg = jest.fn().mockResolvedValue(undefined);
const mockCancelLegNotifications = jest.fn().mockResolvedValue(undefined);
const mockScheduleDeadlineNotifications = jest.fn().mockResolvedValue(undefined);

jest.mock('@/services/storage', () => ({
  databaseService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    getTripsWithLegs: jest.fn().mockResolvedValue([]),
    getTripCount: jest.fn().mockResolvedValue(0),
    getTrips: jest.fn().mockResolvedValue([]),
    createTrip: jest.fn().mockResolvedValue({ id: 'mock-trip-id' }),
    updateTrip: jest.fn().mockResolvedValue(undefined),
    deleteTrip: jest.fn().mockResolvedValue(undefined),
    createTripLeg: jest.fn().mockResolvedValue({ id: 'mock-leg-id' }),
    updateTripLeg: (...args: unknown[]) => mockUpdateTripLeg(...args),
    deleteTripLeg: jest.fn().mockResolvedValue(undefined),
    getQRCodes: jest.fn().mockResolvedValue([]),
    saveQRCode: jest.fn().mockResolvedValue({ id: 'mock-qr-id' }),
    deleteQRCode: jest.fn().mockResolvedValue(undefined),
  },
  mmkvService: {
    getPreferences: jest.fn(() => ({})),
    setPreference: jest.fn(),
    getString: jest.fn(),
    setString: jest.fn(),
    delete: jest.fn(),
    clearAll: jest.fn(),
  },
}));

jest.mock('@/services/deadline/notificationScheduler', () => ({
  scheduleDeadlineNotifications: (...args: unknown[]) =>
    mockScheduleDeadlineNotifications(...args),
  cancelLegNotifications: (...args: unknown[]) =>
    mockCancelLegNotifications(...args),
  cancelTripNotifications: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/services/deadline/deadlineService', () => ({
  computeLegDeadline: jest.fn(),
}));

jest.mock('@/services/schemas/schemaRegistry', () => ({
  SchemaRegistry: {
    getInstance: jest.fn(() => ({
      getSchema: jest.fn().mockReturnValue(null),
    })),
  },
}));

// ---------------------------------------------------------------------------
// Import store after mocks are set up
// ---------------------------------------------------------------------------

import { useTripStore } from '@/stores/useTripStore';
import { Trip, TripLeg } from '@/types/trip';

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

const makeLeg = (overrides: Partial<TripLeg> = {}): TripLeg => ({
  id: 'leg-1',
  tripId: 'trip-1',
  destinationCountry: 'JPN',
  arrivalDate: '2027-08-01',
  departureDate: '2027-08-10',
  flightNumber: 'NH101',
  accommodation: {
    name: 'Park Hyatt Tokyo',
    address: {
      line1: '3-7-1-2 Nishi-Shinjuku',
      city: 'Tokyo',
      postalCode: '163-1055',
      country: 'JPN',
    },
  },
  formStatus: 'not_started',
  submissionStatus: 'not_started',
  order: 0,
  qrCodes: [],
  assignedTravelers: [],
  travelerFormsData: [],
  ...overrides,
});

const makeTrip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 'trip-1',
  name: 'Test Trip',
  status: 'upcoming',
  legs: [makeLeg()],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

// ---------------------------------------------------------------------------
// Integration tests
// ---------------------------------------------------------------------------

describe('Submission Status Tracking — full lifecycle integration', () => {
  beforeEach(() => {
    useTripStore.setState({
      trips: [],
      currentTrip: null,
      isLoading: false,
      isLoadingMore: false,
      error: null,
      currentPage: 0,
      pageSize: 20,
      totalTrips: 0,
      hasMoreTrips: true,
    });
    jest.clearAllMocks();
    mockUpdateTripLeg.mockResolvedValue(undefined);
    mockCancelLegNotifications.mockResolvedValue(undefined);
    mockScheduleDeadlineNotifications.mockResolvedValue(undefined);
  });

  it('leg starts with submissionStatus not_started', () => {
    const trip = makeTrip();
    useTripStore.setState({ trips: [trip] });

    const leg = useTripStore.getState().getLegById('leg-1');
    expect(leg?.submissionStatus).toBe('not_started');
  });

  it('updateLegSubmissionStatus transitions leg from not_started to submitted', async () => {
    const trip = makeTrip();
    useTripStore.setState({ trips: [trip] });

    await act(async () => {
      await useTripStore.getState().updateLegSubmissionStatus('leg-1', 'submitted');
    });

    const leg = useTripStore.getState().getLegById('leg-1');
    expect(leg?.submissionStatus).toBe('submitted');
  });

  it('updateLegSubmissionStatus persists the change to the database', async () => {
    const trip = makeTrip();
    useTripStore.setState({ trips: [trip] });

    await act(async () => {
      await useTripStore.getState().updateLegSubmissionStatus('leg-1', 'submitted');
    });

    expect(mockUpdateTripLeg).toHaveBeenCalledTimes(1);
    expect(mockUpdateTripLeg).toHaveBeenCalledWith('leg-1', { submissionStatus: 'submitted' });
  });

  it('full flow: not_started → in_progress → submitted', async () => {
    const trip = makeTrip();
    useTripStore.setState({ trips: [trip] });

    // Step 1: transition to in_progress
    await act(async () => {
      await useTripStore.getState().updateLegSubmissionStatus('leg-1', 'in_progress');
    });
    expect(useTripStore.getState().getLegById('leg-1')?.submissionStatus).toBe('in_progress');

    // Step 2: transition to submitted
    await act(async () => {
      await useTripStore.getState().updateLegSubmissionStatus('leg-1', 'submitted');
    });
    expect(useTripStore.getState().getLegById('leg-1')?.submissionStatus).toBe('submitted');
  });

  it('submission progress count (submitted legs) updates after marking as submitted', async () => {
    const tripWithTwoLegs = makeTrip({
      legs: [
        makeLeg({ id: 'leg-jpn', destinationCountry: 'JPN', order: 0 }),
        makeLeg({
          id: 'leg-sgp',
          destinationCountry: 'SGP',
          order: 1,
          submissionStatus: 'not_started',
        }),
      ],
    });
    useTripStore.setState({ trips: [tripWithTwoLegs] });

    // Initially no legs submitted
    const initialTrip = useTripStore.getState().getTripById('trip-1');
    const initialSubmitted = initialTrip?.legs.filter(
      l => l.submissionStatus === 'submitted',
    ).length ?? 0;
    expect(initialSubmitted).toBe(0);

    // Mark the Japan leg as submitted
    await act(async () => {
      await useTripStore.getState().updateLegSubmissionStatus('leg-jpn', 'submitted');
    });

    const updatedTrip = useTripStore.getState().getTripById('trip-1');
    const submittedCount = updatedTrip?.legs.filter(
      l => l.submissionStatus === 'submitted',
    ).length ?? 0;
    expect(submittedCount).toBe(1);
    expect(updatedTrip?.legs.length).toBe(2);

    // Mark the Singapore leg as submitted
    await act(async () => {
      await useTripStore.getState().updateLegSubmissionStatus('leg-sgp', 'submitted');
    });

    const finalTrip = useTripStore.getState().getTripById('trip-1');
    const allSubmitted = finalTrip?.legs.filter(
      l => l.submissionStatus === 'submitted',
    ).length ?? 0;
    expect(allSubmitted).toBe(2);
  });

  it('only the targeted leg changes status when multiple legs exist', async () => {
    const tripWithTwoLegs = makeTrip({
      legs: [
        makeLeg({ id: 'leg-jpn', destinationCountry: 'JPN', order: 0 }),
        makeLeg({
          id: 'leg-sgp',
          destinationCountry: 'SGP',
          order: 1,
          submissionStatus: 'not_started',
        }),
      ],
    });
    useTripStore.setState({ trips: [tripWithTwoLegs] });

    await act(async () => {
      await useTripStore.getState().updateLegSubmissionStatus('leg-jpn', 'submitted');
    });

    const jpnLeg = useTripStore.getState().getLegById('leg-jpn');
    const sgpLeg = useTripStore.getState().getLegById('leg-sgp');

    expect(jpnLeg?.submissionStatus).toBe('submitted');
    // Singapore leg must remain unchanged
    expect(sgpLeg?.submissionStatus).toBe('not_started');
  });

  it('sets error state when database throws during updateLegSubmissionStatus', async () => {
    const trip = makeTrip();
    useTripStore.setState({ trips: [trip] });
    mockUpdateTripLeg.mockRejectedValueOnce(new Error('DB write failed'));

    await act(async () => {
      await useTripStore.getState().updateLegSubmissionStatus('leg-1', 'submitted');
    });

    // In-memory state should NOT have changed (DB write failed before state update)
    const leg = useTripStore.getState().getLegById('leg-1');
    expect(leg?.submissionStatus).toBe('not_started');

    // Error should be set in store
    const { error } = useTripStore.getState();
    expect(error).toBeTruthy();
  });

  it('markLegAsSubmitted delegates to updateTripLeg and sets formStatus to submitted', async () => {
    const trip = makeTrip({ legs: [makeLeg({ formStatus: 'ready' })] });
    useTripStore.setState({ trips: [trip] });

    await act(async () => {
      await useTripStore.getState().markLegAsSubmitted('leg-1');
    });

    // markLegAsSubmitted calls updateTripLeg which calls databaseService.updateTripLeg
    expect(mockUpdateTripLeg).toHaveBeenCalledWith(
      'leg-1',
      expect.objectContaining({ formStatus: 'submitted' }),
    );

    const leg = useTripStore.getState().getLegById('leg-1');
    expect(leg?.formStatus).toBe('submitted');
  });

  it('TripDetailScreen summary: 0 of N legs submitted reflects clean trip state', () => {
    // This test verifies the data contract that TripDetailScreen uses
    // to compute its "X of N legs submitted" summary via useMemo.
    const tripWithThreeLegs = makeTrip({
      legs: [
        makeLeg({ id: 'leg-1', order: 0 }),
        makeLeg({ id: 'leg-2', destinationCountry: 'SGP', order: 1, submissionStatus: 'not_started' }),
        makeLeg({ id: 'leg-3', destinationCountry: 'MYS', order: 2, submissionStatus: 'not_started' }),
      ],
    });
    useTripStore.setState({ trips: [tripWithThreeLegs] });

    const trip = useTripStore.getState().getTripById('trip-1')!;
    const submitted = trip.legs.filter(l => l.submissionStatus === 'submitted').length;
    const total = trip.legs.length;

    expect(submitted).toBe(0);
    expect(total).toBe(3);
  });

  it('TripDetailScreen summary: correct count after sequential submissions', async () => {
    const tripWithThreeLegs = makeTrip({
      legs: [
        makeLeg({ id: 'leg-1', order: 0 }),
        makeLeg({ id: 'leg-2', destinationCountry: 'SGP', order: 1, submissionStatus: 'not_started' }),
        makeLeg({ id: 'leg-3', destinationCountry: 'MYS', order: 2, submissionStatus: 'not_started' }),
      ],
    });
    useTripStore.setState({ trips: [tripWithThreeLegs] });

    // Submit leg-1
    await act(async () => {
      await useTripStore.getState().updateLegSubmissionStatus('leg-1', 'submitted');
    });
    let trip = useTripStore.getState().getTripById('trip-1')!;
    expect(trip.legs.filter(l => l.submissionStatus === 'submitted').length).toBe(1);

    // Submit leg-2
    await act(async () => {
      await useTripStore.getState().updateLegSubmissionStatus('leg-2', 'submitted');
    });
    trip = useTripStore.getState().getTripById('trip-1')!;
    expect(trip.legs.filter(l => l.submissionStatus === 'submitted').length).toBe(2);

    // Submit leg-3 — all legs submitted
    await act(async () => {
      await useTripStore.getState().updateLegSubmissionStatus('leg-3', 'submitted');
    });
    trip = useTripStore.getState().getTripById('trip-1')!;
    expect(trip.legs.filter(l => l.submissionStatus === 'submitted').length).toBe(3);
    expect(trip.legs.length).toBe(3);
  });
});
