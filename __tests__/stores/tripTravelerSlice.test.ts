/**
 * Tests for tripTravelerSlice: createTravelerSlice
 */

import type { TripStore } from '../../src/stores/useTripStoreTypes';
import type { Trip, TripLeg, TravelerFormData } from '../../src/types/trip';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

const mockUpdateTripLeg = jest.fn();

jest.mock('@/services/storage', () => ({
  databaseService: {
    updateTripLeg: (...args: unknown[]) => mockUpdateTripLeg(...args),
  },
}));

import { createTravelerSlice } from '../../src/stores/tripTravelerSlice';

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function createLeg(overrides: Partial<TripLeg> = {}): TripLeg {
  return {
    id: 'leg-1',
    tripId: 'trip-1',
    destinationCountry: 'JPN',
    arrivalDate: '2025-07-01',
    accommodation: { name: 'Hotel', address: { line1: '1-1', city: 'Tokyo', postalCode: '100', country: 'JPN' } },
    formStatus: 'not_started',
    submissionStatus: 'not_started',
    order: 0,
    assignedTravelers: [],
    travelerFormsData: [],
    ...overrides,
  };
}

function createTrip(legs: TripLeg[] = []): Trip {
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
// Test setup
// ---------------------------------------------------------------------------

describe('createTravelerSlice', () => {
  let set: jest.Mock;
  let get: jest.Mock;
  let storeState: Partial<TripStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateTripLeg.mockResolvedValue(undefined);

    storeState = {
      trips: [createTrip([createLeg()])],
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
      getLegById: (legId: string) => {
        for (const trip of storeState.trips!) {
          const leg = trip.legs.find(l => l.id === legId);
          if (leg) return leg;
        }
        return undefined;
      },
      assignTravelersToLeg: jest.fn(),
    }));
  });

  // -----------------------------------------------------------------------
  // assignTravelersToLeg
  // -----------------------------------------------------------------------

  describe('assignTravelersToLeg', () => {
    it('updates database and local state', async () => {
      const slice = createTravelerSlice(set, get);
      await slice.assignTravelersToLeg('leg-1', ['t1', 't2']);

      expect(mockUpdateTripLeg).toHaveBeenCalledWith('leg-1', {
        assignedTravelers: ['t1', 't2'],
      });
      // set called: first with isLoading:true, then with updated trips
      expect(set).toHaveBeenCalledTimes(2);
    });

    it('sets isLoading to true then false', async () => {
      const slice = createTravelerSlice(set, get);
      await slice.assignTravelersToLeg('leg-1', ['t1']);

      expect(set).toHaveBeenCalledWith({ isLoading: true, error: null });
    });

    it('initializes traveler form data for new travelers', async () => {
      const slice = createTravelerSlice(set, get);
      await slice.assignTravelersToLeg('leg-1', ['t1']);

      // The functional set call should create travelerFormsData
      const functionalSetCall = set.mock.calls[1][0];
      const result = functionalSetCall(storeState);
      const updatedLeg = result.trips[0].legs[0];
      expect(updatedLeg.assignedTravelers).toEqual(['t1']);
      expect(updatedLeg.travelerFormsData).toHaveLength(1);
      expect(updatedLeg.travelerFormsData[0].travelerId).toBe('t1');
      expect(updatedLeg.travelerFormsData[0].formStatus).toBe('not_started');
    });

    it('preserves existing traveler form data', async () => {
      const existingFormData: TravelerFormData = {
        travelerId: 't1',
        formData: { name: 'John' },
        formStatus: 'in_progress',
        completionPercentage: 50,
      };
      storeState.trips = [createTrip([createLeg({ travelerFormsData: [existingFormData] })])];

      const slice = createTravelerSlice(set, get);
      await slice.assignTravelersToLeg('leg-1', ['t1', 't2']);

      const functionalSetCall = set.mock.calls[1][0];
      const result = functionalSetCall(storeState);
      const updatedLeg = result.trips[0].legs[0];
      expect(updatedLeg.travelerFormsData[0]).toEqual(existingFormData);
      expect(updatedLeg.travelerFormsData[1].travelerId).toBe('t2');
    });

    it('sets error on failure', async () => {
      mockUpdateTripLeg.mockRejectedValue(new Error('DB error'));

      const slice = createTravelerSlice(set, get);
      await slice.assignTravelersToLeg('leg-1', ['t1']);

      expect(set).toHaveBeenCalledWith({
        error: 'DB error',
        isLoading: false,
      });
    });
  });

  // -----------------------------------------------------------------------
  // removeTravelerFromLeg
  // -----------------------------------------------------------------------

  describe('removeTravelerFromLeg', () => {
    it('removes traveler by filtering assignedTravelers', async () => {
      storeState.trips = [createTrip([createLeg({ assignedTravelers: ['t1', 't2'] })])];

      const mockAssignTravelers = jest.fn();
      get.mockReturnValue({
        ...storeState,
        getLegById: (legId: string) => storeState.trips![0].legs.find(l => l.id === legId),
        assignTravelersToLeg: mockAssignTravelers,
      });

      const slice = createTravelerSlice(set, get);
      await slice.removeTravelerFromLeg('leg-1', 't1');

      expect(mockAssignTravelers).toHaveBeenCalledWith('leg-1', ['t2']);
    });

    it('does nothing if leg not found', async () => {
      get.mockReturnValue({
        ...storeState,
        getLegById: () => undefined,
        assignTravelersToLeg: jest.fn(),
      });

      const slice = createTravelerSlice(set, get);
      await slice.removeTravelerFromLeg('nonexistent', 't1');

      // No DB call, no error
      expect(mockUpdateTripLeg).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // updateTravelerFormData
  // -----------------------------------------------------------------------

  describe('updateTravelerFormData', () => {
    it('updates existing traveler form data', async () => {
      const existingFormData: TravelerFormData = {
        travelerId: 't1',
        formData: { name: 'John' },
        formStatus: 'not_started',
        completionPercentage: 0,
      };
      storeState.trips = [createTrip([createLeg({ travelerFormsData: [existingFormData] })])];

      const slice = createTravelerSlice(set, get);
      await slice.updateTravelerFormData('leg-1', 't1', 'email', 'john@test.com');

      expect(mockUpdateTripLeg).toHaveBeenCalledWith('leg-1', {
        travelerFormsData: [
          expect.objectContaining({
            travelerId: 't1',
            formData: { name: 'John', email: 'john@test.com' },
            formStatus: 'in_progress',
          }),
        ],
      });
    });

    it('creates new traveler entry if not found', async () => {
      storeState.trips = [createTrip([createLeg({ travelerFormsData: [] })])];

      const slice = createTravelerSlice(set, get);
      await slice.updateTravelerFormData('leg-1', 't1', 'name', 'John');

      expect(mockUpdateTripLeg).toHaveBeenCalledWith('leg-1', {
        travelerFormsData: [
          expect.objectContaining({
            travelerId: 't1',
            formData: { name: 'John' },
            formStatus: 'in_progress',
            completionPercentage: 0,
          }),
        ],
      });
    });

    it('does nothing if leg not found', async () => {
      get.mockReturnValue({
        ...storeState,
        getLegById: () => undefined,
      });

      const slice = createTravelerSlice(set, get);
      await slice.updateTravelerFormData('nonexistent', 't1', 'name', 'X');

      expect(mockUpdateTripLeg).not.toHaveBeenCalled();
    });

    it('sets error on failure', async () => {
      storeState.trips = [createTrip([createLeg({ travelerFormsData: [] })])];
      mockUpdateTripLeg.mockRejectedValue(new Error('write fail'));

      const slice = createTravelerSlice(set, get);
      await slice.updateTravelerFormData('leg-1', 't1', 'name', 'X');

      expect(set).toHaveBeenCalledWith({
        error: 'write fail',
      });
    });
  });

  // -----------------------------------------------------------------------
  // updateTravelerFormStatus
  // -----------------------------------------------------------------------

  describe('updateTravelerFormStatus', () => {
    it('updates status for existing traveler', async () => {
      const existingFormData: TravelerFormData = {
        travelerId: 't1',
        formData: {},
        formStatus: 'not_started',
        completionPercentage: 0,
      };
      storeState.trips = [createTrip([createLeg({ travelerFormsData: [existingFormData] })])];

      const slice = createTravelerSlice(set, get);
      await slice.updateTravelerFormStatus('leg-1', 't1', 'ready');

      expect(mockUpdateTripLeg).toHaveBeenCalledWith('leg-1', {
        travelerFormsData: [
          expect.objectContaining({
            travelerId: 't1',
            formStatus: 'ready',
          }),
        ],
      });
    });

    it('creates new entry for unknown traveler', async () => {
      storeState.trips = [createTrip([createLeg({ travelerFormsData: [] })])];

      const slice = createTravelerSlice(set, get);
      await slice.updateTravelerFormStatus('leg-1', 't1', 'submitted');

      expect(mockUpdateTripLeg).toHaveBeenCalledWith('leg-1', {
        travelerFormsData: [
          expect.objectContaining({
            travelerId: 't1',
            formData: {},
            formStatus: 'submitted',
            completionPercentage: 0,
          }),
        ],
      });
    });

    it('sets error on failure', async () => {
      storeState.trips = [createTrip([createLeg({ travelerFormsData: [] })])];
      mockUpdateTripLeg.mockRejectedValue(new Error('status fail'));

      const slice = createTravelerSlice(set, get);
      await slice.updateTravelerFormStatus('leg-1', 't1', 'ready');

      expect(set).toHaveBeenCalledWith({
        error: 'status fail',
      });
    });
  });

  // -----------------------------------------------------------------------
  // getTravelerFormData
  // -----------------------------------------------------------------------

  describe('getTravelerFormData', () => {
    it('returns form data for matching traveler', () => {
      const formData: TravelerFormData = {
        travelerId: 't1',
        formData: { name: 'John' },
        formStatus: 'in_progress',
        completionPercentage: 50,
      };
      storeState.trips = [createTrip([createLeg({ travelerFormsData: [formData] })])];

      const slice = createTravelerSlice(set, get);
      expect(slice.getTravelerFormData('leg-1', 't1')).toEqual(formData);
    });

    it('returns undefined for unknown traveler', () => {
      storeState.trips = [createTrip([createLeg({ travelerFormsData: [] })])];

      const slice = createTravelerSlice(set, get);
      expect(slice.getTravelerFormData('leg-1', 'unknown')).toBeUndefined();
    });

    it('returns undefined for unknown leg', () => {
      get.mockReturnValue({
        ...storeState,
        getLegById: () => undefined,
      });

      const slice = createTravelerSlice(set, get);
      expect(slice.getTravelerFormData('nonexistent', 't1')).toBeUndefined();
    });
  });
});
