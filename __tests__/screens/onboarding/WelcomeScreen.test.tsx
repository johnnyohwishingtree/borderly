/**
 * Unit tests for WelcomeScreen.
 *
 * Covers rendering of hero section, feature cards, supported country flags,
 * privacy notice, navigation buttons, and progress bar.
 */
import { render, screen, fireEvent } from '@testing-library/react-native';
import WelcomeScreen from '@/screens/onboarding/WelcomeScreen/WelcomeScreen';

// ── Mock return values (module-level stable references) ───────────────────────

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate };

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

jest.mock('../../../src/utils/theme', () => ({
  useTheme: () => ({
    colors: { textPrimary: '#000', textSecondary: '#666', success: '#22c55e', accent: '#3b82f6' },
    isDark: false,
  }),
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const Icon = ({ testID }: { testID?: string }) => React.createElement('View', { testID });
  return {
    Globe: Icon,
    Plane: Icon,
    Lock: Icon,
    Smartphone: Icon,
    Zap: Icon,
    ShieldCheck: Icon,
    HelpCircle: Icon,
    UploadCloud: Icon,
  };
});

jest.mock('../../../src/components/ui', () => {
  const React = require('react');
  return {
    Button: ({ title, onPress, testID }: { title: string; onPress?: () => void; testID?: string }) =>
      React.createElement('TouchableOpacity', { onPress, testID },
        React.createElement('Text', null, title)),
    ProgressBar: ({ accessibilityLabel, className }: { progress: number; accessibilityLabel?: string; className?: string }) =>
      React.createElement('View', { testID: 'progress-bar', accessibilityLabel, className }),
    ScreenContainer: ({ children, ...props }: any) =>
      React.createElement('View', props, children),
  };
});

jest.mock('../../../src/components/ui/gluestack/card', () => {
  const React = require('react');
  return {
    Card: ({ children, ...props }: any) =>
      React.createElement('View', props, children),
  };
});

jest.mock('../../../src/components/ui/gluestack/icon', () => {
  const React = require('react');
  return {
    Icon: ({ testID }: { testID?: string }) => React.createElement('View', { testID }),
  };
});

jest.mock('../../../src/components/ui/gluestack/button', () => {
  const React = require('react');
  return {
    Button: ({ title, onPress, testID }: { title: string; onPress?: () => void; testID?: string }) =>
      React.createElement('TouchableOpacity', { onPress, testID },
        React.createElement('Text', null, title)),
  };
});

jest.mock('../../../src/components/trips/CountryFlag', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ countryCode }: { countryCode: string }) =>
      React.createElement('View', { testID: `country-flag-${countryCode}` }),
  };
});

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Hero section ──────────────────────────────────────────────────────────────

describe('WelcomeScreen — hero section', () => {
  it('renders "Welcome to" header text', () => {
    render(<WelcomeScreen />);

    expect(screen.getByText('Welcome to')).toBeTruthy();
  });

  it('renders "Borderly" header text', () => {
    render(<WelcomeScreen />);

    expect(screen.getByText('Borderly')).toBeTruthy();
  });

  it('renders subtitle text', () => {
    render(<WelcomeScreen />);

    expect(screen.getByText(/Fill once, travel everywhere/)).toBeTruthy();
  });
});

// ── Progress bar ──────────────────────────────────────────────────────────────

describe('WelcomeScreen — progress bar', () => {
  it('renders progress bar at step 1 of 4', () => {
    render(<WelcomeScreen />);

    expect(screen.getByLabelText(/Step 1 of 4/)).toBeTruthy();
  });
});

// ── Feature cards ─────────────────────────────────────────────────────────────

describe('WelcomeScreen — feature cards', () => {
  it('renders "Fill Once, Travel Everywhere" feature heading', () => {
    render(<WelcomeScreen />);

    expect(screen.getByText('Fill Once, Travel Everywhere')).toBeTruthy();
  });

  it('renders "Private & Secure" feature', () => {
    render(<WelcomeScreen />);

    expect(screen.getByText('Private & Secure')).toBeTruthy();
    expect(screen.getByText('Data stays on your device')).toBeTruthy();
  });

  it('renders "Works Offline" feature', () => {
    render(<WelcomeScreen />);

    expect(screen.getByText('Works Offline')).toBeTruthy();
    expect(screen.getByText('No internet required')).toBeTruthy();
  });

  it('renders "Lightning Fast" feature', () => {
    render(<WelcomeScreen />);

    expect(screen.getByText('Lightning Fast')).toBeTruthy();
    expect(screen.getByText('Fill forms in seconds')).toBeTruthy();
  });
});

