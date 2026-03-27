import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-native-keychain', () => ({
  getGenericPassword: jest.fn().mockResolvedValue(false),
}));

const mockLoadPreferences = jest.fn();
const mockUpdatePreference = jest.fn();
const mockResetPreferences = jest.fn();
const mockSetBiometricAvailable = jest.fn();
const mockClearCache = jest.fn();
const mockTriggerSchemaUpdateCheck = jest.fn().mockResolvedValue(true);
const mockSetTheme = jest.fn();
const mockSetLockEnabled = jest.fn();
const mockSetLockTimeoutMinutes = jest.fn();

jest.mock('@/stores/useAppStore', () => ({
  useAppStore: jest.fn(() => ({
    preferences: { biometricEnabled: false, language: 'en' },
    updatePreference: mockUpdatePreference,
    loadPreferences: mockLoadPreferences,
    resetPreferences: mockResetPreferences,
    isBiometricAvailable: true,
    setBiometricAvailable: mockSetBiometricAvailable,
    clearCache: mockClearCache,
    triggerSchemaUpdateCheck: mockTriggerSchemaUpdateCheck,
    theme: 'system',
    setTheme: mockSetTheme,
    isLockEnabled: false,
    setLockEnabled: mockSetLockEnabled,
    lockTimeoutMinutes: 5,
    setLockTimeoutMinutes: mockSetLockTimeoutMinutes,
  })),
}));

const mockSetOnboardingComplete = jest.fn();
jest.mock('@/stores/useProfileStore', () => ({
  useProfileStore: jest.fn(() => ({
    familyProfiles: {
      primaryProfileId: 'profile-1',
      profiles: new Map([['profile-1', { id: 'profile-1' }]]),
    },
    setOnboardingComplete: mockSetOnboardingComplete,
  })),
}));

const mockIsAvailable = jest.fn().mockResolvedValue(true);
const mockGetPortalCredentialsForProfile = jest.fn().mockResolvedValue([]);
const mockDeletePortalCredential = jest.fn().mockResolvedValue(undefined);
const mockDeleteAllPortalCredentialsForProfile = jest.fn().mockResolvedValue(undefined);
const mockExportUserData = jest.fn().mockResolvedValue(undefined);
const mockDeleteAllData = jest.fn().mockResolvedValue(undefined);

jest.mock('@/services/storage', () => ({
  keychainService: {
    isAvailable: mockIsAvailable,
    getPortalCredentialsForProfile: mockGetPortalCredentialsForProfile,
    deletePortalCredential: mockDeletePortalCredential,
    deleteAllPortalCredentialsForProfile: mockDeleteAllPortalCredentialsForProfile,
  },
  exportUserData: mockExportUserData,
  deleteAllData: mockDeleteAllData,
}));

const mockGetSchemaMetadata = jest.fn().mockReturnValue([
  { countryCode: 'JPN', version: '1.0' },
]);

jest.mock('@/services/schemas/schemaRegistry', () => ({
  schemaRegistry: {
    getSchemaMetadata: mockGetSchemaMetadata,
  },
}));

jest.mock('@/utils/countryUtils', () => ({
  getPortalName: jest.fn((code: string) => `Portal ${code}`),
}));

