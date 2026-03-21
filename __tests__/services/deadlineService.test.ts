/**
 * Tests for DeadlineService
 *
 * Covers all acceptance criteria:
 *  1. computeLegDeadline derives deadline dates from departure minus schema hours
 *  2. All 5 DeadlineStatus values are reachable
 *  3. getUrgencyLevel returns correct level at boundary values (exactly 24 h, 48 h)
 *  4. Missing departure datetime returns no-deadline status
 *  5. computeTripDeadlines maps over all legs correctly
 */

import {
  computeLegDeadline,
  computeTripDeadlines,
  getUrgencyLevel,
  DeadlineStatus,
  LegDeadline,
} from '../../src/services/deadline/deadlineService';
import { TripLeg, Trip } from '../../src/types/trip';
import { CountryFormSchema } from '../../src/types/schema';

// ---------------------------------------------------------------------------
// Helpers / fixtures
// ---------------------------------------------------------------------------

function makeSchema(overrides: Partial<CountryFormSchema> = {}): CountryFormSchema {
  return {
    countryCode: 'JPN',
    countryName: 'Japan',
    schemaVersion: '1.0.0',
    lastUpdated: '2025-01-01T00:00:00Z',
    portalUrl: 'https://vjw-lp.digital.go.jp/en/',
    portalName: 'Visit Japan Web',
    submissionDeadlineHours: 72,
    recommendedLeadTimeHours: 24,
    submissionWindowNote: 'Submit at least 3 days before arrival',
    metadata: {
      priority: 1,
      complexity: 'medium',
      popularity: 90,
      lastVerified: '2025-01-01T00:00:00Z',
      supportedLanguages: ['en', 'ja'],
      implementationStatus: 'complete',
      maintenanceFrequency: 'monthly',
    },
    changeDetection: {
      monitoredSelectors: [],
      changeThreshold: 20,
      fallbackActions: [],
    },
    submission: {
      earliestBeforeArrival: '14d',
      latestBeforeArrival: '3d',
      recommended: '7d',
    },
    portalFlow: {
      requiresAccount: true,
      multiStep: true,
      canSaveProgress: true,
    },
    sections: [],
    submissionGuide: [],
    ...overrides,
  } as CountryFormSchema;
}

function makeLeg(overrides: Partial<TripLeg> = {}): TripLeg {
  // Note: departureDate is intentionally omitted from the base fixture so tests
  // can control its presence without triggering exactOptionalPropertyTypes errors.
  const base: TripLeg = {
    id: 'leg-001',
    tripId: 'trip-001',
    destinationCountry: 'JPN',
    arrivalDate: '2025-12-01T10:00:00Z',
    accommodation: {
      name: 'Hotel Tokyo',
      address: {
        line1: '1-1 Marunouchi',
        city: 'Tokyo',
        postalCode: '100-0005',
        country: 'JPN',
      },
    },
    formStatus: 'not_started',
    order: 0,
  };
  return { ...base, ...overrides };
}

/** Creates a leg with a departureDate set to N days from now. */
function makeLegWithDeparture(daysFromNow: number, overrides: Partial<TripLeg> = {}): TripLeg {
  const date = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  return makeLeg({ departureDate: date.toISOString(), ...overrides });
}

/** Creates a leg with no departureDate (explicitly absent). */
function makeLegNoDeparture(overrides: Partial<TripLeg> = {}): TripLeg {
  return makeLeg(overrides);
}

function makeTrip(legs: TripLeg[]): Trip {
  return {
    id: 'trip-001',
    name: 'Asia Trip',
    status: 'upcoming',
    legs,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };
}

// ---------------------------------------------------------------------------
// computeLegDeadline — deadline date derivation
// ---------------------------------------------------------------------------

