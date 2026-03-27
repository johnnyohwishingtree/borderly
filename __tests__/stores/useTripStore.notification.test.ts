/**
 * useTripStore — notification scheduler integration tests
 *
 * Verifies that TripStore CRUD operations correctly wire into the
 * NotificationScheduler:
 *
 *  1. addTripLeg  → schedules deadline notifications for the new leg
 *  2. deleteTrip  → cancels all trip notifications
 *  3. removeTripLeg → cancels leg notifications (before DB deletion)
 *  4. updateTripLeg (departure date change) → cancels old and re-schedules
 *  5. updateTripLeg (formStatus ready/submitted) → cancels without re-scheduling
 *  6. Idempotency: cancel is always called before re-scheduling in updateTripLeg
 */

import { act } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Capture mutable scheduler mock refs before importing the store
// ---------------------------------------------------------------------------

const mockScheduleDeadlineNotifications = jest.fn().mockResolvedValue(undefined);
const mockCancelLegNotifications = jest.fn().mockResolvedValue(undefined);
const mockCancelTripNotifications = jest.fn().mockResolvedValue(undefined);

jest.mock('@/services/deadline/notificationScheduler', () => ({
  scheduleDeadlineNotifications: (...args: unknown[]) =>
    mockScheduleDeadlineNotifications(...args),
  cancelLegNotifications: (...args: unknown[]) =>
    mockCancelLegNotifications(...args),
  cancelTripNotifications: (...args: unknown[]) =>
    mockCancelTripNotifications(...args),
}));

// ---------------------------------------------------------------------------
// Deadline service mock — returns a realistic future deadline
// ---------------------------------------------------------------------------

const mockDeadline = {
  legId: 'leg-1',
  countryCode: 'JPN',
  submissionDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  recommendedDeadline: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000),
  hoursRemaining: 720,
  status: 'not-started' as const,
  windowNote: 'Submit 3 days before arrival',
};

const mockComputeLegDeadline = jest.fn().mockReturnValue(mockDeadline);

jest.mock('@/services/deadline/deadlineService', () => ({
  computeLegDeadline: (...args: unknown[]) => mockComputeLegDeadline(...args),
  computeTripDeadlines: jest.fn().mockResolvedValue([]),
}));

// ---------------------------------------------------------------------------
// Schema registry mock — returns a non-null schema so scheduling proceeds
// ---------------------------------------------------------------------------

const mockGetSchema = jest.fn().mockReturnValue({ countryCode: 'JPN', fields: [] });

jest.mock('@/services/schemas/schemaRegistry', () => ({
  SchemaRegistry: {
    getInstance: jest.fn(() => ({
      getSchema: mockGetSchema,
    })),
  },
}));

// ---------------------------------------------------------------------------
// Database service mock
// ---------------------------------------------------------------------------

