import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, AlertButton } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useProfileStore } from '@/stores/useProfileStore';
import EditProfileScreen from '@/screens/profile/EditProfileScreen/EditProfileScreen';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('@/stores/useProfileStore', () => ({
  useProfileStore: jest.fn(),
}));

jest.mock('@/components/ui', () => {
  const { View, Text, TouchableOpacity, TextInput } = require('react-native');
  return {
    ScreenContainer: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    Button: ({ title, onPress, disabled, loading, testID }: any) => (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        testID={testID || `button-${title}`}
      >
        <Text>{loading ? 'Saving...' : title}</Text>
      </TouchableOpacity>
    ),
    Card: ({ children }: any) => <View>{children}</View>,
    Input: ({ label, value, onChangeText, testID, error }: any) => (
      <View>
        <Text>{label}</Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          testID={testID || `input-${String(label).toLowerCase().replace(/\s+/g, '-')}`}
        />
        {error ? <Text testID={`error-${label}`}>{error}</Text> : null}
      </View>
    ),
    StatusBadge: ({ text }: any) => {
      const { Text: RNText } = require('react-native');
      return <RNText>{text}</RNText>;
    },
    Divider: () => <View />,
    AddressAutocomplete: ({ testID }: any) => <View testID={testID} />,
    SearchableSelect: ({ label, value, onValueChange, testID, options }: any) => (
      <View testID={testID}>
        <Text>{label}</Text>
        <Text testID={`${testID}-value`}>{value}</Text>
        {options?.map((opt: any) => (
          <TouchableOpacity
            key={opt.value}
            testID={`${testID}-option-${opt.value}`}
            onPress={() => onValueChange(opt.value)}
          >
            <Text>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    ),
  };
});

jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  return {
    Lock: () => <View testID="icon-lock" />,
    TriangleAlert: () => <View testID="icon-triangle-alert" />,
    Lightbulb: () => <View testID="icon-lightbulb" />,
  };
});

const mockGoBack = jest.fn();
const mockUpdateProfile = jest.fn();

const DEFAULT_PROFILE = {
  id: 'test-profile-1',
  givenNames: 'Alice',
  surname: 'Smith',
  passportNumber: 'AB1234567',
  nationality: 'USA',
  dateOfBirth: '1985-03-15',
  gender: 'F',
  passportExpiry: '2030-03-15',
  issuingCountry: 'USA',
  email: 'alice@example.com',
  phoneNumber: '+1 555-0100',
  occupation: 'ENGINEER',
  maritalStatus: 'SINGLE',
  homeAddress: {
    line1: '123 Main St',
    city: 'Springfield',
    state: 'IL',
    postalCode: '62701',
    country: 'USA',
  },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function setupMocks(overrides: { profile?: any; isLoading?: boolean } = {}) {
  (useNavigation as unknown as jest.Mock).mockReturnValue({ goBack: mockGoBack });
  (useProfileStore as unknown as jest.Mock).mockReturnValue({
    profile: 'profile' in overrides ? overrides.profile : DEFAULT_PROFILE,
    updateProfile: mockUpdateProfile,
    isLoading: overrides.isLoading ?? false,
  });
}

/** Helper: render, make a change to enable the Save button, then press Save */
async function renderAndSave() {
  const utils = render(<EditProfileScreen />);
  // Change email to enable the Save button (hasUnsavedChanges = true)
  fireEvent.changeText(
    utils.getByTestId('input-email-address'),
    'updated@example.com',
  );
  fireEvent.press(utils.getByTestId('button-Save Changes'));
  return utils;
}

describe('EditProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateProfile.mockResolvedValue(undefined);
  });

  describe('handleSave — alert-then-navigate pattern', () => {
    let alertSpy: jest.SpyInstance;

    beforeEach(() => {
      alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    });

    afterEach(() => {
      alertSpy.mockRestore();
    });

    it('calls navigation.goBack() inside the Alert OK callback, not before it', async () => {
      let capturedButtons: AlertButton[] | undefined;

      alertSpy.mockImplementation((_title, _message, buttons) => {
        capturedButtons = buttons;
      });

      setupMocks();
      await renderAndSave();

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Success',
          'Profile updated successfully.',
          expect.any(Array),
        );
      });

      // goBack must NOT have been called yet — the alert is still open
      expect(mockGoBack).not.toHaveBeenCalled();

      // The alert should have a single OK button with an onPress callback
      expect(capturedButtons).toHaveLength(1);
      expect(capturedButtons![0].text).toBe('OK');
      expect(typeof capturedButtons![0].onPress).toBe('function');

      // Simulate tapping OK
      capturedButtons![0].onPress!();
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('shows the success alert with correct title before navigating', async () => {
      setupMocks();
      await renderAndSave();

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Success',
          'Profile updated successfully.',
          expect.any(Array),
        );
      });

      // navigation.goBack() should not be called synchronously
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('does not call navigation.goBack() synchronously after updateProfile resolves', async () => {
      setupMocks();
      await renderAndSave();

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({ email: 'updated@example.com' }),
        );
      });

      // Even after updateProfile resolves, goBack must not have been called
      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe('Cancel/Discard flow (unaffected)', () => {
    it('calls navigation.goBack() directly when Cancel is pressed with no unsaved changes', () => {
      setupMocks();
      const { getByText } = render(<EditProfileScreen />);
      // No changes — button shows "Cancel"
      fireEvent.press(getByText('Cancel'));
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('shows discard confirmation alert when Discard is pressed with unsaved changes', () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

      setupMocks();
      const { getByText, getByTestId } = render(<EditProfileScreen />);

      // Make a change so button becomes "Discard"
      fireEvent.changeText(
        getByTestId('input-email-address'),
        'changed@example.com',
      );
      fireEvent.press(getByText('Discard'));

      expect(alertSpy).toHaveBeenCalledWith(
        'Discard Changes?',
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({ text: 'Keep Editing', style: 'cancel' }),
          expect.objectContaining({ text: 'Discard', style: 'destructive' }),
        ]),
      );

      // navigation.goBack() not called yet — user must confirm in the alert
      expect(mockGoBack).not.toHaveBeenCalled();

      alertSpy.mockRestore();
    });
  });

  describe('enum field selection', () => {
    it('renders SearchableSelect for occupation with current value', () => {
      setupMocks();
      const { getByTestId } = render(<EditProfileScreen />);
      const occupationValue = getByTestId('occupation-select-value');
      expect(occupationValue.props.children).toBe('ENGINEER');
    });

    it('renders SearchableSelect for marital status with current value', () => {
      setupMocks();
      const { getByTestId } = render(<EditProfileScreen />);
      const maritalValue = getByTestId('marital-status-select-value');
      expect(maritalValue.props.children).toBe('SINGLE');
    });

    it('updates occupation when an option is selected', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      setupMocks();
      const { getByTestId } = render(<EditProfileScreen />);

      fireEvent.press(getByTestId('occupation-select-option-DOCTOR'));
      fireEvent.press(getByTestId('button-Save Changes'));

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({ occupation: 'DOCTOR' }),
        );
      });
      alertSpy.mockRestore();
    });

    it('updates marital status when an option is selected', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      setupMocks();
      const { getByTestId } = render(<EditProfileScreen />);

      fireEvent.press(getByTestId('marital-status-select-option-MARRIED'));
      fireEvent.press(getByTestId('button-Save Changes'));

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({ maritalStatus: 'MARRIED' }),
        );
      });
      alertSpy.mockRestore();
    });
  });

  describe('no profile state', () => {
    it('renders a fallback message when profile is null', () => {
      setupMocks({ profile: null });
      const { getByText } = render(<EditProfileScreen />);
      getByText('No profile to edit');
    });
  });
});
