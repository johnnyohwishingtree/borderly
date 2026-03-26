/**
 * Tests for tripStoreLegSlice: createLegSlice
 */

import type { TripStore } from '../../src/stores/useTripStoreTypes';
import type { Trip, TripLeg } from '../../src/types/trip';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

const mockCreateTripLeg = jest.fn();
const mockUpdateTripLeg = jest.fn();
const mockDeleteTripLeg = jest.fn();
const mockScheduleDeadlineNotifications = jest.fn();
const mockCancelLegNotifications = jest.fn();
const mockComputeLegDeadline = jest.fn();
const mockGetSchema = jest.fn();

jest.mock('@/services/storage', () => ({
  databaseService: {
    createTripLeg: (...args: unknown[]) => mockCreateTripLeg(...args),
    updateTripLeg: (...args: unknown[]) => mockUpdateTripLeg(...args),
    deleteTripLeg: (...args: unknown[]) => mockDeleteTripLeg(...args),
  },
}));

jest.mock('@/services/deadline/notificationScheduler', () => ({
  scheduleDeadlineNotifications: (...args: unknown[]) => mockScheduleDeadlineNotifications(...args),
  cancelLegNotifications: (...args: unknown[]) => mockCancelLegNotifications(...args),
}));

jest.mock('@/services/deadline/deadlineService', () => ({
  computeLegDeadline: (...args: unknown[]) => mockComputeLegDeadline(...args),
}));

jest.mock('@/services/schemas/schemaRegistry', () => ({
  SchemaRegistry: {
    getInstance: () => ({
      getSchema: (...args: unknown[]) => mockGetSchema(...args),
    }),
  },
}));

import { createLegSlice } from '../../src/stores/tripStoreLegSlice';

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function createLeg(overrides: Partial<TripLeg> = {}): TripLeg {
  return {
    id: 'leg-1',
    tripId: 'trip-1',
    destinationCountry: 'JPN',
    arrivalDate: '2025-07-01',
    accommodation: {
      name: 'Hotel',
      address: { line1: '1-1', city: 'Tokyo', postalCode: '100', country: 'JPN' },
    },
    formStatus: 'not_started',
    submissionStatus: 'not_started',
    order: 0,
    assignedTravelers: [],
    travelerFormsData: [],
    ...overrides,
  };
}

