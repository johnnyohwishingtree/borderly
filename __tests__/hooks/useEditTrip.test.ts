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
      submissionStatus: 'not_started',
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
    expect(result.current.tripName.editName).toBe('Asia Summer 2026');
  });

  it('setEditName updates the input value', () => {
    const { result } = renderHook(() => useEditTrip({ trip: makeTrip() }));

    act(() => {
      result.current.tripName.setEditName('Winter Japan 2026');
    });

    expect(result.current.tripName.editName).toBe('Winter Japan 2026');
  });

  it('handleUpdateTripName calls updateTrip with the trimmed name', async () => {
    const onTripUpdated = jest.fn();
    const { result } = renderHook(() =>
      useEditTrip({ trip: makeTrip(), onTripUpdated })
    );

    act(() => { result.current.tripName.setEditName('  New Name  '); });

    let success = false;
    await act(async () => {
      success = await result.current.tripName.handleUpdateTripName();
    });

    expect(success).toBe(true);
    expect(mockUpdateTrip).toHaveBeenCalledWith('trip_1', { name: 'New Name' });
    expect(onTripUpdated).toHaveBeenCalledTimes(1);
  });

  it('handleUpdateTripName returns false and sets error when name is empty', async () => {
    const { result } = renderHook(() => useEditTrip({ trip: makeTrip() }));

    act(() => { result.current.tripName.setEditName('   '); });

    let success = true;
    await act(async () => {
      success = await result.current.tripName.handleUpdateTripName();
    });

    expect(success).toBe(false);
    expect(mockUpdateTrip).not.toHaveBeenCalled();
    expect(typeof result.current.errors.name).toBe('string');
    expect(result.current.errors.name.length).toBeGreaterThan(0);
  });

  it('handleUpdateTripName returns false when trip is null', async () => {
    const { result } = renderHook(() => useEditTrip({ trip: null }));

    let success = true;
    await act(async () => {
      success = await result.current.tripName.handleUpdateTripName();
    });

    expect(success).toBe(false);
    expect(mockUpdateTrip).not.toHaveBeenCalled();
  });

  it('editName updates when the trip id changes', () => {
    const { result, rerender } = renderHook(
      ({ trip }: { trip: Trip | null }) => useEditTrip({ trip }),
      { initialProps: { trip: makeTrip({ id: 'trip_1', name: 'Trip One' }) } }
    );

    expect(result.current.tripName.editName).toBe('Trip One');

    rerender({ trip: makeTrip({ id: 'trip_2', name: 'Trip Two' }) });

    expect(result.current.tripName.editName).toBe('Trip Two');
  });
});

// ── Leg editing ───────────────────────────────────────────────────────────────

