import { renderHook, act } from '@testing-library/react-native';
import { useLegForm } from '@/hooks/useLegForm';
import { useFormStore } from '@/stores/useFormStore';

// Mock navigation
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

// Mock stores
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
};

const mockLeg = {
  id: 'leg_1',
  tripId: 'trip_1',
  destinationCountry: 'JPN',
  arrivalDate: '2026-06-01',
  departureDate: '2026-06-07',
  formStatus: 'not_started',
  order: 0,
  formData: {},
};

const mockTrip = {
  id: 'trip_1',
  name: 'Japan Trip',
  legs: [mockLeg],
};

jest.mock('../../src/stores/useProfileStore', () => ({
  useProfileStore: () => ({ profile: mockProfile }),
}));

jest.mock('../../src/stores/useTripStore', () => ({
  useTripStore: () => ({
    getTripById: (id: string) => (id === 'trip_1' ? mockTrip : undefined),
    getLegById: (id: string) => (id === 'leg_1' ? mockLeg : undefined),
    updateTripLeg: jest.fn().mockResolvedValue({}),
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

  it('returns trip and leg data', () => {
    const { result } = renderHook(() =>
      useLegForm({ tripId: 'trip_1', legId: 'leg_1' })
    );

    expect(result.current.trip).toEqual(mockTrip);
    expect(result.current.leg).toEqual(mockLeg);
  });

  it('sets loadError when trip is not found', () => {
    const { result } = renderHook(() =>
      useLegForm({ tripId: 'nonexistent', legId: 'leg_1' })
    );

    expect(result.current.loadError).not.toBeNull();
  });

  it('handleFormDataChange updates the form store', () => {
    const { result } = renderHook(() =>
      useLegForm({ tripId: 'trip_1', legId: 'leg_1' })
    );

    act(() => {
      result.current.handleFormDataChange({ surname: 'Smith' });
    });

    const storeData = useFormStore.getState().formData;
    expect(storeData.surname).toBe('Smith');
  });

  it('dismissError clears the form error', () => {
    const { result } = renderHook(() =>
      useLegForm({ tripId: 'trip_1', legId: 'leg_1' })
    );

    act(() => {
      result.current.dismissError();
    });

    expect(result.current.formError).toBeNull();
  });
});
