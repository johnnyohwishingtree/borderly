import { create } from 'zustand';
import type { Trip, LegSubmissionStatus } from '@/types/trip';
import { databaseService } from '@/services/storage';
import { cancelTripNotifications } from '@/services/deadline/notificationScheduler';
import { cloneTrip } from '@/services/trips/tripDuplicateService';
import type { TripStore } from './useTripStoreTypes';
import { createTravelerSlice } from './tripTravelerSlice';
import { createLegSlice } from './tripStoreLegSlice';
import { createQRSlice } from './tripStoreQRSlice';
import { createLoadingSlice } from './tripStoreLoadingSlice';

export type { TripStore } from './useTripStoreTypes';

export const useTripStore = create<TripStore>((set, get) => ({
  // Initial state
  trips: [],
  currentTrip: null,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  currentPage: 0,
  pageSize: 20,
  totalTrips: 0,
  hasMoreTrips: true,

  // Loading operations (delegated to slice)
  ...createLoadingSlice(set, get),

  // Trip CRUD
  createTrip: async (tripData) => {
    set({ isLoading: true, error: null });
    try {
      const tripModel = await databaseService.createTrip(tripData);

      const newTrip: Trip = {
        id: tripModel.id,
        name: tripData.name,
        status: tripData.status,
        legs: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      set(state => ({
        trips: [...state.trips, newTrip],
        isLoading: false,
      }));

      return newTrip;
    } catch (error) {
      console.error('Failed to create trip:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create trip';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  updateTrip: async (tripId, updates) => {
    set({ isLoading: true, error: null });
    try {
      await databaseService.updateTrip(tripId, {
        ...updates,
        createdAt: updates.createdAt ? new Date(updates.createdAt) : undefined,
        updatedAt: new Date(),
      } as any);

      set(state => ({
        trips: state.trips.map(trip =>
          trip.id === tripId
            ? { ...trip, ...updates, updatedAt: new Date().toISOString() }
            : trip
        ),
        currentTrip: state.currentTrip?.id === tripId
          ? { ...state.currentTrip, ...updates, updatedAt: new Date().toISOString() }
          : state.currentTrip,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Failed to update trip:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to update trip',
        isLoading: false,
      });
    }
  },

  deleteTrip: async (tripId) => {
    set({ isLoading: true, error: null });
    try {
      await databaseService.deleteTrip(tripId);
      cancelTripNotifications(tripId).catch(() => {/* fire-and-forget */});

      set(state => ({
        trips: state.trips.filter(trip => trip.id !== tripId),
        currentTrip: state.currentTrip?.id === tripId ? null : state.currentTrip,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Failed to delete trip:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to delete trip',
        isLoading: false,
      });
    }
  },

  setCurrentTrip: (trip) => {
    set({ currentTrip: trip });
  },

  // Leg operations (delegated to slice)
  ...createLegSlice(set, get),

  // QR code operations (delegated to slice)
  ...createQRSlice(set, get),

  // Multi-traveler operations (delegated to slice)
  ...createTravelerSlice(set, get),

  // Utilities
  getTripById: (tripId) => {
    return get().trips.find(trip => trip.id === tripId);
  },

  getLegById: (legId) => {
    const trips = get().trips;
    for (const trip of trips) {
      const leg = trip.legs.find(l => l.id === legId);
      if (leg) {return leg;}
    }
    return undefined;
  },

  getActiveTrips: () => {
    return get().trips.filter(trip => trip.status === 'active');
  },

  getUpcomingTrips: () => {
    return get().trips.filter(trip => trip.status === 'upcoming');
  },

  clearError: () => {
    set({ error: null });
  },

  // Trip duplication
  duplicateTrip: async (sourceTripId, newDepartureDate) => {
    const sourceTrip = get().getTripById(sourceTripId);
    if (!sourceTrip) {
      throw new Error(`Trip not found: ${sourceTripId}`);
    }

    const { trip: clonedTripData, legs: clonedLegsData } = cloneTrip(sourceTrip, newDepartureDate);
    const newTrip = await get().createTrip({ ...clonedTripData, legs: [] });

    for (const legData of clonedLegsData) {
      await get().addTripLeg(newTrip.id, legData);
    }

    return get().getTripById(newTrip.id) ?? newTrip;
  },

  // Submission status
  markLegAsSubmitted: async (legId) => {
    await get().updateTripLeg(legId, { formStatus: 'submitted' });
  },

  updateLegSubmissionStatus: async (legId: string, status: LegSubmissionStatus) => {
    set({ error: null });
    try {
      await databaseService.updateTripLeg(legId, { submissionStatus: status });

      set(state => ({
        trips: state.trips.map(trip => ({
          ...trip,
          legs: trip.legs.map(leg =>
            leg.id === legId ? { ...leg, submissionStatus: status } : leg
          ),
        })),
      }));
    } catch (error) {
      console.error('Failed to update leg submission status:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to update submission status' });
    }
  },
}));