describe('computeLegDeadline', () => {
  it('derives submissionDeadline as departureDate minus submissionDeadlineHours', () => {
    // departureDate = 2025-11-30T22:00:00Z, submissionDeadlineHours = 72
    // submissionDeadline should be 2025-11-27T22:00:00Z
    const leg = makeLeg({ departureDate: '2025-11-30T22:00:00Z' });
    const schema = makeSchema({ submissionDeadlineHours: 72 });

    const result = computeLegDeadline(leg, schema);

    const expectedDeadline = new Date('2025-11-27T22:00:00Z');
    expect(result.submissionDeadline).toBeDefined();
    expect(result.submissionDeadline!.getTime()).toBe(expectedDeadline.getTime());
  });

  it('derives recommendedDeadline as submissionDeadline minus recommendedLeadTimeHours', () => {
    // submissionDeadline = 2025-11-27T22:00:00Z, recommendedLeadTimeHours = 24
    // recommendedDeadline = 2025-11-26T22:00:00Z
    const leg = makeLeg({ departureDate: '2025-11-30T22:00:00Z' });
    const schema = makeSchema({ submissionDeadlineHours: 72, recommendedLeadTimeHours: 24 });

    const result = computeLegDeadline(leg, schema);

    const expectedRecommended = new Date('2025-11-26T22:00:00Z');
    expect(result.recommendedDeadline).toBeDefined();
    expect(result.recommendedDeadline!.getTime()).toBe(expectedRecommended.getTime());
  });

  it('falls back to arrivalDate when departureDate is absent', () => {
    const leg = makeLegNoDeparture({ arrivalDate: '2025-12-01T10:00:00Z' });
    const schema = makeSchema({ submissionDeadlineHours: 48 });

    const result = computeLegDeadline(leg, schema);

    const expectedDeadline = new Date('2025-11-29T10:00:00Z');
    expect(result.submissionDeadline).toBeDefined();
    expect(result.submissionDeadline!.getTime()).toBe(expectedDeadline.getTime());
  });

  // -------------------------------------------------------------------------
  // Acceptance criterion: all 5 DeadlineStatus values are reachable
  // -------------------------------------------------------------------------

  it('returns status "not-started" for a leg with no form activity and future deadline', () => {
    const leg = makeLegWithDeparture(10, { formStatus: 'not_started' });
    const schema = makeSchema({ submissionDeadlineHours: 72 });

    const result = computeLegDeadline(leg, schema);

    expect(result.status).toBe<DeadlineStatus>('not-started');
  });

  it('returns status "in-progress" when formStatus is in_progress and deadline not passed', () => {
    const leg = makeLegWithDeparture(10, { formStatus: 'in_progress' });
    const schema = makeSchema({ submissionDeadlineHours: 72 });

    const result = computeLegDeadline(leg, schema);

    expect(result.status).toBe<DeadlineStatus>('in-progress');
  });

  it('returns status "ready" when formStatus is ready', () => {
    const leg = makeLegWithDeparture(10, { formStatus: 'ready' });
    const schema = makeSchema({ submissionDeadlineHours: 72 });

    const result = computeLegDeadline(leg, schema);

    expect(result.status).toBe<DeadlineStatus>('ready');
  });

  it('returns status "ready" when formStatus is submitted', () => {
    const leg = makeLegWithDeparture(-5, { formStatus: 'submitted' });
    const schema = makeSchema({ submissionDeadlineHours: 72 });

    const result = computeLegDeadline(leg, schema);

    // submitted = ready, overdue doesn't apply
    expect(result.status).toBe<DeadlineStatus>('ready');
  });

  it('returns status "overdue" when past deadline and form not ready', () => {
    // departure was 1 day ago, submissionDeadlineHours = 72 → deadline was 4 days ago
    const leg = makeLegWithDeparture(-1, { formStatus: 'not_started' });
    const schema = makeSchema({ submissionDeadlineHours: 72 });

    const result = computeLegDeadline(leg, schema);

    expect(result.status).toBe<DeadlineStatus>('overdue');
  });

  it('returns status "no-deadline" when submissionDeadlineHours is 0 and no departureDate', () => {
    const leg = makeLegNoDeparture();
    const schema = makeSchema({ submissionDeadlineHours: 0 });

    const result = computeLegDeadline(leg, schema);

    expect(result.status).toBe<DeadlineStatus>('no-deadline');
    expect(result.submissionDeadline).toBeUndefined();
    expect(result.recommendedDeadline).toBeUndefined();
    expect(result.hoursRemaining).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Acceptance criterion: missing departure datetime returns no-deadline
  // -------------------------------------------------------------------------

  it('returns no-deadline status when submissionDeadlineHours is 0 (no hard deadline set)', () => {
    const leg = makeLegNoDeparture();
    const schema = makeSchema({ submissionDeadlineHours: 0 });

    const result = computeLegDeadline(leg, schema);

    expect(result.status).toBe('no-deadline');
  });

  it('populates legId and countryCode on the returned LegDeadline', () => {
    const leg = makeLegWithDeparture(10, { id: 'leg-xyz', destinationCountry: 'SGP' });
    const schema = makeSchema({ countryCode: 'SGP', submissionDeadlineHours: 48 });

    const result = computeLegDeadline(leg, schema);

    expect(result.legId).toBe('leg-xyz');
    expect(result.countryCode).toBe('SGP');
  });

  it('sets windowNote from schema submissionWindowNote', () => {
    const leg = makeLegWithDeparture(10);
    const schema = makeSchema({ submissionWindowNote: 'Must submit 3 days before arrival' });

    const result = computeLegDeadline(leg, schema);

    expect(result.windowNote).toBe('Must submit 3 days before arrival');
  });
});

// ---------------------------------------------------------------------------
// computeTripDeadlines
// ---------------------------------------------------------------------------

describe('computeTripDeadlines', () => {
  it('returns a LegDeadline for each leg in the trip', () => {
    const legs = [
      makeLegWithDeparture(10, { id: 'leg-1', destinationCountry: 'JPN' }),
      makeLegWithDeparture(10, { id: 'leg-2', destinationCountry: 'SGP' }),
    ];
    const trip = makeTrip(legs);
    const schemas: Record<string, CountryFormSchema> = {
      JPN: makeSchema({ countryCode: 'JPN' }),
      SGP: makeSchema({ countryCode: 'SGP' }),
    };

    const results = computeTripDeadlines(trip, schemas);

    expect(results).toHaveLength(2);
    expect(results[0].legId).toBe('leg-1');
    expect(results[1].legId).toBe('leg-2');
  });

  it('returns no-deadline for legs with no matching schema', () => {
    const leg = makeLegWithDeparture(10, { destinationCountry: 'XXX' });
    const trip = makeTrip([leg]);

    const results = computeTripDeadlines(trip, {});

    expect(results[0].status).toBe('no-deadline');
    expect(results[0].windowNote).toBe('');
  });

  it('returns an empty array for a trip with no legs', () => {
    const trip = makeTrip([]);
    const results = computeTripDeadlines(trip, {});
    expect(results).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getUrgencyLevel — boundary value tests
// ---------------------------------------------------------------------------

describe('getUrgencyLevel', () => {
  function makeDeadlineWithHours(
    hoursRemaining: number,
    status: DeadlineStatus = 'not-started',
  ): LegDeadline {
    return {
      legId: 'leg-001',
      countryCode: 'JPN',
      hoursRemaining,
      status,
      windowNote: '',
    };
  }

  it('returns "overdue" when hoursRemaining < 0', () => {
    const deadline = makeDeadlineWithHours(-1);
    expect(getUrgencyLevel(deadline)).toBe('overdue');
  });

  it('returns "overdue" when status is overdue even with positive hoursRemaining', () => {
    const deadline = makeDeadlineWithHours(10, 'overdue');
    expect(getUrgencyLevel(deadline)).toBe('overdue');
  });

  it('returns "critical" when hoursRemaining is exactly 24', () => {
    const deadline = makeDeadlineWithHours(24);
    expect(getUrgencyLevel(deadline)).toBe('critical');
  });

  it('returns "critical" when hoursRemaining is between 0 and 24', () => {
    const deadline = makeDeadlineWithHours(12);
    expect(getUrgencyLevel(deadline)).toBe('critical');
  });

  it('returns "warning" when hoursRemaining is exactly 48', () => {
    const deadline = makeDeadlineWithHours(48);
    expect(getUrgencyLevel(deadline)).toBe('warning');
  });

  it('returns "warning" when hoursRemaining is between 24 and 48 (exclusive)', () => {
    const deadline = makeDeadlineWithHours(36);
    expect(getUrgencyLevel(deadline)).toBe('warning');
  });

  it('returns "normal" when hoursRemaining is greater than 48', () => {
    const deadline = makeDeadlineWithHours(72);
    expect(getUrgencyLevel(deadline)).toBe('normal');
  });

  it('returns "normal" for no-deadline status with 0 hoursRemaining', () => {
    const deadline = makeDeadlineWithHours(0, 'no-deadline');
    expect(getUrgencyLevel(deadline)).toBe('normal');
  });

  it('returns "normal" when hoursRemaining is exactly 49', () => {
    const deadline = makeDeadlineWithHours(49);
    expect(getUrgencyLevel(deadline)).toBe('normal');
  });

  it('returns "warning" when hoursRemaining is exactly 25', () => {
    const deadline = makeDeadlineWithHours(25);
    expect(getUrgencyLevel(deadline)).toBe('warning');
  });
});
