/**
 * Unit tests for ConfirmProfileScreen.
 *
 * Covers profile field rendering, loading state, missing profile state,
 * navigation (continue, edit, go back), and security notice.
 */
import { render, screen, fireEvent } from '@testing-library/react-native';
import ConfirmProfileScreen from '@/screens/onboarding/ConfirmProfileScreen/ConfirmProfileScreen';

// ── Mock return values (module-level stable references) ───────────────────────

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = { navigate: mockNavigate, goBack: mockGoBack };
const mockLoadProfile = jest.fn();
const mockSetOnboardingComplete = jest.fn();

const mockProfile = {
  passportNumber: 'L12345678',
  givenNames: 'JOHN',
  surname: 'SMITH',
  nationality: 'USA',
  dateOfBirth: '1990-01-15',
  gender: 'M',
  passportExpiry: '2030-06-20',
  issuingCountry: 'USA',
};

interface MockStoreReturn {
  profile: typeof mockProfile | null;
  loadProfile: jest.Mock;
  isLoading: boolean;
  setOnboardingComplete: jest.Mock;
}

let mockStoreReturn: MockStoreReturn = {
  profile: mockProfile,
  loadProfile: mockLoadProfile,
  isLoading: false,
  setOnboardingComplete: mockSetOnboardingComplete,
};

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

jest.mock('../../../src/stores/useProfileStore', () => ({
  useProfileStore: () => mockStoreReturn,
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const Icon = ({ testID }: { testID?: string }) => React.createElement('View', { testID });
  return {
    BookOpen: Icon,
    User: Icon,
    Globe: Icon,
    CalendarDays: Icon,
    Users: Icon,
    CalendarClock: Icon,
    Building2: Icon,
    ShieldCheck: Icon,
    Lock: Icon,
    CircleAlert: Icon,
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
    ProgressBar: ({ progress }: { progress: number }) =>
      React.createElement('View', { testID: 'progress-bar', accessibilityLabel: `Progress: ${progress}%` }),
    ScreenContainer: ({ children, ...props }: any) =>
      React.createElement('View', props, children),
  };
});

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockStoreReturn = {
    profile: mockProfile,
    loadProfile: mockLoadProfile,
    isLoading: false,
    setOnboardingComplete: mockSetOnboardingComplete,
  };
});

// ── Profile fields rendering ──────────────────────────────────────────────────

describe('ConfirmProfileScreen — profile fields', () => {
  it('renders "Confirm Your Profile" title', () => {
    render(<ConfirmProfileScreen />);

    screen.getByText('Confirm Your Profile');
  });

  it('renders passport number', () => {
    render(<ConfirmProfileScreen />);

    screen.getByTestId('profile-field-passport-number');
    screen.getByText('L12345678');
  });

  it('renders full name (givenNames + surname)', () => {
    render(<ConfirmProfileScreen />);

    screen.getByTestId('profile-field-full-name');
    screen.getByText('JOHN SMITH');
  });

  it('renders nationality', () => {
    render(<ConfirmProfileScreen />);

    const nationalityField = screen.getByTestId('profile-field-nationality');
    expect(nationalityField.children).toContain('USA');
  });

  it('renders date of birth', () => {
    render(<ConfirmProfileScreen />);

    screen.getByTestId('profile-field-date-of-birth');
    screen.getByText('1990-01-15');
  });

  it('renders gender as "Male" for gender "M"', () => {
    render(<ConfirmProfileScreen />);

    screen.getByTestId('profile-field-gender');
    screen.getByText('Male');
  });

  it('renders gender as "Female" for gender "F"', () => {
    mockStoreReturn = {
      ...mockStoreReturn,
      profile: { ...mockProfile, gender: 'F' },
    };

    render(<ConfirmProfileScreen />);

    screen.getByText('Female');
  });

  it('renders gender as "Other" for non-M/F gender', () => {
    mockStoreReturn = {
      ...mockStoreReturn,
      profile: { ...mockProfile, gender: 'X' },
    };

    render(<ConfirmProfileScreen />);

    screen.getByText('Other');
  });

  it('renders passport expiry', () => {
    render(<ConfirmProfileScreen />);

    screen.getByTestId('profile-field-passport-expiry');
    screen.getByText('2030-06-20');
  });

  it('renders issuing country', () => {
    render(<ConfirmProfileScreen />);

    screen.getByTestId('profile-field-issuing-country');
  });

  it('renders progress bar', () => {
    render(<ConfirmProfileScreen />);

    screen.getByTestId('progress-bar');
  });
});

