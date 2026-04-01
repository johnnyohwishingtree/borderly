import { ActivityIndicator, View, Text, ScrollView, Pressable } from 'react-native';
import { Lock, Unlock, Bell, ChevronRight } from 'lucide-react-native';
import { Button, Card, Toggle, StatusBadge, Divider, ScreenContainer } from '@/components/ui';
import ThemeSelector from '@/components/settings/ThemeSelector';
import { PortalAccountsCard } from '@/components/settings/PortalAccountsCard';
import { useSettings } from '@/hooks/useSettings';
import { SETTINGS_IDS } from './testIDs';
import { SUPPORTED_COUNTRIES } from '@/constants/countries';

export default function SettingsScreen() {
  const {
    navigation,
    preferences: { values: preferences },
    security: {
      isBiometricAvailable,
      isCheckingBiometric,
      handleBiometricToggle,
    },
    theme: { themePreference, setTheme },
    portal: {
      portalCredentials,
      isDeletingCredential,
      handleDeletePortalCredential,
      handleDeleteAllPortalCredentials,
    },
    data: { handleDeleteAllData },
  } = useSettings();

  return (
    <ScreenContainer className="bg-surface-secondary">
    <ScrollView className="flex-1">
      <View className="p-4 space-y-4">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-base text-secondary">App preferences and data management</Text>
        </View>

        {/* Security Settings */}
        <Card>
          <View className="flex-row items-center mb-4">
            <Text className="text-lg font-semibold text-primary mr-3">Security & Privacy</Text>
            <StatusBadge
              status={preferences.biometricEnabled ? "success" : "warning"}
              size="small"
              text={preferences.biometricEnabled ? "Protected" : "Basic"}
            />
          </View>

          <View className="space-y-6">
            <View className="bg-surface-secondary p-4 rounded-lg">
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1">
                  <View className="flex-row items-center mb-1">
                    <Text className="text-base font-medium text-primary mr-2">
                      Biometric Authentication
                    </Text>
                    {preferences.biometricEnabled ? <Lock size={20} color="#374151" /> : <Unlock size={20} color="#374151" />}
                  </View>
                  <Text className="text-sm text-secondary">
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
                <View className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                  <Text className="text-xs font-medium text-green-800 dark:text-green-200">Enhanced Security Active</Text>
                  <Text className="text-xs text-green-700 dark:text-green-300 mt-1">
                    Your passport data is protected by biometric authentication
                  </Text>
                </View>
              )}
            </View>

            <Divider text="Data Privacy" />

            <View className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <View className="flex-row items-center mb-2">
                <Lock size={20} color="#1e3a5f" />
                <Text className="text-base font-semibold text-blue-900 dark:text-blue-100 ml-2">Local-First Privacy</Text>
              </View>
              <Text className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                Your data never leaves this device unless you explicitly share it.
              </Text>
              <Text className="text-xs text-accent">
                • Passport data encrypted in device keychain
                • No cloud storage or server sync
                • You control all data sharing
              </Text>
            </View>
          </View>
        </Card>

        {/* Notifications */}
        <Card testID={SETTINGS_IDS.notificationSettingsCard.id}>
          <Pressable
            onPress={() => navigation.navigate('NotificationPreferences')}
            accessibilityRole="button"
            accessibilityLabel="Notification Preferences"
            accessibilityHint="Configure deadline reminder notifications"
            testID={SETTINGS_IDS.notificationPreferencesRow.id}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <Bell size={20} color="#3b82f6" />
                <View className="ml-3 flex-1">
                  <Text className="text-base font-semibold text-primary">
                    Notification Preferences
                  </Text>
                  <Text className="text-sm text-secondary">
                    Deadline reminders, timing, quiet hours
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color="#9ca3af" />
            </View>
          </Pressable>
        </Card>

        {/* Appearance */}
        <Card>
          <Text className="text-lg font-semibold text-primary mb-4">Appearance</Text>
          <View>
            <Text className="text-sm font-semibold text-secondary mb-2">Theme</Text>
            <ThemeSelector value={themePreference} onValueChange={setTheme} testID={SETTINGS_IDS.settingsThemeSelector.id} />
            <Text className="text-xs text-tertiary mt-1">Choose how the app appears on your device</Text>
          </View>
        </Card>

        {/* Portal Accounts */}
        <PortalAccountsCard
          portalCredentials={portalCredentials}
          isDeletingCredential={isDeletingCredential}
          onDeleteCredential={handleDeletePortalCredential}
          onDeleteAllCredentials={handleDeleteAllPortalCredentials}
        />

        {/* App Information */}
        <Card>
          <Text className="text-lg font-semibold text-primary mb-4">App Information</Text>
          <View className="space-y-4">
            <View className="bg-surface-secondary p-3 rounded-lg">
              <Text className="text-xs font-medium text-tertiary uppercase tracking-wide">Version</Text>
              <Text className="text-sm text-primary mt-1">1.0.0 (MVP)</Text>
            </View>
            <View className="bg-surface-secondary p-3 rounded-lg">
              <Text className="text-xs font-medium text-tertiary uppercase tracking-wide">Supported Countries</Text>
              <Text className="text-sm text-primary mt-2">{SUPPORTED_COUNTRIES.map(c => c.name).join(' • ')}</Text>
            </View>
            <View className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <Text className="text-xs font-medium text-blue-800 dark:text-blue-200">Built for Privacy</Text>
              <Text className="text-xs text-accent mt-1">Local-first architecture ensures your travel data stays on your device</Text>
            </View>
          </View>
        </Card>

        {/* Help & Support */}
        <Card>
          <Text className="text-lg font-semibold text-primary mb-4">Help & Support</Text>
          <View className="bg-surface-secondary p-4 rounded-lg">
            <Text className="text-sm font-medium text-primary mb-2">Need Help?</Text>
            <Text className="text-xs text-secondary mb-3">Having issues with forms or need support with specific country requirements?</Text>
            <View className="space-y-2">
              <Button title="Help & FAQ" onPress={() => navigation.navigate('Help')} variant="secondary" size="small" fullWidth />
              <Button title="Send Feedback" onPress={() => navigation.navigate('Feedback')} variant="secondary" size="small" fullWidth />
              <Button title="Report Bug" onPress={() => navigation.navigate('BugReport')} variant="secondary" size="small" fullWidth />
              <Button title="Privacy Policy" onPress={() => navigation.navigate('PrivacyPolicy')} variant="secondary" size="small" fullWidth />
            </View>
          </View>
        </Card>

        {/* Danger Zone */}
        <Card>
          <Text className="text-lg font-semibold text-primary mb-4">Danger Zone</Text>
          <Button
            title="Delete All Data"
            onPress={handleDeleteAllData}
            variant="danger"
            fullWidth
          />
          <Text className="text-xs text-error mt-1 text-center">
            Permanently removes all app data — cannot be undone
          </Text>
        </Card>

        {/* Bottom spacing */}
        <View className="h-8" />
      </View>
    </ScrollView>
    </ScreenContainer>
  );
}
