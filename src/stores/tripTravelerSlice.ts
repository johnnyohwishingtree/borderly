import type { TravelerFormData } from '@/types/trip';
import { databaseService } from '@/services/storage';
import type { TripStore } from './useTripStoreTypes';

type Set = (
  partial:
    | Partial<TripStore>
    | ((state: TripStore) => Partial<TripStore>),
) => void;
type Get = () => TripStore;

/**
 * Multi-traveler slice: assign travelers to legs, update per-traveler
 * form data / status, and look up traveler form data.
 */
export function createTravelerSlice(set: Set, get: Get) {
  return {
    assignTravelersToLeg: async (legId: string, travelerIds: string[]) => {
      set({ isLoading: true, error: null });
      try {
        // Update database
        await databaseService.updateTripLeg(legId, {
          assignedTravelers: travelerIds,
        } as any);

        // Update local state
        set(state => ({
          trips: state.trips.map(trip => ({
            ...trip,
            legs: trip.legs.map(leg =>
              leg.id === legId
                ? {
                    ...leg,
                    assignedTravelers: travelerIds,
                    // Initialize traveler forms data if not exists
                    travelerFormsData: travelerIds.map(travelerId => {
                      const existing = leg.travelerFormsData?.find(t => t.travelerId === travelerId);
                      return existing || {
                        travelerId,
                        formData: {},
                        formStatus: 'not_started' as const,
                        completionPercentage: 0,
                      };
                    }),
                  }
                : leg
            )
          })),
          isLoading: false,
        }));
      } catch (error) {
        console.error('Failed to assign travelers to leg:', error);
        set({
          error: error instanceof Error ? error.message : 'Failed to assign travelers',
          isLoading: false,
        });
      }
    },

    removeTravelerFromLeg: async (legId: string, travelerId: string) => {
      const leg = get().getLegById(legId);
      if (!leg) return;

      const updatedTravelers = (leg.assignedTravelers || []).filter(id => id !== travelerId);
      await get().assignTravelersToLeg(legId, updatedTravelers);
    },

    updateTravelerFormData: async (legId: string, travelerId: string, fieldId: string, value: unknown) => {
      set({ error: null });
      try {
        const leg = get().getLegById(legId);
        if (!leg) return;

        const existingFormsData = leg.travelerFormsData || [];
        const existingIndex = existingFormsData.findIndex(t => t.travelerId === travelerId);

        let updatedTravelerFormsData: TravelerFormData[];
        if (existingIndex >= 0) {
          updatedTravelerFormsData = existingFormsData.map((t, i) =>
            i === existingIndex
              ? {
                  ...t,
                  formData: { ...t.formData, [fieldId]: value },
                  formStatus: 'in_progress' as const,
                }
              : t
          );
        } else {
          updatedTravelerFormsData = [
            ...existingFormsData,
            {
              travelerId,
              formData: { [fieldId]: value },
              formStatus: 'in_progress' as const,
              completionPercentage: 0,
            },
          ];
        }

        // Persist to database
        await databaseService.updateTripLeg(legId, { travelerFormsData: updatedTravelerFormsData });

        // Update in-memory state
        set(state => ({
          trips: state.trips.map(trip => ({
            ...trip,
            legs: trip.legs.map(l =>
              l.id !== legId ? l : { ...l, travelerFormsData: updatedTravelerFormsData }
            ),
          })),
        }));
      } catch (error) {
        console.error('Failed to update traveler form data:', error);
        set({ error: error instanceof Error ? error.message : 'Failed to update form data' });
      }
    },

    updateTravelerFormStatus: async (legId: string, travelerId: string, status: 'not_started' | 'in_progress' | 'ready' | 'submitted') => {
      set({ error: null });
      try {
        const leg = get().getLegById(legId);
        if (!leg) return;

        const existingFormsData = leg.travelerFormsData || [];
        const existingIndex = existingFormsData.findIndex(t => t.travelerId === travelerId);

        let updatedTravelerFormsData: TravelerFormData[];
        if (existingIndex >= 0) {
          updatedTravelerFormsData = existingFormsData.map((t, i) =>
            i === existingIndex ? { ...t, formStatus: status } : t
          );
        } else {
          updatedTravelerFormsData = [
            ...existingFormsData,
            {
              travelerId,
              formData: {},
              formStatus: status,
              completionPercentage: 0,
            },
          ];
        }

        // Persist to database
        await databaseService.updateTripLeg(legId, { travelerFormsData: updatedTravelerFormsData });

        // Update in-memory state
        set(state => ({
          trips: state.trips.map(trip => ({
            ...trip,
            legs: trip.legs.map(l =>
              l.id !== legId ? l : { ...l, travelerFormsData: updatedTravelerFormsData }
            ),
          })),
        }));
      } catch (error) {
        console.error('Failed to update traveler form status:', error);
        set({ error: error instanceof Error ? error.message : 'Failed to update form status' });
      }
    },

    getTravelerFormData: (legId: string, travelerId: string) => {
      const leg = get().getLegById(legId);
      if (!leg) return undefined;

      return leg.travelerFormsData?.find(t => t.travelerId === travelerId);
    },
  };
}
