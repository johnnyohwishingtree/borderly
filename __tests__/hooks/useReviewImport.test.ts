import { renderHook, act } from '@testing-library/react-native';

const mockReplace = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    replace: mockReplace,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: {
      draftTripJson: JSON.stringify({
        trip: {
          id: 'draft-1',
          name: 'Tokyo Trip',
          status: 'upcoming',
          legs: [
            {
              id: 'leg-1',
              tripId: 'draft-1',
              destinationCountry: 'JPN',
              arrivalDate: '2025-07-15',
              flightNumber: 'NH101',
              arrivalAirport: 'NRT',
              accommodation: { name: '', address: { line1: '', city: '', postalCode: '', country: '' } },
              formStatus: 'not_started',
              submissionStatus: 'not_started',
              order: 0,
            },
          ],
          createdAt: '2025-01-01',
          updatedAt: '2025-01-01',
        },
        confidence: 0.8,
      }),
    },
  }),
}));

const mockCreateTrip = jest.fn().mockResolvedValue({ id: 'saved-trip-1' });
const mockAddTripLeg = jest.fn().mockResolvedValue({});

jest.mock('@/stores/useTripStore', () => ({
  useTripStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      createTrip: mockCreateTrip,
      addTripLeg: mockAddTripLeg,
    }),
}));

import { useReviewImport } from '@/hooks/useReviewImport';

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateTrip.mockResolvedValue({ id: 'saved-trip-1' });
});

describe('useReviewImport', () => {
  it('parses draft trip from route params', () => {
    const { result } = renderHook(() => useReviewImport());
    expect(result.current.draft.draftTrip.name).toBe('Tokyo Trip');
    expect(result.current.draft.draftTrip.legs).toHaveLength(1);
    expect(result.current.draft.draftTrip.legs[0].destinationCountry).toBe('JPN');
  });

  it('returns correct confidence level', () => {
    const { result } = renderHook(() => useReviewImport());
    expect(result.current.draft.confidence).toBe(0.8);
    expect(result.current.draft.confidenceLevel).toBe('high');
  });

  it('updates trip name', () => {
    const { result } = renderHook(() => useReviewImport());
    act(() => result.current.actions.updateTripName('Japan Adventure'));
    expect(result.current.draft.draftTrip.name).toBe('Japan Adventure');
  });

  it('updates a leg field', () => {
    const { result } = renderHook(() => useReviewImport());
    act(() => result.current.actions.updateLeg(0, { arrivalDate: '2025-08-01' }));
    expect(result.current.draft.draftTrip.legs[0].arrivalDate).toBe('2025-08-01');
  });

  it('removes a leg and reorders', () => {
    const { result } = renderHook(() => useReviewImport());
    act(() => result.current.actions.removeLeg(0));
    expect(result.current.draft.draftTrip.legs).toHaveLength(0);
  });

  it('saves trip and navigates on confirm', async () => {
    const { result } = renderHook(() => useReviewImport());

    await act(async () => {
      await result.current.actions.handleConfirm();
    });

    expect(mockCreateTrip).toHaveBeenCalled();
    expect(mockAddTripLeg).toHaveBeenCalledWith('saved-trip-1', expect.objectContaining({ destinationCountry: 'JPN' }));
    expect(mockReplace).toHaveBeenCalledWith('TripDetail', { tripId: 'saved-trip-1' });
  });

  it('shows error when save fails', async () => {
    mockCreateTrip.mockRejectedValue(new Error('DB error'));

    const { result } = renderHook(() => useReviewImport());

    await act(async () => {
      await result.current.actions.handleConfirm();
    });

    expect(result.current.status.saveError).toContain('Could not save');
    expect(result.current.status.isSaving).toBe(false);
  });

  it('navigates back on cancel', () => {
    const { result } = renderHook(() => useReviewImport());
    act(() => result.current.actions.handleCancel());
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('detects missing fields', () => {
    const { result } = renderHook(() => useReviewImport());
    // Initially all fields are present
    expect(result.current.draft.hasMissingFields).toBe(false);

    // Clear the trip name
    act(() => result.current.actions.updateTripName(''));
    expect(result.current.draft.hasMissingFields).toBe(true);
  });
});
