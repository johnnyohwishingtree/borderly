import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useTripCreation } from '@/hooks/useTripCreation';
import type { TripTemplate } from '@/types/trip';

// ── tripTemplateService mock ──────────────────────────────────────────────────

const TEMPLATE_FIXTURE: TripTemplate = {
  id: 'tpl_hook_test',
  name: 'Asia Loop',
  legs: [
    { countryCode: 'JPN', typicalDurationDays: 7, order: 0 },
    { countryCode: 'SGP', typicalDurationDays: 3, order: 1 },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
};

jest.mock('../../src/services/trips/tripTemplateService', () => ({
  tripTemplateService: {
    getById: jest.fn((id: string) => {
      if (id === 'tpl_hook_test') return TEMPLATE_FIXTURE;
      return null;
    }),
  },
}));

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate, replace: mockReplace }),
}));

// Mock stores
jest.mock('../../src/stores/useTripStore', () => ({
  useTripStore: () => ({
    createTrip: jest.fn().mockResolvedValue({ id: 'trip_1' }),
    addTripLeg: jest.fn().mockResolvedValue({}),
  }),
}));

/**
 * Profile store mock with STABLE function references so `useEffect` deps
 * don't change on every render (which would cause an infinite loop).
 * `__setProfiles` is a test-only helper to control what `getAllProfiles` returns.
 */
