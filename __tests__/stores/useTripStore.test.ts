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
  submissionStatus: 'not_started',
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

  describe('updateTravelerFormData', () => {
    it('calls databaseService.updateTripLeg with updated travelerFormsData for a new traveler', async () => {
      const trip = makeTrip();
      useTripStore.setState({ trips: [trip] });

      await act(async () => {
        await useTripStore.getState().updateTravelerFormData('leg-1', 'traveler-1', 'passport_number', 'AB123456');
      });

      expect(mockUpdateTripLeg).toHaveBeenCalledTimes(1);
      expect(mockUpdateTripLeg).toHaveBeenCalledWith('leg-1', {
        travelerFormsData: [
          {
            travelerId: 'traveler-1',
            formData: { passport_number: 'AB123456' },
            formStatus: 'in_progress',
            completionPercentage: 0,
          },
        ],
      });
    });

    it('calls databaseService.updateTripLeg merging data for an existing traveler entry', async () => {
      const trip = makeTrip({
        legs: [
          makeLeg({
            travelerFormsData: [
              {
                travelerId: 'traveler-1',
                formData: { full_name: 'Jane Doe' },
                formStatus: 'in_progress',
                completionPercentage: 10,
              },
            ],
          }),
        ],
      });
      useTripStore.setState({ trips: [trip] });

      await act(async () => {
        await useTripStore.getState().updateTravelerFormData('leg-1', 'traveler-1', 'passport_number', 'AB123456');
      });

      expect(mockUpdateTripLeg).toHaveBeenCalledTimes(1);
      const [calledLegId, calledUpdates] = mockUpdateTripLeg.mock.calls[0] as [string, { travelerFormsData: unknown[] }];
      expect(calledLegId).toBe('leg-1');
      expect(calledUpdates.travelerFormsData).toHaveLength(1);
      expect((calledUpdates.travelerFormsData[0] as Record<string, unknown>).formData).toEqual({
        full_name: 'Jane Doe',
        passport_number: 'AB123456',
      });
    });

    it('updates in-memory state after database write', async () => {
      const trip = makeTrip();
      useTripStore.setState({ trips: [trip] });

      await act(async () => {
        await useTripStore.getState().updateTravelerFormData('leg-1', 'traveler-1', 'passport_number', 'AB123456');
      });

      const { trips } = useTripStore.getState();
      const leg = trips[0].legs[0];
      expect(leg.travelerFormsData).toHaveLength(1);
      expect(leg.travelerFormsData![0].formData).toEqual({ passport_number: 'AB123456' });
    });

    it('does not update in-memory state if database write throws', async () => {
      const trip = makeTrip();
      useTripStore.setState({ trips: [trip] });
      mockUpdateTripLeg.mockRejectedValue(new Error('DB error'));

      await act(async () => {
        await useTripStore.getState().updateTravelerFormData('leg-1', 'traveler-1', 'passport_number', 'AB123456');
      });

      const { trips, error } = useTripStore.getState();
      expect(trips[0].legs[0].travelerFormsData).toBeUndefined();
      expect(error).toBe('DB error');
    });
  });

  describe('updateTravelerFormStatus', () => {
    it('calls databaseService.updateTripLeg with updated formStatus for a new traveler', async () => {
      const trip = makeTrip();
      useTripStore.setState({ trips: [trip] });

      await act(async () => {
        await useTripStore.getState().updateTravelerFormStatus('leg-1', 'traveler-1', 'ready');
      });

      expect(mockUpdateTripLeg).toHaveBeenCalledTimes(1);
      expect(mockUpdateTripLeg).toHaveBeenCalledWith('leg-1', {
        travelerFormsData: [
          {
            travelerId: 'traveler-1',
            formData: {},
            formStatus: 'ready',
            completionPercentage: 0,
          },
        ],
      });
    });

    it('calls databaseService.updateTripLeg updating status for an existing traveler entry', async () => {
      const trip = makeTrip({
        legs: [
          makeLeg({
            travelerFormsData: [
              {
                travelerId: 'traveler-1',
                formData: { passport_number: 'AB123456' },
                formStatus: 'in_progress',
                completionPercentage: 50,
              },
            ],
          }),
        ],
      });
      useTripStore.setState({ trips: [trip] });

      await act(async () => {
        await useTripStore.getState().updateTravelerFormStatus('leg-1', 'traveler-1', 'ready');
      });

      expect(mockUpdateTripLeg).toHaveBeenCalledTimes(1);
      const [calledLegId, calledUpdates] = mockUpdateTripLeg.mock.calls[0] as [string, { travelerFormsData: unknown[] }];
      expect(calledLegId).toBe('leg-1');
      expect((calledUpdates.travelerFormsData[0] as Record<string, unknown>).formStatus).toBe('ready');
      // Existing formData must be preserved
      expect((calledUpdates.travelerFormsData[0] as Record<string, unknown>).formData).toEqual({ passport_number: 'AB123456' });
    });

    it('updates in-memory state after database write', async () => {
      const trip = makeTrip();
      useTripStore.setState({ trips: [trip] });

      await act(async () => {
        await useTripStore.getState().updateTravelerFormStatus('leg-1', 'traveler-1', 'submitted');
      });

      const { trips } = useTripStore.getState();
      const leg = trips[0].legs[0];
      expect(leg.travelerFormsData).toHaveLength(1);
      expect(leg.travelerFormsData![0].formStatus).toBe('submitted');
    });

    it('does not update in-memory state if database write throws', async () => {
      const trip = makeTrip();
      useTripStore.setState({ trips: [trip] });
      mockUpdateTripLeg.mockRejectedValue(new Error('DB error'));

      await act(async () => {
        await useTripStore.getState().updateTravelerFormStatus('leg-1', 'traveler-1', 'ready');
      });

      const { trips, error } = useTripStore.getState();
      expect(trips[0].legs[0].travelerFormsData).toBeUndefined();
      expect(error).toBe('DB error');
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

  describe('updateLegSubmissionStatus', () => {
    it('calls databaseService.updateTripLeg with the new submissionStatus', async () => {
      const trip = makeTrip();
      useTripStore.setState({ trips: [trip] });

      await act(async () => {
        await useTripStore.getState().updateLegSubmissionStatus('leg-1', 'in_progress');
      });

      expect(mockUpdateTripLeg).toHaveBeenCalledTimes(1);
      expect(mockUpdateTripLeg).toHaveBeenCalledWith('leg-1', { submissionStatus: 'in_progress' });
    });

    it('updates in-memory state after database write', async () => {
      const trip = makeTrip();
      useTripStore.setState({ trips: [trip] });

      await act(async () => {
        await useTripStore.getState().updateLegSubmissionStatus('leg-1', 'submitted');
      });

      const { trips } = useTripStore.getState();
      expect(trips[0].legs[0].submissionStatus).toBe('submitted');
    });

    it('sets submissionStatus to not_started', async () => {
      const trip = makeTrip({ legs: [makeLeg({ submissionStatus: 'submitted' })] });
      useTripStore.setState({ trips: [trip] });

      await act(async () => {
        await useTripStore.getState().updateLegSubmissionStatus('leg-1', 'not_started');
      });

      const { trips } = useTripStore.getState();
      expect(trips[0].legs[0].submissionStatus).toBe('not_started');
    });

    it('sets error and does not update in-memory state if database write throws', async () => {
      const trip = makeTrip();
      useTripStore.setState({ trips: [trip] });
      mockUpdateTripLeg.mockRejectedValue(new Error('DB error'));

      await act(async () => {
        await useTripStore.getState().updateLegSubmissionStatus('leg-1', 'submitted');
      });

      const { trips, error } = useTripStore.getState();
      // State should be unchanged
      expect(trips[0].legs[0].submissionStatus).toBe('not_started');
      expect(error).toBe('DB error');
    });
  });
});
