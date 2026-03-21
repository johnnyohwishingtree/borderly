/**
 * Tests for useTripStore
 *
 * Focuses on verifying that store actions correctly delegate to databaseService,
 * particularly the `removeTripLeg` bug fix (issue #583).
 */

import { act } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

const mockDeleteTripLeg = jest.fn();
const mockUpdateTripLeg = jest.fn();
const mockCancelLegNotifications = jest.fn().mockResolvedValue(undefined);

jest.mock('@/services/storage', () => ({
  databaseService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    getTripsWithLegs: jest.fn().mockResolvedValue([]),
    getTrips: jest.fn().mockResolvedValue([]),
    createTrip: jest.fn(),
    updateTrip: jest.fn(),
    deleteTrip: jest.fn(),
    createTripLeg: jest.fn(),
    updateTripLeg: (...args: unknown[]) => mockUpdateTripLeg(...args),
    deleteTripLeg: (...args: unknown[]) => mockDeleteTripLeg(...args),
    getQRCodes: jest.fn().mockResolvedValue([]),
    saveQRCode: jest.fn(),
    deleteQRCode: jest.fn(),
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
  scheduleDeadlineNotifications: jest.fn().mockResolvedValue(undefined),
  cancelLegNotifications: (...args: unknown[]) => mockCancelLegNotifications(...args),
  cancelTripNotifications: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/services/deadline/deadlineService', () => ({
  computeLegDeadline: jest.fn(),
}));

jest.mock('@/services/schemas/schemaRegistry', () => ({
  SchemaRegistry: jest.fn().mockImplementation(() => ({
    getSchema: jest.fn(),
  })),
}));

// ---------------------------------------------------------------------------
// Import store after mocks are set up
// ---------------------------------------------------------------------------

import { useTripStore } from '@/stores/useTripStore';
import { Trip, TripLeg } from '@/types/trip';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeLeg = (overrides: Partial<TripLeg> = {}): TripLeg => ({
  id: 'leg-1',
  tripId: 'trip-1',
  destinationCountry: 'JPN',
  arrivalDate: '2026-04-01',
  accommodation: { name: 'Hotel', address: { line1: '1 Main St', city: 'Tokyo', postalCode: '100-0001', country: 'JPN' } },
  formStatus: 'not_started',
  order: 0,
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
// Tests
// ---------------------------------------------------------------------------

describe('useTripStore', () => {
  beforeEach(() => {
    // Reset store state and mocks before each test
    useTripStore.setState({ trips: [], currentTrip: null, isLoading: false, error: null });
    jest.clearAllMocks();
    mockDeleteTripLeg.mockResolvedValue(undefined);
    mockUpdateTripLeg.mockResolvedValue(undefined);
    mockCancelLegNotifications.mockResolvedValue(undefined);
  });

  describe('removeTripLeg', () => {
    it('calls databaseService.deleteTripLeg with the correct legId', async () => {
      const trip = makeTrip();
      useTripStore.setState({ trips: [trip] });

      await act(async () => {
        await useTripStore.getState().removeTripLeg('leg-1');
      });

      expect(mockDeleteTripLeg).toHaveBeenCalledTimes(1);
      expect(mockDeleteTripLeg).toHaveBeenCalledWith('leg-1');
    });

    it('removes the leg from in-memory state after database deletion', async () => {
      const trip = makeTrip();
      useTripStore.setState({ trips: [trip] });

      await act(async () => {
        await useTripStore.getState().removeTripLeg('leg-1');
      });

      const { trips } = useTripStore.getState();
      expect(trips[0].legs).toHaveLength(0);
    });

    it('does not update state if database deletion throws', async () => {
      const trip = makeTrip();
      useTripStore.setState({ trips: [trip] });
      mockDeleteTripLeg.mockRejectedValue(new Error('DB error'));

      await expect(
        act(async () => {
          await useTripStore.getState().removeTripLeg('leg-1');
        })
      ).rejects.toThrow('DB error');

      // State should be unchanged — leg still present
      const { trips } = useTripStore.getState();
      expect(trips[0].legs).toHaveLength(1);
    });

    it('cancels deadline notifications for the leg before deleting', async () => {
      const trip = makeTrip();
      useTripStore.setState({ trips: [trip] });

      await act(async () => {
        await useTripStore.getState().removeTripLeg('leg-1');
      });

      expect(mockCancelLegNotifications).toHaveBeenCalledWith('leg-1', 'trip-1');
    });
  });

  describe('reorderTripLegs', () => {
    it('calls databaseService.updateTripLeg for each leg with its new order index', async () => {
      const trip = makeTrip({
        legs: [
          makeLeg({ id: 'leg-1', order: 0 }),
          makeLeg({ id: 'leg-2', order: 1 }),
          makeLeg({ id: 'leg-3', order: 2 }),
        ],
      });
      useTripStore.setState({ trips: [trip] });

      await act(async () => {
        await useTripStore.getState().reorderTripLegs('trip-1', ['leg-3', 'leg-1', 'leg-2']);
      });

      expect(mockUpdateTripLeg).toHaveBeenCalledTimes(3);
      expect(mockUpdateTripLeg).toHaveBeenCalledWith('leg-3', { order: 0 });
      expect(mockUpdateTripLeg).toHaveBeenCalledWith('leg-1', { order: 1 });
      expect(mockUpdateTripLeg).toHaveBeenCalledWith('leg-2', { order: 2 });
    });

    it('updates in-memory state to reflect the new order', async () => {
      const trip = makeTrip({
        legs: [
          makeLeg({ id: 'leg-1', order: 0 }),
          makeLeg({ id: 'leg-2', order: 1 }),
        ],
      });
      useTripStore.setState({ trips: [trip] });

      await act(async () => {
        await useTripStore.getState().reorderTripLegs('trip-1', ['leg-2', 'leg-1']);
      });

      const { trips } = useTripStore.getState();
      expect(trips[0].legs[0].id).toBe('leg-2');
      expect(trips[0].legs[0].order).toBe(0);
      expect(trips[0].legs[1].id).toBe('leg-1');
      expect(trips[0].legs[1].order).toBe(1);
    });

    it('does not update in-memory state if a database write throws', async () => {
      const trip = makeTrip({
        legs: [
          makeLeg({ id: 'leg-1', order: 0 }),
          makeLeg({ id: 'leg-2', order: 1 }),
        ],
      });
      useTripStore.setState({ trips: [trip] });
      mockUpdateTripLeg.mockRejectedValue(new Error('DB error'));

      await expect(
        act(async () => {
          await useTripStore.getState().reorderTripLegs('trip-1', ['leg-2', 'leg-1']);
        })
      ).rejects.toThrow('DB error');

      // State should be unchanged — original order preserved
      const { trips } = useTripStore.getState();
      expect(trips[0].legs[0].id).toBe('leg-1');
      expect(trips[0].legs[0].order).toBe(0);
    });
  });
});
