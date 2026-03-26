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
}

let mockStoreReturn: MockStoreReturn = {
  profile: mockProfile,
  loadProfile: mockLoadProfile,
  isLoading: false,
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
  };
});

// ── Profile fields rendering ──────────────────────────────────────────────────

describe('ConfirmProfileScreen — profile fields', () => {
  it('renders "Confirm Your Profile" title', () => {
    render(<ConfirmProfileScreen />);

    expect(screen.getByText('Confirm Your Profile')).toBeTruthy();
  });

  it('renders passport number', () => {
    render(<ConfirmProfileScreen />);

    expect(screen.getByTestId('profile-field-passport-number')).toBeTruthy();
    expect(screen.getByText('L12345678')).toBeTruthy();
  });

  it('renders full name (givenNames + surname)', () => {
    render(<ConfirmProfileScreen />);

    expect(screen.getByTestId('profile-field-full-name')).toBeTruthy();
    expect(screen.getByText('JOHN SMITH')).toBeTruthy();
  });

  it('renders nationality', () => {
    render(<ConfirmProfileScreen />);

    const nationalityField = screen.getByTestId('profile-field-nationality');
    expect(nationalityField).toBeTruthy();
    expect(nationalityField.children).toContain('USA');
  });

  it('renders date of birth', () => {
    render(<ConfirmProfileScreen />);

    expect(screen.getByTestId('profile-field-date-of-birth')).toBeTruthy();
    expect(screen.getByText('1990-01-15')).toBeTruthy();
  });

  it('renders gender as "Male" for gender "M"', () => {
    render(<ConfirmProfileScreen />);

    expect(screen.getByTestId('profile-field-gender')).toBeTruthy();
    expect(screen.getByText('Male')).toBeTruthy();
  });

  it('renders gender as "Female" for gender "F"', () => {
    mockStoreReturn = {
      ...mockStoreReturn,
      profile: { ...mockProfile, gender: 'F' },
    };

    render(<ConfirmProfileScreen />);

    expect(screen.getByText('Female')).toBeTruthy();
  });

  it('renders gender as "Other" for non-M/F gender', () => {
    mockStoreReturn = {
      ...mockStoreReturn,
      profile: { ...mockProfile, gender: 'X' },
    };

    render(<ConfirmProfileScreen />);

    expect(screen.getByText('Other')).toBeTruthy();
  });

  it('renders passport expiry', () => {
    render(<ConfirmProfileScreen />);

    expect(screen.getByTestId('profile-field-passport-expiry')).toBeTruthy();
    expect(screen.getByText('2030-06-20')).toBeTruthy();
  });

  it('renders issuing country', () => {
    render(<ConfirmProfileScreen />);

    expect(screen.getByTestId('profile-field-issuing-country')).toBeTruthy();
  });

  it('renders progress bar', () => {
    render(<ConfirmProfileScreen />);

    expect(screen.getByTestId('progress-bar')).toBeTruthy();
  });
});

// ── Security notice ───────────────────────────────────────────────────────────

describe('ConfirmProfileScreen — security notice', () => {
  it('renders "Security Notice" heading', () => {
    render(<ConfirmProfileScreen />);

    expect(screen.getByText('Security Notice')).toBeTruthy();
  });

  it('renders security description about local keychain storage', () => {
    render(<ConfirmProfileScreen />);

    expect(screen.getByText(/stored securely on your device/)).toBeTruthy();
  });

  it('renders security badges (Encrypted, Local Storage, No Server)', () => {
    render(<ConfirmProfileScreen />);

    expect(screen.getByText('Encrypted')).toBeTruthy();
    expect(screen.getByText('Local Storage')).toBeTruthy();
    expect(screen.getByText('No Server')).toBeTruthy();
  });
});

// ── Navigation ────────────────────────────────────────────────────────────────

describe('ConfirmProfileScreen — navigation', () => {
  it('renders "Continue" button', () => {
    render(<ConfirmProfileScreen />);

    expect(screen.getByTestId('continue-to-security-button')).toBeTruthy();
  });

  it('pressing "Continue" navigates to AddCompanions', () => {
    render(<ConfirmProfileScreen />);

    fireEvent.press(screen.getByTestId('continue-to-security-button'));

    expect(mockNavigate).toHaveBeenCalledWith('AddCompanions');
  });

  it('renders "Edit Information" button', () => {
    render(<ConfirmProfileScreen />);

    expect(screen.getByTestId('edit-information-button')).toBeTruthy();
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

    expect(screen.getByText('Loading profile...')).toBeTruthy();
    expect(screen.getByText('Retrieving your secure data')).toBeTruthy();
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

    expect(screen.getByText('No Profile Found')).toBeTruthy();
  });

  it('shows explanation text', () => {
    render(<ConfirmProfileScreen />);

    expect(screen.getByText(/couldn't find your profile data/)).toBeTruthy();
  });

  it('renders "Go Back" button', () => {
    render(<ConfirmProfileScreen />);

    expect(screen.getByTestId('confirm-go-back-button')).toBeTruthy();
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
