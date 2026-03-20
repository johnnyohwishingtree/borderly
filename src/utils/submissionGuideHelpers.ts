/**
 * Pure helper functions for SubmissionGuideScreen traveler switching logic.
 * Kept separate so they can be unit-tested without React hooks.
 */

import type { TravelerProfile } from '../types/profile';
import type { TripLeg } from '../types/trip';

/**
 * Represents the minimal data for a traveler tab in the submission guide.
 */
export interface SubmissionGuideTravelerTab {
  id: string;
  name: string;
  completionPercentage: number;
  formStatus: 'not_started' | 'in_progress' | 'ready' | 'submitted';
}

/**
 * Build the traveler tabs array for the submission guide from a list of
 * traveler profiles and the leg's stored form data.
 *
 * Returns an empty array when there is only one (or zero) assigned traveler —
 * in that case the TravelerTabs component hides itself anyway.
 */
export function buildSubmissionGuideTabs(
  travelerProfiles: TravelerProfile[],
  leg: TripLeg,
): SubmissionGuideTravelerTab[] {
  if (travelerProfiles.length <= 1) return [];

  return travelerProfiles.map(p => {
    const travelerFormData = leg.travelerFormsData?.find(
      t => t.travelerId === p.id,
    );
    return {
      id: p.id,
      name: p.givenNames,
      completionPercentage: travelerFormData?.completionPercentage ?? 0,
      formStatus: travelerFormData?.formStatus ?? 'not_started',
    };
  });
}

/**
 * Mark a step as complete for the given traveler and return the updated map.
 * Pure — does not mutate the input.
 */
export function markStepComplete(
  completedStepsMap: Record<string, number[]>,
  travelerId: string,
  stepOrder: number,
): Record<string, number[]> {
  const existing = completedStepsMap[travelerId] ?? [];
  if (existing.includes(stepOrder)) return completedStepsMap;
  return { ...completedStepsMap, [travelerId]: [...existing, stepOrder] };
}

/**
 * Return the completed steps for a specific traveler from the map.
 */
export function getCompletedStepsForTraveler(
  completedStepsMap: Record<string, number[]>,
  travelerId: string,
): number[] {
  return completedStepsMap[travelerId] ?? [];
}

/**
 * Determine the initial active traveler ID from route params and the leg.
 *
 * Priority:
 * 1. Explicit travelerId from route params
 * 2. Current profile, if assigned to this leg (or if no travelers assigned)
 * 3. First assigned traveler
 */
export function resolveInitialTravelerId(
  travelerId: string | undefined,
  profileId: string | undefined,
  assignedTravelers: string[],
): string | null {
  if (travelerId) return travelerId;

  if (
    profileId &&
    (assignedTravelers.length === 0 || assignedTravelers.includes(profileId))
  ) {
    return profileId;
  }

  if (assignedTravelers.length > 0) {
    return assignedTravelers[0];
  }

  return null;
}
