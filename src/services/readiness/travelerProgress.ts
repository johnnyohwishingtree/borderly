/**
 * Computes per-traveler form progress across all legs of a trip.
 *
 * Pure function — no side effects, no store imports.
 */

import type { Trip, TripLeg } from '../../types/trip';
import type { FamilyMember, FamilyRelationship } from '../../types/profile';
import { getTravelerFormStatus } from '../forms/formEngine';

export type TravelerFormStatus = 'not_started' | 'in_progress' | 'ready' | 'submitted';

export interface TravelerProgress {
  profileId: string;
  name: string;
  relationship: FamilyRelationship;
  legsReady: number;
  legsTotal: number;
  overallStatus: TravelerFormStatus;
}

/**
 * For each traveler assigned to a trip, computes how many legs are ready/submitted.
 * Returns empty array for solo-traveler trips.
 */
export function computeTravelerProgress(
  trip: Trip,
  familyMembers: FamilyMember[],
): TravelerProgress[] {
  const memberMap = new Map(familyMembers.map(m => [m.id, m]));

  // Collect unique traveler IDs across all legs
  const travelerLegs = new Map<string, TripLeg[]>();
  for (const leg of trip.legs) {
    const ids = leg.assignedTravelers ?? [];
    for (const id of ids) {
      const existing = travelerLegs.get(id) ?? [];
      existing.push(leg);
      travelerLegs.set(id, existing);
    }
  }

  // Solo or no multi-traveler assignments — return empty
  if (travelerLegs.size <= 1) {
    return [];
  }

  const results: TravelerProgress[] = [];

  for (const [profileId, legs] of travelerLegs) {
    const member = memberMap.get(profileId);
    if (!member) continue;

    let legsReady = 0;
    const statuses: TravelerFormStatus[] = [];

    for (const leg of legs) {
      const status = getTravelerFormStatus(profileId, leg);
      statuses.push(status);
      if (status === 'ready' || status === 'submitted') {
        legsReady++;
      }
    }

    const overallStatus = deriveOverallStatus(statuses);

    results.push({
      profileId,
      name: `${member.givenNames} ${member.surname}`,
      relationship: member.relationship,
      legsReady,
      legsTotal: legs.length,
      overallStatus,
    });
  }

  return results;
}

function deriveOverallStatus(statuses: TravelerFormStatus[]): TravelerFormStatus {
  if (statuses.length === 0) return 'not_started';
  if (statuses.every(s => s === 'submitted')) return 'submitted';
  if (statuses.every(s => s === 'ready' || s === 'submitted')) return 'ready';
  if (statuses.some(s => s === 'in_progress' || s === 'ready' || s === 'submitted')) return 'in_progress';
  return 'not_started';
}
