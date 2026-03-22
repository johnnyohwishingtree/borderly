import { render, fireEvent, act } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useProfileStore } from '@/stores/useProfileStore';
import { useAppStore } from '@/stores/useAppStore';
import ProfileScreen from '@/screens/profile/ProfileScreen/ProfileScreen';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('@/stores/useProfileStore', () => ({
  useProfileStore: jest.fn(),
}));

jest.mock('@/stores/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

jest.mock('@/components/ui', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    Button: ({ title, onPress, testID }: any) => (
      <TouchableOpacity onPress={onPress} testID={testID}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
    Card: ({ children }: any) => <View>{children}</View>,
    StatusBadge: ({ text }: any) => {
      const { Text: RNText } = require('react-native');
      return <RNText>{text}</RNText>;
    },
    Divider: () => <View />,
    ProgressBar: ({ progress }: any) => <View testID="progress-bar" accessibilityValue={{ now: progress }} />,
    LoadingSpinner: ({ text }: any) => {
      const { Text: RNText } = require('react-native');
      return <RNText>{text}</RNText>;
    },
    EmptyState: ({ title }: any) => {
      const { Text: RNText } = require('react-native');
      return <RNText>{title}</RNText>;
    },
  };
});

jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  return {
    TriangleAlert: () => <View testID="icon-triangle-alert" />,
    Lock: () => <View testID="icon-lock" />,
    User: () => <View testID="icon-user" />,
    ChevronRight: () => <View testID="icon-chevron-right" />,
  };
});

const mockNavigate = jest.fn();

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
  occupation: 'Engineer',
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

function makeFamilyProfiles(size: number) {
  const profiles = new Map<string, any>();
  for (let i = 0; i < size; i++) {
    profiles.set(`profile-${i}`, {
      id: `profile-${i}`,
      relationship: i === 0 ? 'self' : 'spouse',
      isPrimary: i === 0,
      isActive: true,
      biometricEnabled: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      nickname: `Member ${i}`,
    });
  }
  return {
    profiles,
    primaryProfileId: 'profile-0',
    maxProfiles: 8,
    version: 1,
    lastModified: '2026-01-01T00:00:00Z',
  };
}

function setupMocks(overrides: { familySize?: number; profile?: any; isLoading?: boolean; error?: string | null } = {}) {
  (useNavigation as unknown as jest.Mock).mockReturnValue({ navigate: mockNavigate });
  (useAppStore as unknown as jest.Mock).mockReturnValue({
    preferences: { biometricEnabled: false },
  });
  (useProfileStore as unknown as jest.Mock).mockReturnValue({
    profile: 'profile' in overrides ? overrides.profile : DEFAULT_PROFILE,
    familyProfiles: makeFamilyProfiles(overrides.familySize ?? 1),
    loadProfile: jest.fn(),
    isLoading: overrides.isLoading ?? false,
    error: overrides.error ?? null,
  });
}

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Family Members section', () => {
    it('shows a single tappable summary row (not two navigation buttons)', () => {
      setupMocks({ familySize: 1 });
      const { getByTestId, queryByTestId } = render(<ProfileScreen />);

      // Single summary row present
      expect(getByTestId('family-summary-row')).toBeTruthy();

      // Old duplicate buttons should be gone
      expect(queryByTestId('manage-family-button')).toBeNull();
      expect(queryByTestId('add-family-member-button')).toBeNull();
    });

    it('displays "1 family member" when there is exactly one profile', () => {
      setupMocks({ familySize: 1 });
      const { getByText } = render(<ProfileScreen />);
      expect(getByText('1 family member')).toBeTruthy();
    });

    it('displays plural count when there are multiple profiles', () => {
      setupMocks({ familySize: 3 });
      const { getByText } = render(<ProfileScreen />);
      expect(getByText('3 family members')).toBeTruthy();
    });

    it('navigates to FamilyManagement when summary row is tapped', () => {
      setupMocks({ familySize: 2 });
      const { getByTestId } = render(<ProfileScreen />);
      fireEvent.press(getByTestId('family-summary-row'));
      expect(mockNavigate).toHaveBeenCalledWith('FamilyManagement');
    });

    it('chevron icon is present in the summary row', () => {
      setupMocks({ familySize: 1 });
      const { getByTestId } = render(<ProfileScreen />);
      expect(getByTestId('icon-chevron-right')).toBeTruthy();
    });
  });

  describe('handleUnlockProfile — biometric unlock', () => {
    it('reads fresh profile from store and sets isUnlocked=true after biometric unlock', async () => {
      const loadedProfile = { ...DEFAULT_PROFILE, passportNumber: 'XY9876543' };

      (useNavigation as unknown as jest.Mock).mockReturnValue({ navigate: mockNavigate });
      (useAppStore as unknown as jest.Mock).mockReturnValue({
        preferences: { biometricEnabled: true },
      });

      const mockLoadProfile = jest.fn().mockResolvedValue(undefined);
      // Hook returns stale closure value (profile before loadProfile ran)
      (useProfileStore as unknown as jest.Mock).mockReturnValue({
        profile: DEFAULT_PROFILE,
        familyProfiles: makeFamilyProfiles(1),
        loadProfile: jest.fn(),
        isLoading: false,
        error: null,
      });
      // getState() returns the fresh data that loadProfile populates
      (useProfileStore as any).getState = jest.fn().mockReturnValue({
        loadProfile: mockLoadProfile,
        profile: loadedProfile,
      });

      const { getByTestId, getByText, queryByTestId } = render(<ProfileScreen />);

      // Unlock button is visible before authentication
      expect(getByTestId('unlock-biometrics-button')).toBeTruthy();

      await act(async () => {
        fireEvent.press(getByTestId('unlock-biometrics-button'));
      });

      // loadProfile was called via getState()
      expect(mockLoadProfile).toHaveBeenCalled();

      // The freshly-loaded passport number (from getState().profile) is now displayed
      expect(getByText('XY9876543')).toBeTruthy();

      // The unlock button is no longer shown (isUnlocked is true)
      expect(queryByTestId('unlock-biometrics-button')).toBeNull();
    });
  });

  describe('loading and error states', () => {
    it('shows a loading spinner when isLoading is true', () => {
      setupMocks({ profile: null, familySize: 0, isLoading: true });
      const { getByText } = render(<ProfileScreen />);
      expect(getByText('Loading your profile...')).toBeTruthy();
    });

    it('shows an error state when error is set', () => {
      setupMocks({ profile: null, familySize: 0, error: 'Failed to load' });
      const { getByText } = render(<ProfileScreen />);
      expect(getByText('Unable to load profile')).toBeTruthy();
    });

    it('shows an empty state when profile is null', () => {
      setupMocks({ profile: null, familySize: 0 });
      const { getByText } = render(<ProfileScreen />);
      expect(getByText('No Profile Found')).toBeTruthy();
    });
  });
});
