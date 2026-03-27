/**
 * Tests for tripStoreLoadingSlice: createLoadingSlice
 */

import type { TripStore } from '../../src/stores/useTripStoreTypes';
import type { Trip } from '../../src/types/trip';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

const mockInitialize = jest.fn();
const mockGetTripsWithLegs = jest.fn();
const mockGetTripCount = jest.fn();

jest.mock('@/services/storage', () => ({
  databaseService: {
    initialize: (...args: unknown[]) => mockInitialize(...args),
    getTripsWithLegs: (...args: unknown[]) => mockGetTripsWithLegs(...args),
    getTripCount: (...args: unknown[]) => mockGetTripCount(...args),
  },
  TripQueryOptions: {},
}));

jest.mock('../../src/stores/tripModelMapper', () => ({
  mapTripModelToTrip: (tripModel: any, legModels: any[]) => ({
    id: tripModel.id,
    name: tripModel.name,
    status: tripModel.status,
    legs: legModels.map(l => ({ id: l.id, tripId: tripModel.id })),
    createdAt: tripModel.createdAtISO,
    updatedAt: tripModel.updatedAtISO,
  }),
}));

import { createLoadingSlice } from '../../src/stores/tripStoreLoadingSlice';

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function createTripModel(id = 'trip-1') {
  return {
    id,
    name: 'Test Trip',
    status: 'upcoming',
    createdAtISO: '2025-01-01T00:00:00Z',
    updatedAtISO: '2025-01-01T00:00:00Z',
  };
}

function createLegModel(id = 'leg-1') {
  return { id };
}

