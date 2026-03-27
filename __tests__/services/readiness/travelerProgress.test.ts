/**
 * Unit tests for computeTravelerProgress.
 *
 * Covers:
 * - Returns empty for solo-traveler trips
 * - Computes correct legsReady/legsTotal per traveler
 * - Derives overall status correctly
 * - Handles legs with no travelerFormsData
 */

import { computeTravelerProgress } from '../../../src/services/readiness/travelerProgress';
import type { Trip, TripLeg } from '../../../src/types/trip';
import type { FamilyMember } from '../../../src/types/profile';

function makeMember(overrides: Partial<FamilyMember> = {}): FamilyMember {
  return {
    id: `member-${Math.random()}`,
    givenNames: 'John',
    surname: 'Doe',
    passportNumber: 'AB123456',
    nationality: 'USA',
    dateOfBirth: '1990-01-01',
    gender: 'M',
    passportExpiry: '2030-01-01',
    issuingCountry: 'USA',
    relationship: 'self',
    defaultDeclarations: {
      hasItemsToDeclare: false,
      carryingCurrency: false,
      carryingProhibitedItems: false,
      visitedFarm: false,
      hasCriminalRecord: false,
      carryingCommercialGoods: false,
    },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeLeg(overrides: Partial<TripLeg> = {}): TripLeg {
  return {
    id: `leg-${Math.random()}`,
    tripId: 'trip-001',
    destinationCountry: 'JPN',
    arrivalDate: '2025-08-01',
    departureDate: '2025-08-10',
    formStatus: 'not_started',
    submissionStatus: 'not_started',
    order: 0,
    accommodation: {
      name: 'Hotel',
      address: { line1: '1-1', city: 'Tokyo', postalCode: '100', country: 'Japan' },
    },
    ...overrides,
  };
}

function makeTrip(legs: TripLeg[]): Trip {
  return {
    id: 'trip-001',
    name: 'Test Trip',
    status: 'upcoming',
    legs,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };
}

const self = makeMember({ id: 'p1', givenNames: 'John', surname: 'Doe', relationship: 'self' });
const spouse = makeMember({ id: 'p2', givenNames: 'Jane', surname: 'Doe', relationship: 'spouse' });
const child = makeMember({ id: 'p3', givenNames: 'Alex', surname: 'Doe', relationship: 'child' });

describe('computeTravelerProgress — empty cases', () => {
  it('returns empty array for trip with no assigned travelers', () => {
    const trip = makeTrip([makeLeg({ id: 'leg-1' })]);
    const result = computeTravelerProgress(trip, [self, spouse]);
    expect(result).toEqual([]);
  });

  it('returns empty array for solo traveler trip', () => {
    const trip = makeTrip([
      makeLeg({ id: 'leg-1', assignedTravelers: ['p1'] }),
    ]);
    const result = computeTravelerProgress(trip, [self, spouse]);
    expect(result).toEqual([]);
  });

  it('returns empty array when familyMembers is empty', () => {
    const trip = makeTrip([
      makeLeg({ id: 'leg-1', assignedTravelers: ['p1', 'p2'] }),
    ]);
    const result = computeTravelerProgress(trip, []);
    expect(result).toEqual([]);
  });
});

describe('computeTravelerProgress — multi-traveler', () => {
  it('computes progress for two travelers across two legs', () => {
    const trip = makeTrip([
      makeLeg({
        id: 'leg-1',
        assignedTravelers: ['p1', 'p2'],
        travelerFormsData: [
          { travelerId: 'p1', formData: {}, formStatus: 'ready', completionPercentage: 100 },
          { travelerId: 'p2', formData: {}, formStatus: 'not_started', completionPercentage: 0 },
        ],
      }),
      makeLeg({
        id: 'leg-2',
        destinationCountry: 'SGP',
        assignedTravelers: ['p1', 'p2'],
        travelerFormsData: [
          { travelerId: 'p1', formData: {}, formStatus: 'submitted', completionPercentage: 100 },
          { travelerId: 'p2', formData: {}, formStatus: 'in_progress', completionPercentage: 50 },
        ],
      }),
    ]);

    const result = computeTravelerProgress(trip, [self, spouse]);

    expect(result).toHaveLength(2);

    const john = result.find(r => r.profileId === 'p1');
    expect(john).toEqual(expect.objectContaining({ profileId: 'p1' }));
    expect(john!.legsReady).toBe(2);
    expect(john!.legsTotal).toBe(2);
    expect(john!.overallStatus).toBe('ready'); // ready + submitted = ready

    const jane = result.find(r => r.profileId === 'p2');
    expect(jane).toEqual(expect.objectContaining({ profileId: 'p2' }));
    expect(jane!.legsReady).toBe(0);
    expect(jane!.legsTotal).toBe(2);
    expect(jane!.overallStatus).toBe('in_progress');
  });

  it('reports submitted when all legs are submitted for a traveler', () => {
    const trip = makeTrip([
      makeLeg({
        id: 'leg-1',
        assignedTravelers: ['p1', 'p2'],
        travelerFormsData: [
          { travelerId: 'p1', formData: {}, formStatus: 'submitted', completionPercentage: 100 },
          { travelerId: 'p2', formData: {}, formStatus: 'submitted', completionPercentage: 100 },
        ],
      }),
    ]);

    const result = computeTravelerProgress(trip, [self, spouse]);
    expect(result).toHaveLength(2);
    expect(result[0].overallStatus).toBe('submitted');
    expect(result[1].overallStatus).toBe('submitted');
  });

  it('handles traveler assigned to subset of legs', () => {
    const trip = makeTrip([
      makeLeg({
        id: 'leg-1',
        assignedTravelers: ['p1', 'p2', 'p3'],
        travelerFormsData: [
          { travelerId: 'p1', formData: {}, formStatus: 'ready', completionPercentage: 100 },
          { travelerId: 'p2', formData: {}, formStatus: 'ready', completionPercentage: 100 },
          { travelerId: 'p3', formData: {}, formStatus: 'not_started', completionPercentage: 0 },
        ],
      }),
      makeLeg({
        id: 'leg-2',
        assignedTravelers: ['p1', 'p2'],
        travelerFormsData: [
          { travelerId: 'p1', formData: {}, formStatus: 'ready', completionPercentage: 100 },
          { travelerId: 'p2', formData: {}, formStatus: 'not_started', completionPercentage: 0 },
        ],
      }),
    ]);

    const result = computeTravelerProgress(trip, [self, spouse, child]);

    const alex = result.find(r => r.profileId === 'p3');
    expect(alex).toEqual(expect.objectContaining({ profileId: 'p3' }));
    expect(alex!.legsTotal).toBe(1); // Only assigned to leg-1
    expect(alex!.legsReady).toBe(0);
  });

  it('includes name and relationship in result', () => {
    const trip = makeTrip([
      makeLeg({
        id: 'leg-1',
        assignedTravelers: ['p1', 'p2'],
      }),
    ]);

    const result = computeTravelerProgress(trip, [self, spouse]);
    const john = result.find(r => r.profileId === 'p1');
    expect(john!.name).toBe('John Doe');
    expect(john!.relationship).toBe('self');

    const jane = result.find(r => r.profileId === 'p2');
    expect(jane!.name).toBe('Jane Doe');
    expect(jane!.relationship).toBe('spouse');
  });

  it('skips unknown traveler IDs not in familyMembers', () => {
    const trip = makeTrip([
      makeLeg({
        id: 'leg-1',
        assignedTravelers: ['p1', 'p2', 'unknown-id'],
      }),
    ]);

    const result = computeTravelerProgress(trip, [self, spouse]);
    expect(result).toHaveLength(2);
    expect(result.find(r => r.profileId === 'unknown-id')).toBeUndefined();
  });
});
