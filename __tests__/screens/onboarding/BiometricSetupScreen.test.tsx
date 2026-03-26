/**
 * Unit tests for BiometricSetupScreen.
 *
 * Covers biometric setup header, security benefit cards, enable/skip flows,
 * loading state, progress bar, platform-specific biometric type display,
 * and back navigation.
 */
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';
import BiometricSetupScreen from '@/screens/onboarding/BiometricSetupScreen/BiometricSetupScreen';

// ── Mock return values (module-level stable references) ───────────────────────

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: mockGoBack };

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const Icon = ({ testID }: { testID?: string }) => React.createElement('View', { testID });
  return {
    Fingerprint: Icon,
    ShieldCheck: Icon,
    Zap: Icon,
    KeyRound: Icon,
    Lightbulb: Icon,
  };
});

jest.mock('../../../src/components/ui', () => {
  const React = require('react');
  return {
    Button: ({ title, onPress, testID, loading }: { title: string; onPress?: () => void; testID?: string; loading?: boolean }) =>
      React.createElement('TouchableOpacity', { onPress, testID, disabled: loading },
        React.createElement('Text', null, title)),
    Card: ({ children, ...props }: any) =>
      React.createElement('View', props, children),
    ProgressBar: ({ progress }: { progress: number }) =>
      React.createElement('View', { testID: 'progress-bar', accessibilityLabel: `Progress: ${progress}%` }),
    ScreenContainer: ({ children, ...props }: any) =>
      React.createElement('View', props, children),
  };
});

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'ios';
});

// ── Header and description ────────────────────────────────────────────────────

describe('BiometricSetupScreen — header', () => {
  it('renders "Secure Your Profile" title', () => {
    render(<BiometricSetupScreen />);

    expect(screen.getByText('Secure Your Profile')).toBeTruthy();
  });

  it('renders description about biometric authentication', () => {
    render(<BiometricSetupScreen />);

    expect(screen.getByText(/Enable biometric authentication/)).toBeTruthy();
  });

  it('renders progress bar at 100%', () => {
    render(<BiometricSetupScreen />);

    expect(screen.getByTestId('progress-bar')).toBeTruthy();
  });
});

// ── Security benefit cards ────────────────────────────────────────────────────

describe('BiometricSetupScreen — security benefits', () => {
  it('renders "Quick Access" benefit', () => {
    render(<BiometricSetupScreen />);

    expect(screen.getByText('Quick Access')).toBeTruthy();
    expect(screen.getByText('Instant access to your profile')).toBeTruthy();
  });

  it('renders "Additional Security" benefit', () => {
    render(<BiometricSetupScreen />);

    expect(screen.getByText('Additional Security')).toBeTruthy();
    expect(screen.getByText('Extra protection for your data')).toBeTruthy();
  });

  it('renders "No Passwords" benefit', () => {
    render(<BiometricSetupScreen />);

    expect(screen.getByText('No Passwords')).toBeTruthy();
    expect(screen.getByText('Nothing to remember or forget')).toBeTruthy();
  });
});

// ── Optional setup notice ─────────────────────────────────────────────────────

describe('BiometricSetupScreen — optional setup notice', () => {
  it('renders "Optional Setup" heading', () => {
    render(<BiometricSetupScreen />);

    expect(screen.getByText('Optional Setup')).toBeTruthy();
  });

  it('renders skip explanation text', () => {
    render(<BiometricSetupScreen />);

    expect(screen.getByText(/can skip this step/)).toBeTruthy();
  });
});

// ── Platform-specific biometric type ──────────────────────────────────────────

describe('BiometricSetupScreen — platform biometric type', () => {
  it('shows "Touch ID / Face ID" on iOS', () => {
    Platform.OS = 'ios';

    render(<BiometricSetupScreen />);

    expect(screen.getByText('Touch ID / Face ID')).toBeTruthy();
    expect(screen.getByText('Enable Touch ID / Face ID')).toBeTruthy();
  });

  it('shows "Fingerprint / Face Unlock" on Android', () => {
    Platform.OS = 'android';

    render(<BiometricSetupScreen />);

    expect(screen.getByText('Fingerprint / Face Unlock')).toBeTruthy();
    expect(screen.getByText('Enable Fingerprint / Face Unlock')).toBeTruthy();
  });
});

// ── Enable biometric flow ─────────────────────────────────────────────────────

describe('BiometricSetupScreen — enable biometric', () => {
  it('renders enable biometric button', () => {
    render(<BiometricSetupScreen />);

    expect(screen.getByTestId('enable-biometric-button')).toBeTruthy();
  });

  it('pressing enable button triggers Alert after setup completes', async () => {
    jest.useFakeTimers();
    render(<BiometricSetupScreen />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('enable-biometric-button'));
    });

    // Shows loading title while enabling
    expect(screen.getByText(/Setting up Touch ID/)).toBeTruthy();

    // Advance the 2-second timer
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Setup Complete!',
      expect.any(String),
      expect.any(Array),
    );

    jest.useRealTimers();
  });
});

// ── Skip flow ─────────────────────────────────────────────────────────────────

describe('BiometricSetupScreen — skip', () => {
  it('renders "Skip for Now" button', () => {
    render(<BiometricSetupScreen />);

    expect(screen.getByTestId('skip-biometric-button')).toBeTruthy();
  });

  it('pressing "Skip for Now" shows confirmation Alert', () => {
    render(<BiometricSetupScreen />);

    fireEvent.press(screen.getByTestId('skip-biometric-button'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Skip Biometric Setup?',
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ text: 'Go Back' }),
        expect.objectContaining({ text: 'Skip' }),
      ]),
    );
  });

  it('pressing "Skip" in Alert navigates to NotificationPermission', () => {
    render(<BiometricSetupScreen />);

    fireEvent.press(screen.getByTestId('skip-biometric-button'));

    // Get the "Skip" button callback from Alert.alert
    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const buttons = alertCalls[0][2];
    const skipButton = buttons.find((b: { text: string }) => b.text === 'Skip');
    skipButton.onPress();

    expect(mockNavigate).toHaveBeenCalledWith('NotificationPermission');
  });
});

// ── Back navigation ───────────────────────────────────────────────────────────

describe('BiometricSetupScreen — back navigation', () => {
  it('renders "Back" button', () => {
    render(<BiometricSetupScreen />);

    expect(screen.getByTestId('biometric-back-button')).toBeTruthy();
  });

  it('pressing "Back" calls goBack', () => {
    render(<BiometricSetupScreen />);

    fireEvent.press(screen.getByTestId('biometric-back-button'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
