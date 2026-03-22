/**
 * TripDuplicateService
 *
 * Pure-function service for cloning an existing trip into a new trip object.
 * The cloned trip has all leg dates offset proportionally from a new departure
 * date, and all submission statuses reset to 'not_started'.
 */

import { Trip, TripLeg } from '@/types/trip';
import { addDays } from '@/utils/dateUtils';

/**
 * Data shape returned by cloneTrip.
 * IDs are intentionally absent — they will be assigned by the store when the
 * cloned trip is persisted to the database.
 */
export type ClonedLegData = Omit<TripLeg, 'id' | 'tripId'>;

export interface ClonedTripData {
  name: string;
  status: Trip['status'];
}

export interface DuplicateTripResult {
  trip: ClonedTripData;
  legs: ClonedLegData[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns the trip's start date — the earliest leg arrivalDate ordered by `order`.
 * Returns null when the trip has no legs.
 */
function getTripStartDate(trip: Trip): string | null {
  if (trip.legs.length === 0) {
    return null;
  }
  const sorted = [...trip.legs].sort((a, b) => a.order - b.order);
  return sorted[0].arrivalDate;
}

/**
 * Computes the offset in whole days between two ISO date strings.
 * A positive result means newDate is after originalDate.
 */
function computeDeltaDays(originalDate: string, newDate: string): number {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const original = new Date(originalDate);
  const next = new Date(newDate);
  // Use UTC midnight to avoid daylight-saving edge cases.
  const originalUTC = Date.UTC(original.getFullYear(), original.getMonth(), original.getDate());
  const nextUTC = Date.UTC(next.getFullYear(), next.getMonth(), next.getDate());
  return Math.round((nextUTC - originalUTC) / MS_PER_DAY);
}

/**
 * Shifts an ISO date string by `deltaDays`.
 * Falls back to the original string if `addDays` cannot parse it (should not happen in practice).
 */
function shiftDate(dateString: string, deltaDays: number): string {
  const result = addDays(dateString, deltaDays);
  return result ?? dateString;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Clones a trip with a new departure date.
 *
 * Rules:
 * - Trip name is prefixed with "Copy of " (unless it already starts with that).
 * - The delta between the new departure date and the original trip start date
 *   is applied uniformly to every leg's arrivalDate and departureDate.
 * - All leg submissionStatus values are reset to 'not_started'.
 * - All leg formStatus values are reset to 'not_started'.
 * - formData and travelerFormsData are cleared on every leg.
 * - qrCodes is reset to an empty array on every leg.
 * - assignedTravelers is preserved (same travelers; they'll fill out new forms).
 * - The cloned trip status is set to 'upcoming'.
 *
 * @param sourceTrip       The original Trip object.
 * @param newDepartureDate ISO 8601 date (YYYY-MM-DD) for the new trip start.
 * @returns DuplicateTripResult ready to be persisted by the TripStore.
 */
export function cloneTrip(sourceTrip: Trip, newDepartureDate: string): DuplicateTripResult {
  const startDate = getTripStartDate(sourceTrip);
  const deltaDays = startDate ? computeDeltaDays(startDate, newDepartureDate) : 0;

  const clonedLegs: ClonedLegData[] = sourceTrip.legs.map(leg => {
    // Build accommodation with only the fields that are present, to comply
    // with exactOptionalPropertyTypes.
    const accommodation = {
      name: leg.accommodation.name,
      address: { ...leg.accommodation.address },
      ...(leg.accommodation.phone !== undefined && { phone: leg.accommodation.phone }),
      ...(leg.accommodation.bookingReference !== undefined && {
        bookingReference: leg.accommodation.bookingReference,
      }),
    };

    // Build the cloned leg, conditionally including optional fields.
    const clonedLeg: ClonedLegData = {
      destinationCountry: leg.destinationCountry,
      arrivalDate: shiftDate(leg.arrivalDate, deltaDays),
      accommodation,
      formStatus: 'not_started',
      submissionStatus: 'not_started',
      order: leg.order,
      // Preserve assigned travelers; traveler form data is reset below.
      assignedTravelers: leg.assignedTravelers ? [...leg.assignedTravelers] : [],
      // Reset all submission artefacts.
      qrCodes: [],
      travelerFormsData: [],
      // Optional date fields
      ...(leg.departureDate !== undefined && {
        departureDate: shiftDate(leg.departureDate, deltaDays),
      }),
      // Optional static fields — copy as-is if present
      ...(leg.flightNumber !== undefined && { flightNumber: leg.flightNumber }),
      ...(leg.airlineCode !== undefined && { airlineCode: leg.airlineCode }),
      ...(leg.arrivalAirport !== undefined && { arrivalAirport: leg.arrivalAirport }),
      // formData intentionally omitted to clear previous answers
    };

    return clonedLeg;
  });

  const originalName = sourceTrip.name;
  const clonedName = originalName.startsWith('Copy of ')
    ? originalName
    : `Copy of ${originalName}`;

  return {
    trip: {
      name: clonedName,
      status: 'upcoming',
    },
    legs: clonedLegs,
  };
}