describe('useEditTrip — leg editing', () => {
  it('startEditLeg pre-fills editLegData from the given leg', () => {
    const trip = makeTrip();
    const { result } = renderHook(() => useEditTrip({ trip }));

    act(() => { result.current.legEdit.startEditLeg(trip.legs[0]); });

    expect(result.current.legEdit.editingLegId).toBe('leg_1');
    expect(result.current.legEdit.editLegData?.destinationCountry).toBe('JPN');
    expect(result.current.legEdit.editLegData?.flightNumber).toBe('NH123');
    expect(result.current.legEdit.editLegData?.accommodation.name).toBe('Park Hyatt Tokyo');
  });

  it('cancelEditLeg resets editing state', () => {
    const trip = makeTrip();
    const { result } = renderHook(() => useEditTrip({ trip }));

    act(() => { result.current.legEdit.startEditLeg(trip.legs[0]); });
    act(() => { result.current.legEdit.cancelEditLeg(); });

    expect(result.current.legEdit.editingLegId).toBeNull();
    expect(result.current.legEdit.editLegData).toBeNull();
  });

  it('updateEditLegField updates a top-level field', () => {
    const trip = makeTrip();
    const { result } = renderHook(() => useEditTrip({ trip }));

    act(() => { result.current.legEdit.startEditLeg(trip.legs[0]); });
    act(() => { result.current.legEdit.updateEditLegField('flightNumber', 'JL456'); });

    expect(result.current.legEdit.editLegData?.flightNumber).toBe('JL456');
  });

  it('updateEditLegField handles nested dot-notation path', () => {
    const trip = makeTrip();
    const { result } = renderHook(() => useEditTrip({ trip }));

    act(() => { result.current.legEdit.startEditLeg(trip.legs[0]); });
    act(() => { result.current.legEdit.updateEditLegField('accommodation.address.city', 'Osaka'); });

    expect(result.current.legEdit.editLegData?.accommodation.address.city).toBe('Osaka');
  });

  it('updateEditLegField does not mutate the original leg data', () => {
    const trip = makeTrip();
    const { result } = renderHook(() => useEditTrip({ trip }));

    act(() => { result.current.legEdit.startEditLeg(trip.legs[0]); });

    const before = result.current.legEdit.editLegData;
    act(() => { result.current.legEdit.updateEditLegField('arrivalDate', '2026-05-01'); });

    expect(before?.arrivalDate).toBe('2026-04-01'); // original unchanged
    expect(result.current.legEdit.editLegData?.arrivalDate).toBe('2026-05-01');
  });

  it('handleSaveLeg calls updateTripLeg and resets state on success', async () => {
    const onTripUpdated = jest.fn();
    const trip = makeTrip();
    const { result } = renderHook(() => useEditTrip({ trip, onTripUpdated }));

    act(() => { result.current.legEdit.startEditLeg(trip.legs[0]); });
    act(() => { result.current.legEdit.updateEditLegField('flightNumber', 'JL456'); });

    let success = false;
    await act(async () => { success = await result.current.legEdit.handleSaveLeg(); });

    expect(success).toBe(true);
    expect(mockUpdateTripLeg).toHaveBeenCalledWith('leg_1', expect.objectContaining({
      destinationCountry: 'JPN',
      flightNumber: 'JL456',
    }));
    expect(result.current.legEdit.editingLegId).toBeNull();
    expect(onTripUpdated).toHaveBeenCalledTimes(1);
  });

  it('handleSaveLeg returns false and sets errors when country is missing', async () => {
    const trip = makeTrip();
    const { result } = renderHook(() => useEditTrip({ trip }));

    act(() => { result.current.legEdit.startEditLeg(trip.legs[0]); });
    act(() => { result.current.legEdit.updateEditLegField('destinationCountry', ''); });

    let success = true;
    await act(async () => { success = await result.current.legEdit.handleSaveLeg(); });

    expect(success).toBe(false);
    expect(mockUpdateTripLeg).not.toHaveBeenCalled();
    expect(typeof result.current.errors.country).toBe('string');
    expect(result.current.errors.country.length).toBeGreaterThan(0);
  });

  it('handleSaveLeg persists assignedTravelers changes', async () => {
    const trip = makeTrip();
    const { result } = renderHook(() => useEditTrip({ trip }));

    act(() => { result.current.legEdit.startEditLeg(trip.legs[0]); });
    // Add a second traveler
    act(() => { result.current.legEdit.handleEditLegTravelerToggle('traveler_2'); });

    let success = false;
    await act(async () => { success = await result.current.legEdit.handleSaveLeg(); });

    expect(success).toBe(true);
    expect(mockUpdateTripLeg).toHaveBeenCalledWith('leg_1', expect.objectContaining({
      assignedTravelers: expect.arrayContaining([PRIMARY_ID, 'traveler_2']),
    }));
  });

  it('handleSaveLeg persists traveler removal', async () => {
    const trip = makeTrip();
    const { result } = renderHook(() => useEditTrip({ trip }));

    act(() => { result.current.legEdit.startEditLeg(trip.legs[0]); });
    // Remove the primary traveler
    act(() => { result.current.legEdit.handleEditLegTravelerToggle(PRIMARY_ID); });

    let success = false;
    await act(async () => { success = await result.current.legEdit.handleSaveLeg(); });

    expect(success).toBe(true);
    expect(mockUpdateTripLeg).toHaveBeenCalledWith('leg_1', expect.objectContaining({
      assignedTravelers: [],
    }));
  });

  it('handleSaveLeg returns false when editingLegId is null', async () => {
    const { result } = renderHook(() => useEditTrip({ trip: makeTrip() }));

    let success = true;
    await act(async () => { success = await result.current.legEdit.handleSaveLeg(); });

    expect(success).toBe(false);
    expect(mockUpdateTripLeg).not.toHaveBeenCalled();
  });

  it('handleEditLegTravelerToggle adds a traveler', () => {
    const trip = makeTrip();
    const { result } = renderHook(() => useEditTrip({ trip }));

    act(() => { result.current.legEdit.startEditLeg(trip.legs[0]); });
    act(() => { result.current.legEdit.handleEditLegTravelerToggle('traveler_2'); });

    expect(result.current.legEdit.editLegData?.assignedTravelers).toContain('traveler_2');
  });

  it('handleEditLegTravelerToggle removes an already-assigned traveler', () => {
    const trip = makeTrip();
    const { result } = renderHook(() => useEditTrip({ trip }));

    act(() => { result.current.legEdit.startEditLeg(trip.legs[0]); });
    // Primary traveler is already assigned
    act(() => { result.current.legEdit.handleEditLegTravelerToggle(PRIMARY_ID); });

    expect(result.current.legEdit.editLegData?.assignedTravelers).not.toContain(PRIMARY_ID);
  });
});

