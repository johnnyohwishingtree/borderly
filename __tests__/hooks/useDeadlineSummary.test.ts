import { renderHook, act } from '@testing-library/react-native';
import { useDeadlineSummary } from '../../src/hooks/useDeadlineSummary';
import type { Trip } from '../../src/types/trip';
import type { CountryFormSchema } from '../../src/types/schema';

// Minimal schema factory
function makeSchema(overrides: Partial<CountryFormSchema> = {}): CountryFormSchema {
  return {
    countryCode: 'JPN',
    countryName: 'Japan',
    portalName: 'Visit Japan Web',
    portalUrl: 'https://example.com',
    schemaVersion: '1.0',
    lastUpdated: '2025-01-01',
    submissionDeadlineHours: 72,
    recommendedLeadTimeHours: 24,
    submissionWindowNote: 'Submit 72h before arrival',
    sections: [],
    submissionGuide: [],
    submission: { method: 'online', portalUrl: 'https://example.com', steps: [] },
    ...overrides,
  } as CountryFormSchema;
}

// Trip factory
function makeTrip(overrides: Partial<Trip> & { legs: Trip['legs'] }): Trip {
  return {
    id: 'trip-1',
    name: 'Test Trip',
    status: 'upcoming',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    ...overrides,
  };
}

function makeLeg(
  overrides: Partial<Trip['legs'][0]> = {},
): Trip['legs'][0] {
  return {
    id: 'leg-1',
    tripId: 'trip-1',
    destinationCountry: 'JPN',
    arrivalDate: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12h from now
    formStatus: 'not_started',
    submissionStatus: 'not_started',
    accommodation: { name: 'Hotel', address: { line1: '', city: '', country: '', postalCode: '' } },
    order: 0,
    ...overrides,
  };
}

