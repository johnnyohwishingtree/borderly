import { render, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '@/stores/useAppStore';
import { useProfileStore } from '@/stores/useProfileStore';
import SettingsScreen from '@/screens/settings/SettingsScreen/SettingsScreen';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('@/stores/useAppStore', () => ({
  useAppStore: jest.fn(),
}));

jest.mock('@/stores/useProfileStore', () => ({
  useProfileStore: jest.fn(),
}));

jest.mock('@/services/storage', () => ({
  keychainService: {
    isAvailable: jest.fn().mockResolvedValue(true),
    getPortalCredentialsForProfile: jest.fn().mockResolvedValue([]),
    deletePortalCredential: jest.fn().mockResolvedValue(undefined),
    deleteAllPortalCredentialsForProfile: jest.fn().mockResolvedValue(undefined),
    authenticateWithBiometric: jest.fn().mockResolvedValue(false),
  },
  exportUserData: jest.fn().mockResolvedValue(undefined),
  deleteAllData: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/services/schemas/schemaRegistry', () => ({
  schemaRegistry: {
    getSchemaMetadata: jest.fn().mockReturnValue([]),
    reset: jest.fn(),
    initialize: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/services/schemas/schemaUpdateService', () => ({
  schemaUpdateService: {
    checkForUpdates: jest.fn().mockResolvedValue({ updated: [], failed: [] }),
  },
}));

jest.mock('@/utils/countryUtils', () => ({
  getPortalName: jest.fn((code: string) => `Portal ${code}`),
}));

jest.mock('@/constants/countries', () => ({
  SUPPORTED_COUNTRIES: [
    { code: 'JPN', name: 'Japan' },
    { code: 'MYS', name: 'Malaysia' },
    { code: 'SGP', name: 'Singapore' },
  ],
}));

jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  return {
    Lock: () => <View testID="icon-lock" />,
    Unlock: () => <View testID="icon-unlock" />,
    Bell: () => <View testID="icon-bell" />,
    ChevronRight: () => <View testID="icon-chevron-right" />,
  };
});

jest.mock('@/components/settings/ThemeSelector', () => {
  const { View } = require('react-native');
  return () => <View testID="theme-selector" />;
});

jest.mock('@/components/settings/PortalAccountsCard', () => {
  const { View, Text } = require('react-native');
  return {
    PortalAccountsCard: ({ portalCredentials }: any) => (
      <View testID="portal-accounts-card">
        <Text>Portal Accounts</Text>
        {portalCredentials?.map((c: any) => (
          <Text key={c.id} testID={`portal-cred-${c.id}`}>{c.portalName}</Text>
        ))}
      </View>
    ),
  };
});

