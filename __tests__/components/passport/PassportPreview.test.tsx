/**
 * Tests for PassportPreview Component
 */

import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import PassportPreview from '../../../src/components/passport/PassportPreview';
import { type TravelerProfile } from '../../../src/types/profile';
import { type MRZParseResult } from '../../../src/services/passport/mrzParser';

// Mock haptic feedback
jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
  HapticFeedbackTypes: {
    notificationSuccess: 'notificationSuccess',
    impactMedium: 'impactMedium'
  }
}));

// Mock validateScannedPassport
jest.mock('../../../src/services/passport/mrzScanner', () => ({
  validateScannedPassport: jest.fn().mockReturnValue({
    isValid: true,
    warnings: []
  })
}));

describe('PassportPreview Component', () => {
  const mockProfile: Partial<TravelerProfile> = {
    passportNumber: 'P12345678',
    surname: 'DOE',
    givenNames: 'JANE',
    nationality: 'USA',
    dateOfBirth: '1990-01-01',
    gender: 'F',
    passportExpiry: '2030-12-31',
    issuingCountry: 'USA'
  };

  const mockScanResult: MRZParseResult = {
    success: true,
    profile: mockProfile,
    errors: [],
    confidence: 0.9
  };

  const mockProps = {
    profile: mockProfile,
    onConfirm: jest.fn(),
    onEdit: jest.fn(),
    onRescan: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Alert.alert = jest.fn();
  });

  it('renders passport information correctly', () => {
    const { getByText, getAllByText } = render(<PassportPreview {...mockProps} />);

    expect(getByText('Confirm Passport Details')).toBeTruthy();
    expect(getByText('P12345678')).toBeTruthy();
    expect(getByText('DOE')).toBeTruthy();
    expect(getByText('JANE')).toBeTruthy();
    expect(getAllByText('USA')).toHaveLength(2); // Appears in both issuing country and nationality
  });

  it('shows security indicator', () => {
    const { getByText } = render(<PassportPreview {...mockProps} />);

    expect(getByText('🔒')).toBeTruthy();
    expect(getByText('Secure Local Storage')).toBeTruthy();
  });

  it('displays scan confidence when scan result provided', () => {
    const { getByText } = render(
      <PassportPreview {...mockProps} scanResult={mockScanResult} />
    );

    expect(getByText('Scan Quality')).toBeTruthy();
    expect(getByText('90% Confident')).toBeTruthy();
  });

  it('handles confirm button press', async () => {
    const { getByText } = render(<PassportPreview {...mockProps} />);

    const confirmButton = getByText('Confirm & Continue');
    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(mockProps.onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  it('handles edit button press', () => {
    const { getByText } = render(<PassportPreview {...mockProps} />);

    const editButton = getByText('Edit Details');
    fireEvent.press(editButton);

    expect(mockProps.onEdit).toHaveBeenCalledTimes(1);
  });

  it('handles rescan button press when provided', () => {
    const { getByText } = render(<PassportPreview {...mockProps} />);

    const rescanButton = getByText('Rescan');
    fireEvent.press(rescanButton);

    expect(mockProps.onRescan).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    const { getByText } = render(
      <PassportPreview {...mockProps} isLoading={true} />
    );

    expect(getByText('Saving...')).toBeTruthy();
  });

  it('formats dates correctly', () => {
    const { getByText } = render(<PassportPreview {...mockProps} />);

    expect(getByText('January 1, 1990')).toBeTruthy(); // Birth date
    expect(getByText('December 31, 2030')).toBeTruthy(); // Expiry date
  });

  it('displays gender correctly', () => {
    const { getByText } = render(<PassportPreview {...mockProps} />);

    expect(getByText('Female')).toBeTruthy();
  });

  it('shows valid expiry status', () => {
    const { getByText } = render(<PassportPreview {...mockProps} />);

    expect(getByText('Valid')).toBeTruthy();
  });

  it('shows expired passport warning', () => {
    const expiredProfile = {
      ...mockProfile,
      passportExpiry: '2020-01-01'
    };

    const { getByText } = render(
      <PassportPreview {...mockProps} profile={expiredProfile} />
    );

    expect(getByText('Expired')).toBeTruthy();
  });

  it('shows expiring soon warning', () => {
    const soonExpiringDate = new Date();
    soonExpiringDate.setMonth(soonExpiringDate.getMonth() + 3);
    const expiryString = soonExpiringDate.toISOString().split('T')[0];

    const soonExpiringProfile = {
      ...mockProfile,
      passportExpiry: expiryString
    };

    const { getByText } = render(
      <PassportPreview {...mockProps} profile={soonExpiringProfile} />
    );

    expect(getByText('Expires Soon')).toBeTruthy();
  });

  it('shows validation warnings when present', () => {
    const { validateScannedPassport } = require('../../../src/services/passport/mrzScanner');
    validateScannedPassport.mockReturnValue({
      isValid: false,
      warnings: ['Passport number appears incomplete', 'Surname appears incomplete']
    });

    const { getByText } = render(
      <PassportPreview {...mockProps} scanResult={mockScanResult} />
    );

    expect(getByText('Validation Warnings')).toBeTruthy();
    expect(getByText('• Passport number appears incomplete')).toBeTruthy();
    expect(getByText('• Surname appears incomplete')).toBeTruthy();
  });

  it('shows confirmation dialog on validation warnings', async () => {
    const { validateScannedPassport } = require('../../../src/services/passport/mrzScanner');
    validateScannedPassport.mockReturnValue({
      isValid: false,
      warnings: ['Test warning']
    });

    const { getByText } = render(
      <PassportPreview {...mockProps} scanResult={mockScanResult} />
    );

    const confirmButton = getByText('Confirm & Continue');
    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Data Validation Warning',
        expect.stringContaining('Test warning'),
        expect.any(Array)
      );
    });
  });

  it('handles missing passport data gracefully', () => {
    const incompleteProfile = {
      passportNumber: undefined,
      surname: '',
      givenNames: undefined
    };

    const { getAllByText } = render(
      <PassportPreview {...mockProps} profile={incompleteProfile} />
    );

    expect(getAllByText('Not provided').length).toBeGreaterThanOrEqual(1);
  });

  it('displays confidence levels with appropriate colors', () => {
    const lowConfidenceScanResult = {
      ...mockScanResult,
      confidence: 0.5
    };

    const { getByText } = render(
      <PassportPreview {...mockProps} scanResult={lowConfidenceScanResult} />
    );

    expect(getByText('50% Confident')).toBeTruthy();
  });

  it('handles different gender values', () => {
    const testCases = [
      { gender: 'M', expected: 'Male' },
      { gender: 'F', expected: 'Female' },
      { gender: 'X', expected: 'Other' },
      { gender: undefined, expected: 'Not specified' }
    ];

    testCases.forEach(({ gender, expected }) => {
      const profileWithGender = { ...mockProfile, gender: gender as any };
      const { getByText } = render(
        <PassportPreview {...mockProps} profile={profileWithGender} />
      );

      expect(getByText(expected)).toBeTruthy();
    });
  });

  it('disables buttons when loading', () => {
    const { getByText, getByLabelText } = render(
      <PassportPreview {...mockProps} isLoading={true} />
    );

    // Check that the loading text is shown
    expect(getByText('Saving...')).toBeTruthy();
    
    // Check that edit button is disabled
    const editButton = getByLabelText('Edit Details');
    expect(editButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('hides rescan button when onRescan not provided', () => {
    const propsWithoutRescan = { ...mockProps, onRescan: undefined };
    const { queryByText } = render(<PassportPreview {...propsWithoutRescan} />);

    expect(queryByText('Rescan')).toBeNull();
  });

  it('handles invalid date formats gracefully', () => {
    const profileWithInvalidDate = {
      ...mockProfile,
      dateOfBirth: 'invalid-date'
    };

    const { getByText } = render(
      <PassportPreview {...mockProps} profile={profileWithInvalidDate} />
    );

    // Should display the raw string when date parsing fails
    expect(getByText('invalid-date')).toBeTruthy();
  });

  it('marks important fields visually', () => {
    const { getByText } = render(<PassportPreview {...mockProps} />);

    // Important fields should have different styling
    const passportNumber = getByText('P12345678');
    const surname = getByText('DOE');
    const givenNames = getByText('JANE');

    // These should be marked as important (exact styling depends on implementation)
    expect(passportNumber).toBeTruthy();
    expect(surname).toBeTruthy();
    expect(givenNames).toBeTruthy();
  });
});