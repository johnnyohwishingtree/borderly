/**
 * Tests for useTripCreation bulk traveler assignment (applyToAllLegs toggle).
 *
 * Covers:
 * - applyToAllLegs defaults to true
 * - Trip-level traveler toggle syncs all legs when applyToAllLegs is on
 * - Per-leg selectors disabled (applyToAllLegs on) — tested at UI level
 * - Turning toggle off preserves current per-leg selections
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockReplace = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, replace: mockReplace, goBack: jest.fn() }),
}));

jest.mock('@/stores/useTripStore', () => ({
  useTripStore: () => ({
    createTrip: jest.fn().mockResolvedValue({ id: 'trip_new' }),
    addTripLeg: jest.fn().mockResolvedValue({}),
  }),
}));

jest.mock('@/stores/useProfileStore', () => ({
  useProfileStore: () => ({
    getAllProfiles: jest.fn().mockResolvedValue(
      new Map([
        ['p1', { id: 'p1', givenNames: 'John', surname: 'Doe', relationship: 'self', passportNumber: 'A1', nationality: 'USA', dateOfBirth: '1990-01-01', gender: 'M', passportExpiry: '2030-01-01', issuingCountry: 'USA', defaultDeclarations: {}, createdAt: '', updatedAt: '' }],
        ['p2', { id: 'p2', givenNames: 'Jane', surname: 'Doe', relationship: 'spouse', passportNumber: 'A2', nationality: 'USA', dateOfBirth: '1991-01-01', gender: 'F', passportExpiry: '2030-01-01', issuingCountry: 'USA', defaultDeclarations: {}, createdAt: '', updatedAt: '' }],
      ]),
    ),
    loadFamilyProfiles: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('@/services/boarding/boardingPassParser', () => ({
  isBoardingPassSupported: jest.fn().mockReturnValue(false),
  getUnsupportedDestinationMessage: jest.fn().mockReturnValue(''),
}));


jest.mock('@/constants/countries', () => ({
  getCountryName: (code: string) => code,
}));

jest.mock('@/utils/deepCopy', () => ({
  deepCopy: <T,>(obj: T): T => JSON.parse(JSON.stringify(obj)),
}));

import { useTripCreation } from '@/hooks/useTripCreation';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useTripCreation — applyToAllLegs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defaults applyToAllLegs to true', async () => {
    const { result } = renderHook(() => useTripCreation());

    await waitFor(() => {
      expect(result.current.travelers.familyMembers.length).toBe(2);
    });

    expect(result.current.travelers.applyToAllLegs).toBe(true);
  });

  it('syncs all legs when trip-level traveler toggled with applyToAllLegs on', async () => {
    const { result } = renderHook(() => useTripCreation());

    await waitFor(() => {
      expect(result.current.travelers.familyMembers.length).toBe(2);
    });

    // Add two legs
    act(() => { result.current.legs.addLeg(); });
    act(() => { result.current.legs.addLeg(); });

    expect(result.current.legs.items).toHaveLength(2);

    // Toggle spouse at trip level
    act(() => { result.current.travelers.handleTripTravelerToggle('p2'); });

    // Both legs should have both travelers
    expect(result.current.legs.items[0].assignedTravelers).toContain('p1');
    expect(result.current.legs.items[0].assignedTravelers).toContain('p2');
    expect(result.current.legs.items[1].assignedTravelers).toContain('p1');
    expect(result.current.legs.items[1].assignedTravelers).toContain('p2');
  });

  it('turning toggle off preserves current per-leg selections', async () => {
    const { result } = renderHook(() => useTripCreation());

    await waitFor(() => {
      expect(result.current.travelers.familyMembers.length).toBe(2);
    });

    act(() => { result.current.legs.addLeg(); });
    act(() => { result.current.travelers.handleTripTravelerToggle('p2'); });

    // All legs have [p1, p2]
    expect(result.current.legs.items[0].assignedTravelers).toEqual(expect.arrayContaining(['p1', 'p2']));

    // Turn toggle off
    act(() => { result.current.travelers.setApplyToAllLegs(false); });

    expect(result.current.travelers.applyToAllLegs).toBe(false);
    // Selections preserved
    expect(result.current.legs.items[0].assignedTravelers).toEqual(expect.arrayContaining(['p1', 'p2']));
  });

  it('turning toggle on with no overrides syncs immediately without confirmation', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { result } = renderHook(() => useTripCreation());

    await waitFor(() => {
      expect(result.current.travelers.familyMembers.length).toBe(2);
    });

    act(() => { result.current.legs.addLeg(); });

    // Turn off then on — no overrides exist
    act(() => { result.current.travelers.setApplyToAllLegs(false); });
    act(() => { result.current.travelers.setApplyToAllLegs(true); });

    expect(alertSpy).not.toHaveBeenCalled();
    expect(result.current.travelers.applyToAllLegs).toBe(true);
    alertSpy.mockRestore();
  });
});
