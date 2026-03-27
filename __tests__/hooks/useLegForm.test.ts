import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useLegForm, deriveLegFormStatus } from '@/hooks/useLegForm';
import { useFormStore } from '@/stores/useFormStore';

// Mock navigation
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

// Shared mock data
const mockDefaultDeclarations = {
  hasItemsToDeclare: false,
  carryingCurrency: false,
  carryingProhibitedItems: false,
  visitedFarm: false,
  hasCriminalRecord: false,
  carryingCommercialGoods: false,
};

const mockProfile = {
  id: 'profile_1',
  givenNames: 'John',
  surname: 'Doe',
  passportNumber: 'AB1234567',
  nationality: 'USA',
  dateOfBirth: '1990-01-01',
  gender: 'M',
  passportExpiry: '2030-01-01',
  issuingCountry: 'USA',
  email: 'john@test.com',
  phoneNumber: '+1234567890',
  defaultDeclarations: mockDefaultDeclarations,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const mockFamilyProfile = {
  id: 'profile_2',
  givenNames: 'Jane',
  surname: 'Doe',
  passportNumber: 'CD9876543',
  nationality: 'USA',
  dateOfBirth: '1992-05-15',
  gender: 'F',
  passportExpiry: '2031-06-01',
  issuingCountry: 'USA',
  email: 'jane@test.com',
  phoneNumber: '+1234567891',
  defaultDeclarations: mockDefaultDeclarations,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const mockSingleTravelerLeg = {
  id: 'leg_1',
  tripId: 'trip_1',
  destinationCountry: 'JPN',
  arrivalDate: '2026-06-01',
  departureDate: '2026-06-07',
  formStatus: 'not_started' as const,
  order: 0,
  formData: {},
  assignedTravelers: [],
  travelerFormsData: [],
  accommodation: {
    name: 'Hotel Tokyo',
    address: {
      line1: '1-1-1 Shinjuku',
      city: 'Tokyo',
      postalCode: '160-0022',
      country: 'JPN',
    },
  },
};

const mockMultiTravelerLeg = {
  ...mockSingleTravelerLeg,
  id: 'leg_2',
  assignedTravelers: ['profile_1', 'profile_2'],
  travelerFormsData: [
    {
      travelerId: 'profile_1',
      formData: { surname: 'Doe' },
      formStatus: 'in_progress' as const,
      completionPercentage: 40,
    },
    {
      travelerId: 'profile_2',
      formData: {},
      formStatus: 'not_started' as const,
      completionPercentage: 0,
    },
  ],
};

const mockTrip = {
  id: 'trip_1',
  name: 'Japan Trip',
  legs: [mockSingleTravelerLeg, mockMultiTravelerLeg],
};

const mockUpdateTripLeg = jest.fn().mockResolvedValue({});
const mockGetTravelerFormData = jest.fn((legId: string, travelerId: string) => {
  if (legId === 'leg_2' && travelerId === 'profile_1') {
    return mockMultiTravelerLeg.travelerFormsData[0];
  }
  if (legId === 'leg_2' && travelerId === 'profile_2') {
    return mockMultiTravelerLeg.travelerFormsData[1];
  }
  return undefined;
});

const mockGetProfile = jest.fn(async (profileId: string) => {
  if (profileId === 'profile_1') return mockProfile;
  if (profileId === 'profile_2') return mockFamilyProfile;
  return null;
});

jest.mock('../../src/stores/useProfileStore', () => ({
  useProfileStore: () => ({
    profile: mockProfile,
    getProfile: mockGetProfile,
  }),
}));

jest.mock('../../src/stores/useTripStore', () => ({
  useTripStore: () => ({
    getTripById: (id: string) => (id === 'trip_1' ? mockTrip : undefined),
    getLegById: (id: string) => {
      if (id === 'leg_1') return mockSingleTravelerLeg;
      if (id === 'leg_2') return mockMultiTravelerLeg;
      return undefined;
    },
    updateTripLeg: mockUpdateTripLeg,
    getTravelerFormData: mockGetTravelerFormData,
  }),
}));

jest.mock('../../src/services/schemas/schemaRegistry', () => ({
  schemaRegistry: {
    getSchema: (code: string) =>
      code === 'JPN'
        ? {
            countryCode: 'JPN',
            countryName: 'Japan',
            portalName: 'Visit Japan Web',
            sections: [],
          }
        : undefined,
  },
}));

jest.mock('../../src/services/error/errorHandler', () => ({
  handleStorageError: jest.fn().mockResolvedValue({ recovered: false, error: null }),
  handleValidationError: jest.fn().mockResolvedValue({ recovered: false, error: null }),
}));

describe('useLegForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFormStore.getState().resetForm();
  });

  // ─── Existing single-traveler tests ──────────────────────────────────────

  it('returns trip and leg data', () => {
    const { result } = renderHook(() =>
      useLegForm({ tripId: 'trip_1', legId: 'leg_1' })
    );

    expect(result.current.tripData.trip).toEqual(mockTrip);
    expect(result.current.tripData.leg).toEqual(mockSingleTravelerLeg);
  });

  it('sets loadError when trip is not found', () => {
    const { result } = renderHook(() =>
      useLegForm({ tripId: 'nonexistent', legId: 'leg_1' })
    );

    expect(result.current.errors.loadError).toMatchObject({
      userMessage: expect.any(String),
    });
  });

  it('handleFormDataChange updates the form store', () => {
    const { result } = renderHook(() =>
      useLegForm({ tripId: 'trip_1', legId: 'leg_1' })
    );

    act(() => {
      result.current.form.handleFormDataChange({ surname: 'Smith' });
    });

    const storeData = useFormStore.getState().formData;
    expect(storeData.surname).toBe('Smith');
  });

  it('dismissError clears the form error', () => {
    const { result } = renderHook(() =>
      useLegForm({ tripId: 'trip_1', legId: 'leg_1' })
    );

    act(() => {
      result.current.errors.dismissError();
    });

    expect(result.current.errors.formError).toBeNull();
  });

  // ─── Single-traveler: hasMultipleTravelers flag ───────────────────────────

  it('hasMultipleTravelers is false for single-traveler leg', () => {
    const { result } = renderHook(() =>
      useLegForm({ tripId: 'trip_1', legId: 'leg_1' })
    );

    expect(result.current.travelers.hasMultipleTravelers).toBe(false);
    expect(result.current.travelers.travelerTabs).toHaveLength(0);
    expect(result.current.travelers.activeTravelerId).toBeNull();
  });

  // ─── Multi-traveler tests ─────────────────────────────────────────────────

  it('hasMultipleTravelers is true for multi-traveler leg', () => {
    const { result } = renderHook(() =>
      useLegForm({ tripId: 'trip_1', legId: 'leg_2' })
    );

    expect(result.current.travelers.hasMultipleTravelers).toBe(true);
  });

  it('loads traveler profiles and sets active traveler for multi-traveler leg', async () => {
    const { result } = renderHook(() =>
      useLegForm({ tripId: 'trip_1', legId: 'leg_2' })
    );

    // Wait for the profiles to be loaded (combined atomic update)
    await waitFor(() => {
      expect(result.current.travelers.activeTravelerId).toBe('profile_1');
    });

    expect(mockGetProfile).toHaveBeenCalledWith('profile_1');
    expect(mockGetProfile).toHaveBeenCalledWith('profile_2');
  });

  it('travelerTabs has correct number of entries for multi-traveler leg', async () => {
    const { result } = renderHook(() =>
      useLegForm({ tripId: 'trip_1', legId: 'leg_2' })
    );

    await waitFor(() => {
      expect(result.current.travelers.activeTravelerId).toBe('profile_1');
    });

    expect(result.current.travelers.travelerTabs).toHaveLength(2);
  });

  it('travelerTabs shows traveler first names once profiles are loaded', async () => {
    const { result } = renderHook(() =>
      useLegForm({ tripId: 'trip_1', legId: 'leg_2' })
    );

    // Wait for atomic state update: profiles + activeTravelerId set together
    await waitFor(() => {
      expect(result.current.travelers.activeTravelerId).toBe('profile_1');
    });

    const names = result.current.travelers.travelerTabs.map((t) => t.name);
    expect(names).toContain('John');
    expect(names).toContain('Jane');
  });

  it('travelerTabs active tab id matches activeTravelerId', async () => {
    const { result } = renderHook(() =>
      useLegForm({ tripId: 'trip_1', legId: 'leg_2' })
    );

    await waitFor(() => {
      expect(result.current.travelers.activeTravelerId).toBe('profile_1');
    });

    const activeTab = result.current.travelers.travelerTabs.find(
      (t) => t.id === result.current.travelers.activeTravelerId
    );
    expect(activeTab).toEqual(expect.objectContaining({ id: 'profile_1' }));
  });

  it('inactive traveler tab has correct formStatus from stored data', async () => {
    const { result } = renderHook(() =>
      useLegForm({ tripId: 'trip_1', legId: 'leg_2' })
    );

    await waitFor(() => {
      expect(result.current.travelers.activeTravelerId).toBe('profile_1');
    });

    // profile_2 has not_started status in stored data
    const janeTab = result.current.travelers.travelerTabs.find((t) => t.id === 'profile_2');
    expect(janeTab?.formStatus).toBe('not_started');
  });

  it('switchToTraveler changes the active traveler', async () => {
    const { result } = renderHook(() =>
      useLegForm({ tripId: 'trip_1', legId: 'leg_2' })
    );

    // Wait for profiles to load
    await waitFor(() => {
      expect(result.current.travelers.activeTravelerId).toBe('profile_1');
    });

    // Switch to the second traveler
    await act(async () => {
      await result.current.travelers.switchToTraveler('profile_2');
    });

    expect(result.current.travelers.activeTravelerId).toBe('profile_2');
  });

  it('switchToTraveler calls updateTripLeg to save current traveler data before switching', async () => {
    const { result } = renderHook(() =>
      useLegForm({ tripId: 'trip_1', legId: 'leg_2' })
    );

    await waitFor(() => {
      expect(result.current.travelers.activeTravelerId).toBe('profile_1');
    });

    await act(async () => {
      await result.current.travelers.switchToTraveler('profile_2');
    });

    expect(mockUpdateTripLeg).toHaveBeenCalledWith(
      'leg_2',
      expect.objectContaining({
        travelerFormsData: expect.any(Array),
      })
    );
  });

  it('switchToTraveler is a no-op when switching to the already-active traveler', async () => {
    const { result } = renderHook(() =>
      useLegForm({ tripId: 'trip_1', legId: 'leg_2' })
    );

    await waitFor(() => {
      expect(result.current.travelers.activeTravelerId).toBe('profile_1');
    });

    // Switch to same traveler
    await act(async () => {
      await result.current.travelers.switchToTraveler('profile_1');
    });

    // updateTripLeg should NOT have been called (no save needed for same traveler)
    expect(mockUpdateTripLeg).not.toHaveBeenCalled();
  });

  // ─── Multi-traveler derived formStatus tests ──────────────────────────────

  it('handleSaveForm for multi-traveler leg passes formStatus in updateTripLeg call', async () => {
    const { result } = renderHook(() =>
      useLegForm({ tripId: 'trip_1', legId: 'leg_2' })
    );

    await waitFor(() => {
      expect(result.current.travelers.activeTravelerId).toBe('profile_1');
    });

    await act(async () => {
      await result.current.submission.handleSaveForm();
    });

    // updateTripLeg must be called with formStatus (not just travelerFormsData)
    expect(mockUpdateTripLeg).toHaveBeenCalledWith(
      'leg_2',
      expect.objectContaining({
        travelerFormsData: expect.any(Array),
        formStatus: expect.stringMatching(/^(not_started|in_progress|ready)$/),
      })
    );
  });

  it('handleSaveForm for multi-traveler leg sets formStatus in_progress when traveler saves with partial form', async () => {
    const { result } = renderHook(() =>
      useLegForm({ tripId: 'trip_1', legId: 'leg_2' })
    );

    await waitFor(() => {
      expect(result.current.travelers.activeTravelerId).toBe('profile_1');
    });

    // isValid is false (form not complete) — save should produce in_progress
    await act(async () => {
      await result.current.submission.handleSaveForm();
    });

    // profile_1 is saved as in_progress, profile_2 is not_started → leg is in_progress
    const lastCall = mockUpdateTripLeg.mock.calls[mockUpdateTripLeg.mock.calls.length - 1];
    expect(lastCall[1].formStatus).toBe('in_progress');
  });

  it('handleMarkAsReady for multi-traveler leg passes formStatus in updateTripLeg call', async () => {
    const { result } = renderHook(() =>
      useLegForm({ tripId: 'trip_1', legId: 'leg_2' })
    );

    await waitFor(() => {
      expect(result.current.travelers.activeTravelerId).toBe('profile_1');
    });

    act(() => {
      useFormStore.setState({ isValid: true });
    });

    await act(async () => {
      await result.current.submission.handleMarkAsReady();
    });

    // updateTripLeg must be called with formStatus
    const lastCall = mockUpdateTripLeg.mock.calls[mockUpdateTripLeg.mock.calls.length - 1];
    expect(lastCall[0]).toBe('leg_2');
    expect(lastCall[1]).toMatchObject({
      travelerFormsData: expect.any(Array),
      formStatus: expect.stringMatching(/^(not_started|in_progress|ready)$/),
    });
  });

  it('handleMarkAsReady for multi-traveler leg sets formStatus in_progress when second traveler is not_started', async () => {
    // mockMultiTravelerLeg has profile_2 as 'not_started'
    // When profile_1 marks ready, derived status should be in_progress (not all ready)
    const { result } = renderHook(() =>
      useLegForm({ tripId: 'trip_1', legId: 'leg_2' })
    );

    await waitFor(() => {
      expect(result.current.travelers.activeTravelerId).toBe('profile_1');
    });

    act(() => {
      useFormStore.setState({ isValid: true });
    });

    await act(async () => {
      await result.current.submission.handleMarkAsReady();
    });

    const lastCall = mockUpdateTripLeg.mock.calls[mockUpdateTripLeg.mock.calls.length - 1];
    // profile_1 is now ready, profile_2 is not_started → not all ready → in_progress
    expect(lastCall[1].formStatus).toBe('in_progress');
  });
});

