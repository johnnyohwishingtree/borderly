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
    ChevronDown: Icon,
    ChevronUp: Icon,
  };
});

jest.mock('../../../src/components/ui', () => {
  const React = require('react');
  return {
    Button: ({ title, onPress, testID }: { title: string; onPress?: () => void; testID?: string }) =>
      React.createElement('TouchableOpacity', { onPress, testID },
        React.createElement('Text', null, title)),
    Card: ({ children, ...props }: any) =>
      React.createElement('View', props, children),
    ProgressBar: ({ accessibilityLabel, className }: { progress: number; accessibilityLabel?: string; className?: string }) =>
      React.createElement('View', { testID: 'progress-bar', accessibilityLabel, className }),
    ScreenContainer: ({ children, ...props }: any) =>
      React.createElement('View', props, children),
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
  it('shows country count in collapsed state by default', () => {
    render(<WelcomeScreen />);

    screen.getByText(/\d+ Countries Supported/);
  });

  it('does not show individual country flags when collapsed', () => {
    render(<WelcomeScreen />);

    expect(screen.queryByTestId('country-flag-JPN')).toBeNull();
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