// ── Add destination ───────────────────────────────────────────────────────────

describe('useEditTrip — add destination', () => {
  it('startAddDestination initialises a blank newLegData form', () => {
    const { result } = renderHook(() => useEditTrip({ trip: makeTrip() }));

    act(() => { result.current.addDestination.startAddDestination(); });

    expect(result.current.addDestination.newLegData).toMatchObject({
      destinationCountry: '',
      arrivalDate: '',
      accommodation: { name: '' },
    });
  });

  it('startAddDestination assigns the primary traveler when family is loaded', async () => {
    getProfileMock().__setProfiles(
      new Map([[PRIMARY_ID, makeMember(PRIMARY_ID, 'self', 'Alice')]])
    );
    const { result } = renderHook(() => useEditTrip({ trip: makeTrip() }));

    // Wait for profiles to load
    await waitFor(() => expect(result.current.familyMembers).toHaveLength(1), { timeout: 3000 });

    act(() => { result.current.addDestination.startAddDestination(); });

    expect(result.current.addDestination.newLegData?.assignedTravelers).toContain(PRIMARY_ID);
  });

  it('cancelAddDestination resets newLegData to null', () => {
    const { result } = renderHook(() => useEditTrip({ trip: makeTrip() }));

    act(() => { result.current.addDestination.startAddDestination(); });
    act(() => { result.current.addDestination.cancelAddDestination(); });

    expect(result.current.addDestination.newLegData).toBeNull();
  });

  it('updateNewLegField updates a field on newLegData', () => {
    const { result } = renderHook(() => useEditTrip({ trip: makeTrip() }));

    act(() => { result.current.addDestination.startAddDestination(); });
    act(() => { result.current.addDestination.updateNewLegField('destinationCountry', 'SGP'); });

    expect(result.current.addDestination.newLegData?.destinationCountry).toBe('SGP');
  });

  it('updateNewLegField handles nested accommodation fields', () => {
    const { result } = renderHook(() => useEditTrip({ trip: makeTrip() }));

    act(() => { result.current.addDestination.startAddDestination(); });
    act(() => { result.current.addDestination.updateNewLegField('accommodation.name', 'Marina Bay Sands'); });

    expect(result.current.addDestination.newLegData?.accommodation.name).toBe('Marina Bay Sands');
  });

  it('handleAddDestination calls addTripLeg with next order index', async () => {
    const onTripUpdated = jest.fn();
    const trip = makeTrip(); // has 1 existing leg (order 0)
    const { result } = renderHook(() => useEditTrip({ trip, onTripUpdated }));

    act(() => { result.current.addDestination.startAddDestination(); });
    act(() => {
      result.current.addDestination.updateNewLegField('destinationCountry', 'SGP');
      result.current.addDestination.updateNewLegField('arrivalDate', '2026-05-01');
      result.current.addDestination.updateNewLegField('accommodation.name', 'Marina Bay Sands');
    });

    let success = false;
    await act(async () => { success = await result.current.addDestination.handleAddDestination(); });

    expect(success).toBe(true);
    expect(mockAddTripLeg).toHaveBeenCalledWith(
      'trip_1',
      expect.objectContaining({
        destinationCountry: 'SGP',
        arrivalDate: '2026-05-01',
        order: 1, // after the existing leg
      })
    );
    expect(result.current.addDestination.newLegData).toBeNull();
    expect(onTripUpdated).toHaveBeenCalledTimes(1);
  });

  it('handleAddDestination validates and returns false when country is missing', async () => {
    const { result } = renderHook(() => useEditTrip({ trip: makeTrip() }));

    act(() => { result.current.addDestination.startAddDestination(); });
    act(() => {
      // Set arrival date and accommodation but no country
      result.current.addDestination.updateNewLegField('arrivalDate', '2026-05-01');
      result.current.addDestination.updateNewLegField('accommodation.name', 'Some Hotel');
    });

    let success = true;
    await act(async () => { success = await result.current.addDestination.handleAddDestination(); });

    expect(success).toBe(false);
    expect(mockAddTripLeg).not.toHaveBeenCalled();
    expect(typeof result.current.errors.country).toBe('string');
    expect(result.current.errors.country.length).toBeGreaterThan(0);
  });

  it('handleAddDestination validates and returns false when arrival date is missing', async () => {
    const { result } = renderHook(() => useEditTrip({ trip: makeTrip() }));

    act(() => { result.current.addDestination.startAddDestination(); });
    act(() => {
      result.current.addDestination.updateNewLegField('destinationCountry', 'MYS');
      result.current.addDestination.updateNewLegField('accommodation.name', 'Hotel Kuala Lumpur');
    });

    let success = true;
    await act(async () => { success = await result.current.addDestination.handleAddDestination(); });

    expect(success).toBe(false);
    expect(typeof result.current.errors.arrivalDate).toBe('string');
    expect(result.current.errors.arrivalDate.length).toBeGreaterThan(0);
  });

  it('handleAddDestination validates and returns false when accommodation name is missing', async () => {
    const { result } = renderHook(() => useEditTrip({ trip: makeTrip() }));

    act(() => { result.current.addDestination.startAddDestination(); });
    act(() => {
      result.current.addDestination.updateNewLegField('destinationCountry', 'MYS');
      result.current.addDestination.updateNewLegField('arrivalDate', '2026-05-01');
    });

    let success = true;
    await act(async () => { success = await result.current.addDestination.handleAddDestination(); });

    expect(success).toBe(false);
    expect(typeof result.current.errors.accommodationName).toBe('string');
    expect(result.current.errors.accommodationName.length).toBeGreaterThan(0);
  });

  it('handleAddDestination returns false when trip is null', async () => {
    const { result } = renderHook(() => useEditTrip({ trip: null }));

    act(() => { result.current.addDestination.startAddDestination(); });

    let success = true;
    await act(async () => { success = await result.current.addDestination.handleAddDestination(); });

    expect(success).toBe(false);
    expect(mockAddTripLeg).not.toHaveBeenCalled();
  });

  it('handleNewLegTravelerToggle adds a traveler to the new leg', () => {
    const { result } = renderHook(() => useEditTrip({ trip: makeTrip() }));

    act(() => { result.current.addDestination.startAddDestination(); });
    act(() => { result.current.addDestination.handleNewLegTravelerToggle('traveler_2'); });

    expect(result.current.addDestination.newLegData?.assignedTravelers).toContain('traveler_2');
  });

  it('handleNewLegTravelerToggle removes an already-selected traveler', () => {
    getProfileMock().__setProfiles(
      new Map([[PRIMARY_ID, makeMember(PRIMARY_ID, 'self', 'Alice')]])
    );

    const { result } = renderHook(() => useEditTrip({ trip: makeTrip() }));
    // Manually push primary into the form
    act(() => { result.current.addDestination.startAddDestination(); });
    // startAddDestination adds PRIMARY_ID (via primary member logic after load —
    // but since profiles load async and we haven't awaited, we add it manually)
    act(() => { result.current.addDestination.handleNewLegTravelerToggle(PRIMARY_ID); });
    act(() => { result.current.addDestination.handleNewLegTravelerToggle(PRIMARY_ID); });

    // After toggling twice, should not be present
    expect(result.current.addDestination.newLegData?.assignedTravelers).not.toContain(PRIMARY_ID);
  });
});

// ── Shared error clearing ─────────────────────────────────────────────────────

describe('useEditTrip — error clearing', () => {
  it('startEditLeg clears previous errors', async () => {
    const trip = makeTrip();
    const { result } = renderHook(() => useEditTrip({ trip }));

    // Trigger a validation error
    act(() => { result.current.addDestination.startAddDestination(); });
    await act(async () => { await result.current.addDestination.handleAddDestination(); });

    expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);

    // Now start editing a leg — errors should be cleared
    act(() => { result.current.legEdit.startEditLeg(trip.legs[0]); });

    expect(result.current.errors).toEqual({});
  });

  it('cancelAddDestination clears errors', async () => {
    const { result } = renderHook(() => useEditTrip({ trip: makeTrip() }));

    act(() => { result.current.addDestination.startAddDestination(); });
    await act(async () => { await result.current.addDestination.handleAddDestination(); });

    expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);

    act(() => { result.current.addDestination.cancelAddDestination(); });

    expect(result.current.errors).toEqual({});
  });
});