jest.mock('@/services/storage', () => ({
  databaseService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    getTripsWithLegs: jest.fn().mockResolvedValue([]),
    getTripCount: jest.fn().mockResolvedValue(0),
    getTrips: jest.fn().mockResolvedValue([]),
    createTrip: jest.fn().mockResolvedValue({ id: 'trip-1' }),
    updateTrip: jest.fn().mockResolvedValue(undefined),
    deleteTrip: jest.fn().mockResolvedValue(undefined),
    createTripLeg: jest.fn().mockResolvedValue({ id: 'leg-1' }),
    updateTripLeg: jest.fn().mockResolvedValue(undefined),
    deleteTripLeg: jest.fn().mockResolvedValue(undefined),
    getQRCodes: jest.fn().mockResolvedValue([]),
    saveQRCode: jest.fn(),
    deleteQRCode: jest.fn(),
  },
  mmkvService: {
    getString: jest.fn(),
    setString: jest.fn(),
    delete: jest.fn(),
    getPreferences: jest.fn(() => ({})),
    setPreference: jest.fn(),
    clearAll: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Import store after all mocks are defined
// ---------------------------------------------------------------------------

import { useTripStore } from '@/stores/useTripStore';
import { Trip, TripLeg } from '@/types/trip';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLeg(overrides: Partial<TripLeg> = {}): TripLeg {
  return {
    id: 'leg-1',
    tripId: 'trip-1',
    destinationCountry: 'JPN',
    arrivalDate: '2026-05-01',
    departureDate: '2026-04-28',
    accommodation: {
      name: 'Tokyo Hotel',
      address: { line1: '1 Main St', city: 'Tokyo', postalCode: '100-0001', country: 'JPN' },
    },
    formStatus: 'not_started',
    submissionStatus: 'not_started',
    order: 0,
    assignedTravelers: [],
    travelerFormsData: [],
    ...overrides,
  };
}

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1',
    name: 'Asia Trip',
    status: 'upcoming',
    legs: [makeLeg()],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('useTripStore — notification scheduler integration', () => {
  beforeEach(() => {
    useTripStore.setState({
      trips: [],
      currentTrip: null,
      isLoading: false,
      error: null,
      currentPage: 0,
      pageSize: 20,
      totalTrips: 0,
      hasMoreTrips: true,
    });
    jest.clearAllMocks();
    // Restore default resolutions after clearAllMocks
    mockScheduleDeadlineNotifications.mockResolvedValue(undefined);
    mockCancelLegNotifications.mockResolvedValue(undefined);
    mockCancelTripNotifications.mockResolvedValue(undefined);
    mockComputeLegDeadline.mockReturnValue(mockDeadline);
    mockGetSchema.mockReturnValue({ countryCode: 'JPN', fields: [] });
  });

  // -------------------------------------------------------------------------
  // addTripLeg → schedules notifications
  // -------------------------------------------------------------------------

  describe('addTripLeg', () => {
    it('calls scheduleDeadlineNotifications when a leg is added', async () => {
      const trip = makeTrip({ legs: [] });
      useTripStore.setState({ trips: [trip] });

      const legData: Omit<TripLeg, 'id' | 'tripId'> = {
        destinationCountry: 'JPN',
        arrivalDate: '2026-05-01',
        departureDate: '2026-04-28',
        accommodation: {
          name: 'Tokyo Hotel',
          address: { line1: '1 Main St', city: 'Tokyo', postalCode: '100-0001', country: 'JPN' },
        },
        formStatus: 'not_started',
        submissionStatus: 'not_started',
        order: 0,
        assignedTravelers: [],
        travelerFormsData: [],
      };

      await act(async () => {
        await useTripStore.getState().addTripLeg('trip-1', legData);
        // Give the fire-and-forget promise time to settle
        await Promise.resolve();
      });

      expect(mockScheduleDeadlineNotifications).toHaveBeenCalledTimes(1);
    });

    it('passes the updated trip and computed deadline to scheduleDeadlineNotifications', async () => {
      const trip = makeTrip({ legs: [] });
      useTripStore.setState({ trips: [trip] });

      const legData: Omit<TripLeg, 'id' | 'tripId'> = {
        destinationCountry: 'JPN',
        arrivalDate: '2026-05-01',
        departureDate: '2026-04-28',
        accommodation: {
          name: 'Tokyo Hotel',
          address: { line1: '1 Main St', city: 'Tokyo', postalCode: '100-0001', country: 'JPN' },
        },
        formStatus: 'not_started',
        submissionStatus: 'not_started',
        order: 0,
        assignedTravelers: [],
        travelerFormsData: [],
      };

      await act(async () => {
        await useTripStore.getState().addTripLeg('trip-1', legData);
        await Promise.resolve();
      });

      const [calledTrip, calledDeadlines] = mockScheduleDeadlineNotifications.mock.calls[0];
      expect(calledTrip).toMatchObject({ id: 'trip-1' });
      expect(calledDeadlines).toHaveLength(1);
      expect(calledDeadlines[0]).toBe(mockDeadline);
    });

    it('adds the leg to state but skips scheduling when the country schema is not found', async () => {
      mockGetSchema.mockReturnValue(null);
      const trip = makeTrip({ legs: [] });
      useTripStore.setState({ trips: [trip] });

      const legData: Omit<TripLeg, 'id' | 'tripId'> = {
        destinationCountry: 'JPN',
        arrivalDate: '2026-05-01',
        accommodation: {
          name: 'Tokyo Hotel',
          address: { line1: '1 Main St', city: 'Tokyo', postalCode: '100-0001', country: 'JPN' },
        },
        formStatus: 'not_started',
        submissionStatus: 'not_started',
        order: 0,
        assignedTravelers: [],
        travelerFormsData: [],
      };

      await act(async () => {
        await useTripStore.getState().addTripLeg('trip-1', legData);
        await Promise.resolve();
      });

      // Leg was still added to state even though scheduling was skipped
      const { trips } = useTripStore.getState();
      expect(trips[0].legs).toHaveLength(1);
      expect(trips[0].legs[0].destinationCountry).toBe('JPN');
      expect(mockScheduleDeadlineNotifications).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // deleteTrip → cancels trip notifications
  // -------------------------------------------------------------------------

  describe('deleteTrip', () => {
    it('calls cancelTripNotifications with the deleted tripId', async () => {
      const trip = makeTrip();
      useTripStore.setState({ trips: [trip] });

      await act(async () => {
        await useTripStore.getState().deleteTrip('trip-1');
        await Promise.resolve();
      });

      expect(mockCancelTripNotifications).toHaveBeenCalledWith('trip-1');
    });

    it('cancels notifications even on database success', async () => {
      const trip = makeTrip();
      useTripStore.setState({ trips: [trip] });

      await act(async () => {
        await useTripStore.getState().deleteTrip('trip-1');
        await Promise.resolve();
      });

      expect(mockCancelTripNotifications).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // removeTripLeg → cancels leg notifications
  // -------------------------------------------------------------------------

  describe('removeTripLeg', () => {
    it('calls cancelLegNotifications with the correct legId and tripId', async () => {
      const trip = makeTrip();
      useTripStore.setState({ trips: [trip] });

      await act(async () => {
        await useTripStore.getState().removeTripLeg('leg-1');
      });

      expect(mockCancelLegNotifications).toHaveBeenCalledWith('leg-1', 'trip-1');
    });

    it('cancels notifications before removing the leg from state', async () => {
      const trip = makeTrip();
      useTripStore.setState({ trips: [trip] });

      let cancelCalledBeforeStateUpdate = false;
      mockCancelLegNotifications.mockImplementation(async () => {
        // At this point the leg should still be in state (cancel happens before removal)
        const { trips } = useTripStore.getState();
        const hasLeg = trips.some(t => t.legs.some(l => l.id === 'leg-1'));
        cancelCalledBeforeStateUpdate = hasLeg;
      });

      await act(async () => {
        await useTripStore.getState().removeTripLeg('leg-1');
      });

      expect(cancelCalledBeforeStateUpdate).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // updateTripLeg (departure date change) → cancel then reschedule
  // -------------------------------------------------------------------------

  describe('updateTripLeg — departure date change', () => {
    it('cancels old notifications and reschedules when departureDate changes', async () => {
      const trip = makeTrip();
      useTripStore.setState({ trips: [trip] });

      await act(async () => {
        await useTripStore.getState().updateTripLeg('leg-1', {
          departureDate: '2026-05-10',
        });
        // Let the chained promise settle
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockCancelLegNotifications).toHaveBeenCalledWith('leg-1', 'trip-1');
      expect(mockScheduleDeadlineNotifications).toHaveBeenCalledTimes(1);
    });

    it('cancels before rescheduling (idempotency: no double-scheduling)', async () => {
      const trip = makeTrip();
      useTripStore.setState({ trips: [trip] });

      const callOrder: string[] = [];
      mockCancelLegNotifications.mockImplementation(async () => {
        callOrder.push('cancel');
      });
      mockScheduleDeadlineNotifications.mockImplementation(async () => {
        callOrder.push('schedule');
      });

      await act(async () => {
        await useTripStore.getState().updateTripLeg('leg-1', {
          departureDate: '2026-05-10',
        });
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(callOrder).toEqual(['cancel', 'schedule']);
    });

    it('updates departure date in state but skips rescheduling when schema is not found', async () => {
      mockGetSchema.mockReturnValue(null);
      const trip = makeTrip();
      useTripStore.setState({ trips: [trip] });

      await act(async () => {
        await useTripStore.getState().updateTripLeg('leg-1', {
          departureDate: '2026-05-10',
        });
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Departure date was still updated in state
      const { trips } = useTripStore.getState();
      expect(trips[0].legs[0].departureDate).toBe('2026-05-10');
      // But no notifications were scheduled
      expect(mockScheduleDeadlineNotifications).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // updateTripLeg (formStatus ready / submitted) → cancel without reschedule
  // -------------------------------------------------------------------------

  describe('updateTripLeg — form ready or submitted', () => {
    it('cancels leg notifications when formStatus is set to "ready"', async () => {
      const trip = makeTrip();
      useTripStore.setState({ trips: [trip] });

      await act(async () => {
        await useTripStore.getState().updateTripLeg('leg-1', {
          formStatus: 'ready',
          submissionStatus: 'not_started',
        });
        await Promise.resolve();
      });

      expect(mockCancelLegNotifications).toHaveBeenCalledWith('leg-1', 'trip-1');
    });

    it('cancels leg notifications when formStatus is set to "submitted"', async () => {
      const trip = makeTrip();
      useTripStore.setState({ trips: [trip] });

      await act(async () => {
        await useTripStore.getState().updateTripLeg('leg-1', {
          formStatus: 'submitted',
          submissionStatus: 'not_started',
        });
        await Promise.resolve();
      });

      expect(mockCancelLegNotifications).toHaveBeenCalledWith('leg-1', 'trip-1');
    });

    it('updates formStatus to ready in state but does not reschedule notifications', async () => {
      const trip = makeTrip();
      useTripStore.setState({ trips: [trip] });

      await act(async () => {
        await useTripStore.getState().updateTripLeg('leg-1', {
          formStatus: 'ready',
          submissionStatus: 'not_started',
        });
        await Promise.resolve();
      });

      // formStatus was updated in state
      const { trips } = useTripStore.getState();
      expect(trips[0].legs[0].formStatus).toBe('ready');
      // Notifications were cancelled but not rescheduled
      expect(mockScheduleDeadlineNotifications).not.toHaveBeenCalled();
    });
  });
});