function createStoreState(overrides: Partial<TripStore> = {}): Partial<TripStore> {
  return {
    trips: [],
    isLoading: false,
    isLoadingMore: false,
    error: null,
    currentPage: 0,
    pageSize: 10,
    totalTrips: 0,
    hasMoreTrips: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createLoadingSlice', () => {
  let set: jest.Mock;
  let get: jest.Mock;
  let storeState: Partial<TripStore>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockInitialize.mockResolvedValue(undefined);
    mockGetTripsWithLegs.mockResolvedValue([]);
    mockGetTripCount.mockResolvedValue(0);

    storeState = createStoreState();

    set = jest.fn((partial) => {
      if (typeof partial === 'function') {
        const updates = partial(storeState as TripStore);
        Object.assign(storeState, updates);
      } else {
        Object.assign(storeState, partial);
      }
    });

    get = jest.fn(() => storeState as TripStore);
  });

  // -----------------------------------------------------------------------
  // loadTrips
  // -----------------------------------------------------------------------

  describe('loadTrips', () => {
    it('sets isLoading true and initializes database', async () => {
      const slice = createLoadingSlice(set, get);
      await slice.loadTrips();

      expect(set).toHaveBeenCalledWith({ isLoading: true, error: null });
      expect(mockInitialize).toHaveBeenCalledWith();
    });

    it('loads trips and sets them in state', async () => {
      const tripModel = createTripModel();
      const legModel = createLegModel();
      mockGetTripsWithLegs.mockResolvedValue([{ trip: tripModel, legs: [legModel] }]);
      mockGetTripCount.mockResolvedValue(1);

      const slice = createLoadingSlice(set, get);
      await slice.loadTrips();

      expect(set).toHaveBeenCalledWith(expect.objectContaining({
        isLoading: false,
        totalTrips: 1,
        currentPage: 1,
      }));
    });

    it('sets hasMoreTrips to true when more trips exist', async () => {
      mockGetTripsWithLegs.mockResolvedValue([
        { trip: createTripModel('t1'), legs: [] },
      ]);
      mockGetTripCount.mockResolvedValue(5);

      const slice = createLoadingSlice(set, get);
      await slice.loadTrips();

      const lastSetCall = set.mock.calls[set.mock.calls.length - 1][0];
      expect(lastSetCall.hasMoreTrips).toBe(true);
    });

    it('sets hasMoreTrips to false when all trips loaded', async () => {
      mockGetTripsWithLegs.mockResolvedValue([
        { trip: createTripModel('t1'), legs: [] },
      ]);
      mockGetTripCount.mockResolvedValue(1);

      const slice = createLoadingSlice(set, get);
      await slice.loadTrips();

      const lastSetCall = set.mock.calls[set.mock.calls.length - 1][0];
      expect(lastSetCall.hasMoreTrips).toBe(false);
    });

    it('resets trips on refresh', async () => {
      const slice = createLoadingSlice(set, get);
      await slice.loadTrips({ refresh: true });

      expect(set).toHaveBeenCalledWith(expect.objectContaining({
        isLoading: true,
        error: null,
        trips: [],
        currentPage: 0,
        hasMoreTrips: true,
      }));
    });

    it('passes status filter to query options', async () => {
      const slice = createLoadingSlice(set, get);
      await slice.loadTrips({ status: 'active' });

      expect(mockGetTripsWithLegs).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' })
      );
      expect(mockGetTripCount).toHaveBeenCalledWith('active');
    });

    it('sets error on failure', async () => {
      mockInitialize.mockRejectedValue(new Error('DB init failed'));

      const slice = createLoadingSlice(set, get);
      await slice.loadTrips();

      expect(set).toHaveBeenCalledWith({
        error: 'DB init failed',
        isLoading: false,
      });
    });

    it('handles non-Error thrown values', async () => {
      mockInitialize.mockRejectedValue('string error');

      const slice = createLoadingSlice(set, get);
      await slice.loadTrips();

      expect(set).toHaveBeenCalledWith({
        error: 'Failed to load trips',
        isLoading: false,
      });
    });
  });

  // -----------------------------------------------------------------------
  // loadMoreTrips
  // -----------------------------------------------------------------------

  describe('loadMoreTrips', () => {
    it('does nothing when already loading more', async () => {
      storeState = createStoreState({ isLoadingMore: true });
      get.mockReturnValue(storeState);

      const slice = createLoadingSlice(set, get);
      await slice.loadMoreTrips();

      expect(mockGetTripsWithLegs).not.toHaveBeenCalled();
    });

    it('does nothing when no more trips available', async () => {
      storeState = createStoreState({ hasMoreTrips: false });
      get.mockReturnValue(storeState);

      const slice = createLoadingSlice(set, get);
      await slice.loadMoreTrips();

      expect(mockGetTripsWithLegs).not.toHaveBeenCalled();
    });

    it('loads more trips with correct offset', async () => {
      storeState = createStoreState({
        currentPage: 2,
        pageSize: 10,
        hasMoreTrips: true,
        isLoadingMore: false,
      });
      get.mockReturnValue(storeState);

      mockGetTripsWithLegs.mockResolvedValue([
        { trip: createTripModel('t3'), legs: [] },
      ]);

      const slice = createLoadingSlice(set, get);
      await slice.loadMoreTrips();

      expect(mockGetTripsWithLegs).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: { limit: 10, offset: 20 },
        })
      );
    });

    it('appends new trips to existing trips', async () => {
      const existingTrip = { id: 't1', name: 'Existing', status: 'upcoming', legs: [], createdAt: '', updatedAt: '' } as Trip;
      storeState = createStoreState({
        trips: [existingTrip],
        currentPage: 1,
        hasMoreTrips: true,
        isLoadingMore: false,
        totalTrips: 5,
      });
      get.mockReturnValue(storeState);

      mockGetTripsWithLegs.mockResolvedValue([
        { trip: createTripModel('t2'), legs: [] },
      ]);

      const slice = createLoadingSlice(set, get);
      await slice.loadMoreTrips();

      // Check the functional updater
      const functionalCall = set.mock.calls.find(
        (call: any) => typeof call[0] === 'function'
      );
      expect(functionalCall).not.toBeUndefined();
      const result = functionalCall![0]({
        trips: [existingTrip],
        currentPage: 1,
        totalTrips: 5,
      });
      expect(result.trips).toHaveLength(2);
      expect(result.currentPage).toBe(2);
    });

    it('sets error on failure', async () => {
      storeState = createStoreState({ hasMoreTrips: true, isLoadingMore: false });
      get.mockReturnValue(storeState);
      mockGetTripsWithLegs.mockRejectedValue(new Error('load more fail'));

      const slice = createLoadingSlice(set, get);
      await slice.loadMoreTrips();

      expect(set).toHaveBeenCalledWith({
        error: 'load more fail',
        isLoadingMore: false,
      });
    });
  });
});
