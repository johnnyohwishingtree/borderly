import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockUseReviewImport = {
  draft: {
    draftTrip: {
      id: 'draft-1',
      name: 'Tokyo Trip',
      status: 'upcoming' as const,
      legs: [
        {
          id: 'leg-1',
          tripId: 'draft-1',
          destinationCountry: 'JPN',
          arrivalDate: '2025-07-15',
          flightNumber: 'NH101',
          arrivalAirport: 'NRT',
          accommodation: { name: 'Hotel Tokyo', address: { line1: '', city: 'Tokyo', postalCode: '', country: 'JPN' } },
          formStatus: 'not_started' as const,
          submissionStatus: 'not_started' as const,
          order: 0,
        },
      ],
      createdAt: '',
      updatedAt: '',
    },
    confidence: 0.8,
    confidenceLevel: 'high' as const,
    hasMissingFields: false,
  },
  status: {
    isSaving: false,
    saveError: '',
  },
  actions: {
    updateTripName: jest.fn(),
    updateLeg: jest.fn(),
    removeLeg: jest.fn(),
    handleConfirm: jest.fn(),
    handleCancel: jest.fn(),
  },
};

jest.mock('@/hooks/useReviewImport', () => ({
  useReviewImport: () => mockUseReviewImport,
}));

jest.mock('@/constants/countries', () => ({
  getCountryName: (code: string) => {
    const names: Record<string, string> = { JPN: 'Japan', SGP: 'Singapore' };
    return names[code] || code;
  },
}));

jest.mock('@/components/ui', () => ({
  ScreenContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Button: ({ title, onPress, disabled, testID }: { title: string; onPress: () => void; disabled?: boolean; testID?: string }) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled} testID={testID}>
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('@/components/ui/LoadingStates', () => {
  const { Text } = require('react-native');
  return ({ text }: { text: string }) => <Text testID="loading-state">{text}</Text>;
});

import ReviewImportScreen from '@/screens/trips/ReviewImportScreen/ReviewImportScreen';

beforeEach(() => {
  jest.clearAllMocks();
  mockUseReviewImport.status.isSaving = false;
  mockUseReviewImport.status.saveError = '';
  mockUseReviewImport.draft.hasMissingFields = false;
});

describe('ReviewImportScreen', () => {
  it('renders trip name input with draft name', () => {
    const { getByTestId } = render(<ReviewImportScreen />);
    const nameInput = getByTestId('review-trip-name');
    expect(nameInput.props.value).toBe('Tokyo Trip');
  });

  it('renders confidence badge', () => {
    const { getByTestId } = render(<ReviewImportScreen />);
    getByTestId('confidence-badge');
  });

  it('renders leg cards', () => {
    const { getByTestId } = render(<ReviewImportScreen />);
    getByTestId('review-leg-0');
  });

  it('renders create trip and cancel buttons', () => {
    const { getByTestId } = render(<ReviewImportScreen />);
    getByTestId('review-create-trip-button');
    getByTestId('review-cancel-button');
  });

  it('calls updateTripName when name is changed', () => {
    const { getByTestId } = render(<ReviewImportScreen />);
    fireEvent.changeText(getByTestId('review-trip-name'), 'Japan Trip');
    expect(mockUseReviewImport.actions.updateTripName).toHaveBeenCalledWith('Japan Trip');
  });

  it('calls handleConfirm when create trip is pressed', () => {
    const { getByTestId } = render(<ReviewImportScreen />);
    fireEvent.press(getByTestId('review-create-trip-button'));
    expect(mockUseReviewImport.actions.handleConfirm).toHaveBeenCalledWith();
  });

  it('calls handleCancel when discard is pressed', () => {
    const { getByTestId } = render(<ReviewImportScreen />);
    fireEvent.press(getByTestId('review-cancel-button'));
    expect(mockUseReviewImport.actions.handleCancel).toHaveBeenCalledWith();
  });

  it('calls removeLeg when remove button is pressed', () => {
    const { getByTestId } = render(<ReviewImportScreen />);
    fireEvent.press(getByTestId('remove-leg-0'));
    expect(mockUseReviewImport.actions.removeLeg).toHaveBeenCalledWith(0);
  });

  it('shows loading when saving', () => {
    mockUseReviewImport.status.isSaving = true;
    const { getByTestId } = render(<ReviewImportScreen />);
    getByTestId('loading-state');
  });

  it('shows save error message', () => {
    mockUseReviewImport.status.saveError = 'Could not save';
    const { getByTestId, getByText } = render(<ReviewImportScreen />);
    getByTestId('save-error-message');
    getByText('Could not save');
  });

  it('shows missing fields warning', () => {
    mockUseReviewImport.draft.hasMissingFields = true;
    const { getByTestId } = render(<ReviewImportScreen />);
    getByTestId('missing-fields-warning');
  });

  it('renders accommodation info on leg card', () => {
    const { getByText } = render(<ReviewImportScreen />);
    getByText('Hotel Tokyo');
  });
});
