import type { Trip } from '@/types/trip';
import { databaseService, TripQueryOptions } from '@/services/storage';
import type { TripStore } from './useTripStoreTypes';
import { mapTripModelToTrip } from './tripModelMapper';

type Set = (
  partial:
    | Partial<TripStore>
    | ((state: TripStore) => Partial<TripStore>),
) => void;
type Get = () => TripStore;

export function createLoadingSlice(set: Set, get: Get) {
  return {
    loadTrips: async (options: { refresh?: boolean; status?: 'upcoming' | 'active' | 'completed' } = {}) => {
      const { refresh = false, status } = options;
      const state = get();

      if (refresh) {
        set({
          isLoading: true,
          error: null,
          trips: [],
          currentPage: 0,
          hasMoreTrips: true
        });
      } else {
        set({ isLoading: true, error: null });
      }

      try {
        await databaseService.initialize();

        const queryOptions: TripQueryOptions = {
          ...(status && { status }),
          pagination: {
            limit: state.pageSize,
            offset: refresh ? 0 : 0
          },
          sortBy: 'updated_at',
          sortOrder: 'desc'
        };

        const tripsWithLegs = await databaseService.getTripsWithLegs(queryOptions);
        const totalTrips = await databaseService.getTripCount(status);

        const trips: Trip[] = tripsWithLegs.map(({ trip: tripModel, legs: legModels }) =>
          mapTripModelToTrip(tripModel, legModels)
        );

        set({
          trips,
          isLoading: false,
          totalTrips,
          currentPage: 1,
          hasMoreTrips: trips.length < totalTrips
        });
      } catch (error) {
        console.error('Failed to load trips:', error);
        set({
          error: error instanceof Error ? error.message : 'Failed to load trips',
          isLoading: false,
        });
      }
    },

    loadMoreTrips: async () => {
      const state = get();

      if (state.isLoadingMore || !state.hasMoreTrips) {
        return;
      }

      set({ isLoadingMore: true, error: null });

      try {
        const queryOptions: TripQueryOptions = {
          pagination: {
            limit: state.pageSize,
            offset: state.currentPage * state.pageSize
          },
          sortBy: 'updated_at',
          sortOrder: 'desc'
        };

        const tripsWithLegs = await databaseService.getTripsWithLegs(queryOptions);

        const newTrips: Trip[] = tripsWithLegs.map(({ trip: tripModel, legs: legModels }) =>
          mapTripModelToTrip(tripModel, legModels)
        );

        set(currentState => ({
          trips: [...currentState.trips, ...newTrips],
          isLoadingMore: false,
          currentPage: currentState.currentPage + 1,
          hasMoreTrips: (currentState.trips.length + newTrips.length) < currentState.totalTrips
        }));
      } catch (error) {
        console.error('Failed to load more trips:', error);
        set({
          error: error instanceof Error ? error.message : 'Failed to load more trips',
          isLoadingMore: false,
        });
      }
    },
  };
}
