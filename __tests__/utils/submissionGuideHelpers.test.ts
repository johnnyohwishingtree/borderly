import {
  buildSubmissionGuideTabs,
  markStepComplete,
  getCompletedStepsForTraveler,
  resolveInitialTravelerId,
} from '../../src/utils/submissionGuideHelpers';
import type { TravelerProfile } from '../../src/types/profile';
import type { TripLeg } from '../../src/types/trip';

// ── Factories ──────────────────────────────────────────────────────────────

function createTraveler(overrides: Partial<TravelerProfile> = {}): TravelerProfile {
  return {
    id: 'traveler-1',
    givenNames: 'John',
    surname: 'Doe',
    passportNumber: 'AB123456',
    nationality: 'USA',
    dateOfBirth: '1990-01-15',
    gender: 'M',
    passportExpiry: '2030-12-31',
    issuingCountry: 'USA',
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

function createLeg(overrides: Partial<TripLeg> = {}): TripLeg {
  return {
    id: 'leg-1',
    tripId: 'trip-1',
    destinationCountry: 'JPN',
    arrivalDate: '2025-06-01',
    accommodation: {
      name: 'Hotel Tokyo',
      address: { line1: '1-1', city: 'Tokyo', postalCode: '100-0001', country: 'JPN' },
    },
    formStatus: 'not_started',
    submissionStatus: 'not_started',
    order: 1,
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('buildSubmissionGuideTabs', () => {
  it('returns empty array when 0 travelers', () => {
    expect(buildSubmissionGuideTabs([], createLeg())).toEqual([]);
  });

  it('returns empty array when 1 traveler', () => {
    expect(buildSubmissionGuideTabs([createTraveler()], createLeg())).toEqual([]);
  });

  it('builds tabs for multiple travelers', () => {
    const travelers = [
      createTraveler({ id: 't1', givenNames: 'Alice' }),
      createTraveler({ id: 't2', givenNames: 'Bob' }),
    ];
    const leg = createLeg({
      travelerFormsData: [
        {
          travelerId: 't1',
          formData: {},
          formStatus: 'ready',
          completionPercentage: 100,
        },
      ],
    });
    const tabs = buildSubmissionGuideTabs(travelers, leg);
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toEqual({
      id: 't1',
      name: 'Alice',
      completionPercentage: 100,
      formStatus: 'ready',
    });
    expect(tabs[1]).toEqual({
      id: 't2',
      name: 'Bob',
      completionPercentage: 0,
      formStatus: 'not_started',
    });
  });

  it('defaults to 0% and not_started when no travelerFormsData', () => {
    const travelers = [
      createTraveler({ id: 't1' }),
      createTraveler({ id: 't2' }),
    ];
    const leg = createLeg(); // no travelerFormsData
    const tabs = buildSubmissionGuideTabs(travelers, leg);
    tabs.forEach(tab => {
      expect(tab.completionPercentage).toBe(0);
      expect(tab.formStatus).toBe('not_started');
    });
  });
});

describe('markStepComplete', () => {
  it('adds a step to an empty map', () => {
    const result = markStepComplete({}, 't1', 1);
    expect(result['t1']).toEqual([1]);
  });

  it('appends step to existing list', () => {
    const result = markStepComplete({ t1: [1] }, 't1', 2);
    expect(result['t1']).toEqual([1, 2]);
  });

  it('returns same map if step already completed', () => {
    const input = { t1: [1, 2] };
    const result = markStepComplete(input, 't1', 2);
    expect(result).toBe(input); // Same reference = no change
  });

  it('does not mutate original map', () => {
    const input = { t1: [1] };
    const result = markStepComplete(input, 't1', 2);
    expect(input['t1']).toEqual([1]);
    expect(result['t1']).toEqual([1, 2]);
  });
});

describe('getCompletedStepsForTraveler', () => {
  it('returns steps for existing traveler', () => {
    expect(getCompletedStepsForTraveler({ t1: [1, 3, 5] }, 't1')).toEqual([1, 3, 5]);
  });

  it('returns empty array for unknown traveler', () => {
    expect(getCompletedStepsForTraveler({}, 'unknown')).toEqual([]);
  });
});

describe('resolveInitialTravelerId', () => {
  it('returns explicit travelerId when provided', () => {
    expect(resolveInitialTravelerId('explicit', 'profile', ['a', 'b'])).toBe('explicit');
  });

  it('returns profileId when in assigned list', () => {
    expect(resolveInitialTravelerId(undefined, 'p1', ['p1', 'p2'])).toBe('p1');
  });

  it('returns profileId when no travelers assigned', () => {
    expect(resolveInitialTravelerId(undefined, 'p1', [])).toBe('p1');
  });

  it('returns first assigned traveler when profileId is not assigned', () => {
    expect(resolveInitialTravelerId(undefined, 'p99', ['a', 'b'])).toBe('a');
  });

  it('returns null when no travelerId, no profileId, and no assigned travelers', () => {
    expect(resolveInitialTravelerId(undefined, undefined, [])).toBeNull();
  });

  it('returns first assigned when profileId is undefined but travelers exist', () => {
    expect(resolveInitialTravelerId(undefined, undefined, ['x'])).toBe('x');
  });
});
