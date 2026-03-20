/**
 * Unit tests for useEditTrip hook.
 *
 * Tests business logic via renderHook — no full React Native component rendering
 * needed. Each section verifies one concern: trip name editing, leg editing,
 * add destination, and validation.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useEditTrip } from '@/hooks/useEditTrip';
import type { Trip } from '@/types/trip';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUpdateTrip = jest.fn().mockResolvedValue(undefined);
const mockUpdateTripLeg = jest.fn().mockResolvedValue(undefined);
const mockAddTripLeg = jest.fn().mockResolvedValue(undefined);

jest.mock('../../src/stores/useTripStore', () => ({
  useTripStore: () => ({
    updateTrip: mockUpdateTrip,
    updateTripLeg: mockUpdateTripLeg,
    addTripLeg: mockAddTripLeg,
  }),
}));

jest.mock('../../src/stores/useProfileStore', () => {
  let _profiles: Map<string, object> = new Map();
  const getAllProfiles = jest.fn(() => Promise.resolve(_profiles));
  const loadFamilyProfiles = jest.fn(() => Promise.resolve(undefined));
  return {
    useProfileStore: () => ({ getAllProfiles, loadFamilyProfiles }),
    __setProfiles: (p: Map<string, object>) => { _profiles = p; },
    __reset: () => { _profiles = new Map(); },
  };
});

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeMember = (id: string, relationship: string, givenNames: string) => ({
  id,
  passportNumber: `P${id}`,
  surname: 'Doe',
  givenNames,
  nationality: 'USA',
  dateOfBirth: '1985-01-01',
  gender: 'M' as const,
  passportExpiry: '2030-01-01',
  issuingCountry: 'USA',
  relationship,
  defaultDeclarations: {
    hasItemsToDeclar: false,
    carryingCurrency: false,
    carryingProhibitedItems: false,
    visitedFarm: false,
    hasCriminalRecord: false,
    carryingCommercialGoods: false,
  },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
});

const PRIMARY_ID = 'profile_primary';

const makeTrip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 'trip_1',
  name: 'Asia Summer 2026',
  status: 'upcoming',
  legs: [
    {
      id: 'leg_1',
      tripId: 'trip_1',
      destinationCountry: 'JPN',
      arrivalDate: '2026-04-01',
      departureDate: '2026-04-10',
      flightNumber: 'NH123',
      airlineCode: 'NH',
      arrivalAirport: 'NRT',
      accommodation: {
        name: 'Park Hyatt Tokyo',
        address: { line1: '3-7-1-2 Nishi-Shinjuku', line2: '', city: 'Tokyo', state: '', postalCode: '163-1055', country: 'JPN' },
        phone: '+81-3-5322-1234',
      },
      formStatus: 'not_started',
      order: 0,
      assignedTravelers: [PRIMARY_ID],
      travelerFormsData: [],
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

type ProfileStoreMock = {
  __setProfiles: (p: Map<string, object>) => void;
  __reset: () => void;
};

const getProfileMock = () =>
  jest.requireMock('../../src/stores/useProfileStore') as ProfileStoreMock;

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  getProfileMock().__reset();
});

// ── Trip name editing ─────────────────────────────────────────────────────────

describe('useEditTrip — trip name editing', () => {
  it('initialises editName from the trip prop', () => {
    const { result } = renderHook(() => useEditTrip({ trip: makeTrip() }));
    expect(result.current.editName).toBe('Asia Summer 2026');
  });

  it('setEditName updates the input value', () => {
    const { result } = renderHook(() => useEditTrip({ trip: makeTrip() }));

    act(() => {
      result.current.setEditName('Winter Japan 2026');
    });

    expect(result.current.editName).toBe('Winter Japan 2026');
  });

  it('handleUpdateTripName calls updateTrip with the trimmed name', async () => {
    const onTripUpdated = jest.fn();
    const { result } = renderHook(() =>
      useEditTrip({ trip: makeTrip(), onTripUpdated })
    );

    act(() => { result.current.setEditName('  New Name  '); });

    let success = false;
    await act(async () => {
      success = await result.current.handleUpdateTripName();
    });

    expect(success).toBe(true);
    expect(mockUpdateTrip).toHaveBeenCalledWith('trip_1', { name: 'New Name' });
    expect(onTripUpdated).toHaveBeenCalledTimes(1);
  });

  it('handleUpdateTripName returns false and sets error when name is empty', async () => {
    const { result } = renderHook(() => useEditTrip({ trip: makeTrip() }));

    act(() => { result.current.setEditName('   '); });

    let success = true;
    await act(async () => {
      success = await result.current.handleUpdateTripName();
    });

    expect(success).toBe(false);
    expect(mockUpdateTrip).not.toHaveBeenCalled();
    expect(result.current.errors.name).toBeTruthy();
  });

  it('handleUpdateTripName returns false when trip is null', async () => {
    const { result } = renderHook(() => useEditTrip({ trip: null }));

    let success = true;
    await act(async () => {
      success = await result.current.handleUpdateTripName();
    });

    expect(success).toBe(false);
    expect(mockUpdateTrip).not.toHaveBeenCalled();
  });

  it('editName updates when the trip id changes', () => {
    const { result, rerender } = renderHook(
      ({ trip }: { trip: Trip | null }) => useEditTrip({ trip }),
      { initialProps: { trip: makeTrip({ id: 'trip_1', name: 'Trip One' }) } }
    );

    expect(result.current.editName).toBe('Trip One');

    rerender({ trip: makeTrip({ id: 'trip_2', name: 'Trip Two' }) });

    expect(result.current.editName).toBe('Trip Two');
  });
});

// ── Leg editing ───────────────────────────────────────────────────────────────

describe('useEditTrip — leg editing', () => {
  it('startEditLeg pre-fills editLegData from the given leg', () => {
    const trip = makeTrip();
    const { result } = renderHook(() => useEditTrip({ trip }));

    act(() => { result.current.startEditLeg(trip.legs[0]); });

    expect(result.current.editingLegId).toBe('leg_1');
    expect(result.current.editLegData?.destinationCountry).toBe('JPN');
    expect(result.current.editLegData?.flightNumber).toBe('NH123');
    expect(result.current.editLegData?.accommodation.name).toBe('Park Hyatt Tokyo');
  });

  it('cancelEditLeg resets editing state', () => {
    const trip = makeTrip();
    const { result } = renderHook(() => useEditTrip({ trip }));

    act(() => { result.current.startEditLeg(trip.legs[0]); });
    act(() => { result.current.cancelEditLeg(); });

    expect(result.current.editingLegId).toBeNull();
    expect(result.current.editLegData).toBeNull();
  });

  it('updateEditLegField updates a top-level field', () => {
    const trip = makeTrip();
    const { result } = renderHook(() => useEditTrip({ trip }));

    act(() => { result.current.startEditLeg(trip.legs[0]); });
    act(() => { result.current.updateEditLegField('flightNumber', 'JL456'); });

    expect(result.current.editLegData?.flightNumber).toBe('JL456');
  });

  it('updateEditLegField handles nested dot-notation path', () => {
    const trip = makeTrip();
    const { result } = renderHook(() => useEditTrip({ trip }));

    act(() => { result.current.startEditLeg(trip.legs[0]); });
    act(() => { result.current.updateEditLegField('accommodation.address.city', 'Osaka'); });

    expect(result.current.editLegData?.accommodation.address.city).toBe('Osaka');
  });

  it('updateEditLegField does not mutate the original leg data', () => {
    const trip = makeTrip();
    const { result } = renderHook(() => useEditTrip({ trip }));

    act(() => { result.current.startEditLeg(trip.legs[0]); });

    const before = result.current.editLegData;
    act(() => { result.current.updateEditLegField('arrivalDate', '2026-05-01'); });

    expect(before?.arrivalDate).toBe('2026-04-01'); // original unchanged
    expect(result.current.editLegData?.arrivalDate).toBe('2026-05-01');
  });

  it('handleSaveLeg calls updateTripLeg and resets state on success', async () => {
    const onTripUpdated = jest.fn();
    const trip = makeTrip();
    const { result } = renderHook(() => useEditTrip({ trip, onTripUpdated }));

    act(() => { result.current.startEditLeg(trip.legs[0]); });
    act(() => { result.current.updateEditLegField('flightNumber', 'JL456'); });

    let success = false;
    await act(async () => { success = await result.current.handleSaveLeg(); });

    expect(success).toBe(true);
    expect(mockUpdateTripLeg).toHaveBeenCalledWith('leg_1', expect.objectContaining({
      destinationCountry: 'JPN',
      flightNumber: 'JL456',
    }));
    expect(result.current.editingLegId).toBeNull();
    expect(onTripUpdated).toHaveBeenCalledTimes(1);
  });

  it('handleSaveLeg returns false and sets errors when country is missing', async () => {
    const trip = makeTrip();
    const { result } = renderHook(() => useEditTrip({ trip }));

    act(() => { result.current.startEditLeg(trip.legs[0]); });
    act(() => { result.current.updateEditLegField('destinationCountry', ''); });

    let success = true;
    await act(async () => { success = await result.current.handleSaveLeg(); });

    expect(success).toBe(false);
    expect(mockUpdateTripLeg).not.toHaveBeenCalled();
    expect(result.current.errors.country).toBeTruthy();
  });

  it('handleSaveLeg returns false when editingLegId is null', async () => {
    const { result } = renderHook(() => useEditTrip({ trip: makeTrip() }));

    let success = true;
    await act(async () => { success = await result.current.handleSaveLeg(); });

    expect(success).toBe(false);
    expect(mockUpdateTripLeg).not.toHaveBeenCalled();
  });

  it('handleEditLegTravelerToggle adds a traveler', () => {
    const trip = makeTrip();
    const { result } = renderHook(() => useEditTrip({ trip }));

    act(() => { result.current.startEditLeg(trip.legs[0]); });
    act(() => { result.current.handleEditLegTravelerToggle('traveler_2'); });

    expect(result.current.editLegData?.assignedTravelers).toContain('traveler_2');
  });

  it('handleEditLegTravelerToggle removes an already-assigned traveler', () => {
    const trip = makeTrip();
    const { result } = renderHook(() => useEditTrip({ trip }));

    act(() => { result.current.startEditLeg(trip.legs[0]); });
    // Primary traveler is already assigned
    act(() => { result.current.handleEditLegTravelerToggle(PRIMARY_ID); });

    expect(result.current.editLegData?.assignedTravelers).not.toContain(PRIMARY_ID);
  });
});

// ── Add destination ───────────────────────────────────────────────────────────

describe('useEditTrip — add destination', () => {
  it('startAddDestination initialises a blank newLegData form', () => {
    const { result } = renderHook(() => useEditTrip({ trip: makeTrip() }));

    act(() => { result.current.startAddDestination(); });

    expect(result.current.newLegData).not.toBeNull();
    expect(result.current.newLegData?.destinationCountry).toBe('');
    expect(result.current.newLegData?.arrivalDate).toBe('');
    expect(result.current.newLegData?.accommodation.name).toBe('');
  });

  it('startAddDestination assigns the primary traveler when family is loaded', async () => {
    getProfileMock().__setProfiles(
      new Map([[PRIMARY_ID, makeMember(PRIMARY_ID, 'self', 'Alice')]])
    );
    const { result } = renderHook(() => useEditTrip({ trip: makeTrip() }));

    // Wait for profiles to load
    await waitFor(() => expect(result.current.familyMembers).toHaveLength(1), { timeout: 3000 });

    act(() => { result.current.startAddDestination(); });

    expect(result.current.newLegData?.assignedTravelers).toContain(PRIMARY_ID);
  });

  it('cancelAddDestination resets newLegData to null', () => {
    const { result } = renderHook(() => useEditTrip({ trip: makeTrip() }));

    act(() => { result.current.startAddDestination(); });
    act(() => { result.current.cancelAddDestination(); });

    expect(result.current.newLegData).toBeNull();
  });

  it('updateNewLegField updates a field on newLegData', () => {
    const { result } = renderHook(() => useEditTrip({ trip: makeTrip() }));

    act(() => { result.current.startAddDestination(); });
    act(() => { result.current.updateNewLegField('destinationCountry', 'SGP'); });

    expect(result.current.newLegData?.destinationCountry).toBe('SGP');
  });

  it('updateNewLegField handles nested accommodation fields', () => {
    const { result } = renderHook(() => useEditTrip({ trip: makeTrip() }));

    act(() => { result.current.startAddDestination(); });
    act(() => { result.current.updateNewLegField('accommodation.name', 'Marina Bay Sands'); });

    expect(result.current.newLegData?.accommodation.name).toBe('Marina Bay Sands');
  });

  it('handleAddDestination calls addTripLeg with next order index', async () => {
    const onTripUpdated = jest.fn();
    const trip = makeTrip(); // has 1 existing leg (order 0)
    const { result } = renderHook(() => useEditTrip({ trip, onTripUpdated }));

    act(() => { result.current.startAddDestination(); });
    act(() => {
      result.current.updateNewLegField('destinationCountry', 'SGP');
      result.current.updateNewLegField('arrivalDate', '2026-05-01');
      result.current.updateNewLegField('accommodation.name', 'Marina Bay Sands');
    });

    let success = false;
    await act(async () => { success = await result.current.handleAddDestination(); });

    expect(success).toBe(true);
    expect(mockAddTripLeg).toHaveBeenCalledWith(
      'trip_1',
      expect.objectContaining({
        destinationCountry: 'SGP',
        arrivalDate: '2026-05-01',
        order: 1, // after the existing leg
      })
    );
    expect(result.current.newLegData).toBeNull();
    expect(onTripUpdated).toHaveBeenCalledTimes(1);
  });

  it('handleAddDestination validates and returns false when country is missing', async () => {
    const { result } = renderHook(() => useEditTrip({ trip: makeTrip() }));

    act(() => { result.current.startAddDestination(); });
    act(() => {
      // Set arrival date and accommodation but no country
      result.current.updateNewLegField('arrivalDate', '2026-05-01');
      result.current.updateNewLegField('accommodation.name', 'Some Hotel');
    });

    let success = true;
    await act(async () => { success = await result.current.handleAddDestination(); });

    expect(success).toBe(false);
    expect(mockAddTripLeg).not.toHaveBeenCalled();
    expect(result.current.errors.country).toBeTruthy();
  });

  it('handleAddDestination validates and returns false when arrival date is missing', async () => {
    const { result } = renderHook(() => useEditTrip({ trip: makeTrip() }));

    act(() => { result.current.startAddDestination(); });
    act(() => {
      result.current.updateNewLegField('destinationCountry', 'MYS');
      result.current.updateNewLegField('accommodation.name', 'Hotel Kuala Lumpur');
    });

    let success = true;
    await act(async () => { success = await result.current.handleAddDestination(); });

    expect(success).toBe(false);
    expect(result.current.errors.arrivalDate).toBeTruthy();
  });

  it('handleAddDestination validates and returns false when accommodation name is missing', async () => {
    const { result } = renderHook(() => useEditTrip({ trip: makeTrip() }));

    act(() => { result.current.startAddDestination(); });
    act(() => {
      result.current.updateNewLegField('destinationCountry', 'MYS');
      result.current.updateNewLegField('arrivalDate', '2026-05-01');
    });

    let success = true;
    await act(async () => { success = await result.current.handleAddDestination(); });

    expect(success).toBe(false);
    expect(result.current.errors.accommodationName).toBeTruthy();
  });

  it('handleAddDestination returns false when trip is null', async () => {
    const { result } = renderHook(() => useEditTrip({ trip: null }));

    act(() => { result.current.startAddDestination(); });

    let success = true;
    await act(async () => { success = await result.current.handleAddDestination(); });

    expect(success).toBe(false);
    expect(mockAddTripLeg).not.toHaveBeenCalled();
  });

  it('handleNewLegTravelerToggle adds a traveler to the new leg', () => {
    const { result } = renderHook(() => useEditTrip({ trip: makeTrip() }));

    act(() => { result.current.startAddDestination(); });
    act(() => { result.current.handleNewLegTravelerToggle('traveler_2'); });

    expect(result.current.newLegData?.assignedTravelers).toContain('traveler_2');
  });

  it('handleNewLegTravelerToggle removes an already-selected traveler', () => {
    getProfileMock().__setProfiles(
      new Map([[PRIMARY_ID, makeMember(PRIMARY_ID, 'self', 'Alice')]])
    );

    const { result } = renderHook(() => useEditTrip({ trip: makeTrip() }));
    // Manually push primary into the form
    act(() => { result.current.startAddDestination(); });
    // startAddDestination adds PRIMARY_ID (via primary member logic after load —
    // but since profiles load async and we haven't awaited, we add it manually)
    act(() => { result.current.handleNewLegTravelerToggle(PRIMARY_ID); });
    act(() => { result.current.handleNewLegTravelerToggle(PRIMARY_ID); });

    // After toggling twice, should not be present
    expect(result.current.newLegData?.assignedTravelers).not.toContain(PRIMARY_ID);
  });
});

// ── Shared error clearing ─────────────────────────────────────────────────────

describe('useEditTrip — error clearing', () => {
  it('startEditLeg clears previous errors', async () => {
    const trip = makeTrip();
    const { result } = renderHook(() => useEditTrip({ trip }));

    // Trigger a validation error
    act(() => { result.current.startAddDestination(); });
    await act(async () => { await result.current.handleAddDestination(); });

    expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);

    // Now start editing a leg — errors should be cleared
    act(() => { result.current.startEditLeg(trip.legs[0]); });

    expect(result.current.errors).toEqual({});
  });

  it('cancelAddDestination clears errors', async () => {
    const { result } = renderHook(() => useEditTrip({ trip: makeTrip() }));

    act(() => { result.current.startAddDestination(); });
    await act(async () => { await result.current.handleAddDestination(); });

    expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);

    act(() => { result.current.cancelAddDestination(); });

    expect(result.current.errors).toEqual({});
  });
});
