import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Mock the hook — screen is a thin render layer
const mockUseImportTrip = {
  mode: 'paste' as 'paste' | 'scan',
  setMode: jest.fn(),
  status: 'idle' as 'idle' | 'parsing' | 'success' | 'error',
  errorMessage: '',
  confirmationText: '',
  setConfirmationText: jest.fn(),
  handleParseConfirmation: jest.fn(),
  handleBoardingPassScanned: jest.fn(),
  handleScanCancel: jest.fn(),
  handleRetry: jest.fn(),
};

jest.mock('@/hooks/useImportTrip', () => ({
  useImportTrip: () => mockUseImportTrip,
}));

jest.mock('@/components/boarding', () => ({
  BoardingPassScanner: () => null,
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

import ImportTripScreen from '@/screens/trips/ImportTripScreen/ImportTripScreen';

beforeEach(() => {
  jest.clearAllMocks();
  mockUseImportTrip.mode = 'paste';
  mockUseImportTrip.status = 'idle';
  mockUseImportTrip.errorMessage = '';
  mockUseImportTrip.confirmationText = '';
});

describe('ImportTripScreen', () => {
  it('renders paste and scan tab buttons', () => {
    const { getByTestId } = render(<ImportTripScreen />);
    expect(getByTestId('import-tab-paste')).toBeTruthy();
    expect(getByTestId('import-tab-scan')).toBeTruthy();
  });

  it('renders confirmation text input', () => {
    const { getByTestId } = render(<ImportTripScreen />);
    expect(getByTestId('import-confirmation-input')).toBeTruthy();
  });

  it('renders import button', () => {
    const { getByTestId } = render(<ImportTripScreen />);
    expect(getByTestId('import-parse-button')).toBeTruthy();
  });

  it('calls setMode when scan tab is pressed', () => {
    const { getByTestId } = render(<ImportTripScreen />);
    fireEvent.press(getByTestId('import-tab-scan'));
    expect(mockUseImportTrip.setMode).toHaveBeenCalledWith('scan');
  });

  it('calls setConfirmationText when text input changes', () => {
    const { getByTestId } = render(<ImportTripScreen />);
    fireEvent.changeText(getByTestId('import-confirmation-input'), 'NH101');
    expect(mockUseImportTrip.setConfirmationText).toHaveBeenCalledWith('NH101');
  });

  it('calls handleParseConfirmation when import button is pressed', () => {
    mockUseImportTrip.confirmationText = 'NH101';
    const { getByTestId } = render(<ImportTripScreen />);
    fireEvent.press(getByTestId('import-parse-button'));
    expect(mockUseImportTrip.handleParseConfirmation).toHaveBeenCalled();
  });

  it('shows loading state when status is parsing', () => {
    mockUseImportTrip.status = 'parsing';
    const { getByTestId } = render(<ImportTripScreen />);
    expect(getByTestId('loading-state')).toBeTruthy();
  });

  it('shows error message when status is error', () => {
    mockUseImportTrip.status = 'error';
    mockUseImportTrip.errorMessage = 'No flight info found';
    const { getByTestId, getByText } = render(<ImportTripScreen />);
    expect(getByTestId('import-error-message')).toBeTruthy();
    expect(getByText('No flight info found')).toBeTruthy();
  });

  it('calls handleRetry when try again is pressed', () => {
    mockUseImportTrip.status = 'error';
    mockUseImportTrip.errorMessage = 'Error';
    const { getByTestId } = render(<ImportTripScreen />);
    fireEvent.press(getByTestId('import-try-again-button'));
    expect(mockUseImportTrip.handleRetry).toHaveBeenCalled();
  });
});