describe('useDeadlineSummary', () => {
  it('returns empty items when no trips have urgent deadlines', () => {
    const trips: Trip[] = [
      makeTrip({
        legs: [makeLeg({
          arrivalDate: new Date(Date.now() + 200 * 60 * 60 * 1000).toISOString(),
        })],
      }),
    ];
    const schemas = { JPN: makeSchema() };

    const { result } = renderHook(() => useDeadlineSummary(trips, schemas));

    expect(result.current.items).toHaveLength(0);
    expect(result.current.hasUrgentItems).toBe(false);
  });

  it('returns items for overdue deadlines', () => {
    const trips: Trip[] = [
      makeTrip({
        legs: [makeLeg({
          arrivalDate: new Date(Date.now() - 100 * 60 * 60 * 1000).toISOString(),
        })],
      }),
    ];
    const schemas = { JPN: makeSchema() };

    const { result } = renderHook(() => useDeadlineSummary(trips, schemas));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].urgency).toBe('overdue');
    expect(result.current.items[0].label).toBe('Overdue');
    expect(result.current.hasUrgentItems).toBe(true);
  });

  it('returns items for critical deadlines (<=24h)', () => {
    // submissionDeadlineHours=72, so arrival must be within 72+24=96h
    // To get critical: hoursRemaining <= 24 but > 0
    // hoursRemaining = submissionDeadline - now
    // submissionDeadline = arrivalDate - 72h
    // So hoursRemaining = arrivalDate - 72h - now
    // For 12h remaining: arrivalDate = now + 72 + 12 = now + 84h
    const trips: Trip[] = [
      makeTrip({
        legs: [makeLeg({
          arrivalDate: new Date(Date.now() + 84 * 60 * 60 * 1000).toISOString(),
        })],
      }),
    ];
    const schemas = { JPN: makeSchema() };

    const { result } = renderHook(() => useDeadlineSummary(trips, schemas));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].urgency).toBe('critical');
  });

  it('returns items for warning deadlines (<=48h)', () => {
    // For 36h remaining: arrivalDate = now + 72 + 36 = now + 108h
    const trips: Trip[] = [
      makeTrip({
        legs: [makeLeg({
          arrivalDate: new Date(Date.now() + 108 * 60 * 60 * 1000).toISOString(),
        })],
      }),
    ];
    const schemas = { JPN: makeSchema() };

    const { result } = renderHook(() => useDeadlineSummary(trips, schemas));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].urgency).toBe('warning');
  });

  it('sorts by urgency: overdue first, then critical, then warning', () => {
    const trips: Trip[] = [
      makeTrip({
        id: 'trip-warning',
        name: 'Warning Trip',
        legs: [makeLeg({
          id: 'leg-w',
          tripId: 'trip-warning',
          arrivalDate: new Date(Date.now() + 108 * 60 * 60 * 1000).toISOString(),
        })],
      }),
      makeTrip({
        id: 'trip-overdue',
        name: 'Overdue Trip',
        legs: [makeLeg({
          id: 'leg-o',
          tripId: 'trip-overdue',
          arrivalDate: new Date(Date.now() - 100 * 60 * 60 * 1000).toISOString(),
        })],
      }),
      makeTrip({
        id: 'trip-critical',
        name: 'Critical Trip',
        legs: [makeLeg({
          id: 'leg-c',
          tripId: 'trip-critical',
          arrivalDate: new Date(Date.now() + 84 * 60 * 60 * 1000).toISOString(),
        })],
      }),
    ];
    const schemas = { JPN: makeSchema() };

    const { result } = renderHook(() => useDeadlineSummary(trips, schemas));

    expect(result.current.items).toHaveLength(3);
    expect(result.current.items[0].urgency).toBe('overdue');
    expect(result.current.items[1].urgency).toBe('critical');
    expect(result.current.items[2].urgency).toBe('warning');
  });

  it('excludes completed trips', () => {
    const trips: Trip[] = [
      makeTrip({
        status: 'completed',
        legs: [makeLeg({
          arrivalDate: new Date(Date.now() - 100 * 60 * 60 * 1000).toISOString(),
        })],
      }),
    ];
    const schemas = { JPN: makeSchema() };

    const { result } = renderHook(() => useDeadlineSummary(trips, schemas));

    expect(result.current.items).toHaveLength(0);
  });

  it('excludes legs with no matching schema', () => {
    const trips: Trip[] = [
      makeTrip({
        legs: [makeLeg({
          destinationCountry: 'XYZ',
          arrivalDate: new Date(Date.now() - 100 * 60 * 60 * 1000).toISOString(),
        })],
      }),
    ];
    const schemas = { JPN: makeSchema() };

    const { result } = renderHook(() => useDeadlineSummary(trips, schemas));

    expect(result.current.items).toHaveLength(0);
  });

  it('toggleExpanded flips the state', () => {
    const trips: Trip[] = [
      makeTrip({
        legs: [makeLeg({
          arrivalDate: new Date(Date.now() + 108 * 60 * 60 * 1000).toISOString(),
        })],
      }),
    ];
    const schemas = { JPN: makeSchema() };

    const { result } = renderHook(() => useDeadlineSummary(trips, schemas));
    const initialExpanded = result.current.isExpanded;

    act(() => {
      result.current.toggleExpanded();
    });

    expect(result.current.isExpanded).toBe(!initialExpanded);
  });

  it('includes tripName and countryCode in items', () => {
    const trips: Trip[] = [
      makeTrip({
        name: 'Japan Vacation',
        legs: [makeLeg({
          destinationCountry: 'JPN',
          arrivalDate: new Date(Date.now() + 84 * 60 * 60 * 1000).toISOString(),
        })],
      }),
    ];
    const schemas = { JPN: makeSchema() };

    const { result } = renderHook(() => useDeadlineSummary(trips, schemas));

    expect(result.current.items[0].tripName).toBe('Japan Vacation');
    expect(result.current.items[0].countryCode).toBe('JPN');
  });

  it('formats label correctly for days', () => {
    // Warning level with ~36h remaining → "Due in 2d"
    const trips: Trip[] = [
      makeTrip({
        legs: [makeLeg({
          arrivalDate: new Date(Date.now() + 108 * 60 * 60 * 1000).toISOString(),
        })],
      }),
    ];
    const schemas = { JPN: makeSchema() };

    const { result } = renderHook(() => useDeadlineSummary(trips, schemas));

    expect(result.current.items[0].label).toMatch(/Due in \d+d/);
  });
});
