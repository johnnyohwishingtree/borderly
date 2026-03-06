import React from 'react';
import { View, Text } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';
import { useProfileStore } from '@/stores/useProfileStore';

// Mock screen components since they don't exist yet
const WelcomeScreen = () => {
  const navigation = useNavigation();
  return (
    <View testID="welcome-screen">
      <Text>Welcome to Borderly</Text>
      <Text>Your universal travel declaration companion</Text>
      <Text>All data stored locally on your device</Text>
      <Text onPress={() => navigation.navigate('PassportScan' as never)}>Get Started</Text>
    </View>
  );
};

const PassportScanScreen = () => {
  const navigation = useNavigation();
  const { saveProfile } = useProfileStore();
  const [passportNumber, setPassportNumber] = React.useState('');
  const [nationality, setNationality] = React.useState('');
  const [gender, setGender] = React.useState('');
  
  const handleSubmit = async () => {
    if (!passportNumber || passportNumber.length < 8 || !nationality || !gender) {
      return;
    }
    
    try {
      await saveProfile({
        passportNumber,
        nationality,
        gender,
        mrzData: {},
        personalDeclarations: {
          hasRestrictedItems: false,
          hasMedicalConditions: false,
          hasBusinessPurpose: false,
          hasVisitedFarms: false,
        },
      });
      navigation.navigate('ConfirmProfile' as never);
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile');
    }
  };

  return (
    <View testID="passport-scan-screen">
      <Text>Passport Information</Text>
      <Text>Passport Number *</Text>
      <Text>Nationality *</Text>
      <Text>Gender *</Text>
      <Text>Male</Text>
      <Text>Female</Text>
      <Text>Other</Text>
      <Text onPress={() => navigation.goBack()}>Back</Text>
      <Text onPress={handleSubmit}>Continue</Text>
    </View>
  );
};

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('@/stores/useProfileStore', () => ({
  useProfileStore: jest.fn(),
}));

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

const mockProfileStore = {
  saveProfile: jest.fn(),
};

