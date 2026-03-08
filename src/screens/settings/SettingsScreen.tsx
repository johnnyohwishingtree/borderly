import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppStore } from '@/stores/useAppStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { Button, Card, Toggle, Select, SelectOption, StatusBadge, Divider } from '@/components/ui';
import { keychainService } from '@/services/storage';
import type { SettingsStackParamList } from '@/app/navigation/types';

type SettingsScreenNavigationProp = NativeStackNavigationProp<SettingsStackParamList, 'Settings'>;

export default function SettingsScreen() {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
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
  const [storageStats, setStorageStats] = useState<{
    profileSize: string;
    tripsCount: number;
    qrCodesCount: number;
    cacheSize: string;
  } | null>(null);

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

  useEffect(() => {
    loadPreferences();
    checkBiometricAvailability();
    loadStorageStats();
  }, [loadPreferences]);

  const loadStorageStats = async () => {
    // Mock storage stats - in real implementation, this would calculate actual storage usage
    setStorageStats({
      profileSize: '2.3 KB',
      tripsCount: 5,
      qrCodesCount: 3,
      cacheSize: '1.2 MB'
    });
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
            loadStorageStats(); // Refresh storage stats
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
                    } catch (_error) {
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
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900">Settings</Text>
          <Text className="text-base text-gray-600">App preferences and data management</Text>
        </View>

        {/* Security Settings */}
        <Card>
          <View className="flex-row items-center mb-4">
            <Text className="text-lg font-semibold text-gray-900 mr-3">Security & Privacy</Text>
            <StatusBadge 
              status={preferences.biometricEnabled ? "success" : "warning"} 
              size="small" 
              text={preferences.biometricEnabled ? "Protected" : "Basic"} 
            />
          </View>

          <View className="space-y-6">
            <View className="bg-gray-50 p-4 rounded-lg">
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1">
                  <View className="flex-row items-center mb-1">
                    <Text className="text-base font-medium text-gray-900 mr-2">
                      Biometric Authentication
                    </Text>
                    <Text className="text-lg">{preferences.biometricEnabled ? '🔒' : '🔓'}</Text>
                  </View>
                  <Text className="text-sm text-gray-600">
                    Require biometric authentication to view passport data
                  </Text>
                  {!isBiometricAvailable && (
                    <View className="mt-2">
                      <StatusBadge status="error" size="small" text="Not Available" />
                    </View>
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
              {preferences.biometricEnabled && (
                <View className="bg-green-50 p-3 rounded-lg">
                  <Text className="text-xs font-medium text-green-800">✓ Enhanced Security Active</Text>
                  <Text className="text-xs text-green-700 mt-1">
                    Your passport data is protected by biometric authentication
                  </Text>
                </View>
              )}
            </View>
            
            <Divider text="Data Privacy" />
            
            <View className="bg-blue-50 p-4 rounded-lg">
              <View className="flex-row items-center mb-2">
                <Text className="text-lg mr-2">🔒</Text>
                <Text className="text-base font-semibold text-blue-900">Local-First Privacy</Text>
              </View>
              <Text className="text-sm text-blue-800 mb-2">
                Your data never leaves this device unless you explicitly share it.
              </Text>
              <Text className="text-xs text-blue-700">
                • Passport data encrypted in device keychain
                • No cloud storage or server sync
                • You control all data sharing
              </Text>
            </View>
          </View>
        </Card>

        {/* App Preferences */}
        <Card>
          <View className="flex-row items-center mb-4">
            <Text className="text-lg font-semibold text-gray-900 mr-3">Appearance & Language</Text>
            <StatusBadge 
              status="info" 
              size="small" 
              text="Customizable" 
            />
          </View>

          <View className="space-y-4">
            <View>
              <Select
                label="Theme"
                options={themeOptions}
                value={preferences.theme}
                onValueChange={(value) => updatePreference('theme', value as 'light' | 'dark' | 'auto')}
              />
              <Text className="text-xs text-gray-500 mt-1">
                Choose how the app appears on your device
              </Text>
            </View>

            <View>
              <Select
                label="Language"
                options={languageOptions}
                value={preferences.language}
                onValueChange={(value) => updatePreference('language', value)}
              />
              <Text className="text-xs text-gray-500 mt-1">
                Interface language (forms remain in destination country language)
              </Text>
            </View>
          </View>
        </Card>

        {/* Analytics & Diagnostics */}
        <Card>
          <View className="flex-row items-center mb-4">
            <Text className="text-lg font-semibold text-gray-900 mr-3">Analytics & Diagnostics</Text>
            <StatusBadge 
              status={preferences.analyticsEnabled ? "info" : "neutral"} 
              size="small" 
              text={preferences.analyticsEnabled ? "Enabled" : "Disabled"} 
            />
          </View>

          <View className="space-y-6">
            <View className="bg-gray-50 p-4 rounded-lg">
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="text-base font-medium text-gray-900">Anonymous Analytics</Text>
                  <Text className="text-sm text-gray-600 mt-1">
                    Help improve the app by sharing anonymous usage data
                  </Text>
                  <Text className="text-xs text-gray-500 mt-2">
                    • No personal or passport data is collected
                    • Only app usage patterns and performance metrics
                  </Text>
                </View>
                <View className="ml-4">
                  <Toggle
                    value={preferences.analyticsEnabled}
                    onValueChange={(value) => updatePreference('analyticsEnabled', value)}
                  />
                </View>
              </View>
            </View>

            <View className="bg-gray-50 p-4 rounded-lg">
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="text-base font-medium text-gray-900">Crash Reporting</Text>
                  <Text className="text-sm text-gray-600 mt-1">
                    Send anonymous crash reports to help fix issues
                  </Text>
                  <Text className="text-xs text-gray-500 mt-2">
                    • Helps identify and fix app crashes
                    • No personal data included in reports
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
          </View>
        </Card>

        {/* Data Management */}
        <Card>
          <View className="flex-row items-center mb-4">
            <Text className="text-lg font-semibold text-gray-900 mr-3">Data Management</Text>
            <StatusBadge 
              status="warning" 
              size="small" 
              text="Handle with Care" 
            />
          </View>

          {/* Storage Usage */}
          {storageStats && (
            <View className="bg-gray-50 p-4 rounded-lg mb-4">
              <Text className="text-sm font-semibold text-gray-900 mb-3">📊 Storage Usage</Text>
              <View className="space-y-2">
                <View className="flex-row justify-between">
                  <Text className="text-xs text-gray-600">Profile Data:</Text>
                  <Text className="text-xs text-gray-900">{storageStats.profileSize}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-xs text-gray-600">Trips:</Text>
                  <Text className="text-xs text-gray-900">{storageStats.tripsCount} saved</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-xs text-gray-600">QR Codes:</Text>
                  <Text className="text-xs text-gray-900">{storageStats.qrCodesCount} stored</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-xs text-gray-600">Cache:</Text>
                  <Text className="text-xs text-gray-900">{storageStats.cacheSize}</Text>
                </View>
              </View>
            </View>
          )}

          <View className="space-y-3">
            <View>
              <Button
                title="📤 Export Data"
                onPress={handleExportData}
                variant="outline"
                fullWidth
              />
              <Text className="text-xs text-gray-500 mt-1 text-center">
                Save your data as a secure backup file
              </Text>
            </View>

            <View>
              <Button
                title="🧽 Clear Cache ({storageStats?.cacheSize})"
                onPress={handleClearCache}
                variant="outline"
                fullWidth
              />
              <Text className="text-xs text-gray-500 mt-1 text-center">
                Free up space by clearing temporary files
              </Text>
            </View>

            <Divider className="my-2" />

            <View>
              <Button
                title="🗑️ Delete All Data"
                onPress={handleDeleteAllData}
                variant="outline"
                fullWidth
              />
              <Text className="text-xs text-red-600 mt-1 text-center">
                ⚠️ Permanently removes all app data - cannot be undone
              </Text>
            </View>
          </View>
        </Card>

        {/* App Information */}
        <Card>
          <View className="flex-row items-center mb-4">
            <Text className="text-lg font-semibold text-gray-900 mr-3">App Information</Text>
            <StatusBadge 
              status="info" 
              size="small" 
              text="MVP Version" 
            />
          </View>

          <View className="space-y-4">
            <View className="bg-gray-50 p-3 rounded-lg">
              <Text className="text-xs font-medium text-gray-500 uppercase tracking-wide">Version</Text>
              <Text className="text-sm text-gray-900 mt-1">1.0.0 (MVP)</Text>
            </View>
            
            <View className="bg-gray-50 p-3 rounded-lg">
              <Text className="text-xs font-medium text-gray-500 uppercase tracking-wide">Supported Countries</Text>
              <View className="mt-2">
                <Text className="text-sm text-gray-900">🇯🇵 Japan • 🇲🇾 Malaysia • 🇸🇬 Singapore</Text>
              </View>
            </View>
            
            <View className="bg-gray-50 p-3 rounded-lg">
              <Text className="text-xs font-medium text-gray-500 uppercase tracking-wide">Schema Updates</Text>
              <Text className="text-sm text-gray-900 mt-1">
                {preferences.lastSchemaUpdateCheck || 'Never checked'}
              </Text>
              <Text className="text-xs text-gray-500 mt-1">
                Country form schemas are bundled with the app
              </Text>
            </View>
            
            <View className="bg-blue-50 p-3 rounded-lg">
              <Text className="text-xs font-medium text-blue-800">📱 Built for Privacy</Text>
              <Text className="text-xs text-blue-700 mt-1">
                Local-first architecture ensures your travel data stays on your device
              </Text>
            </View>
          </View>
        </Card>

        {/* Quick Actions */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</Text>
          
          <View className="space-y-3">
            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Button
                  title="🔄 Refresh"
                  onPress={() => {
                    loadPreferences();
                    loadStorageStats();
                    Alert.alert('Refreshed', 'Settings refreshed successfully.');
                  }}
                  variant="outline"
                  fullWidth
                />
              </View>
              <View className="flex-1">
                <Button
                  title="⚙️ Reset"
                  onPress={() => {
                    Alert.alert(
                      'Reset Settings',
                      'This will reset app preferences to defaults (your profile data will be preserved).',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Reset', style: 'destructive', onPress: () => {
                          resetPreferences();
                          Alert.alert('Reset Complete', 'Settings have been reset to defaults.');
                        }}
                      ]
                    );
                  }}
                  variant="outline"
                  fullWidth
                />
              </View>
            </View>
          </View>
        </Card>

        {/* Help & Support */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 mb-4">Help & Support</Text>
          
          <View className="bg-gray-50 p-4 rounded-lg">
            <Text className="text-sm font-medium text-gray-900 mb-2">📞 Need Help?</Text>
            <Text className="text-xs text-gray-600 mb-3">
              Having issues with forms or need support with specific country requirements?
            </Text>
            <View className="space-y-2">
              <Button
                title="📚 Help & FAQ"
                onPress={() => navigation.navigate('Help')}
                variant="outline"
                size="small"
                fullWidth
              />
              <Button
                title="💬 Send Feedback"
                onPress={() => navigation.navigate('Feedback')}
                variant="outline"
                size="small"
                fullWidth
              />
              <Button
                title="🐛 Report Bug"
                onPress={() => navigation.navigate('BugReport')}
                variant="outline"
                size="small"
                fullWidth
              />
            </View>
          </View>
        </Card>

        {/* Bottom spacing */}
        <View className="h-8" />
      </View>
    </ScrollView>
  );
}
