/**
 * Tests for useTripChecklist hook.
 *
 * Covers:
 *  1. Returns null checklist when trip has no legs
 *  2. Returns null checklist when tripId not found
 *  3. Computes checklist for a valid trip
 *  4. Sets isLoading correctly during computation
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useTripChecklist } from '../../src/hooks/useTripChecklist';
import type { Trip } from '../../src/types/trip';

// ── Mocks ──

const mockGetAllProfiles = jest.fn(() =>
  Promise.resolve(
    new Map([
      [
        'profile-001',
        {
          id: 'profile-001',
          passportNumber: 'AB1234567',
          surname: 'DOE',
          givenNames: 'JOHN',
          nationality: 'USA',
          dateOfBirth: '1990-01-15',
          gender: 'M',
          passportExpiry: '2030-01-15',
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
        },
      ],
    ]),
  ),
);

jest.mock('../../src/stores/useProfileStore', () => ({
  useProfileStore: (selector: (s: { getAllProfiles: typeof mockGetAllProfiles }) => unknown) =>
    selector({ getAllProfiles: mockGetAllProfiles }),
}));

const baseLeg = {
  id: 'leg-001',
  tripId: 'trip-001',
  destinationCountry: 'JPN',
  arrivalDate: '2027-06-15',
  departureDate: '2027-06-10',
  formStatus: 'not_started' as const,
  submissionStatus: 'not_started' as const,
  accommodation: {
    name: 'Hotel Tokyo',
    address: { line1: '1-1 Shibuya', city: 'Tokyo', postalCode: '150-0001', country: 'JPN' },
  },
  order: 0,
};

const tripWithLegs: Trip = {
  id: 'trip-001',
  name: 'Japan Trip',
  status: 'upcoming',
  legs: [baseLeg],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

const tripNoLegs: Trip = {
  id: 'trip-002',
  name: 'Empty Trip',
  status: 'upcoming',
  legs: [],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

let mockTrips: Trip[] = [tripWithLegs, tripNoLegs];

jest.mock('../../src/stores/useTripStore', () => ({
  useTripStore: (selector: (s: { trips: Trip[] }) => unknown) =>
    selector({ trips: mockTrips }),
}));

jest.mock('../../src/schemas', () => ({
  getSchemaByCountryCode: jest.fn((code: string) => {
    if (code === 'JPN') {
      return Promise.resolve({
        countryCode: 'JPN',
        countryName: 'Japan',
        schemaVersion: '1.0.0',
        lastUpdated: '2025-01-01T00:00:00Z',
        portalUrl: 'https://vjw.digital.go.jp',
        portalName: 'Visit Japan Web',
        submissionDeadlineHours: 72,
        recommendedLeadTimeHours: 24,
        submissionWindowNote: 'Submit 3 days before',
        passportValidityMonths: 6,
        metadata: {
          priority: 1,
          complexity: 'medium',
          popularity: 90,
          lastVerified: '2025-01-01T00:00:00Z',
          supportedLanguages: ['en', 'ja'],
          implementationStatus: 'complete',
          maintenanceFrequency: 'monthly',
        },
        changeDetection: { monitoredSelectors: [], changeThreshold: 20, fallbackActions: [] },
        submission: { earliestBeforeArrival: '14d', latestBeforeArrival: '3d', recommended: '7d' },
        portalFlow: { requiresAccount: true, multiStep: true, canSaveProgress: true },
        sections: [],
        submissionGuide: [],
      });
    }
    return Promise.resolve(null);
  }),
}));

// ── Tests ──

describe('useTripChecklist', () => {
  beforeEach(() => {
    mockTrips = [tripWithLegs, tripNoLegs];
    mockGetAllProfiles.mockClear();
  });

  it('returns null checklist when trip has no legs', async () => {
    const { result } = renderHook(() => useTripChecklist('trip-002'));

    expect(result.current.checklist).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('returns null checklist when tripId is not found', async () => {
    const { result } = renderHook(() => useTripChecklist('nonexistent'));

    expect(result.current.checklist).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('computes checklist for a valid trip', async () => {
    const { result } = renderHook(() => useTripChecklist('trip-001'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.checklist).not.toBeNull();
    });

    const checklist = result.current.checklist!;
    expect(checklist.tripId).toBe('trip-001');
    expect(checklist.tripName).toBe('Japan Trip');
    expect(checklist.items.length).toBeGreaterThan(0);
    expect(checklist.totalCount).toBe(checklist.items.length);

    // Should have at least a form item for the JPN leg
    const formItems = checklist.items.filter(i => i.category === 'form');
    expect(formItems.length).toBe(1);
    expect(formItems[0].countryCode).toBe('JPN');
  });

  it('calls getAllProfiles during computation', async () => {
    const { result } = renderHook(() => useTripChecklist('trip-001'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetAllProfiles).toHaveBeenCalled();
  });
});
