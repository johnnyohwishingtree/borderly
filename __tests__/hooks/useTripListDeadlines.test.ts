/**
 * Tests for useTripListDeadlines hook.
 *
 * The hook loads schemas for all trip legs, computes deadlines, and returns
 * the most urgent deadline per trip for TripCard display.
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useTripListDeadlines } from '../../src/hooks/useTripListDeadlines';
import type { Trip, TripLeg } from '../../src/types/trip';
import type { CountryFormSchema } from '../../src/types/schema';

// Mock schema loading — import directly, not from barrel
jest.mock('../../src/schemas', () => ({
  getSchemaByCountryCode: jest.fn(),
}));

// Mock deadline service
jest.mock('../../src/services/deadline/deadlineService', () => {
  const actual = jest.requireActual('../../src/services/deadline/deadlineService');
  return actual;
});

import { getSchemaByCountryCode } from '../../src/schemas';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeLeg(overrides: Partial<TripLeg> = {}): TripLeg {
  return {
    id: 'leg-1',
    tripId: 'trip-1',
    destinationCountry: 'JPN',
    arrivalDate: '2025-12-01T10:00:00Z',
    accommodation: {
      name: 'Hotel',
      address: { line1: '1-1', city: 'Tokyo', postalCode: '100', country: 'JPN' },
    },
    formStatus: 'not_started',
    submissionStatus: 'not_started',
    order: 0,
    ...overrides,
  };
}

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1',
    name: 'Test Trip',
    status: 'upcoming',
    legs: [makeLeg()],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeSchema(overrides: Partial<CountryFormSchema> = {}): CountryFormSchema {
  return {
    countryCode: 'JPN',
    countryName: 'Japan',
    schemaVersion: '1.0.0',
    lastUpdated: '2025-01-01',
    portalUrl: 'https://vjw.digital.go.jp',
    portalName: 'Visit Japan Web',
    submissionDeadlineHours: 72,
    recommendedLeadTimeHours: 24,
    submissionWindowNote: 'Submit 3 days before',
    metadata: {
      priority: 1,
      complexity: 'medium',
      popularity: 90,
      lastVerified: '2025-01-01',
      supportedLanguages: ['en'],
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useTripListDeadlines', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty urgencyByTripId when no trips provided', async () => {
    const { result } = renderHook(() => useTripListDeadlines([]));
    expect(result.current.urgencyByTripId).toEqual({});
  });

  it('returns empty urgencyByTripId for completed trips', async () => {
    jest.mocked(getSchemaByCountryCode).mockResolvedValue(makeSchema());
    const trip = makeTrip({ status: 'completed' });

    const { result } = renderHook(() => useTripListDeadlines([trip]));

    await waitFor(() => {
      expect(result.current.urgencyByTripId).toEqual({});
    });
  });

  it('loads schemas for all unique country codes across trips', async () => {
    jest.mocked(getSchemaByCountryCode).mockResolvedValue(makeSchema());
    const trip = makeTrip({
      legs: [
        makeLeg({ destinationCountry: 'JPN' }),
        makeLeg({ id: 'leg-2', destinationCountry: 'SGP' }),
      ],
    });

    renderHook(() => useTripListDeadlines([trip]));

    await waitFor(() => {
      expect(getSchemaByCountryCode).toHaveBeenCalledWith('JPN');
      expect(getSchemaByCountryCode).toHaveBeenCalledWith('SGP');
    });
  });

  it('returns urgency for trips with overdue deadlines', async () => {
    // Leg departure was 5 days ago, 72h deadline → well overdue
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const trip = makeTrip({
      legs: [makeLeg({ departureDate: pastDate, formStatus: 'not_started' })],
    });

    jest.mocked(getSchemaByCountryCode).mockResolvedValue(
      makeSchema({ submissionDeadlineHours: 72 }),
    );

    const { result } = renderHook(() => useTripListDeadlines([trip]));

    await waitFor(() => {
      const urgency = result.current.urgencyByTripId['trip-1'];
      expect(urgency).toBeDefined();
      expect(urgency.level).toBe('overdue');
      expect(urgency.label).toBe('Overdue');
    });
  });

  it('returns urgency "critical" when deadline is within 24 hours', async () => {
    // Departure in 80 hours, 72h deadline → 8 hours remaining (critical)
    const soonDate = new Date(Date.now() + 80 * 60 * 60 * 1000).toISOString();
    const trip = makeTrip({
      legs: [makeLeg({ departureDate: soonDate, formStatus: 'not_started' })],
    });

    jest.mocked(getSchemaByCountryCode).mockResolvedValue(
      makeSchema({ submissionDeadlineHours: 72 }),
    );

    const { result } = renderHook(() => useTripListDeadlines([trip]));

    await waitFor(() => {
      const urgency = result.current.urgencyByTripId['trip-1'];
      expect(urgency).toBeDefined();
      expect(urgency.level).toBe('critical');
    });
  });

  it('does not include trips where all deadlines are normal', async () => {
    // Departure in 30 days, 72h deadline → plenty of time
    const farDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const trip = makeTrip({
      legs: [makeLeg({ departureDate: farDate, formStatus: 'not_started' })],
    });

    jest.mocked(getSchemaByCountryCode).mockResolvedValue(
      makeSchema({ submissionDeadlineHours: 72 }),
    );

    const { result } = renderHook(() => useTripListDeadlines([trip]));

    await waitFor(() => {
      expect(Object.keys(result.current.schemas)).toContain('JPN');
    });
    expect(result.current.urgencyByTripId['trip-1']).toBeUndefined();
  });

  it('returns schemas map after loading', async () => {
    const schema = makeSchema({ countryCode: 'JPN' });
    jest.mocked(getSchemaByCountryCode).mockResolvedValue(schema);

    const trip = makeTrip();
    const { result } = renderHook(() => useTripListDeadlines([trip]));

    await waitFor(() => {
      expect(result.current.schemas['JPN']).toBeDefined();
      expect(result.current.schemas['JPN'].countryCode).toBe('JPN');
    });
  });

  it('handles schema loading failure gracefully', async () => {
    jest.mocked(getSchemaByCountryCode).mockResolvedValue(null);

    const trip = makeTrip();
    const { result } = renderHook(() => useTripListDeadlines([trip]));

    // Schema should not be in the map, trip should have no urgency
    await waitFor(() => {
      expect(result.current.schemas['JPN']).toBeUndefined();
    });
    expect(result.current.urgencyByTripId['trip-1']).toBeUndefined();
  });

  it('picks the most urgent leg when a trip has multiple legs', async () => {
    // Leg 1: overdue (departure 5 days ago)
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    // Leg 2: normal (departure 30 days out)
    const farDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const trip = makeTrip({
      legs: [
        makeLeg({ id: 'leg-overdue', departureDate: pastDate, formStatus: 'not_started' }),
        makeLeg({ id: 'leg-normal', departureDate: farDate, formStatus: 'not_started' }),
      ],
    });

    jest.mocked(getSchemaByCountryCode).mockResolvedValue(
      makeSchema({ submissionDeadlineHours: 72 }),
    );

    const { result } = renderHook(() => useTripListDeadlines([trip]));

    await waitFor(() => {
      const urgency = result.current.urgencyByTripId['trip-1'];
      expect(urgency).toBeDefined();
      expect(urgency.level).toBe('overdue');
    });
  });
});
