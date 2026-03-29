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

    screen.getByText('Welcome to');
  });

  it('renders "Borderly" header text', () => {
    render(<WelcomeScreen />);

    screen.getByText('Borderly');
  });

  it('renders subtitle text', () => {
    render(<WelcomeScreen />);

    screen.getByText(/Fill once, travel everywhere/);
  });
});

// ── Progress bar ──────────────────────────────────────────────────────────────

describe('WelcomeScreen — progress bar', () => {
  it('renders progress bar at step 1 of 4', () => {
    render(<WelcomeScreen />);

    screen.getByLabelText(/Step 1 of 4/);
  });
});

// ── Feature cards ─────────────────────────────────────────────────────────────

describe('WelcomeScreen — feature cards', () => {
  it('renders "Fill Once, Travel Everywhere" feature heading', () => {
    render(<WelcomeScreen />);

    screen.getByText('Fill Once, Travel Everywhere');
  });

  it('renders "Private & Secure" feature', () => {
    render(<WelcomeScreen />);

    screen.getByText('Private & Secure');
    screen.getByText('Data stays on your device');
  });

  it('renders "Works Offline" feature', () => {
    render(<WelcomeScreen />);

    screen.getByText('Works Offline');
    screen.getByText('No internet required');
  });

  it('renders "Lightning Fast" feature', () => {
    render(<WelcomeScreen />);

    screen.getByText('Lightning Fast');
    screen.getByText('Fill forms in seconds');
  });
});

// ── Supported countries ───────────────────────────────────────────────────────

describe('WelcomeScreen — supported countries', () => {
  it('renders "Supported Countries" heading', () => {
    render(<WelcomeScreen />);

    screen.getByText('Supported Countries');
  });

  it('renders country flag for each supported country', () => {
    render(<WelcomeScreen />);

    screen.getByTestId('country-flag-JPN');
    screen.getByTestId('country-flag-MYS');
    screen.getByTestId('country-flag-SGP');
    screen.getByTestId('country-flag-THA');
    screen.getByTestId('country-flag-VNM');
    screen.getByTestId('country-flag-GBR');
    screen.getByTestId('country-flag-USA');
    screen.getByTestId('country-flag-CAN');
    screen.getByTestId('country-flag-AUS');
    screen.getByTestId('country-flag-NZL');
    screen.getByTestId('country-flag-KOR');
    screen.getByTestId('country-flag-IND');
    screen.getByTestId('country-flag-IDN');
    screen.getByTestId('country-flag-PHL');
  });

  it('renders country names for all supported countries', () => {
    render(<WelcomeScreen />);

    screen.getByText('Japan');
    screen.getByText('Malaysia');
    screen.getByText('Singapore');
    screen.getByText('Thailand');
    screen.getByText('Vietnam');
    screen.getByText('UK');
    screen.getByText('USA');
    screen.getByText('Canada');
    screen.getByText('Australia');
    screen.getByText('New Zealand');
    screen.getByText('South Korea');
    screen.getByText('India');
    screen.getByText('Indonesia');
    screen.getByText('Philippines');
  });
});

// ── Privacy notice ────────────────────────────────────────────────────────────

describe('WelcomeScreen — privacy notice', () => {
  it('renders "Privacy First" heading', () => {
    render(<WelcomeScreen />);

    screen.getByText('Privacy First');
  });

  it('renders privacy description about encrypted keychain storage', () => {
    render(<WelcomeScreen />);

    screen.getByText(/encrypted and stored only in your device/);
  });
});

// ── Navigation buttons ────────────────────────────────────────────────────────

describe('WelcomeScreen — navigation', () => {
  it('renders "Get Started" button', () => {
    render(<WelcomeScreen />);

    screen.getByTestId('take-tutorial-button');
  });

  it('pressing "Get Started" navigates to PassportScan screen', () => {
    render(<WelcomeScreen />);

    fireEvent.press(screen.getByTestId('take-tutorial-button'));

    expect(mockNavigate).toHaveBeenCalledWith('PassportScan');
  });

  it('renders "Restore from Backup" button', () => {
    render(<WelcomeScreen />);

    screen.getByTestId('skip-tutorial-button');
  });

  it('pressing "Restore from Backup" navigates to RestoreBackup screen', () => {
    render(<WelcomeScreen />);

    fireEvent.press(screen.getByTestId('skip-tutorial-button'));

    expect(mockNavigate).toHaveBeenCalledWith('RestoreBackup');
  });

  it('renders "Restore from backup" link', () => {
    render(<WelcomeScreen />);

    screen.getByTestId('restore-backup-link-button');
  });

  it('pressing "Restore from backup" navigates to RestoreBackup screen', () => {
    render(<WelcomeScreen />);

    fireEvent.press(screen.getByTestId('restore-backup-link-button'));

    expect(mockNavigate).toHaveBeenCalledWith('RestoreBackup');
  });
});
