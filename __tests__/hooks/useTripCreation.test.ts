import { renderHook, act } from '@testing-library/react-native';
import { useTripCreation } from '@/hooks/useTripCreation';

// Mock navigation
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

// Mock stores
jest.mock('../../src/stores/useTripStore', () => ({
  useTripStore: () => ({
    createTrip: jest.fn().mockResolvedValue({ id: 'trip_1' }),
    addTripLeg: jest.fn().mockResolvedValue({}),
  }),
}));

jest.mock('../../src/stores/useProfileStore', () => ({
  useProfileStore: () => ({
    getAllProfiles: jest.fn().mockResolvedValue(new Map()),
    loadFamilyProfiles: jest.fn().mockResolvedValue(undefined),
  }),
}));

describe('useTripCreation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    // Set initial value on leg 0
    act(() => {
      result.current.updateLeg(0, 'accommodation.name', 'Hotel A');
    });

    // Set value on leg 1
    act(() => {
      result.current.updateLeg(1, 'accommodation.name', 'Hotel B');
    });

    // Verify no cross-contamination (this was the state mutation bug)
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

    // The old reference should not have been mutated
    expect(legBefore.accommodation.address.city).toBe('');
    // The new leg should have the update
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

    // Toggle off
    act(() => {
      result.current.handleTravelerToggle(0, 'traveler_1');
    });

    expect(result.current.legs[0].assignedTravelers).not.toContain('traveler_1');
  });
});
