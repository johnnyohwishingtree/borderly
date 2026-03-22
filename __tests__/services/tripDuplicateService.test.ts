/**
 * Tests for TripDuplicateService — cloneTrip pure function.
 *
 * Acceptance criteria verified here:
 *  1. Cloned trip name is prefixed with "Copy of " (unless already prefixed).
 *  2. Each leg arrivalDate / departureDate is offset by the same delta as
 *     the trip start date.
 *  3. All leg submissionStatus values are reset to 'not_started'.
 *  4. All leg formStatus values are reset to 'not_started'.
 *  5. formData, qrCodes, and travelerFormsData are cleared.
 *  6. A trip with no legs returns an empty legs array and uses delta = 0.
 *  7. Name is not double-prefixed when it already starts with "Copy of ".
 */

import { cloneTrip } from '../../src/services/trips/tripDuplicateService';
import { Trip, TripLeg, Accommodation } from '../../src/types/trip';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeAccommodation(): Accommodation {
  return {
    name: 'Grand Hotel',
    address: {
      line1: '1-1 Shinjuku',
      city: 'Tokyo',
      postalCode: '160-0022',
      country: 'JPN',
    },
  };
}

function makeLeg(overrides: Partial<TripLeg> = {}): TripLeg {
  return {
    id: 'leg-1',
    tripId: 'trip-1',
    destinationCountry: 'JPN',
    arrivalDate: '2025-06-10',
    departureDate: '2025-06-15',
    flightNumber: 'JL001',
    airlineCode: 'JL',
    arrivalAirport: 'NRT',
    accommodation: makeAccommodation(),
    formStatus: 'ready',
    submissionStatus: 'submitted',
    order: 0,
    qrCodes: [],
    assignedTravelers: ['profile-1'],
    travelerFormsData: [
      {
        travelerId: 'profile-1',
        formData: { purpose: 'tourism' },
        formStatus: 'submitted',
        completionPercentage: 100,
      },
    ],
    ...overrides,
  };
}

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1',
    name: 'Asia Summer 2025',
    status: 'upcoming',
    legs: [makeLeg()],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