// Import hook after all mocks are set up
import { useSettings } from '../../src/hooks/useSettings';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert');
  });

  // 1. Initial state includes all expected properties
  it('returns all expected properties', async () => {
    const { result } = renderHook(() => useSettings());

    // Store state (grouped)
    expect(result.current.preferences.values).toEqual({ biometricEnabled: false, language: 'en' });
    expect(typeof result.current.preferences.updatePreference).toBe('function');
    expect(result.current.security.isBiometricAvailable).toBe(true);
    expect(result.current.theme.themePreference).toBe('system');
    expect(typeof result.current.theme.setTheme).toBe('function');
    expect(result.current.security.isLockEnabled).toBe(false);
    expect(result.current.security.lockTimeoutMinutes).toBe(5);

    // Local state (grouped)
    expect(result.current.data.storageStats).toEqual(expect.any(Object));
    expect(result.current.portal.portalCredentials).toEqual([]);
    expect(result.current.schema.schemaMetadata).toEqual([{ countryCode: 'JPN', version: '1.0' }]);
    expect(result.current.schema.isRefreshingSchemas).toBe(false);
    expect(result.current.portal.isDeletingCredential).toBeNull();

    // Constants
    expect(result.current.options.languageOptions).toHaveLength(5);
    expect(result.current.options.lockTimeoutOptions).toHaveLength(4);

    // Handlers
    expect(typeof result.current.security.handleBiometricToggle).toBe('function');
    expect(typeof result.current.security.handleLockToggle).toBe('function');
    expect(typeof result.current.security.handleLockTimeoutChange).toBe('function');
    expect(typeof result.current.data.handleExportData).toBe('function');
    expect(typeof result.current.data.handleClearCache).toBe('function');
    expect(typeof result.current.actions.handleRefreshSettings).toBe('function');
    expect(typeof result.current.actions.handleResetSettings).toBe('function');

    // Navigation
    expect(typeof result.current.navigation).toBe('object');
  });

  // 2. Calls mount-time functions
  it('calls loadPreferences, checkBiometric, loadStorageStats, loadPortalCredentials, loadSchemaMetadata on mount', async () => {
    renderHook(() => useSettings());

    // Wait for async effects
    await act(async () => {});

    expect(mockLoadPreferences).toHaveBeenCalledWith();
    expect(mockIsAvailable).toHaveBeenCalledWith();
    expect(mockGetPortalCredentialsForProfile).toHaveBeenCalledWith('profile-1');
    expect(mockGetSchemaMetadata).toHaveBeenCalledWith();
  });

  // 3. handleBiometricToggle shows Alert when enabling
  it('handleBiometricToggle shows Alert when enabling', async () => {
    const { result } = renderHook(() => useSettings());

    await act(async () => {
      await result.current.security.handleBiometricToggle(true);
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Enable Biometric Authentication',
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Enable' }),
      ]),
    );
  });

  // 3b. handleBiometricToggle shows Alert when disabling
  it('handleBiometricToggle shows Alert when disabling', async () => {
    const { result } = renderHook(() => useSettings());

    await act(async () => {
      await result.current.security.handleBiometricToggle(false);
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Disable Biometric Authentication',
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Disable' }),
      ]),
    );
  });

  // 3c. handleBiometricToggle shows unavailable Alert when biometric not available
  it('handleBiometricToggle shows unavailable Alert when biometric not available and trying to enable', async () => {
    const { useAppStore } = require('@/stores/useAppStore');
    const biometricUnavailableState = {
      preferences: { biometricEnabled: false, language: 'en' },
      updatePreference: mockUpdatePreference,
      loadPreferences: mockLoadPreferences,
      resetPreferences: mockResetPreferences,
      isBiometricAvailable: false,
      setBiometricAvailable: mockSetBiometricAvailable,
      clearCache: mockClearCache,
      triggerSchemaUpdateCheck: mockTriggerSchemaUpdateCheck,
      theme: 'system',
      setTheme: mockSetTheme,
      isLockEnabled: false,
      setLockEnabled: mockSetLockEnabled,
      lockTimeoutMinutes: 5,
      setLockTimeoutMinutes: mockSetLockTimeoutMinutes,
    };
    useAppStore.mockReturnValue(biometricUnavailableState);

    const { result } = renderHook(() => useSettings());

    await act(async () => {
      await result.current.security.handleBiometricToggle(true);
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Biometric Authentication Unavailable',
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ text: 'OK' }),
      ]),
    );

    // Restore default mock
    useAppStore.mockReturnValue({
      preferences: { biometricEnabled: false, language: 'en' },
      updatePreference: mockUpdatePreference,
      loadPreferences: mockLoadPreferences,
      resetPreferences: mockResetPreferences,
      isBiometricAvailable: true,
      setBiometricAvailable: mockSetBiometricAvailable,
      clearCache: mockClearCache,
      triggerSchemaUpdateCheck: mockTriggerSchemaUpdateCheck,
      theme: 'system',
      setTheme: mockSetTheme,
      isLockEnabled: false,
      setLockEnabled: mockSetLockEnabled,
      lockTimeoutMinutes: 5,
      setLockTimeoutMinutes: mockSetLockTimeoutMinutes,
    });
  });

  // 4. handleLockTimeoutChange parses string to number
  it('handleLockTimeoutChange parses string to number and calls setLockTimeoutMinutes', () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.security.handleLockTimeoutChange('15');
    });

    expect(mockSetLockTimeoutMinutes).toHaveBeenCalledWith(15);
  });

  it('handleLockTimeoutChange does not call setLockTimeoutMinutes for invalid input', () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.security.handleLockTimeoutChange('abc');
    });

    expect(mockSetLockTimeoutMinutes).not.toHaveBeenCalled();
  });

  // 5. handleClearCache shows confirmation Alert
  it('handleClearCache shows confirmation Alert', () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.data.handleClearCache();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Clear Cache',
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Clear' }),
      ]),
    );
  });

  // 6. handleExportData calls exportUserData
  it('handleExportData calls exportUserData with profile IDs', async () => {
    const { result } = renderHook(() => useSettings());

    await act(async () => {
      await result.current.data.handleExportData();
    });

    expect(mockExportUserData).toHaveBeenCalledWith(['profile-1']);
  });

  // 7. handleRefreshSettings calls loadPreferences and loadStorageStats
  it('handleRefreshSettings calls loadPreferences and shows alert', () => {
    const { result } = renderHook(() => useSettings());

    // Clear calls from mount
    mockLoadPreferences.mockClear();

    act(() => {
      result.current.actions.handleRefreshSettings();
    });

    expect(mockLoadPreferences).toHaveBeenCalledWith();
    expect(Alert.alert).toHaveBeenCalledWith('Refreshed', 'Settings refreshed successfully.');
  });

  // 8. handleResetSettings shows confirmation Alert
  it('handleResetSettings shows confirmation Alert', () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.actions.handleResetSettings();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Reset Settings',
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Reset' }),
      ]),
    );
  });

  // 9. languageOptions and lockTimeoutOptions are returned
  it('returns languageOptions with expected values', () => {
    const { result } = renderHook(() => useSettings());

    expect(result.current.options.languageOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'en', label: 'English' }),
        expect.objectContaining({ value: 'ja', label: '日本語' }),
      ]),
    );
    expect(result.current.options.languageOptions.length).toBe(5);
  });

  it('returns lockTimeoutOptions with expected values', () => {
    const { result } = renderHook(() => useSettings());

    expect(result.current.options.lockTimeoutOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: '1', label: '1 minute' }),
        expect.objectContaining({ value: '5', label: '5 minutes' }),
      ]),
    );
    expect(result.current.options.lockTimeoutOptions.length).toBe(4);
  });

  // 10. storageStats is set after mount
  it('storageStats is set after mount', async () => {
    const { result } = renderHook(() => useSettings());

    // Wait for async effects
    await act(async () => {});

    expect(result.current.data.storageStats).toEqual({
      profileSize: '2.3 KB',
      tripsCount: 5,
      qrCodesCount: 3,
      cacheSize: '1.2 MB',
    });
  });
});