// ── Supported countries ───────────────────────────────────────────────────────

describe('WelcomeScreen — supported countries', () => {
  it('renders "Supported Countries" heading', () => {
    render(<WelcomeScreen />);

    expect(screen.getByText('Supported Countries')).toBeTruthy();
  });

  it('renders country flag for each supported country', () => {
    render(<WelcomeScreen />);

    expect(screen.getByTestId('country-flag-JPN')).toBeTruthy();
    expect(screen.getByTestId('country-flag-MYS')).toBeTruthy();
    expect(screen.getByTestId('country-flag-SGP')).toBeTruthy();
    expect(screen.getByTestId('country-flag-THA')).toBeTruthy();
    expect(screen.getByTestId('country-flag-VNM')).toBeTruthy();
    expect(screen.getByTestId('country-flag-GBR')).toBeTruthy();
    expect(screen.getByTestId('country-flag-USA')).toBeTruthy();
    expect(screen.getByTestId('country-flag-CAN')).toBeTruthy();
    expect(screen.getByTestId('country-flag-AUS')).toBeTruthy();
    expect(screen.getByTestId('country-flag-NZL')).toBeTruthy();
    expect(screen.getByTestId('country-flag-KOR')).toBeTruthy();
    expect(screen.getByTestId('country-flag-IND')).toBeTruthy();
    expect(screen.getByTestId('country-flag-IDN')).toBeTruthy();
    expect(screen.getByTestId('country-flag-PHL')).toBeTruthy();
  });

  it('renders country names for all supported countries', () => {
    render(<WelcomeScreen />);

    expect(screen.getByText('Japan')).toBeTruthy();
    expect(screen.getByText('Malaysia')).toBeTruthy();
    expect(screen.getByText('Singapore')).toBeTruthy();
    expect(screen.getByText('Thailand')).toBeTruthy();
    expect(screen.getByText('Vietnam')).toBeTruthy();
    expect(screen.getByText('UK')).toBeTruthy();
    expect(screen.getByText('USA')).toBeTruthy();
    expect(screen.getByText('Canada')).toBeTruthy();
    expect(screen.getByText('Australia')).toBeTruthy();
    expect(screen.getByText('New Zealand')).toBeTruthy();
    expect(screen.getByText('South Korea')).toBeTruthy();
    expect(screen.getByText('India')).toBeTruthy();
    expect(screen.getByText('Indonesia')).toBeTruthy();
    expect(screen.getByText('Philippines')).toBeTruthy();
  });
});

// ── Privacy notice ────────────────────────────────────────────────────────────

describe('WelcomeScreen — privacy notice', () => {
  it('renders "Privacy First" heading', () => {
    render(<WelcomeScreen />);

    expect(screen.getByText('Privacy First')).toBeTruthy();
  });

  it('renders privacy description about encrypted keychain storage', () => {
    render(<WelcomeScreen />);

    expect(screen.getByText(/encrypted and stored only in your device/)).toBeTruthy();
  });
});

// ── Navigation buttons ────────────────────────────────────────────────────────

describe('WelcomeScreen — navigation', () => {
  it('renders "Take Quick Tutorial" button', () => {
    render(<WelcomeScreen />);

    expect(screen.getByTestId('take-tutorial-button')).toBeTruthy();
  });

  it('pressing "Take Quick Tutorial" navigates to Tutorial screen', () => {
    render(<WelcomeScreen />);

    fireEvent.press(screen.getByTestId('take-tutorial-button'));

    expect(mockNavigate).toHaveBeenCalledWith('Tutorial');
  });

  it('renders "Skip Tutorial" button', () => {
    render(<WelcomeScreen />);

    expect(screen.getByTestId('skip-tutorial-button')).toBeTruthy();
  });

  it('pressing "Skip Tutorial" navigates to PassportScan screen', () => {
    render(<WelcomeScreen />);

    fireEvent.press(screen.getByTestId('skip-tutorial-button'));

    expect(mockNavigate).toHaveBeenCalledWith('PassportScan');
  });

  it('renders "Restore from backup" link', () => {
    render(<WelcomeScreen />);

    expect(screen.getByTestId('restore-backup-link-button')).toBeTruthy();
  });

  it('pressing "Restore from backup" navigates to RestoreBackup screen', () => {
    render(<WelcomeScreen />);

    fireEvent.press(screen.getByTestId('restore-backup-link-button'));

    expect(mockNavigate).toHaveBeenCalledWith('RestoreBackup');
  });
});