function createTrip(legs: TripLeg[] = [createLeg()]): Trip {
  return {
    id: 'trip-1',
    name: 'Test Trip',
    status: 'upcoming',
    legs,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createLegSlice', () => {
  let set: jest.Mock;
  let get: jest.Mock;
  let storeState: Partial<TripStore>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCreateTripLeg.mockResolvedValue({ id: 'new-leg-id' });
    mockUpdateTripLeg.mockResolvedValue(undefined);
    mockDeleteTripLeg.mockResolvedValue(undefined);
    mockScheduleDeadlineNotifications.mockResolvedValue(undefined);
    mockCancelLegNotifications.mockResolvedValue(undefined);
    mockComputeLegDeadline.mockReturnValue({ legId: 'leg-1', deadline: '2025-06-30' });
    mockGetSchema.mockReturnValue(null);

    storeState = {
      trips: [createTrip()],
      isLoading: false,
      error: null,
    };

    set = jest.fn((partial) => {
      if (typeof partial === 'function') {
        const updates = partial(storeState as TripStore);
        Object.assign(storeState, updates);
      } else {
        Object.assign(storeState, partial);
      }
    });

    get = jest.fn(() => ({
      ...storeState,
      getTripById: (tripId: string) => storeState.trips!.find(t => t.id === tripId),
      getLegById: (legId: string) => {
        for (const trip of storeState.trips!) {
          const leg = trip.legs.find(l => l.id === legId);
          if (leg) return leg;
        }
        return undefined;
      },
    }));
  });

  // -----------------------------------------------------------------------
  // addTripLeg
  // -----------------------------------------------------------------------

  describe('addTripLeg', () => {
    const legData: Omit<TripLeg, 'id' | 'tripId'> = {
      destinationCountry: 'SGP',
      arrivalDate: '2025-08-01',
      accommodation: {
        name: 'Marina Bay',
        address: { line1: '10 Bayfront Ave', city: 'Singapore', postalCode: '018956', country: 'SGP' },
      },
      formStatus: 'not_started',
      submissionStatus: 'not_started',
      order: 1,
      assignedTravelers: [],
      travelerFormsData: [],
    };

    it('sets isLoading true then calls database and updates state', async () => {
      const slice = createLegSlice(set, get);
      await slice.addTripLeg('trip-1', legData);

      expect(set).toHaveBeenCalledWith({ isLoading: true, error: null });
      expect(mockCreateTripLeg).toHaveBeenCalledTimes(1);
      // Functional set call adds leg to trip
      expect(set).toHaveBeenCalledTimes(2);
    });

    it('adds the new leg to the correct trip', async () => {
      const slice = createLegSlice(set, get);
      await slice.addTripLeg('trip-1', legData);

      // Get the functional updater
      const functionalCall = set.mock.calls[1][0];
      const result = functionalCall({ trips: [createTrip()] });
      expect(result.trips[0].legs).toHaveLength(2);
      expect(result.trips[0].legs[1].id).toBe('new-leg-id');
      expect(result.trips[0].legs[1].destinationCountry).toBe('SGP');
    });

    it('schedules deadline notifications when schema exists', async () => {
      mockGetSchema.mockReturnValue({ countryCode: 'SGP' });

      const slice = createLegSlice(set, get);
      await slice.addTripLeg('trip-1', legData);

      expect(mockComputeLegDeadline).toHaveBeenCalled();
      expect(mockScheduleDeadlineNotifications).toHaveBeenCalled();
    });

    it('sets error on failure', async () => {
      mockCreateTripLeg.mockRejectedValue(new Error('DB create failed'));

      const slice = createLegSlice(set, get);
      await slice.addTripLeg('trip-1', legData);

      expect(set).toHaveBeenCalledWith({
        error: 'DB create failed',
        isLoading: false,
      });
    });

    it('defaults submissionStatus and assignedTravelers', async () => {
      const minimalLegData = { ...legData };
      delete (minimalLegData as any).submissionStatus;
      delete (minimalLegData as any).assignedTravelers;
      delete (minimalLegData as any).travelerFormsData;

      const slice = createLegSlice(set, get);
      await slice.addTripLeg('trip-1', minimalLegData);

      const functionalCall = set.mock.calls[1][0];
      const result = functionalCall({ trips: [createTrip()] });
      const newLeg = result.trips[0].legs[1];
      expect(newLeg.submissionStatus).toBe('not_started');
      expect(newLeg.assignedTravelers).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // updateTripLeg
  // -----------------------------------------------------------------------

  describe('updateTripLeg', () => {
    it('updates database and local state', async () => {
      const slice = createLegSlice(set, get);
      await slice.updateTripLeg('leg-1', { formStatus: 'in_progress' });

      expect(mockUpdateTripLeg).toHaveBeenCalledWith('leg-1', expect.objectContaining({
        formStatus: 'in_progress',
      }));
      expect(set).toHaveBeenCalledTimes(2); // isLoading + functional update
    });

    it('cancels notifications when form marked as ready', async () => {
      const slice = createLegSlice(set, get);
      await slice.updateTripLeg('leg-1', { formStatus: 'ready' });

      expect(mockCancelLegNotifications).toHaveBeenCalledWith('leg-1', 'trip-1');
    });

    it('cancels notifications when form marked as submitted', async () => {
      const slice = createLegSlice(set, get);
      await slice.updateTripLeg('leg-1', { formStatus: 'submitted' });

      expect(mockCancelLegNotifications).toHaveBeenCalledWith('leg-1', 'trip-1');
    });

    it('reschedules notifications when departureDate changes and schema exists', async () => {
      mockGetSchema.mockReturnValue({ countryCode: 'JPN' });

      const slice = createLegSlice(set, get);
      await slice.updateTripLeg('leg-1', { departureDate: '2025-07-15' });

      expect(mockCancelLegNotifications).toHaveBeenCalled();
    });

    it('sets error on failure', async () => {
      mockUpdateTripLeg.mockRejectedValue(new Error('update fail'));

      const slice = createLegSlice(set, get);
      await slice.updateTripLeg('leg-1', { formStatus: 'in_progress' });

      expect(set).toHaveBeenCalledWith({
        error: 'update fail',
        isLoading: false,
      });
    });
  });

  // -----------------------------------------------------------------------
  // removeTripLeg
  // -----------------------------------------------------------------------

  describe('removeTripLeg', () => {
    it('cancels notifications and deletes from database', async () => {
      const slice = createLegSlice(set, get);
      await slice.removeTripLeg('leg-1');

      expect(mockCancelLegNotifications).toHaveBeenCalledWith('leg-1', 'trip-1');
      expect(mockDeleteTripLeg).toHaveBeenCalledWith('leg-1');
    });

    it('removes the leg from local state', async () => {
      const slice = createLegSlice(set, get);
      await slice.removeTripLeg('leg-1');

      const functionalCall = set.mock.calls[0][0];
      const result = functionalCall({ trips: [createTrip()] });
      expect(result.trips[0].legs).toHaveLength(0);
    });

    it('handles leg not found in any trip gracefully', async () => {
      const slice = createLegSlice(set, get);
      await slice.removeTripLeg('nonexistent');

      expect(mockCancelLegNotifications).toHaveBeenCalledWith('nonexistent', undefined);
      expect(mockDeleteTripLeg).toHaveBeenCalledWith('nonexistent');
    });
  });

  // -----------------------------------------------------------------------
  // reorderTripLegs
  // -----------------------------------------------------------------------

  describe('reorderTripLegs', () => {
    it('updates order in database for each leg', async () => {
      const legs = [
        createLeg({ id: 'leg-a', order: 0 }),
        createLeg({ id: 'leg-b', order: 1 }),
      ];
      storeState.trips = [createTrip(legs)];

      const slice = createLegSlice(set, get);
      await slice.reorderTripLegs('trip-1', ['leg-b', 'leg-a']);

      expect(mockUpdateTripLeg).toHaveBeenCalledWith('leg-b', { order: 0 });
      expect(mockUpdateTripLeg).toHaveBeenCalledWith('leg-a', { order: 1 });
    });

    it('updates local state with reordered legs', async () => {
      const legs = [
        createLeg({ id: 'leg-a', order: 0 }),
        createLeg({ id: 'leg-b', order: 1 }),
      ];
      storeState.trips = [createTrip(legs)];

      const slice = createLegSlice(set, get);
      await slice.reorderTripLegs('trip-1', ['leg-b', 'leg-a']);

      const functionalCall = set.mock.calls[0][0];
      const result = functionalCall({ trips: [createTrip(legs)] });
      expect(result.trips[0].legs[0].id).toBe('leg-b');
      expect(result.trips[0].legs[0].order).toBe(0);
      expect(result.trips[0].legs[1].id).toBe('leg-a');
      expect(result.trips[0].legs[1].order).toBe(1);
    });

    it('does not modify other trips', async () => {
      const otherTrip = createTrip([createLeg({ id: 'leg-other' })]);
      otherTrip.id = 'trip-2';
      storeState.trips = [createTrip(), otherTrip];

      const slice = createLegSlice(set, get);
      await slice.reorderTripLegs('trip-1', ['leg-1']);

      const functionalCall = set.mock.calls[0][0];
      const result = functionalCall({
        trips: [createTrip(), otherTrip],
      });
      expect(result.trips[1]).toBe(otherTrip);
    });
  });
});