// ─── deriveLegFormStatus unit tests ──────────────────────────────────────────

describe('deriveLegFormStatus', () => {
  it('returns not_started when no travelers have started', () => {
    const forms = [
      { travelerId: 'a', formData: {}, formStatus: 'not_started' as const, completionPercentage: 0 },
      { travelerId: 'b', formData: {}, formStatus: 'not_started' as const, completionPercentage: 0 },
    ];
    expect(deriveLegFormStatus(['a', 'b'], forms)).toBe('not_started');
  });

  it('returns not_started when all travelers have no form entry', () => {
    expect(deriveLegFormStatus(['a', 'b'], [])).toBe('not_started');
  });

  it('returns in_progress when at least one traveler is in_progress', () => {
    const forms = [
      { travelerId: 'a', formData: {}, formStatus: 'in_progress' as const, completionPercentage: 50 },
      { travelerId: 'b', formData: {}, formStatus: 'not_started' as const, completionPercentage: 0 },
    ];
    expect(deriveLegFormStatus(['a', 'b'], forms)).toBe('in_progress');
  });

  it('returns in_progress when one traveler is ready but the other is not_started', () => {
    const forms = [
      { travelerId: 'a', formData: {}, formStatus: 'ready' as const, completionPercentage: 100 },
      { travelerId: 'b', formData: {}, formStatus: 'not_started' as const, completionPercentage: 0 },
    ];
    expect(deriveLegFormStatus(['a', 'b'], forms)).toBe('in_progress');
  });

  it('returns ready when all travelers are ready', () => {
    const forms = [
      { travelerId: 'a', formData: {}, formStatus: 'ready' as const, completionPercentage: 100 },
      { travelerId: 'b', formData: {}, formStatus: 'ready' as const, completionPercentage: 100 },
    ];
    expect(deriveLegFormStatus(['a', 'b'], forms)).toBe('ready');
  });

  it('returns ready when all travelers are submitted', () => {
    const forms = [
      { travelerId: 'a', formData: {}, formStatus: 'submitted' as const, completionPercentage: 100 },
      { travelerId: 'b', formData: {}, formStatus: 'submitted' as const, completionPercentage: 100 },
    ];
    expect(deriveLegFormStatus(['a', 'b'], forms)).toBe('ready');
  });

  it('returns ready when one traveler is ready and the other is submitted', () => {
    const forms = [
      { travelerId: 'a', formData: {}, formStatus: 'ready' as const, completionPercentage: 100 },
      { travelerId: 'b', formData: {}, formStatus: 'submitted' as const, completionPercentage: 100 },
    ];
    expect(deriveLegFormStatus(['a', 'b'], forms)).toBe('ready');
  });

  it('returns not_started when assigned traveler list is empty', () => {
    const forms = [
      { travelerId: 'a', formData: {}, formStatus: 'ready' as const, completionPercentage: 100 },
    ];
    expect(deriveLegFormStatus([], forms)).toBe('not_started');
  });
});
