import { create } from 'zustand';
import { Trip, TripLeg, SavedQRCode } from '@/types/trip';
import { databaseService } from '@/services/storage';

interface TripStore {
  // State
  trips: Trip[];
  currentTrip: Trip | null;
  isLoading: boolean;
  error: string | null;

  // Trip operations
  loadTrips: () => Promise<void>;
  createTrip: (tripData: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Trip>;
  updateTrip: (tripId: string, updates: Partial<Trip>) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  setCurrentTrip: (trip: Trip | null) => void;

  // Trip leg operations
  addTripLeg: (tripId: string, legData: Omit<TripLeg, 'id' | 'tripId'>) => Promise<void>;
  updateTripLeg: (legId: string, updates: Partial<TripLeg>) => Promise<void>;
  removeTripLeg: (legId: string) => Promise<void>;
  reorderTripLegs: (tripId: string, legIds: string[]) => Promise<void>;

  // QR code operations
  addQRCode: (legId: string, qrData: Omit<SavedQRCode, 'id' | 'legId' | 'savedAt'>) => Promise<void>;
  removeQRCode: (qrId: string) => Promise<void>;
  getQRCodesForLeg: (legId: string) => SavedQRCode[];

  // Utilities
  getTripById: (tripId: string) => Trip | undefined;
  getLegById: (legId: string) => TripLeg | undefined;
  getActiveTrips: () => Trip[];
  getUpcomingTrips: () => Trip[];
  clearError: () => void;
}

export const useTripStore = create<TripStore>((set, get) => ({
  // Initial state
  trips: [],
  currentTrip: null,
  isLoading: false,
  error: null,

  // Trip operations
  loadTrips: async () => {
    set({ isLoading: true, error: null });
    try {
      await databaseService.initialize();
      const tripModels = await databaseService.getTrips();

      // Convert WatermelonDB models to plain objects
      const trips: Trip[] = tripModels.map(model => ({
        id: model.id,
        name: (model as any).name,
        status: (model as any).status,
        legs: [], // Will be loaded separately
        createdAt: (model as any).createdAtISO,
        updatedAt: (model as any).updatedAtISO,
      }));

      // Load legs for each trip
      for (const trip of trips) {
        const legModels = await databaseService.getTripLegs(trip.id);
        trip.legs = legModels.map(model => ({
          id: model.id,
          tripId: trip.id,
          destinationCountry: (model as any).destinationCountry,
          arrivalDate: (model as any).arrivalDateISO,
          departureDate: (model as any).departureDateISO,
          flightNumber: (model as any).flightNumber,
          airlineCode: (model as any).airlineCode,
          arrivalAirport: (model as any).arrivalAirport,
          accommodation: (model as any).accommodation,
          formStatus: (model as any).formStatus,
          formData: (model as any).formData,
          order: (model as any).order,
          qrCodes: [], // Will be loaded if needed
        }));
      }

      set({ trips, isLoading: false });
    } catch (error) {
      console.error('Failed to load trips:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load trips',
        isLoading: false,
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
      };

      set(state => ({
        trips: state.trips.map(trip =>
          trip.id === tripId
            ? { ...trip, legs: [...trip.legs, newLeg] }
            : trip
        ),
        isLoading: false,
      }));
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
    } catch (error) {
      console.error('Failed to update trip leg:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to update trip leg',
        isLoading: false,
      });
    }
  },

  removeTripLeg: async (legId) => {
    // Implementation would delete the leg from database
    // For now, just remove from state
    set(state => ({
      trips: state.trips.map(trip => ({
        ...trip,
        legs: trip.legs.filter(leg => leg.id !== legId),
      })),
    }));
  },

  reorderTripLegs: async (tripId, legIds) => {
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

      // Reload trips to get updated QR codes
      await get().loadTrips();
    } catch (error) {
      console.error('Failed to add QR code:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to add QR code' });
    }
  },

  removeQRCode: async (qrId) => {
    try {
      await databaseService.deleteQRCode(qrId);
      // Reload trips to get updated QR codes
      await get().loadTrips();
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
}));
