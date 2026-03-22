/**
 * Unit tests for the traveler switching logic in SubmissionGuideScreen.
 *
 * Tested via pure helper functions from src/utils/submissionGuideHelpers.ts
 * which owns all derivation logic. This avoids the memory overhead of
 * full React Native component or hook rendering.
 *
 * Covers:
 * - Traveler tabs built from assigned traveler profiles
 * - hasMultipleTravelers behaviour (tabs empty for single traveler)
 * - Per-traveler step completion tracking (markStepComplete / get)
 * - Step completion is isolated per traveler
 * - activeTravelerId resolution from route param / current profile / fallback
 */

import {
  buildSubmissionGuideTabs,
  markStepComplete,
  getCompletedStepsForTraveler,
  resolveInitialTravelerId,
} from '../../../src/utils/submissionGuideHelpers';

// ── Shared fixtures ───────────────────────────────────────────────────────────

const defaultDeclarations = {
  hasItemsToDeclare: false,
  carryingCurrency: false,
  carryingProhibitedItems: false,
  visitedFarm: false,
  hasCriminalRecord: false,
  carryingCommercialGoods: false,
};

const john = {
  id: 'profile_1', givenNames: 'John', surname: 'Doe',
  passportNumber: 'AB1234567', nationality: 'USA', dateOfBirth: '1990-01-01',
  gender: 'M' as const, passportExpiry: '2030-01-01', issuingCountry: 'USA',
  defaultDeclarations, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
};
const jane = {
  id: 'profile_2', givenNames: 'Jane', surname: 'Doe',
  passportNumber: 'CD9876543', nationality: 'USA', dateOfBirth: '1992-05-15',
  gender: 'F' as const, passportExpiry: '2031-06-01', issuingCountry: 'USA',
  defaultDeclarations, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
};

const baseAccommodation = {
  name: 'Hotel Tokyo',
  address: { line1: '1-1 Shinjuku', city: 'Tokyo', postalCode: '160-0022', country: 'JPN' },
};

function makeLeg(
  assignedTravelers: string[],
  formStatuses?: Record<string, { formStatus: 'not_started' | 'in_progress' | 'ready' | 'submitted'; completionPercentage: number }>,
) {
  return {
    id: 'leg-1', tripId: 'trip-1', destinationCountry: 'JPN',
    arrivalDate: '2026-04-01', departureDate: '2026-04-10',
    formStatus: 'ready' as const, order: 0, qrCodes: [],
    accommodation: baseAccommodation,
    assignedTravelers,
    travelerFormsData: assignedTravelers.map(id => ({
      travelerId: id,
      formData: {},
      formStatus: (formStatuses?.[id]?.formStatus ?? 'ready') as 'not_started' | 'in_progress' | 'ready' | 'submitted',
      completionPercentage: formStatuses?.[id]?.completionPercentage ?? 100,
    })),
  };
}

// ── buildSubmissionGuideTabs ──────────────────────────────────────────────────

describe('buildSubmissionGuideTabs', () => {
  it('returns an empty array for a single-traveler leg', () => {
    const leg = makeLeg(['profile_1']);
    expect(buildSubmissionGuideTabs([john], leg)).toHaveLength(0);
  });

  it('returns an empty array when the profiles list is empty', () => {
    const leg = makeLeg([]);
    expect(buildSubmissionGuideTabs([], leg)).toHaveLength(0);
  });

  it('returns a tab for each assigned traveler when there are multiple', () => {
    const leg = makeLeg(['profile_1', 'profile_2']);
    const tabs = buildSubmissionGuideTabs([john, jane], leg);

    expect(tabs).toHaveLength(2);
    expect(tabs.map(t => t.id)).toEqual(['profile_1', 'profile_2']);
  });

  it('uses the traveler givenNames as the tab name', () => {
    const leg = makeLeg(['profile_1', 'profile_2']);
    const tabs = buildSubmissionGuideTabs([john, jane], leg);

    expect(tabs[0].name).toBe('John');
    expect(tabs[1].name).toBe('Jane');
  });

  it('reflects formStatus from leg travelerFormsData', () => {
    const leg = makeLeg(['profile_1', 'profile_2'], {
      profile_1: { formStatus: 'ready', completionPercentage: 100 },
      profile_2: { formStatus: 'in_progress', completionPercentage: 60 },
    });
    const tabs = buildSubmissionGuideTabs([john, jane], leg);

    expect(tabs[0].formStatus).toBe('ready');
    expect(tabs[1].formStatus).toBe('in_progress');
  });

  it('reflects completionPercentage from leg travelerFormsData', () => {
    const leg = makeLeg(['profile_1', 'profile_2'], {
      profile_1: { formStatus: 'in_progress', completionPercentage: 75 },
      profile_2: { formStatus: 'not_started', completionPercentage: 0 },
    });
    const tabs = buildSubmissionGuideTabs([john, jane], leg);

    expect(tabs[0].completionPercentage).toBe(75);
    expect(tabs[1].completionPercentage).toBe(0);
  });

  it('defaults to "not_started" and 0% if no form data found for traveler', () => {
    // leg has no travelerFormsData
    const leg = {
      ...makeLeg(['profile_1', 'profile_2']),
      travelerFormsData: undefined as any,
    };
    const tabs = buildSubmissionGuideTabs([john, jane], leg);

    expect(tabs[0].formStatus).toBe('not_started');
    expect(tabs[0].completionPercentage).toBe(0);
  });
});