/** Returns a TripLeg without the departureDate property (not even set to undefined). */
function makeLegNoDeparture(): TripLeg {
  const leg = makeLeg();
  const { departureDate: _removed, ...rest } = leg;
  return rest as TripLeg;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('cloneTrip', () => {
  describe('trip name', () => {
    it('prefixes the name with "Copy of "', () => {
      const source = makeTrip({ name: 'Asia Summer 2025' });
      const { trip } = cloneTrip(source, '2025-09-10');
      expect(trip.name).toBe('Copy of Asia Summer 2025');
    });

    it('does not double-prefix when name already starts with "Copy of "', () => {
      const source = makeTrip({ name: 'Copy of Asia Summer 2025' });
      const { trip } = cloneTrip(source, '2025-09-10');
      expect(trip.name).toBe('Copy of Asia Summer 2025');
    });

    it('sets cloned trip status to "upcoming"', () => {
      const source = makeTrip({ status: 'active' });
      const { trip } = cloneTrip(source, '2025-09-10');
      expect(trip.status).toBe('upcoming');
    });
  });

  describe('date offsetting', () => {
    it('offsets arrivalDate by the delta between newDepartureDate and original start', () => {
      // Original start: 2025-06-10 → new start: 2025-09-10 → delta = +92 days
      const source = makeTrip();
      const { legs } = cloneTrip(source, '2025-09-10');
      expect(legs[0].arrivalDate).toBe('2025-09-10');
    });

    it('offsets optional departureDate by the same delta', () => {
      // Original departure: 2025-06-15, delta = +92 days → 2025-09-15
      const source = makeTrip();
      const { legs } = cloneTrip(source, '2025-09-10');
      expect(legs[0].departureDate).toBe('2025-09-15');
    });

    it('leaves departureDate absent when original had no departureDate', () => {
      const source = makeTrip({ legs: [makeLegNoDeparture()] });
      const { legs } = cloneTrip(source, '2025-09-10');
      expect(legs[0].departureDate).toBeUndefined();
    });

    it('applies the same delta to every leg', () => {
      const source = makeTrip({
        legs: [
          makeLeg({ id: 'leg-1', arrivalDate: '2025-06-10', departureDate: '2025-06-15', order: 0 }),
          makeLeg({
            id: 'leg-2',
            tripId: 'trip-1',
            destinationCountry: 'SGP',
            arrivalDate: '2025-06-15',
            departureDate: '2025-06-20',
            order: 1,
          }),
        ],
      });
      // delta from 2025-06-10 to 2025-09-10 = +92 days
      const { legs } = cloneTrip(source, '2025-09-10');
      expect(legs[0].arrivalDate).toBe('2025-09-10');
      expect(legs[0].departureDate).toBe('2025-09-15');
      expect(legs[1].arrivalDate).toBe('2025-09-15');
      expect(legs[1].departureDate).toBe('2025-09-20');
    });

    it('handles a negative delta (new date before original)', () => {
      // Original start: 2025-06-10, new start: 2025-03-10 → delta = -92 days
      const source = makeTrip();
      const { legs } = cloneTrip(source, '2025-03-10');
      expect(legs[0].arrivalDate).toBe('2025-03-10');
      expect(legs[0].departureDate).toBe('2025-03-15');
    });

    it('returns zero-offset dates when new date equals original start', () => {
      const source = makeTrip();
      const { legs } = cloneTrip(source, '2025-06-10');
      expect(legs[0].arrivalDate).toBe('2025-06-10');
      expect(legs[0].departureDate).toBe('2025-06-15');
    });

    it('uses delta = 0 when trip has no legs', () => {
      const source = makeTrip({ legs: [] });
      const { legs } = cloneTrip(source, '2099-01-01');
      expect(legs).toHaveLength(0);
    });
  });

  describe('submission status reset', () => {
    it('resets submissionStatus to "not_started" on every leg', () => {
      const source = makeTrip({
        legs: [
          makeLeg({ id: 'leg-1', submissionStatus: 'submitted', order: 0 }),
          makeLeg({ id: 'leg-2', submissionStatus: 'in_progress', order: 1 }),
        ],
      });
      const { legs } = cloneTrip(source, '2025-09-10');
      expect(legs[0].submissionStatus).toBe('not_started');
      expect(legs[1].submissionStatus).toBe('not_started');
    });

    it('resets formStatus to "not_started" on every leg', () => {
      const source = makeTrip({
        legs: [
          makeLeg({ id: 'leg-1', formStatus: 'ready', order: 0 }),
          makeLeg({ id: 'leg-2', formStatus: 'submitted', order: 1 }),
        ],
      });
      const { legs } = cloneTrip(source, '2025-09-10');
      expect(legs[0].formStatus).toBe('not_started');
      expect(legs[1].formStatus).toBe('not_started');
    });
  });

  describe('form data and artefacts', () => {
    it('clears formData on every leg', () => {
      const source = makeTrip({
        legs: [makeLeg({ formData: { purpose: 'tourism', currency: 100 } })],
      });
      const { legs } = cloneTrip(source, '2025-09-10');
      expect(legs[0].formData).toBeUndefined();
    });

    it('clears qrCodes on every leg', () => {
      const source = makeTrip({
        legs: [
          makeLeg({
            qrCodes: [
              {
                id: 'qr-1',
                legId: 'leg-1',
                type: 'immigration',
                imageBase64: 'abc123',
                savedAt: '2025-06-10T12:00:00Z',
                label: 'Visit Japan Web QR',
              },
            ],
          }),
        ],
      });
      const { legs } = cloneTrip(source, '2025-09-10');
      expect(legs[0].qrCodes).toEqual([]);
    });

    it('clears travelerFormsData on every leg', () => {
      const source = makeTrip();
      const { legs } = cloneTrip(source, '2025-09-10');
      expect(legs[0].travelerFormsData).toEqual([]);
    });

    it('preserves assignedTravelers (same traveler IDs, fresh forms)', () => {
      const source = makeTrip({
        legs: [makeLeg({ assignedTravelers: ['profile-1', 'profile-2'] })],
      });
      const { legs } = cloneTrip(source, '2025-09-10');
      expect(legs[0].assignedTravelers).toEqual(['profile-1', 'profile-2']);
    });
  });

  describe('static fields', () => {
    it('preserves destination country, flight number, airline code, and airport', () => {
      const source = makeTrip();
      const { legs } = cloneTrip(source, '2025-09-10');
      expect(legs[0].destinationCountry).toBe('JPN');
      expect(legs[0].flightNumber).toBe('JL001');
      expect(legs[0].airlineCode).toBe('JL');
      expect(legs[0].arrivalAirport).toBe('NRT');
    });

    it('deep-copies accommodation so mutations do not affect the original', () => {
      const source = makeTrip();
      const { legs } = cloneTrip(source, '2025-09-10');
      legs[0].accommodation.name = 'Mutated Hotel';
      expect(source.legs[0].accommodation.name).toBe('Grand Hotel');
    });

    it('preserves leg order', () => {
      const source = makeTrip({
        legs: [
          makeLeg({ id: 'leg-1', order: 0 }),
          makeLeg({ id: 'leg-2', order: 1 }),
          makeLeg({ id: 'leg-3', order: 2 }),
        ],
      });
      const { legs } = cloneTrip(source, '2025-09-10');
      expect(legs.map(l => l.order)).toEqual([0, 1, 2]);
    });
  });

  describe('multi-leg date ordering', () => {
    it('uses the leg with order=0 as the trip start date anchor', () => {
      // Legs are given in reverse order to confirm sort-by-order logic.
      const source = makeTrip({
        legs: [
          makeLeg({ id: 'leg-2', arrivalDate: '2025-06-15', order: 1 }),
          makeLeg({ id: 'leg-1', arrivalDate: '2025-06-10', order: 0 }),
        ],
      });
      const { legs } = cloneTrip(source, '2025-09-10');
      // order-0 leg original arrivalDate = 2025-06-10 → delta = +92 days
      const legsByOrder = [...legs].sort((a, b) => a.order - b.order);
      expect(legsByOrder[0].arrivalDate).toBe('2025-09-10');
      expect(legsByOrder[1].arrivalDate).toBe('2025-09-15');
    });
  });
});
