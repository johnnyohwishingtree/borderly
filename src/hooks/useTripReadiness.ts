import { useState, useEffect } from 'react';
import { Trip } from '../types/trip';
import { TravelerProfile } from '../types/profile';
import { CountryFormSchema } from '../types/schema';
import { TripReadiness } from '../services/readiness/readinessTypes';
import { computeTripReadiness } from '../services/readiness';
import { getSchemaByCountryCode } from '../schemas';
import { useProfileStore } from '../stores/useProfileStore';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface UseTripReadinessResult {
  /** Aggregated readiness snapshot for the trip, or null if not yet computed. */
  tripReadiness: TripReadiness | null;
  /** True while the async computation is in flight. */
  isLoading: boolean;
}

/**
 * Computes a TripReadiness snapshot for the given trip asynchronously.
 *
 * - Loads all traveler profiles from the OS Keychain via useProfileStore.
 * - Loads country schemas for each unique destination in the trip.
 * - Collects QR codes already stored on each leg.
 * - Calls computeTripReadiness and returns the result once available.
 *
 * Returns `{ tripReadiness: null, isLoading: false }` when `trip` is null or
 * the trip has no legs.
 */
export function useTripReadiness(trip: Trip | null): UseTripReadinessResult {
  const getAllProfiles = useProfileStore(state => state.getAllProfiles);

  const [tripReadiness, setTripReadiness] = useState<TripReadiness | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!trip || trip.legs.length === 0) {
      setTripReadiness(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const compute = async () => {
      try {
        // Load all profiles
        const profileMap = await getAllProfiles();
        const profiles: TravelerProfile[] = Array.from(profileMap.values());

        // Load schemas for each unique country code in this trip
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

        // Collect all QR codes already stored on each leg
        const qrCodes = trip.legs.flatMap(l => l.qrCodes ?? []);

        const readiness = await computeTripReadiness(trip, profiles, schemas, qrCodes);

        if (!cancelled) {
          setTripReadiness(readiness);
        }
      } catch (err) {
        console.error('useTripReadiness: failed to compute readiness', err);
        if (!cancelled) {
          setTripReadiness(null);
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

  return { tripReadiness, isLoading };
}