// ── Security notice ───────────────────────────────────────────────────────────

describe('ConfirmProfileScreen — security notice', () => {
  it('renders "Security Notice" heading', () => {
    render(<ConfirmProfileScreen />);

    screen.getByText('Security Notice');
  });

  it('renders security description about local keychain storage', () => {
    render(<ConfirmProfileScreen />);

    screen.getByText(/stored securely on your device/);
  });

  it('renders security badges (Encrypted, Local Storage, No Server)', () => {
    render(<ConfirmProfileScreen />);

    screen.getByText('Encrypted');
    screen.getByText('Local Storage');
    screen.getByText('No Server');
  });
});

// ── Navigation ────────────────────────────────────────────────────────────────

describe('ConfirmProfileScreen — navigation', () => {
  it('renders "Continue" button', () => {
    render(<ConfirmProfileScreen />);

    screen.getByTestId('continue-to-security-button');
  });

  it('pressing "Continue" completes onboarding', () => {
    render(<ConfirmProfileScreen />);

    fireEvent.press(screen.getByTestId('continue-to-security-button'));

    expect(mockSetOnboardingComplete).toHaveBeenCalledWith(true);
  });

  it('renders "Edit Information" button', () => {
    render(<ConfirmProfileScreen />);

    screen.getByTestId('edit-information-button');
  });

  it('pressing "Edit Information" calls goBack', () => {
    render(<ConfirmProfileScreen />);

    fireEvent.press(screen.getByTestId('edit-information-button'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});

// ── Loading state ─────────────────────────────────────────────────────────────

describe('ConfirmProfileScreen — loading state', () => {
  it('shows loading text when isLoading is true', () => {
    mockStoreReturn = { ...mockStoreReturn, isLoading: true };

    render(<ConfirmProfileScreen />);

    screen.getByText('Loading profile...');
    screen.getByText('Retrieving your secure data');
  });

  it('does not render profile fields when loading', () => {
    mockStoreReturn = { ...mockStoreReturn, isLoading: true };

    render(<ConfirmProfileScreen />);

    expect(screen.queryByText('Confirm Your Profile')).toBeNull();
  });
});

// ── No profile state ──────────────────────────────────────────────────────────

describe('ConfirmProfileScreen — no profile', () => {
  beforeEach(() => {
    mockStoreReturn = { ...mockStoreReturn, profile: null };
  });

  it('shows "No Profile Found" when profile is null', () => {
    render(<ConfirmProfileScreen />);

    screen.getByText('No Profile Found');
  });

  it('shows explanation text', () => {
    render(<ConfirmProfileScreen />);

    screen.getByText(/couldn't find your profile data/);
  });

  it('renders "Go Back" button', () => {
    render(<ConfirmProfileScreen />);

    screen.getByTestId('confirm-go-back-button');
  });

  it('pressing "Go Back" calls goBack', () => {
    render(<ConfirmProfileScreen />);

    fireEvent.press(screen.getByTestId('confirm-go-back-button'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});

// ── Lifecycle ─────────────────────────────────────────────────────────────────

describe('ConfirmProfileScreen — lifecycle', () => {
  it('calls loadProfile on mount', () => {
    render(<ConfirmProfileScreen />);

    expect(mockLoadProfile).toHaveBeenCalledTimes(1);
  });
});
