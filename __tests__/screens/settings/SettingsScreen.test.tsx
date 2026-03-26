import { render, fireEvent, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
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

jest.mock('@/components/settings/DataManagementCard', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    DataManagementCard: ({ onExportData, onRestoreBackup, onClearCache, onDeleteAllData }: any) => (
      <View testID="data-management-card">
        <Text>Data Management</Text>
        <TouchableOpacity testID="export-data-button" onPress={onExportData}><Text>Export</Text></TouchableOpacity>
        <TouchableOpacity testID="restore-backup-button" onPress={onRestoreBackup}><Text>Restore</Text></TouchableOpacity>
        <TouchableOpacity testID="clear-cache-button" onPress={onClearCache}><Text>Clear Cache</Text></TouchableOpacity>
        <TouchableOpacity testID="delete-all-data-button" onPress={onDeleteAllData}><Text>Delete All</Text></TouchableOpacity>
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
    Select: ({ label, options, value, onValueChange, testID }: any) => {
      const { View: V, Text: T, TouchableOpacity: TO } = require('react-native');
      return (
        <V testID={testID}>
          <T>{label}</T>
          {options.map((opt: any) => (
            <TO
              key={opt.value}
              testID={`${testID}-option-${opt.value}`}
              onPress={() => onValueChange(opt.value)}
            >
              <T>{opt.label}</T>
            </TO>
          ))}
          <T testID={`${testID}-value`}>{value}</T>
        </V>
      );
    },
    SelectOption: {},
    StatusBadge: ({ text, testID }: any) => <Text testID={testID}>{text}</Text>,
    Divider: ({ text }: any) => <View>{text ? <Text>{text}</Text> : null}</View>,
    LoadingSpinner: ({ text }: any) => <Text>{text ?? 'Loading...'}</Text>,
    ActivityIndicator: () => <View testID="activity-indicator" />,
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
    theme: 'system',
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
  theme: 'system',
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

describe('SettingsScreen — App Lock section', () => {
  const { keychainService } = require('@/services/storage'); // eslint-disable-line @typescript-eslint/no-require-imports

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the App Lock card when biometric is available', () => {
    setupMocks({ isBiometricAvailable: true });
    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId('app-lock-card')).toBeTruthy();
  });

  it('shows the toggle when biometric is available', () => {
    setupMocks({ isBiometricAvailable: true });
    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId('app-lock-toggle')).toBeTruthy();
  });

  it('toggle reflects isLockEnabled=false from store', () => {
    setupMocks({ isBiometricAvailable: true, isLockEnabled: false });
    const { getByTestId } = render(<SettingsScreen />);
    const toggle = getByTestId('app-lock-toggle');
    // value is false → accessibilityState.checked is false
    expect(toggle.props.accessibilityState.checked).toBe(false);
  });

  it('toggle reflects isLockEnabled=true from store', () => {
    setupMocks({ isBiometricAvailable: true, isLockEnabled: true });
    const { getByTestId } = render(<SettingsScreen />);
    const toggle = getByTestId('app-lock-toggle');
    expect(toggle.props.accessibilityState.checked).toBe(true);
  });

  it('calls setLockEnabled(true) directly when enabling lock (no auth needed)', async () => {
    const setLockEnabled = jest.fn();
    setupMocks({ isBiometricAvailable: true, isLockEnabled: false, setLockEnabled });
    const { getByTestId } = render(<SettingsScreen />);
    const toggle = getByTestId('app-lock-toggle');

    await act(async () => {
      fireEvent.press(toggle);
    });

    expect(setLockEnabled).toHaveBeenCalledWith(true);
  });

  it('triggers biometric auth when disabling lock', async () => {
    keychainService.authenticateWithBiometric.mockResolvedValue(true);

    const setLockEnabled = jest.fn();
    setupMocks({ isBiometricAvailable: true, isLockEnabled: true, setLockEnabled });
    const { getByTestId } = render(<SettingsScreen />);
    const toggle = getByTestId('app-lock-toggle');

    await act(async () => {
      fireEvent.press(toggle);
    });

    expect(keychainService.authenticateWithBiometric).toHaveBeenCalledWith(
      'borderly_lock_check',
      expect.objectContaining({
        title: 'Confirm Disable App Lock',
      }),
    );
    expect(setLockEnabled).toHaveBeenCalledWith(false);
  });

  it('does NOT disable lock if biometric auth fails', async () => {
    keychainService.authenticateWithBiometric.mockResolvedValue(false);

    const setLockEnabled = jest.fn();
    setupMocks({ isBiometricAvailable: true, isLockEnabled: true, setLockEnabled });
    const { getByTestId } = render(<SettingsScreen />);
    const toggle = getByTestId('app-lock-toggle');

    await act(async () => {
      fireEvent.press(toggle);
    });

    // When auth returns false, Alert fallback is shown instead of directly disabling
    expect(setLockEnabled).not.toHaveBeenCalledWith(false);
  });

  it('shows Alert confirmation when biometric auth returns false', async () => {
    keychainService.authenticateWithBiometric.mockResolvedValue(false);

    const alertSpy = jest.spyOn(Alert, 'alert');
    const setLockEnabled = jest.fn();
    setupMocks({ isBiometricAvailable: true, isLockEnabled: true, setLockEnabled });
    const { getByTestId } = render(<SettingsScreen />);
    const toggle = getByTestId('app-lock-toggle');

    await act(async () => {
      fireEvent.press(toggle);
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Disable App Lock',
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Disable' }),
      ]),
    );
  });

  it('shows timeout select when lock is enabled', () => {
    setupMocks({ isBiometricAvailable: true, isLockEnabled: true, lockTimeoutMinutes: 5 });
    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId('app-lock-timeout-section')).toBeTruthy();
    expect(getByTestId('app-lock-timeout-select')).toBeTruthy();
  });

  it('hides timeout select when lock is disabled', () => {
    setupMocks({ isBiometricAvailable: true, isLockEnabled: false });
    const { queryByTestId } = render(<SettingsScreen />);
    expect(queryByTestId('app-lock-timeout-section')).toBeNull();
  });

  it('displays all four timeout options', () => {
    setupMocks({ isBiometricAvailable: true, isLockEnabled: true, lockTimeoutMinutes: 5 });
    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId('app-lock-timeout-select-option-1')).toBeTruthy();
    expect(getByTestId('app-lock-timeout-select-option-5')).toBeTruthy();
    expect(getByTestId('app-lock-timeout-select-option-15')).toBeTruthy();
    expect(getByTestId('app-lock-timeout-select-option-30')).toBeTruthy();
  });

  it('calls setLockTimeoutMinutes with selected minute value', async () => {
    const setLockTimeoutMinutes = jest.fn();
    setupMocks({
      isBiometricAvailable: true,
      isLockEnabled: true,
      lockTimeoutMinutes: 5,
      setLockTimeoutMinutes,
    });
    const { getByTestId } = render(<SettingsScreen />);

    await act(async () => {
      fireEvent.press(getByTestId('app-lock-timeout-select-option-15'));
    });

    expect(setLockTimeoutMinutes).toHaveBeenCalledWith(15);
  });

  it('shows current timeout value in select', () => {
    setupMocks({ isBiometricAvailable: true, isLockEnabled: true, lockTimeoutMinutes: 30 });
    const { getByTestId } = render(<SettingsScreen />);
    const valueEl = getByTestId('app-lock-timeout-select-value');
    expect(valueEl.props.children).toBe('30');
  });

  it('hides lock controls and shows unavailable message when biometric is not available', () => {
    setupMocks({ isBiometricAvailable: false });
    const { getByTestId, queryByTestId } = render(<SettingsScreen />);
    expect(getByTestId('app-lock-unavailable')).toBeTruthy();
    expect(queryByTestId('app-lock-toggle')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Rendering — all settings sections
// ---------------------------------------------------------------------------

describe('SettingsScreen — section rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  it('renders the Settings header', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('Settings')).toBeTruthy();
    expect(getByText('App preferences and data management')).toBeTruthy();
  });

  it('renders Security & Privacy section', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('Security & Privacy')).toBeTruthy();
    expect(getByText('Biometric Authentication')).toBeTruthy();
  });

  it('renders Appearance & Language section', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('Appearance & Language')).toBeTruthy();
    expect(getByText('Theme')).toBeTruthy();
  });

  it('renders Analytics & Diagnostics section', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('Analytics & Diagnostics')).toBeTruthy();
    expect(getByText('Anonymous Analytics')).toBeTruthy();
    expect(getByText('Crash Reporting')).toBeTruthy();
  });

  it('renders Form Data section', () => {
    const { getByTestId, getByText } = render(<SettingsScreen />);
    expect(getByTestId('form-data-card')).toBeTruthy();
    expect(getByText('Form Data')).toBeTruthy();
  });

  it('renders App Information section with version', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('App Information')).toBeTruthy();
    expect(getByText('1.0.0 (MVP)')).toBeTruthy();
  });

  it('renders supported countries in App Information', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('Japan • Malaysia • Singapore')).toBeTruthy();
  });

  it('renders Quick Actions section', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('Quick Actions')).toBeTruthy();
    expect(getByText('Refresh')).toBeTruthy();
    expect(getByText('Reset')).toBeTruthy();
  });

  it('renders Help & Support section', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('Help & Support')).toBeTruthy();
    expect(getByText('Help & FAQ')).toBeTruthy();
    expect(getByText('Send Feedback')).toBeTruthy();
    expect(getByText('Privacy Policy')).toBeTruthy();
  });

  it('renders Notification Preferences row', () => {
    const { getByTestId, getByText } = render(<SettingsScreen />);
    expect(getByTestId('notification-preferences-row')).toBeTruthy();
    expect(getByText('Notification Preferences')).toBeTruthy();
    expect(getByText('Deadline reminders, timing, quiet hours')).toBeTruthy();
  });

  it('renders Local-First Privacy info', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('Local-First Privacy')).toBeTruthy();
    expect(getByText('Your data never leaves this device unless you explicitly share it.')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

describe('SettingsScreen — theme', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  it('renders ThemeSelector component', () => {
    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId('theme-selector')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Biometric security badge
// ---------------------------------------------------------------------------

describe('SettingsScreen — security badge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows "Protected" badge when biometric is enabled', () => {
    setupMocks({ preferences: { ...DEFAULT_APP_STORE.preferences, biometricEnabled: true } });
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('Protected')).toBeTruthy();
  });

  it('shows "Basic" badge when biometric is disabled', () => {
    setupMocks({ preferences: { ...DEFAULT_APP_STORE.preferences, biometricEnabled: false } });
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('Basic')).toBeTruthy();
  });

  it('shows "Enhanced Security Active" message when biometric enabled', () => {
    setupMocks({ preferences: { ...DEFAULT_APP_STORE.preferences, biometricEnabled: true } });
    const { getByText } = render(<SettingsScreen />);
    expect(getByText(/Enhanced Security Active/)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Navigation interactions
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

  it('Help & FAQ button navigates to Help', () => {
    const { getByText } = render(<SettingsScreen />);
    fireEvent.press(getByText('Help & FAQ'));
    expect(mockNavigate).toHaveBeenCalledWith('Help');
  });

  it('Privacy Policy button navigates to PrivacyPolicy', () => {
    const { getByText } = render(<SettingsScreen />);
    fireEvent.press(getByText('Privacy Policy'));
    expect(mockNavigate).toHaveBeenCalledWith('PrivacyPolicy');
  });

  it('Send Feedback button navigates to Feedback', () => {
    const { getByText } = render(<SettingsScreen />);
    fireEvent.press(getByText('Send Feedback'));
    expect(mockNavigate).toHaveBeenCalledWith('Feedback');
  });

  it('Report Bug button navigates to BugReport', () => {
    const { getByText } = render(<SettingsScreen />);
    fireEvent.press(getByText('Report Bug'));
    expect(mockNavigate).toHaveBeenCalledWith('BugReport');
  });
});

// ---------------------------------------------------------------------------
// Form Data / Schema refresh
// ---------------------------------------------------------------------------

describe('SettingsScreen — form data', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  it('shows "No schema data available yet" when no schemas exist', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('No schema data available yet.')).toBeTruthy();
  });

  it('renders refresh schemas button', () => {
    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId('refresh-schemas-button')).toBeTruthy();
  });
});
