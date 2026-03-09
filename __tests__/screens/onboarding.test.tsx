import { render, fireEvent } from '@testing-library/react-native';
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

// Mock Dimensions API
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812 })),
    },
  };
});

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
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    Button: ({ title, onPress, disabled, loading, ...props }: any) => (
      <TouchableOpacity onPress={disabled || loading ? undefined : onPress} testID={props.testID}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
    Card: ({ children }: any) => <View>{children}</View>,
    Input: ({ label, value, onChangeText, error, helperText, placeholder, required, onBlur }: any) => {
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
    ProgressBar: ({ progress, label }: any) => (
      <View>
        {label && <Text>{label}</Text>}
        <View testID="progress-bar">
          <Text>{progress}%</Text>
        </View>
      </View>
    ),
    Tooltip: ({ children, content }: any) => (
      <View>
        {children}
        {content && <Text testID="tooltip-content">{content}</Text>}
      </View>
    ),
    HelpHint: ({ title, content }: any) => (
      <View testID="help-hint">
        {title && <Text>{title}</Text>}
        {content && <Text>{content}</Text>}
      </View>
    ),
    ProgressIndicator: ({ steps, currentStep }: any) => (
      <View testID="progress-indicator">
        <Text>{currentStep} of {steps?.length || 0}</Text>
      </View>
    ),
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
    (useNavigation as unknown as jest.Mock).mockReturnValue(mockNavigation);
    (useProfileStore as unknown as jest.Mock).mockReturnValue(mockProfileStore);
  });

  describe('WelcomeScreen', () => {
    it('should render welcome content correctly', () => {
      const { getByText } = render(<WelcomeScreen />);

      expect(getByText('Welcome to')).toBeTruthy();
      expect(getByText('Borderly')).toBeTruthy();
      expect(getByText('Your universal travel declaration companion. Fill once, travel everywhere.')).toBeTruthy();
      expect(getByText('Fill Once, Travel Everywhere')).toBeTruthy();
      expect(getByText('Private & Secure')).toBeTruthy();
      expect(getByText('Data stays on your device')).toBeTruthy();
      expect(getByText('Works Offline')).toBeTruthy();
      expect(getByText('Lightning Fast')).toBeTruthy();
      expect(getByText('Privacy First')).toBeTruthy();
    });

    it('should navigate to PassportScan when Skip Tutorial is pressed', () => {
      const { getByText } = render(<WelcomeScreen />);

      const skipButton = getByText('Skip Tutorial');
      fireEvent.press(skipButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('PassportScan');
    });

    it('should navigate to Tutorial when Take Quick Tutorial is pressed', () => {
      const { getByText } = render(<WelcomeScreen />);

      const tutorialButton = getByText('Take Quick Tutorial');
      fireEvent.press(tutorialButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Tutorial');
    });

    it('should display privacy information prominently', () => {
      const { getByText } = render(<WelcomeScreen />);

      expect(getByText('Privacy First')).toBeTruthy();
      expect(getByText(/Your passport data is encrypted and stored only in your device's secure keychain/)).toBeTruthy();
    });
  });

  describe('PassportScanScreen', () => {
    it('should render passport scan method selection correctly', () => {
      const { getByText } = render(<PassportScanScreen />);

      expect(getByText('Passport Information')).toBeTruthy();
      expect(getByText(/All data is stored securely on your device/)).toBeTruthy();
      expect(getByText('Optimized Passport Scan')).toBeTruthy();
      expect(getByText('Start Camera Scan')).toBeTruthy();
      expect(getByText('Manual Entry')).toBeTruthy();
      expect(getByText('Enter Manually')).toBeTruthy();
    });

    it('should show manual form when manual entry is selected', () => {
      const { getByText, getByPlaceholderText } = render(<PassportScanScreen />);
      
      // Click manual entry to show the form
      fireEvent.press(getByText('Enter Manually'));

      expect(getByPlaceholderText('Enter passport number')).toBeTruthy();
      expect(getByPlaceholderText('Enter surname')).toBeTruthy();
      expect(getByPlaceholderText('Enter given names')).toBeTruthy();
    });

    it('should display gender options in manual form', () => {
      const { getByText } = render(<PassportScanScreen />);

      // Click manual entry to show the form
      fireEvent.press(getByText('Enter Manually'));

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

    it('should handle gender selection in manual form', () => {
      const { getByText } = render(<PassportScanScreen />);

      // Click manual entry to show the form
      fireEvent.press(getByText('Enter Manually'));

      const femaleButton = getByText('Female');
      fireEvent.press(femaleButton);
      expect(femaleButton).toBeTruthy();

      const otherButton = getByText('Other');
      fireEvent.press(otherButton);
      expect(otherButton).toBeTruthy();
    });
  });

  describe('Onboarding Flow Integration', () => {
    it('should start with Welcome and navigate to PassportScan via Skip Tutorial', () => {
      const { getByText } = render(<WelcomeScreen />);

      fireEvent.press(getByText('Skip Tutorial'));
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

      expect(getByText('Private & Secure')).toBeTruthy();
      expect(getByText('Data stays on your device')).toBeTruthy();
    });

    it('should mention secure storage in passport screen', () => {
      const { getByText } = render(<PassportScanScreen />);

      expect(getByText(/All data is stored securely on your device/)).toBeTruthy();
    });
  });
});
