/**
 * useTripListDeadlines — computes the most urgent deadline per trip for TripCard display.
 *
 * Returns a map of tripId → TripUrgency for trips that have non-normal urgency.
 */

import { useMemo, useState, useEffect } from 'react';
import type { Trip } from '../types/trip';
import type { CountryFormSchema } from '../types/schema';
import { computeTripDeadlines, getUrgencyLevel } from '../services/deadline/deadlineService';
import type { UrgencyLevel, LegDeadline } from '../services/deadline/deadlineService';
import { getSchemaByCountryCode } from '../schemas';

export interface TripUrgency {
  level: UrgencyLevel;
  hoursRemaining: number;
  countryCode: string;
  label: string;
}

function formatUrgencyLabel(level: UrgencyLevel, hoursRemaining: number): string {
  if (level === 'overdue') return 'Overdue';
  if (hoursRemaining <= 24) return `Due in ${Math.ceil(hoursRemaining)}h`;
  const days = Math.round(hoursRemaining / 24);
  return `Due in ${days}d`;
}

const URGENCY_ORDER: Record<UrgencyLevel, number> = {
  overdue: 3,
  critical: 2,
  warning: 1,
  normal: 0,
};

function findMostUrgent(deadlines: LegDeadline[]): TripUrgency | null {
  let worst: LegDeadline | null = null;
  let worstLevel: UrgencyLevel = 'normal';

  for (const d of deadlines) {
    const level = getUrgencyLevel(d);
    if (URGENCY_ORDER[level] > URGENCY_ORDER[worstLevel]) {
      worst = d;
      worstLevel = level;
    }
  }

  if (!worst || worstLevel === 'normal') return null;

  return {
    level: worstLevel,
    hoursRemaining: worst.hoursRemaining,
    countryCode: worst.countryCode,
    label: formatUrgencyLabel(worstLevel, worst.hoursRemaining),
  };
}

export function useTripListDeadlines(trips: Trip[]): Record<string, TripUrgency> {
  const [schemas, setSchemas] = useState<Record<string, CountryFormSchema>>({});

  // Load schemas for all unique country codes across trips
  useEffect(() => {
    const codes = new Set<string>();
    for (const trip of trips) {
      for (const leg of trip.legs) {
        codes.add(leg.destinationCountry);
      }
    }

    let cancelled = false;
    const load = async () => {
      const entries = await Promise.all(
        Array.from(codes).map(async (code) => {
          const schema = await getSchemaByCountryCode(code);
          return [code, schema] as [string, CountryFormSchema | null];
        }),
      );
      if (!cancelled) {
        setSchemas(
          Object.fromEntries(entries.filter((e): e is [string, CountryFormSchema] => e[1] !== null)),
        );
      }
    };
    load().catch(() => {});
    return () => { cancelled = true; };
  }, [trips]);

  return useMemo(() => {
    const result: Record<string, TripUrgency> = {};
    for (const trip of trips) {
      if (trip.status === 'completed') continue;
      const deadlines = computeTripDeadlines(trip, schemas);
      const urgency = findMostUrgent(deadlines);
      if (urgency) {
        result[trip.id] = urgency;
      }
    }
    return result;
  }, [trips, schemas]);
}