describe('Onboarding Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    (useProfileStore as jest.Mock).mockReturnValue(mockProfileStore);
  });

  describe('WelcomeScreen', () => {
    it('should render welcome content correctly', () => {
      const { getByText } = render(<WelcomeScreen />);

      expect(getByText('Welcome to Borderly')).toBeTruthy();
      expect(getByText('Your universal travel declaration companion')).toBeTruthy();
      expect(getByText('Fill Once, Travel Everywhere')).toBeTruthy();
      expect(getByText('Passport data stays on your device')).toBeTruthy();
      expect(getByText('No server stores your personal info')).toBeTruthy();
      expect(getByText('Works offline and secure')).toBeTruthy();
      expect(getByText('Privacy First')).toBeTruthy();
    });

    it('should navigate to PassportScan when Get Started is pressed', () => {
      const { getByText } = render(<WelcomeScreen />);
      
      const getStartedButton = getByText('Get Started');
      fireEvent.press(getStartedButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('PassportScan');
    });

    it('should display privacy information prominently', () => {
      const { getByText } = render(<WelcomeScreen />);

      expect(getByText(/encrypted and stored only in your device's secure keychain/)).toBeTruthy();
      expect(getByText(/never transmit your personal information/)).toBeTruthy();
    });
  });

  describe('PassportScanScreen', () => {
    it('should render passport form correctly', () => {
      const { getByText, getByPlaceholderText } = render(<PassportScanScreen />);

      expect(getByText('Enter Passport Details')).toBeTruthy();
      expect(getByText(/stored securely on your device/)).toBeTruthy();
      expect(getByText('Passport Information')).toBeTruthy();
      
      expect(getByPlaceholderText('Enter passport number')).toBeTruthy();
      expect(getByPlaceholderText('Enter surname')).toBeTruthy();
      expect(getByPlaceholderText('Enter given names')).toBeTruthy();
      expect(getByPlaceholderText('e.g., USA, CAN, GBR')).toBeTruthy();
      expect(getByPlaceholderText('YYYY-MM-DD')).toBeTruthy();
    });

    it('should display gender options', () => {
      const { getByText } = render(<PassportScanScreen />);

      expect(getByText('Gender')).toBeTruthy();
      expect(getByText('Male')).toBeTruthy();
      expect(getByText('Female')).toBeTruthy();
      expect(getByText('Other')).toBeTruthy();
    });

    it('should navigate back when Back button is pressed', () => {
      const { getByText } = render(<PassportScanScreen />);
      
      const backButton = getByText('Back');
      fireEvent.press(backButton);

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });

    it('should show validation errors for required fields', async () => {
      const { getByText } = render(<PassportScanScreen />);
      
      const continueButton = getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(getByText('Passport number is required')).toBeTruthy();
        expect(getByText('Surname is required')).toBeTruthy();
        expect(getByText('Given names are required')).toBeTruthy();
        expect(getByText('Nationality is required')).toBeTruthy();
        expect(getByText('Date of birth is required')).toBeTruthy();
        expect(getByText('Passport expiry date is required')).toBeTruthy();
        expect(getByText('Issuing country is required')).toBeTruthy();
      });
    });

    it('should validate passport number length', async () => {
      const { getByPlaceholderText, getByText } = render(<PassportScanScreen />);
      
      const passportInput = getByPlaceholderText('Enter passport number');
      fireEvent.changeText(passportInput, '12345'); // Too short
      
      const continueButton = getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(getByText('Invalid passport number')).toBeTruthy();
      });
    });

    it('should validate nationality format', async () => {
      const { getByPlaceholderText, getByText } = render(<PassportScanScreen />);
      
      const nationalityInput = getByPlaceholderText('e.g., USA, CAN, GBR');
      fireEvent.changeText(nationalityInput, 'US'); // Too short
      
      const continueButton = getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(getByText('Nationality is required')).toBeTruthy();
      });

      fireEvent.changeText(nationalityInput, 'USAA'); // Too long
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(getByText('Use 3-letter country code')).toBeTruthy();
      });
    });

    it('should handle gender selection', () => {
      const { getByText } = render(<PassportScanScreen />);
      
      const femaleButton = getByText('Female');
      fireEvent.press(femaleButton);
      
      // The button should now be in selected state (primary variant)
      expect(femaleButton).toBeTruthy();
      
      const otherButton = getByText('Other');
      fireEvent.press(otherButton);
      
      expect(otherButton).toBeTruthy();
    });

    it('should successfully submit valid form data', async () => {
      mockProfileStore.saveProfile.mockResolvedValue(undefined);
      
      const { getByPlaceholderText, getByText } = render(<PassportScanScreen />);
      
      // Fill out the form with valid data
      fireEvent.changeText(getByPlaceholderText('Enter passport number'), 'A12345678');
      fireEvent.changeText(getByPlaceholderText('Enter surname'), 'Doe');
      fireEvent.changeText(getByPlaceholderText('Enter given names'), 'John');
      
      const nationalityInput = getByPlaceholderText('e.g., USA, CAN, GBR');
      fireEvent.changeText(nationalityInput, 'USA');
      
      const dobInput = getByPlaceholderText('YYYY-MM-DD');
      fireEvent.changeText(dobInput, '1990-01-01');
      
      const expiryInput = getByPlaceholderText('YYYY-MM-DD');
      fireEvent.changeText(expiryInput, '2030-01-01');
      
      const issuingCountryInput = getByPlaceholderText('e.g., USA, CAN, GBR');
      fireEvent.changeText(issuingCountryInput, 'USA');
      
      const continueButton = getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockProfileStore.saveProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            passportNumber: 'A12345678',
            surname: 'Doe',
            givenNames: 'John',
            nationality: 'USA',
            dateOfBirth: '1990-01-01',
            gender: 'M', // Default value
            passportExpiry: '2030-01-01',
            issuingCountry: 'USA',
            email: '',
            phoneNumber: '',
            defaultDeclarations: expect.any(Object),
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          })
        );
        
        expect(mockNavigation.navigate).toHaveBeenCalledWith('ConfirmProfile');
      });
    });

    it('should handle profile save errors', async () => {
      const error = new Error('Save failed');
      mockProfileStore.saveProfile.mockRejectedValue(error);
      
      const { getByPlaceholderText, getByText } = render(<PassportScanScreen />);
      
      // Fill required fields
      fireEvent.changeText(getByPlaceholderText('Enter passport number'), 'A12345678');
      fireEvent.changeText(getByPlaceholderText('Enter surname'), 'Doe');
      fireEvent.changeText(getByPlaceholderText('Enter given names'), 'John');
      fireEvent.changeText(getByPlaceholderText('e.g., USA, CAN, GBR'), 'USA');
      fireEvent.changeText(getByPlaceholderText('YYYY-MM-DD'), '1990-01-01');
      
      const continueButton = getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to save passport data. Please try again.'
        );
      });
    });

    it('should include default declarations in saved profile', async () => {
      mockProfileStore.saveProfile.mockResolvedValue(undefined);
      
      const { getByPlaceholderText, getByText } = render(<PassportScanScreen />);
      
      // Fill minimum required fields
      fireEvent.changeText(getByPlaceholderText('Enter passport number'), 'A12345678');
      fireEvent.changeText(getByPlaceholderText('Enter surname'), 'Doe');
      fireEvent.changeText(getByPlaceholderText('Enter given names'), 'John');
      fireEvent.changeText(getByPlaceholderText('e.g., USA, CAN, GBR'), 'USA');
      fireEvent.changeText(getByPlaceholderText('YYYY-MM-DD'), '1990-01-01');
      
      const continueButton = getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockProfileStore.saveProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            defaultDeclarations: {
              hasItemsToDeclar: false,
              carryingCurrency: false,
              carryingProhibitedItems: false,
              visitedFarm: false,
              hasCriminalRecord: false,
              carryingCommercialGoods: false,
            },
          })
        );
      });
    });
  });

  describe('Onboarding Flow Integration', () => {
    it('should follow complete onboarding flow', async () => {
      // Start with Welcome screen
      const { getByText, rerender } = render(<WelcomeScreen />);
      
      fireEvent.press(getByText('Get Started'));
      expect(mockNavigation.navigate).toHaveBeenCalledWith('PassportScan');
      
      // Move to PassportScan screen
      mockNavigation.navigate.mockClear();
      mockProfileStore.saveProfile.mockResolvedValue(undefined);
      
      rerender(<PassportScanScreen />);
      
      // Fill and submit passport form
      fireEvent.changeText(getByText('Enter passport number'), 'A12345678');
      fireEvent.changeText(getByText('Enter surname'), 'Doe');
      fireEvent.changeText(getByText('Enter given names'), 'John');
      fireEvent.changeText(getByText('e.g., USA, CAN, GBR'), 'USA');
      fireEvent.changeText(getByText('YYYY-MM-DD'), '1990-01-01');
      
      const continueButton = getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith('ConfirmProfile');
      });
    });

    it('should allow navigation back in the flow', () => {
      const { getByText } = render(<PassportScanScreen />);
      
      const backButton = getByText('Back');
      fireEvent.press(backButton);

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('Data Security', () => {
    it('should emphasize local storage in UI text', () => {
      const { getByText } = render(<WelcomeScreen />);
      
      expect(getByText('Passport data stays on your device')).toBeTruthy();
      expect(getByText('No server stores your personal info')).toBeTruthy();
    });

    it('should mention secure storage in passport screen', () => {
      const { getByText } = render(<PassportScanScreen />);
      
      expect(getByText(/stored securely on your device/)).toBeTruthy();
    });
  });
});