jest.mock('@/components/ui', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    ScreenContainer: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    Button: ({ title, onPress, testID, disabled }: any) => (
      <TouchableOpacity onPress={onPress} testID={testID} disabled={disabled}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
    Card: ({ children, testID }: any) => <View testID={testID}>{children}</View>,
    Toggle: ({ value, onValueChange, testID, disabled }: any) => {
      const { Pressable: P } = require('react-native');
      return (
        <P
          value={value}
          onPress={() => !disabled && onValueChange(!value)}
          testID={testID}
          accessibilityState={{ checked: value }}
        />
      );
    },
    StatusBadge: ({ text, testID }: any) => <Text testID={testID}>{text}</Text>,
    Divider: ({ text }: any) => <View>{text ? <Text>{text}</Text> : null}</View>,
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockNavigate = jest.fn();

function makeDefaultFamilyProfiles() {
  const profiles = new Map<string, any>();
  profiles.set('profile-1', {
    id: 'profile-1',
    relationship: 'self',
    isPrimary: true,
    isActive: true,
    biometricEnabled: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    nickname: 'Me',
  });
  return {
    profiles,
    primaryProfileId: 'profile-1',
    maxProfiles: 8,
    version: 1,
    lastModified: '2026-01-01T00:00:00Z',
  };
}

const DEFAULT_APP_STORE = {
  preferences: {
    theme: 'light',
    language: 'en',
    biometricEnabled: false,
    analyticsEnabled: false,
    crashReportingEnabled: false,
    onboardingComplete: true,
    lastSchemaUpdateCheck: '',
    family_profiles: '',
    current_profile_id: '',
  },
  updatePreference: jest.fn(),
  loadPreferences: jest.fn(),
  resetPreferences: jest.fn(),
  isBiometricAvailable: true,
  setBiometricAvailable: jest.fn(),
  clearCache: jest.fn(),
  triggerSchemaUpdateCheck: jest.fn().mockResolvedValue(true),
  theme: 'light',
  setTheme: jest.fn(),
  isLockEnabled: false,
  setLockEnabled: jest.fn(),
  lockTimeoutMinutes: 5,
  setLockTimeoutMinutes: jest.fn(),
};

const DEFAULT_PROFILE_STORE = {
  familyProfiles: makeDefaultFamilyProfiles(),
  setOnboardingComplete: jest.fn(),
};

function setupMocks(
  appStoreOverrides: Partial<typeof DEFAULT_APP_STORE> = {},
  profileStoreOverrides: Partial<typeof DEFAULT_PROFILE_STORE> = {},
) {
  (useNavigation as unknown as jest.Mock).mockReturnValue({ navigate: mockNavigate });
  (useAppStore as unknown as jest.Mock).mockReturnValue({
    ...DEFAULT_APP_STORE,
    ...appStoreOverrides,
  });
  (useProfileStore as unknown as jest.Mock).mockReturnValue({
    ...DEFAULT_PROFILE_STORE,
    ...profileStoreOverrides,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SettingsScreen — section rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  it('renders the Settings subtitle', () => {
    const { getByText } = render(<SettingsScreen />);
    getByText('App preferences and data management');
  });

  it('renders Security & Privacy section', () => {
    const { getByText } = render(<SettingsScreen />);
    getByText('Security & Privacy');
    getByText('Biometric Authentication');
  });

  it('renders Appearance section with theme selector', () => {
    const { getByText, getByTestId } = render(<SettingsScreen />);
    getByText('Appearance');
    getByText('Theme');
    getByTestId('theme-selector');
  });

  it('renders App Information section with version', () => {
    const { getByText } = render(<SettingsScreen />);
    getByText('App Information');
    getByText('1.0.0 (MVP)');
  });

  it('renders supported countries', () => {
    const { getByText } = render(<SettingsScreen />);
    getByText('Japan • Malaysia • Singapore');
  });

  it('renders Help & Support section', () => {
    const { getByText } = render(<SettingsScreen />);
    getByText('Help & Support');
    getByText('Help & FAQ');
    getByText('Send Feedback');
    getByText('Privacy Policy');
  });

  it('renders Danger Zone with Delete All Data', () => {
    const { getByText } = render(<SettingsScreen />);
    getByText('Danger Zone');
    getByText('Delete All Data');
  });

  it('renders Notification Preferences row', () => {
    const { getByTestId, getByText } = render(<SettingsScreen />);
    getByTestId('notification-preferences-row');
    getByText('Notification Preferences');
  });

  it('renders Local-First Privacy info', () => {
    const { getByText } = render(<SettingsScreen />);
    getByText('Local-First Privacy');
  });

  it('does NOT render removed sections', () => {
    const { queryByText } = render(<SettingsScreen />);
    expect(queryByText('App Lock')).toBeNull();
    expect(queryByText('Form Data')).toBeNull();
    expect(queryByText('Quick Actions')).toBeNull();
    expect(queryByText('Analytics & Diagnostics')).toBeNull();
    expect(queryByText('Data Management')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Security badge
// ---------------------------------------------------------------------------

describe('SettingsScreen — security badge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows "Protected" badge when biometric is enabled', () => {
    setupMocks({ preferences: { ...DEFAULT_APP_STORE.preferences, biometricEnabled: true } });
    const { getByText } = render(<SettingsScreen />);
    getByText('Protected');
  });

  it('shows "Basic" badge when biometric is disabled', () => {
    setupMocks({ preferences: { ...DEFAULT_APP_STORE.preferences, biometricEnabled: false } });
    const { getByText } = render(<SettingsScreen />);
    getByText('Basic');
  });
});

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

describe('SettingsScreen — navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  it('notification preferences row navigates to NotificationPreferences', () => {
    const { getByTestId } = render(<SettingsScreen />);
    fireEvent.press(getByTestId('notification-preferences-row'));
    expect(mockNavigate).toHaveBeenCalledWith('NotificationPreferences');
  });

  it('Help & FAQ navigates to Help', () => {
    const { getByText } = render(<SettingsScreen />);
    fireEvent.press(getByText('Help & FAQ'));
    expect(mockNavigate).toHaveBeenCalledWith('Help');
  });

  it('Privacy Policy navigates to PrivacyPolicy', () => {
    const { getByText } = render(<SettingsScreen />);
    fireEvent.press(getByText('Privacy Policy'));
    expect(mockNavigate).toHaveBeenCalledWith('PrivacyPolicy');
  });
});
