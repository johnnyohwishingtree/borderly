import { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppStore } from '@/stores/useAppStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { keychainService, exportUserData, deleteAllData } from '@/services/storage';
import { schemaRegistry } from '@/services/schemas/schemaRegistry';
import type { SchemaMetadata } from '@/services/schemas/schemaRegistry';
import { getPortalName } from '@/utils/countryUtils';
import type { PortalCredential } from '@/types/submission';
import type { SettingsStackParamList } from '@/app/navigation/types';
import type { SelectOption } from '@/components/ui/Select';

type SettingsScreenNavigationProp = NativeStackNavigationProp<SettingsStackParamList, 'Settings'>;

const APP_LOCK_CHECK_SERVICE = 'borderly_lock_check';

const languageOptions: SelectOption[] = [
  { label: 'English', value: 'en' },
  { label: '日本語', value: 'ja' },
  { label: 'Bahasa Malaysia', value: 'ms' },
  { label: 'Deutsch', value: 'de' },
  { label: 'Français', value: 'fr' },
];

const lockTimeoutOptions: SelectOption[] = [
  { label: '1 minute', value: '1' },
  { label: '5 minutes', value: '5' },
  { label: '15 minutes', value: '15' },
  { label: '30 minutes', value: '30' },
];

export function useSettings() {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const {
    preferences,
    updatePreference,
    loadPreferences,
    resetPreferences,
    isBiometricAvailable,
    setBiometricAvailable,
    clearCache,
    triggerSchemaUpdateCheck,
    theme: themePreference,
    setTheme,
    isLockEnabled,
    setLockEnabled,
    lockTimeoutMinutes,
    setLockTimeoutMinutes,
  } = useAppStore();
  const { familyProfiles, setOnboardingComplete } = useProfileStore();

  const [isCheckingBiometric, setIsCheckingBiometric] = useState(false);
  const [storageStats, setStorageStats] = useState<{
    profileSize: string;
    tripsCount: number;
    qrCodesCount: number;
    cacheSize: string;
  } | null>(null);
  const [portalCredentials, setPortalCredentials] = useState<PortalCredential[]>([]);
  const [isDeletingCredential, setIsDeletingCredential] = useState<string | null>(null);
  const [schemaMetadata, setSchemaMetadata] = useState<SchemaMetadata[]>([]);
  const [isRefreshingSchemas, setIsRefreshingSchemas] = useState(false);

  const checkBiometricAvailability = useCallback(async () => {
    setIsCheckingBiometric(true);
    try {
      const available = await keychainService.isAvailable();
      setBiometricAvailable(available);
    } catch (error) {
      console.error('Failed to check biometric availability:', error);
      setBiometricAvailable(false);
    } finally {
      setIsCheckingBiometric(false);
    }
  }, [setBiometricAvailable]);

  const loadStorageStats = useCallback(async () => {
    // Mock storage stats - in real implementation, this would calculate actual storage usage
    setStorageStats({
      profileSize: '2.3 KB',
      tripsCount: 5,
      qrCodesCount: 3,
      cacheSize: '1.2 MB',
    });
  }, []);

  const loadPortalCredentials = useCallback(async () => {
    try {
      const primaryId = familyProfiles.primaryProfileId;
      if (!primaryId) return;
      const creds = await keychainService.getPortalCredentialsForProfile(primaryId);
      setPortalCredentials(creds);
    } catch (err) {
      console.error('Failed to load portal credentials:', err);
    }
  }, [familyProfiles.primaryProfileId]);

  const loadSchemaMetadata = useCallback(() => {
    try {
      const metadata = schemaRegistry.getSchemaMetadata();
      setSchemaMetadata(metadata);
    } catch {
      // Registry may not yet be initialized; silently ignore.
    }
  }, []);

  const handleRefreshSchemas = useCallback(async () => {
    setIsRefreshingSchemas(true);
    const success = await triggerSchemaUpdateCheck();
    loadSchemaMetadata();
    if (success) {
      Alert.alert('Form Data Updated', 'Country form schemas have been checked for updates.');
    } else {
      Alert.alert('Update Failed', 'Unable to check for schema updates. Please try again.');
    }
    setIsRefreshingSchemas(false);
  }, [triggerSchemaUpdateCheck, loadSchemaMetadata]);

  useEffect(() => {
    loadPreferences();
    checkBiometricAvailability();
    loadStorageStats();
    loadPortalCredentials();
    loadSchemaMetadata();
  }, [loadPreferences, checkBiometricAvailability, loadStorageStats, loadPortalCredentials, loadSchemaMetadata]);

  const handleBiometricToggle = async (enabled: boolean) => {
    if (!isBiometricAvailable && enabled) {
      Alert.alert(
        'Biometric Authentication Unavailable',
        'Biometric authentication is not available on this device.',
        [{ text: 'OK' }],
      );
      return;
    }

    if (enabled) {
      Alert.alert(
        'Enable Biometric Authentication',
        'This will require biometric authentication to view sensitive passport data.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Enable', onPress: () => updatePreference('biometricEnabled', true) },
        ],
      );
    } else {
      Alert.alert(
        'Disable Biometric Authentication',
        'Passport data will be visible without biometric authentication. This is less secure.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: () => updatePreference('biometricEnabled', false),
          },
        ],
      );
    }
  };

  const handleLockToggle = async (enabled: boolean) => {
    if (enabled) {
      setLockEnabled(true);
      return;
    }

    try {
      const authenticated = await keychainService.authenticateWithBiometric(
        APP_LOCK_CHECK_SERVICE,
        {
          title: 'Confirm Disable App Lock',
          subtitle: 'Authenticate to disable app lock',
          cancel: 'Cancel',
        },
      );
      if (authenticated) {
        setLockEnabled(false);
      } else {
        Alert.alert(
          'Disable App Lock',
          'Are you sure you want to disable app lock?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Disable', style: 'destructive', onPress: () => setLockEnabled(false) },
          ],
        );
      }
    } catch {
      // User cancelled biometric — keep lock enabled
    }
  };

  const handleLockTimeoutChange = (value: string) => {
    const minutes = parseInt(value, 10);
    if (!isNaN(minutes)) {
      setLockTimeoutMinutes(minutes);
    }
  };

  const handleExportData = async () => {
    try {
      const profileIds = Array.from(familyProfiles.profiles.keys());
      if (profileIds.length === 0) {
        Alert.alert('No Data', 'There is no profile data to export.');
        return;
      }
      await exportUserData(profileIds);
    } catch {
      Alert.alert('Export Failed', 'Unable to export your data. Please try again.');
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear app cache and temporary data. Your profile and trips will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          onPress: () => {
            clearCache();
            loadStorageStats();
            Alert.alert('Cache Cleared', 'App cache has been cleared successfully.');
          },
        },
      ],
    );
  };

  const handleDeletePortalCredential = (portalCode: string) => {
    Alert.alert(
      'Delete Portal Credential',
      `Remove saved login for ${getPortalName(portalCode)}? You will need to log in manually next time.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeletingCredential(portalCode);
            try {
              const primaryId = familyProfiles.primaryProfileId;
              if (!primaryId) return;
              await keychainService.deletePortalCredential(primaryId, portalCode);
              await loadPortalCredentials();
            } catch {
              Alert.alert('Error', 'Failed to delete credential. Please try again.');
            } finally {
              setIsDeletingCredential(null);
            }
          },
        },
      ],
    );
  };

  const handleDeleteAllPortalCredentials = () => {
    Alert.alert(
      'Delete All Portal Credentials',
      'This will remove all saved portal logins. You will need to log in manually to each portal.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              const primaryId = familyProfiles.primaryProfileId;
              if (!primaryId) return;
              await keychainService.deleteAllPortalCredentialsForProfile(primaryId);
              setPortalCredentials([]);
            } catch {
              Alert.alert('Error', 'Failed to delete all portal credentials. Please try again.');
            }
          },
        },
      ],
    );
  };

  const handleDeleteAllData = () => {
    Alert.alert(
      'Delete All Data',
      'This will permanently delete your profile, trips, and all app data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you sure?',
              'This will permanently delete ALL your data including your passport info, trips, and QR codes. You will need to complete onboarding again.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete All Data',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const profileIds = Array.from(familyProfiles.profiles.keys());
                      await deleteAllData(profileIds);
                      setOnboardingComplete(false);
                    } catch {
                      Alert.alert('Error', 'Failed to delete all data. Some data may remain. Please try again.');
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const handleRefreshSettings = () => {
    loadPreferences();
    loadStorageStats();
    Alert.alert('Refreshed', 'Settings refreshed successfully.');
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'This will reset app preferences to defaults (your profile data will be preserved).',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetPreferences();
            Alert.alert('Reset Complete', 'Settings have been reset to defaults.');
          },
        },
      ],
    );
  };

  return {
    // Navigation
    navigation,

    // Store state
    preferences,
    updatePreference,
    isBiometricAvailable,
    themePreference,
    setTheme,
    isLockEnabled,
    lockTimeoutMinutes,

    // Local state
    isCheckingBiometric,
    storageStats,
    portalCredentials,
    isDeletingCredential,
    schemaMetadata,
    isRefreshingSchemas,

    // Constants
    languageOptions,
    lockTimeoutOptions,

    // Handlers
    handleBiometricToggle,
    handleLockToggle,
    handleLockTimeoutChange,
    handleExportData,
    handleClearCache,
    handleDeletePortalCredential,
    handleDeleteAllPortalCredentials,
    handleDeleteAllData,
    handleRefreshSchemas,
    handleRefreshSettings,
    handleResetSettings,
  };
}
