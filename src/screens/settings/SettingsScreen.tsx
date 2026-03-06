import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useAppStore } from '@/stores/useAppStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { Button, Card, Toggle, Select, SelectOption } from '@/components/ui';
import { keychainService } from '@/services/storage';

export default function SettingsScreen() {
  const {
    preferences,
    updatePreference,
    loadPreferences,
    resetPreferences,
    isBiometricAvailable,
    setBiometricAvailable,
    clearCache,
  } = useAppStore();
  const { clearProfile } = useProfileStore();
  const [isCheckingBiometric, setIsCheckingBiometric] = useState(false);

  useEffect(() => {
    loadPreferences();
    checkBiometricAvailability();
  }, [loadPreferences]);

  const checkBiometricAvailability = async () => {
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
  };

  const themeOptions: SelectOption[] = [
    { label: 'Auto (System)', value: 'auto' },
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
  ];

  const languageOptions: SelectOption[] = [
    { label: 'English', value: 'en' },
    { label: '日本語', value: 'ja' },
    { label: 'Bahasa Malaysia', value: 'ms' },
    { label: 'Deutsch', value: 'de' },
    { label: 'Français', value: 'fr' },
  ];

  const handleBiometricToggle = async (enabled: boolean) => {
    if (!isBiometricAvailable && enabled) {
      Alert.alert(
        'Biometric Authentication Unavailable',
        'Biometric authentication is not available on this device.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (enabled) {
      Alert.alert(
        'Enable Biometric Authentication',
        'This will require biometric authentication to view sensitive passport data.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: () => updatePreference('biometricEnabled', true),
          },
        ]
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
        ]
      );
    }
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'Data export functionality will be available in a future update.',
      [{ text: 'OK' }]
    );
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
            Alert.alert('Cache Cleared', 'App cache has been cleared successfully.');
          },
        },
      ]
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
              'This will permanently delete ALL your data. You will need to complete onboarding again.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete All Data',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await clearProfile();
                      resetPreferences();
                      Alert.alert('Data Deleted', 'All data has been deleted. Please restart the app.');
                    } catch (error) {
                      Alert.alert('Error', 'Failed to delete data. Please try again.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4 space-y-4">
        {/* Header */}
        <View className="mb-4">
          <Text className="text-2xl font-bold text-gray-900">Settings</Text>
          <Text className="text-base text-gray-600">App preferences and configuration</Text>
        </View>

        {/* Security Settings */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 mb-4">Security</Text>

          <View className="space-y-4">
            <View className="flex-row justify-between items-center">
              <View className="flex-1">
                <Text className="text-base font-medium text-gray-900">
                  Biometric Authentication
                </Text>
                <Text className="text-sm text-gray-600">
                  Require biometric authentication to view passport data
                </Text>
                {!isBiometricAvailable && (
                  <Text className="text-xs text-orange-600 mt-1">
                    Not available on this device
                  </Text>
                )}
              </View>
              <View className="ml-4">
                {isCheckingBiometric ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <Toggle
                    value={preferences.biometricEnabled}
                    onValueChange={handleBiometricToggle}
                    disabled={!isBiometricAvailable}
                  />
                )}
              </View>
            </View>
          </View>
        </Card>

        {/* App Preferences */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 mb-4">Appearance</Text>

          <View className="space-y-4">
            <Select
              label="Theme"
              options={themeOptions}
              value={preferences.theme}
              onValueChange={(value) => updatePreference('theme', value as 'light' | 'dark' | 'auto')}
            />

            <Select
              label="Language"
              options={languageOptions}
              value={preferences.language}
              onValueChange={(value) => updatePreference('language', value)}
            />
          </View>
        </Card>

        {/* Privacy Settings */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 mb-4">Privacy</Text>

          <View className="space-y-4">
            <View className="flex-row justify-between items-center">
              <View className="flex-1">
                <Text className="text-base font-medium text-gray-900">Analytics</Text>
                <Text className="text-sm text-gray-600">
                  Help improve the app by sharing anonymous usage data
                </Text>
              </View>
              <View className="ml-4">
                <Toggle
                  value={preferences.analyticsEnabled}
                  onValueChange={(value) => updatePreference('analyticsEnabled', value)}
                />
              </View>
            </View>

            <View className="flex-row justify-between items-center">
              <View className="flex-1">
                <Text className="text-base font-medium text-gray-900">Crash Reporting</Text>
                <Text className="text-sm text-gray-600">
                  Send anonymous crash reports to help fix issues
                </Text>
              </View>
              <View className="ml-4">
                <Toggle
                  value={preferences.crashReportingEnabled}
                  onValueChange={(value) => updatePreference('crashReportingEnabled', value)}
                />
              </View>
            </View>
          </View>
        </Card>

        {/* Data Management */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 mb-4">Data Management</Text>

          <View className="space-y-3">
            <Button
              title="Export Data"
              onPress={handleExportData}
              variant="outline"
              fullWidth
            />

            <Button
              title="Clear Cache"
              onPress={handleClearCache}
              variant="outline"
              fullWidth
            />

            <Button
              title="Delete All Data"
              onPress={handleDeleteAllData}
              variant="outline"
              fullWidth
            />
          </View>
        </Card>

        {/* App Information */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 mb-4">About</Text>

          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-sm font-medium text-gray-700">Version</Text>
              <Text className="text-sm text-gray-900">1.0.0 (MVP)</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm font-medium text-gray-700">Supported Countries</Text>
              <Text className="text-sm text-gray-900">Japan, Malaysia, Singapore</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm font-medium text-gray-700">Last Schema Update</Text>
              <Text className="text-sm text-gray-900">
                {preferences.lastSchemaUpdateCheck || 'Never'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Local First Notice */}
        <Card>
          <View className="flex-row items-center mb-2">
            <Text className="text-lg">🔒</Text>
            <Text className="text-lg font-semibold text-gray-900 ml-2">
              Local-First Privacy
            </Text>
          </View>
          <Text className="text-sm text-gray-600">
            Your passport data never leaves your device. All travel information is stored
            securely on your phone using device keychain and encrypted storage.
          </Text>
        </Card>

        {/* Bottom spacing */}
        <View className="h-8" />
      </View>
    </ScrollView>
  );
}