// ── markStepComplete ──────────────────────────────────────────────────────────

describe('markStepComplete', () => {
  it('adds the step order to the traveler entry', () => {
    const map = markStepComplete({}, 'profile_1', 1);
    expect(map['profile_1']).toContain(1);
  });

  it('is idempotent — marking the same step twice does not duplicate it', () => {
    const map1 = markStepComplete({}, 'profile_1', 1);
    const map2 = markStepComplete(map1, 'profile_1', 1);

    expect(map2['profile_1'].filter(s => s === 1)).toHaveLength(1);
  });

  it('keeps step completions isolated per traveler', () => {
    let map = markStepComplete({}, 'profile_1', 1);
    map = markStepComplete(map, 'profile_2', 2);

    expect(map['profile_1']).toEqual([1]);
    expect(map['profile_2']).toEqual([2]);
  });

  it('preserves existing step completions when adding a new one', () => {
    let map = markStepComplete({}, 'profile_1', 1);
    map = markStepComplete(map, 'profile_1', 2);

    expect(map['profile_1']).toEqual([1, 2]);
  });

  it('does not mutate the input object', () => {
    const input: Record<string, number[]> = {};
    markStepComplete(input, 'profile_1', 1);
    expect(input['profile_1']).toBeUndefined();
  });
});

// ── getCompletedStepsForTraveler ──────────────────────────────────────────────

describe('getCompletedStepsForTraveler', () => {
  it('returns steps for the specified traveler', () => {
    const map: Record<string, number[]> = { profile_1: [1, 2], profile_2: [3] };
    expect(getCompletedStepsForTraveler(map, 'profile_1')).toEqual([1, 2]);
  });

  it('returns an empty array for a traveler with no completed steps', () => {
    expect(getCompletedStepsForTraveler({}, 'profile_1')).toEqual([]);
  });

  it('returns the correct traveler\'s steps, not another traveler\'s', () => {
    const map: Record<string, number[]> = { profile_1: [1], profile_2: [2, 3] };
    expect(getCompletedStepsForTraveler(map, 'profile_2')).toEqual([2, 3]);
    expect(getCompletedStepsForTraveler(map, 'profile_1')).toEqual([1]);
  });

  it('switching back to a traveler still returns their previously saved steps', () => {
    // Simulate: John completes step 1 → switch to Jane → switch back to John
    let map = markStepComplete({}, 'profile_1', 1);
    // Switching to Jane (no-op for the map)
    map = markStepComplete(map, 'profile_2', 2);
    // Switching back to John
    expect(getCompletedStepsForTraveler(map, 'profile_1')).toContain(1);
    expect(getCompletedStepsForTraveler(map, 'profile_1')).not.toContain(2);
  });
});

// ── resolveInitialTravelerId ──────────────────────────────────────────────────

describe('resolveInitialTravelerId', () => {
  it('returns the explicit travelerId when provided', () => {
    expect(resolveInitialTravelerId('profile_2', 'profile_1', ['profile_1', 'profile_2']))
      .toBe('profile_2');
  });

  it('returns the current profile id when they are assigned to the leg', () => {
    expect(resolveInitialTravelerId(undefined, 'profile_1', ['profile_1', 'profile_2']))
      .toBe('profile_1');
  });

  it('returns the current profile id when no travelers are assigned (single-user flow)', () => {
    expect(resolveInitialTravelerId(undefined, 'profile_1', []))
      .toBe('profile_1');
  });

  it('falls back to the first assigned traveler when current profile is not assigned', () => {
    expect(resolveInitialTravelerId(undefined, 'profile_3', ['profile_1', 'profile_2']))
      .toBe('profile_1');
  });

  it('returns null when nothing can be resolved', () => {
    expect(resolveInitialTravelerId(undefined, undefined, [])).toBeNull();
  });
});
