import type { TripLeg } from '@/types/trip';
import { databaseService } from '@/services/storage';
import {
  scheduleDeadlineNotifications,
  cancelLegNotifications,
} from '@/services/deadline/notificationScheduler';
import { computeLegDeadline } from '@/services/deadline/deadlineService';
import { SchemaRegistry } from '@/services/schemas/schemaRegistry';
import type { TripStore } from './useTripStoreTypes';

type Set = (
  partial:
    | Partial<TripStore>
    | ((state: TripStore) => Partial<TripStore>),
) => void;
type Get = () => TripStore;

export function createLegSlice(set: Set, get: Get) {
  return {
    addTripLeg: async (tripId: string, legData: Omit<TripLeg, 'id' | 'tripId'>) => {
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
          assignedTravelers: legData.assignedTravelers || [],
          travelerFormsData: legData.travelerFormsData || [],
        };

        set(state => ({
          trips: state.trips.map(trip =>
            trip.id === tripId
              ? { ...trip, legs: [...trip.legs, newLeg] }
              : trip
          ),
          isLoading: false,
        }));

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

    updateTripLeg: async (legId: string, updates: Partial<TripLeg>) => {
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

        const updatedLeg = get().getLegById(legId);
        const trip = get().trips.find(t => t.legs.some(l => l.id === legId));
        if (updatedLeg) {
          if (updates.formStatus === 'ready' || updates.formStatus === 'submitted') {
            cancelLegNotifications(legId, trip?.id).catch(() => {/* fire-and-forget */});
          } else if (updates.departureDate !== undefined) {
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

    removeTripLeg: async (legId: string) => {
      const legTrip = get().trips.find(t => t.legs.some(l => l.id === legId));
      cancelLegNotifications(legId, legTrip?.id).catch(() => {/* fire-and-forget */});

      await databaseService.deleteTripLeg(legId);

      set(state => ({
        trips: state.trips.map(trip => ({
          ...trip,
          legs: trip.legs.filter(leg => leg.id !== legId),
        })),
      }));
    },

    reorderTripLegs: async (tripId: string, legIds: string[]) => {
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
  };
}
