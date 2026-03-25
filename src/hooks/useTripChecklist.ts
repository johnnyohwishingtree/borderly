import { useState, useEffect } from 'react';
import { TravelerProfile } from '../types/profile';
import { CountryFormSchema } from '../types/schema';
import { TripChecklist } from '../services/checklist/checklistTypes';
import { computeTripChecklist } from '../services/checklist/checklistService';
import { getSchemaByCountryCode } from '../schemas';
import { useProfileStore } from '../stores/useProfileStore';
import { useTripStore } from '../stores/useTripStore';

export interface UseTripChecklistResult {
  checklist: TripChecklist | null;
  isLoading: boolean;
}

/**
 * Computes a TripChecklist for the given trip.
 *
 * Loads profiles, schemas, and QR codes, then calls computeTripChecklist.
 * Returns null when tripId is not found or has no legs.
 */
export function useTripChecklist(tripId: string): UseTripChecklistResult {
  const getAllProfiles = useProfileStore(state => state.getAllProfiles);
  const trips = useTripStore(state => state.trips);
  const trip = trips.find(t => t.id === tripId) ?? null;

  const [checklist, setChecklist] = useState<TripChecklist | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!trip || trip.legs.length === 0) {
      setChecklist(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const compute = async () => {
      try {
        const profileMap = await getAllProfiles();
        const profiles: TravelerProfile[] = Array.from(profileMap.values());

        const uniqueCodes = Array.from(
          new Set(trip.legs.map(l => l.destinationCountry)),
        );
        const schemaEntries = await Promise.all(
          uniqueCodes.map(async code => {
            const schema = await getSchemaByCountryCode(code);
            return [code, schema] as [string, CountryFormSchema | null];
          }),
        );
        const schemas: Record<string, CountryFormSchema> = Object.fromEntries(
          schemaEntries.filter(
            (entry): entry is [string, CountryFormSchema] => entry[1] !== null,
          ),
        );

        const qrCodes = trip.legs.flatMap(l => l.qrCodes ?? []);
        const result = computeTripChecklist(trip, profiles, schemas, qrCodes);

        if (!cancelled) {
          setChecklist(result);
        }
      } catch (err) {
        console.error('useTripChecklist: failed to compute checklist', err);
        if (!cancelled) {
          setChecklist(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    compute();

    return () => {
      cancelled = true;
    };
  }, [trip, getAllProfiles]);

  return { checklist, isLoading };
}
