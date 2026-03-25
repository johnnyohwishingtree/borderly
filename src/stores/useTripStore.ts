import { create } from 'zustand';
import type { Trip, TripLeg, LegSubmissionStatus } from '@/types/trip';
import { databaseService, TripQueryOptions } from '@/services/storage';
import {
  scheduleDeadlineNotifications,
  cancelLegNotifications,
  cancelTripNotifications,
} from '@/services/deadline/notificationScheduler';
import { computeLegDeadline } from '@/services/deadline/deadlineService';
import { SchemaRegistry } from '@/services/schemas/schemaRegistry';
import { cloneTrip } from '@/services/trips/tripDuplicateService';
import type { TripStore } from './useTripStoreTypes';
import { mapTripModelToTrip } from './tripModelMapper';
import { createTravelerSlice } from './tripTravelerSlice';

export type { TripStore } from './useTripStoreTypes';

export const useTripStore = create<TripStore>((set, get) => ({
  // Initial state
  trips: [],
  currentTrip: null,
  isLoading: false,
  isLoadingMore: false,
  error: null,

  // Pagination state
  currentPage: 0,
  pageSize: 20,
  totalTrips: 0,
  hasMoreTrips: true,

  // Trip operations with optimized loading
  loadTrips: async (options = {}) => {
    const { refresh = false, status } = options;
    const state = get();

    // If refresh is true, reset pagination
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
        ...(status && { status }), // Only include status if it's defined
        pagination: {
          limit: state.pageSize,
          offset: refresh ? 0 : 0 // Always start from 0 for initial load
        },
        sortBy: 'updated_at',
        sortOrder: 'desc'
      };

      // Use optimized batch loading method
      const tripsWithLegs = await databaseService.getTripsWithLegs(queryOptions);
      const totalTrips = await databaseService.getTripCount(status);

      // Convert to plain objects
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

      // Convert to plain objects
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

      // Cancel all scheduled notifications for this trip before removing state
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

  // Trip leg operations
  addTripLeg: async (tripId, legData) => {
    set({ isLoading: true, error: null });
    try {
      const legModel = await databaseService.createTripLeg({
        ...legData,
        tripId,
        arrivalDate: new Date(legData.arrivalDate),
        departureDate: legData.departureDate ? new Date(legData.departureDate) : undefined,
      } as any);

      const newLeg: TripLeg = {
        id: legModel.id,
        tripId,
        ...legData,
        submissionStatus: legData.submissionStatus || 'not_started',
        assignedTravelers: legData.assignedTravelers || [], // Default to empty array
        travelerFormsData: legData.travelerFormsData || [], // Default to empty array
      };

      set(state => ({
        trips: state.trips.map(trip =>
          trip.id === tripId
            ? { ...trip, legs: [...trip.legs, newLeg] }
            : trip
        ),
        isLoading: false,
      }));

      // Schedule deadline notifications for the new leg (fire-and-forget)
      const updatedTrip = get().getTripById(tripId);
      if (updatedTrip) {
        const schema = SchemaRegistry.getInstance().getSchema(newLeg.destinationCountry);
        if (schema) {
          const deadline = computeLegDeadline(newLeg, schema);
          scheduleDeadlineNotifications(updatedTrip, [deadline]).catch(() => {/* fire-and-forget */});
        }
      }
    } catch (error) {
      console.error('Failed to add trip leg:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to add trip leg',
        isLoading: false,
      });
    }
  },

  updateTripLeg: async (legId, updates) => {
    set({ isLoading: true, error: null });
    try {
      await databaseService.updateTripLeg(legId, {
        ...updates,
        arrivalDate: updates.arrivalDate ? new Date(updates.arrivalDate) : undefined,
        departureDate: updates.departureDate ? new Date(updates.departureDate) : undefined,
      } as any);

      set(state => ({
        trips: state.trips.map(trip => ({
          ...trip,
          legs: trip.legs.map(leg =>
            leg.id === legId ? { ...leg, ...updates } : leg
          ),
        })),
        isLoading: false,
      }));

      // Post-update notification logic (fire-and-forget)
      const updatedLeg = get().getLegById(legId);
      const trip = get().trips.find(t => t.legs.some(l => l.id === legId));
      if (updatedLeg) {
        if (updates.formStatus === 'ready' || updates.formStatus === 'submitted') {
          // Leg is complete — cancel its pending notifications
          cancelLegNotifications(legId, trip?.id).catch(() => {/* fire-and-forget */});
        } else if (updates.departureDate !== undefined) {
          // Departure date changed — reschedule (cancel then re-schedule)
          if (trip) {
            const schema = SchemaRegistry.getInstance().getSchema(updatedLeg.destinationCountry);
            if (schema) {
              cancelLegNotifications(legId, trip.id)
                .then(() => {
                  const deadline = computeLegDeadline(updatedLeg, schema);
                  return scheduleDeadlineNotifications(trip, [deadline]);
                })
                .catch(() => {/* fire-and-forget */});
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to update trip leg:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to update trip leg',
        isLoading: false,
      });
    }
  },

  removeTripLeg: async (legId) => {
    // Cancel notifications before removing from state
    const legTrip = get().trips.find(t => t.legs.some(l => l.id === legId));
    cancelLegNotifications(legId, legTrip?.id).catch(() => {/* fire-and-forget */});

    // Persist deletion to database before updating in-memory state
    await databaseService.deleteTripLeg(legId);

    set(state => ({
      trips: state.trips.map(trip => ({
        ...trip,
        legs: trip.legs.filter(leg => leg.id !== legId),
      })),
    }));
  },

  reorderTripLegs: async (tripId, legIds) => {
    // Persist new order to database before updating in-memory state
    await Promise.all(
      legIds.map((legId, index) => databaseService.updateTripLeg(legId, { order: index }))
    );

    set(state => ({
      trips: state.trips.map(trip => {
        if (trip.id !== tripId) {return trip;}

        const reorderedLegs = legIds.map((legId, index) => {
          const leg = trip.legs.find(l => l.id === legId);
          return leg ? { ...leg, order: index } : null;
        }).filter(Boolean) as TripLeg[];

        return { ...trip, legs: reorderedLegs };
      }),
    }));
  },

  // QR code operations
  addQRCode: async (legId, qrData) => {
    try {
      await databaseService.saveQRCode({
        ...qrData,
        legId,
      });

      // Instead of reloading all trips, just update the specific leg
      const qrCodes = await databaseService.getQRCodes(legId);
      const formattedQrCodes = qrCodes.map(qr => ({
        id: qr.id,
        legId: (qr as any).legId,
        type: (qr as any).type,
        imageBase64: (qr as any).imageBase64,
        savedAt: (qr as any).savedAtISO,
        label: (qr as any).label,
      }));

      set(state => ({
        trips: state.trips.map(trip => ({
          ...trip,
          legs: trip.legs.map(leg =>
            leg.id === legId
              ? { ...leg, qrCodes: formattedQrCodes }
              : leg
          )
        }))
      }));
    } catch (error) {
      console.error('Failed to add QR code:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to add QR code' });
    }
  },

  removeQRCode: async (qrId) => {
    try {
      await databaseService.deleteQRCode(qrId);

      // Update state by removing the QR code from the appropriate leg
      set(state => ({
        trips: state.trips.map(trip => ({
          ...trip,
          legs: trip.legs.map(leg => ({
            ...leg,
            qrCodes: (leg.qrCodes || []).filter(qr => qr.id !== qrId)
          }))
        }))
      }));
    } catch (error) {
      console.error('Failed to remove QR code:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to remove QR code' });
    }
  },

  getQRCodesForLeg: (legId) => {
    const trips = get().trips;
    for (const trip of trips) {
      for (const leg of trip.legs) {
        if (leg.id === legId) {
          return leg.qrCodes || [];
        }
      }
    }
    return [];
  },

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

    // Persist the new trip (without legs first, then add each leg)
    const newTrip = await get().createTrip({ ...clonedTripData, legs: [] });

    for (const legData of clonedLegsData) {
      await get().addTripLeg(newTrip.id, legData);
    }

    // Return the fully-populated trip (with legs attached by addTripLeg)
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

  // Multi-traveler operations (delegated to slice)
  ...createTravelerSlice(set, get),
}));
