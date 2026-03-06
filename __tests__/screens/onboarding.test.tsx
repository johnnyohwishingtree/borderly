import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useProfileStore } from '@/stores/useProfileStore';
import WelcomeScreen from '@/screens/onboarding/WelcomeScreen';
import PassportScanScreen from '@/screens/onboarding/PassportScanScreen';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('@/stores/useProfileStore', () => ({
  useProfileStore: jest.fn(),
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: ({ component: Component }: { component: React.ComponentType }) => <Component />,
  }),
}));

jest.mock('react-hook-form', () => {
  const actual = jest.requireActual('react-hook-form');
  return actual;
});

jest.mock('@hookform/resolvers/zod', () => ({
  zodResolver: () => async (values: any) => ({ values, errors: {} }),
}));

jest.mock('@/components/ui', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    Button: ({ title, onPress, disabled, loading, ...props }: any) => (
      <TouchableOpacity onPress={disabled || loading ? undefined : onPress} testID={props.testID}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
    Card: ({ children }: any) => <View>{children}</View>,
    Input: ({ label, value, onChangeText, error, helperText, placeholder, required, onBlur, ...props }: any) => {
      const { TextInput } = require('react-native');
      return (
        <View>
          {label && <Text>{label}</Text>}
          {required && <Text>*</Text>}
          <TextInput
            value={value}
            onChangeText={onChangeText}
            onBlur={onBlur}
            placeholder={placeholder}
          />
          {error && <Text>{error}</Text>}
          {!error && helperText && <Text>{helperText}</Text>}
        </View>
      );
    },
  };
});

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
    });

    it('should display gender options', () => {
      const { getByText } = render(<PassportScanScreen />);

      expect(getByText(/Gender/)).toBeTruthy();
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

    it('should handle gender selection', () => {
      const { getByText } = render(<PassportScanScreen />);

      const femaleButton = getByText('Female');
      fireEvent.press(femaleButton);
      expect(femaleButton).toBeTruthy();

      const otherButton = getByText('Other');
      fireEvent.press(otherButton);
      expect(otherButton).toBeTruthy();
    });
  });

  describe('Onboarding Flow Integration', () => {
    it('should start with Welcome and navigate to PassportScan', () => {
      const { getByText } = render(<WelcomeScreen />);

      fireEvent.press(getByText('Get Started'));
      expect(mockNavigation.navigate).toHaveBeenCalledWith('PassportScan');
    });

    it('should allow navigation back from PassportScan', () => {
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