jest.mock('../../src/stores/useProfileStore', () => {
  // These are created ONCE — stable references across renders.
  let _profiles: Map<string, object> = new Map();
  const getAllProfiles = jest.fn(() => Promise.resolve(_profiles));
  const loadFamilyProfiles = jest.fn(() => Promise.resolve(undefined));
  return {
    useProfileStore: () => ({ getAllProfiles, loadFamilyProfiles }),
    __setProfiles: (p: Map<string, object>) => { _profiles = p; },
    __reset: () => { _profiles = new Map(); jest.clearAllMocks(); },
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────
const PRIMARY_ID = 'profile_primary';
const SPOUSE_ID  = 'profile_spouse';
const CHILD_ID   = 'profile_child';

const makeMember = (id: string, relationship: string, givenNames: string) => ({
  id,
  passportNumber: `P${id}`,
  surname: 'Smith',
  givenNames,
  nationality: 'GBR',
  dateOfBirth: '1985-06-15',
  gender: 'F',
  passportExpiry: '2030-06-15',
  issuingCountry: 'GBR',
  relationship,
  defaultDeclarations: {
    hasItemsToDeclare: false,
    carryingCurrency: false,
    carryingProhibitedItems: false,
    visitedFarm: false,
    hasCriminalRecord: false,
    carryingCommercialGoods: false,
  },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
});

const familyProfilesMap = new Map([
  [PRIMARY_ID, makeMember(PRIMARY_ID, 'self',   'Alice')],
  [SPOUSE_ID,  makeMember(SPOUSE_ID,  'spouse', 'Bob')],
  [CHILD_ID,   makeMember(CHILD_ID,   'child',  'Charlie')],
]);

type ProfileStoreMock = {
  __setProfiles: (p: Map<string, object>) => void;
  __reset: () => void;
};

const getProfileMock = () =>
  jest.requireMock('../../src/stores/useProfileStore') as ProfileStoreMock;

// ─────────────────────────────────────────────────────────────────────────────
// Basic tests (solo traveler — no family members)
// ─────────────────────────────────────────────────────────────────────────────
describe('useTripCreation', () => {
  beforeEach(() => {
    getProfileMock().__reset();
  });

  it('starts with empty legs and trip data', () => {
    const { result } = renderHook(() => useTripCreation());

    expect(result.current.legs).toEqual([]);
    expect(result.current.tripData.name).toBe('');
    expect(result.current.tripData.status).toBe('upcoming');
    expect(result.current.isCreating).toBe(false);
  });

  it('addLeg adds a new empty leg', () => {
    const { result } = renderHook(() => useTripCreation());

    act(() => {
      result.current.addLeg();
    });

    expect(result.current.legs).toHaveLength(1);
    expect(result.current.legs[0].destinationCountry).toBe('');
    expect(result.current.legs[0].arrivalDate).toBe('');
  });

  it('removeLeg removes the leg at the given index', () => {
    const { result } = renderHook(() => useTripCreation());

    act(() => {
      result.current.addLeg();
      result.current.addLeg();
    });

    expect(result.current.legs).toHaveLength(2);

    act(() => {
      result.current.removeLeg(0);
    });

    expect(result.current.legs).toHaveLength(1);
  });

  it('updateLeg updates a simple field', () => {
    const { result } = renderHook(() => useTripCreation());

    act(() => {
      result.current.addLeg();
    });

    act(() => {
      result.current.updateLeg(0, 'destinationCountry', 'JPN');
    });

    expect(result.current.legs[0].destinationCountry).toBe('JPN');
  });

  it('updateLeg handles nested dot-notation fields without mutating other legs', () => {
    const { result } = renderHook(() => useTripCreation());

    act(() => {
      result.current.addLeg();
      result.current.addLeg();
    });

    act(() => {
      result.current.updateLeg(0, 'accommodation.name', 'Hotel A');
    });

    act(() => {
      result.current.updateLeg(1, 'accommodation.name', 'Hotel B');
    });

    expect(result.current.legs[0].accommodation.name).toBe('Hotel A');
    expect(result.current.legs[1].accommodation.name).toBe('Hotel B');
  });

  it('updateLeg with nested path does not mutate the original leg object', () => {
    const { result } = renderHook(() => useTripCreation());

    act(() => {
      result.current.addLeg();
    });

    const legBefore = result.current.legs[0];

    act(() => {
      result.current.updateLeg(0, 'accommodation.address.city', 'Tokyo');
    });

    expect(legBefore.accommodation.address.city).toBe('');
    expect(result.current.legs[0].accommodation.address.city).toBe('Tokyo');
  });

  it('setTripData updates trip metadata', () => {
    const { result } = renderHook(() => useTripCreation());

    act(() => {
      result.current.setTripData({ name: 'Japan Trip', status: 'upcoming' });
    });

    expect(result.current.tripData.name).toBe('Japan Trip');
  });

  it('handleTravelerToggle adds and removes travelers', () => {
    const { result } = renderHook(() => useTripCreation());

    act(() => {
      result.current.addLeg();
    });

    act(() => {
      result.current.handleTravelerToggle(0, 'traveler_1');
    });

    expect(result.current.legs[0].assignedTravelers).toContain('traveler_1');

    act(() => {
      result.current.handleTravelerToggle(0, 'traveler_1');
    });

    expect(result.current.legs[0].assignedTravelers).not.toContain('traveler_1');
  });

  it('solo traveler: tripTravelers is empty before profiles load', () => {
    const { result } = renderHook(() => useTripCreation());
    // No family members configured — tripTravelers starts empty.
    expect(result.current.tripTravelers).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Trip-level traveler propagation tests (with family members)
// ─────────────────────────────────────────────────────────────────────────────
describe('useTripCreation — trip-level traveler propagation', () => {
  beforeEach(() => {
    getProfileMock().__reset();
    getProfileMock().__setProfiles(familyProfilesMap);
  });

  /** Render the hook and wait until family members have been loaded. */
  const renderAndLoad = async () => {
    const rendered = renderHook(() => useTripCreation());
    // Wait until tripTravelers is populated (signals profile load + init).
    await waitFor(
      () => expect(rendered.result.current.tripTravelers).toHaveLength(1),
      { timeout: 3000 },
    );
    return rendered;
  };

  it('initializes tripTravelers with only the primary traveler', async () => {
    const { result } = await renderAndLoad();
    expect(result.current.tripTravelers).toEqual([PRIMARY_ID]);
  });

  it('handleTripTravelerToggle adds a traveler and propagates to all existing legs', async () => {
    const { result } = await renderAndLoad();

    // Add two legs (both inherit the current trip-level traveler).
    act(() => {
      result.current.addLeg();
      result.current.addLeg();
    });

    expect(result.current.legs[0].assignedTravelers).toEqual([PRIMARY_ID]);
    expect(result.current.legs[1].assignedTravelers).toEqual([PRIMARY_ID]);

    // Add spouse at trip level — both legs should update.
    act(() => {
      result.current.handleTripTravelerToggle(SPOUSE_ID);
    });

    expect(result.current.tripTravelers).toContain(SPOUSE_ID);
    expect(result.current.legs[0].assignedTravelers).toContain(SPOUSE_ID);
    expect(result.current.legs[1].assignedTravelers).toContain(SPOUSE_ID);
  });

  it('handleTripTravelerToggle removes a traveler and propagates to all legs', async () => {
    const { result } = await renderAndLoad();

    // Add spouse first.
    act(() => {
      result.current.handleTripTravelerToggle(SPOUSE_ID);
    });

    // Add two legs — they inherit primary + spouse.
    act(() => {
      result.current.addLeg();
      result.current.addLeg();
    });

    expect(result.current.legs[0].assignedTravelers).toContain(SPOUSE_ID);
    expect(result.current.legs[1].assignedTravelers).toContain(SPOUSE_ID);

    // Remove spouse at trip level.
    act(() => {
      result.current.handleTripTravelerToggle(SPOUSE_ID);
    });

    expect(result.current.tripTravelers).not.toContain(SPOUSE_ID);
    expect(result.current.legs[0].assignedTravelers).not.toContain(SPOUSE_ID);
    expect(result.current.legs[1].assignedTravelers).not.toContain(SPOUSE_ID);
  });

  it('per-leg overrides are preserved when trip-level selection changes', async () => {
    const { result } = await renderAndLoad();

    // Add two legs.
    act(() => {
      result.current.addLeg();
      result.current.addLeg();
    });

    // Manually override leg 0 — marks it as overridden.
    act(() => {
      result.current.handleTravelerToggle(0, SPOUSE_ID);
    });

    expect(result.current.legs[0].assignedTravelers).toContain(SPOUSE_ID);
    expect(result.current.legs[1].assignedTravelers).not.toContain(SPOUSE_ID);

    // Add child at trip level — should NOT propagate to overridden leg 0.
    act(() => {
      result.current.handleTripTravelerToggle(CHILD_ID);
    });

    // Leg 0 (overridden): retains spouse, does NOT get child.
    expect(result.current.legs[0].assignedTravelers).toContain(SPOUSE_ID);
    expect(result.current.legs[0].assignedTravelers).not.toContain(CHILD_ID);

    // Leg 1 (not overridden): gets child, no spouse.
    expect(result.current.legs[1].assignedTravelers).toContain(CHILD_ID);
    expect(result.current.legs[1].assignedTravelers).not.toContain(SPOUSE_ID);
  });

  it('primary traveler cannot be removed via handleTripTravelerToggle', async () => {
    const { result } = await renderAndLoad();

    // Attempt to deselect the primary traveler — should be a no-op.
    act(() => {
      result.current.handleTripTravelerToggle(PRIMARY_ID);
    });

    expect(result.current.tripTravelers).toContain(PRIMARY_ID);
  });

  it('new legs added after trip-level change inherit the trip-level selection', async () => {
    const { result } = await renderAndLoad();

    // Add spouse at trip level.
    act(() => {
      result.current.handleTripTravelerToggle(SPOUSE_ID);
    });

    // Add a leg — should inherit both primary and spouse.
    act(() => {
      result.current.addLeg();
    });

    expect(result.current.legs[0].assignedTravelers).toContain(PRIMARY_ID);
    expect(result.current.legs[0].assignedTravelers).toContain(SPOUSE_ID);
  });

  it('removing a leg shifts override indices correctly', async () => {
    const { result } = await renderAndLoad();

    // Add three legs.
    act(() => {
      result.current.addLeg();
      result.current.addLeg();
      result.current.addLeg();
    });

    // Override leg at index 2.
    act(() => {
      result.current.handleTravelerToggle(2, SPOUSE_ID);
    });

    // Remove leg 0 — former leg 2 is now leg 1.
    act(() => {
      result.current.removeLeg(0);
    });

    // Add child at trip level.
    act(() => {
      result.current.handleTripTravelerToggle(CHILD_ID);
    });

    // Leg 0 (formerly leg 1) was NOT overridden — receives child.
    expect(result.current.legs[0].assignedTravelers).toContain(CHILD_ID);

    // Leg 1 (formerly leg 2) WAS overridden — does NOT receive child.
    expect(result.current.legs[1].assignedTravelers).not.toContain(CHILD_ID);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Navigation after trip creation
// ─────────────────────────────────────────────────────────────────────────────
describe('useTripCreation — navigation after trip creation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getProfileMock().__reset();
  });

  it('navigates to TripDetail with the new trip id on success', async () => {
    const { Alert } = require('react-native') as { Alert: { alert: jest.Mock } };
    const { result } = renderHook(() => useTripCreation());

    // Set up a valid trip with all required fields
    act(() => {
      result.current.setTripData({ name: 'Test Trip', status: 'upcoming' });
      result.current.addLeg();
    });

    act(() => {
      result.current.updateLeg(0, 'destinationCountry', 'JPN');
      result.current.updateLeg(0, 'arrivalDate', '2025-04-01');
      result.current.updateLeg(0, 'accommodation.name', 'Hotel Tokyo');
      result.current.handleTravelerToggle(0, 'traveler_1');
    });

    await act(async () => {
      await result.current.handleCreateTrip();
    });

    // The success alert should have been called with a buttons array
    expect(Alert.alert).toHaveBeenCalledWith(
      'Success',
      'Trip created successfully!',
      expect.arrayContaining([expect.objectContaining({ text: 'OK' })]),
    );

    // Simulate the user pressing OK on the success alert
    const successCall = Alert.alert.mock.calls.find(
      (c: unknown[]) => c[0] === 'Success',
    ) as [string, string, Array<{ text: string; onPress: () => void }>] | undefined;
    const okButton = successCall?.[2]?.[0];
    act(() => {
      okButton?.onPress();
    });

    // navigation.replace should be used (not navigate) so CreateTrip is removed from the stack
    expect(mockReplace).toHaveBeenCalledWith('TripDetail', { tripId: 'trip_1' });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('does not navigate when validation fails', async () => {
    const { result } = renderHook(() => useTripCreation());

    // Leave tripData.name empty to trigger validation failure
    await act(async () => {
      await result.current.handleCreateTrip();
    });

    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Template pre-fill tests
// ─────────────────────────────────────────────────────────────────────────────
describe('useTripCreation — template pre-fill', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getProfileMock().__reset();
  });

  it('starts with empty legs when no templateId is provided', () => {
    const { result } = renderHook(() => useTripCreation());
    expect(result.current.legs).toHaveLength(0);
    expect(result.current.tripData.name).toBe('');
  });

  it('pre-populates legs from the template when templateId matches', () => {
    const { result } = renderHook(() =>
      useTripCreation({ templateId: 'tpl_hook_test' }),
    );

    expect(result.current.legs).toHaveLength(2);
    expect(result.current.legs[0].destinationCountry).toBe('JPN');
    expect(result.current.legs[1].destinationCountry).toBe('SGP');
  });

  it('pre-fills the trip name from the template', () => {
    const { result } = renderHook(() =>
      useTripCreation({ templateId: 'tpl_hook_test' }),
    );

    expect(result.current.tripData.name).toBe('Asia Loop');
  });

  it('leaves arrival and departure dates empty (user must set them)', () => {
    const { result } = renderHook(() =>
      useTripCreation({ templateId: 'tpl_hook_test' }),
    );

    expect(result.current.legs[0].arrivalDate).toBe('');
    expect(result.current.legs[0].departureDate).toBe('');
    expect(result.current.legs[1].arrivalDate).toBe('');
    expect(result.current.legs[1].departureDate).toBe('');
  });

  it('respects template leg ordering (sorted by order field)', () => {
    const { result } = renderHook(() =>
      useTripCreation({ templateId: 'tpl_hook_test' }),
    );

    // Template fixture has order 0 = JPN, order 1 = SGP
    expect(result.current.legs[0].destinationCountry).toBe('JPN');
    expect(result.current.legs[1].destinationCountry).toBe('SGP');
  });

  it('falls back to empty legs when templateId is not found', () => {
    const { result } = renderHook(() =>
      useTripCreation({ templateId: 'tpl_nonexistent' }),
    );

    expect(result.current.legs).toHaveLength(0);
    expect(result.current.tripData.name).toBe('');
  });

  it('user can add a leg after loading from template', () => {
    const { result } = renderHook(() =>
      useTripCreation({ templateId: 'tpl_hook_test' }),
    );

    expect(result.current.legs).toHaveLength(2);

    act(() => {
      result.current.addLeg();
    });

    expect(result.current.legs).toHaveLength(3);
  });

  it('user can remove a leg after loading from template', () => {
    const { result } = renderHook(() =>
      useTripCreation({ templateId: 'tpl_hook_test' }),
    );

    expect(result.current.legs).toHaveLength(2);

    act(() => {
      result.current.removeLeg(0);
    });

    expect(result.current.legs).toHaveLength(1);
    expect(result.current.legs[0].destinationCountry).toBe('SGP');
  });
});
