import { ActivityIndicator, View, Text, ScrollView, Pressable } from 'react-native';
import { Lock, Unlock, Bell, ChevronRight } from 'lucide-react-native';
import { SUPPORTED_COUNTRIES } from '@/constants/countries';
import { Button, Card, Toggle, Select, StatusBadge, Divider, ScreenContainer } from '@/components/ui';
import ThemeSelector from '@/components/settings/ThemeSelector';
import { PortalAccountsCard } from '@/components/settings/PortalAccountsCard';
import { DataManagementCard } from '@/components/settings/DataManagementCard';
import { useSettings } from '@/hooks/useSettings';
import { SETTINGS_IDS } from './testIDs';

export default function SettingsScreen() {
  const {
    navigation,
    preferences: { values: preferences, updatePreference },
    security: {
      isBiometricAvailable,
      isCheckingBiometric,
      handleBiometricToggle,
      isLockEnabled,
      handleLockToggle,
      lockTimeoutMinutes,
      handleLockTimeoutChange,
    },
    theme: { themePreference, setTheme },
    portal: {
      portalCredentials,
      isDeletingCredential,
      handleDeletePortalCredential,
      handleDeleteAllPortalCredentials,
    },
    schema: { schemaMetadata, isRefreshingSchemas, handleRefreshSchemas },
    data: { storageStats, handleExportData, handleClearCache, handleDeleteAllData },
    options: { languageOptions, lockTimeoutOptions },
    actions: { handleRefreshSettings, handleResetSettings },
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
                  <Text className="text-xs font-medium text-green-800 dark:text-green-200">✓ Enhanced Security Active</Text>
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

        {/* App Lock */}
        <Card testID={SETTINGS_IDS.appLockCard.id}>
          <View className="flex-row items-center mb-4">
            <Text className="text-lg font-semibold text-primary mr-3">App Lock</Text>
            <StatusBadge
              status={isLockEnabled ? 'success' : 'neutral'}
              size="small"
              text={isLockEnabled ? 'Enabled' : 'Disabled'}
            />
          </View>

          {!isBiometricAvailable ? (
            <View className="bg-surface-secondary p-4 rounded-lg" testID={SETTINGS_IDS.appLockUnavailable.id}>
              <Text className="text-sm text-tertiary">
                App lock is not available on this device. Biometric authentication (Face ID / Touch ID / Fingerprint) is required.
              </Text>
            </View>
          ) : (
            <View className="space-y-4">
              <View className="bg-surface-secondary p-4 rounded-lg">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1">
                    <Text className="text-base font-medium text-primary">Enable App Lock</Text>
                    <Text className="text-sm text-secondary mt-1">
                      Lock the app after a period of inactivity. Disabling requires biometric confirmation.
                    </Text>
                  </View>
                  <View className="ml-4">
                    <Toggle
                      value={isLockEnabled}
                      onValueChange={handleLockToggle}
                      accessibilityLabel="Enable app lock"
                      accessibilityHint="Locks the app after a period of inactivity"
                      testID={SETTINGS_IDS.appLockToggle.id}
                    />
                  </View>
                </View>
              </View>

              {isLockEnabled && (
                <View testID={SETTINGS_IDS.appLockTimeoutSection.id}>
                  <Select
                    label="Lock After"
                    options={lockTimeoutOptions}
                    value={String(lockTimeoutMinutes)}
                    onValueChange={handleLockTimeoutChange}
                    testID={SETTINGS_IDS.appLockTimeoutSelect.id}
                  />
                  <Text className="text-xs text-tertiary mt-1">
                    Duration of inactivity before the app locks automatically
                  </Text>
                </View>
              )}
            </View>
          )}
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

        {/* App Preferences */}
        <Card>
          <View className="flex-row items-center mb-4">
            <Text className="text-lg font-semibold text-primary mr-3">Appearance & Language</Text>
            <StatusBadge status="info" size="small" text="Customizable" />
          </View>

          <View className="space-y-4">
            <View>
              <Text className="text-sm font-semibold text-secondary mb-2">Theme</Text>
              <ThemeSelector value={themePreference} onValueChange={setTheme} testID={SETTINGS_IDS.settingsThemeSelector.id} />
              <Text className="text-xs text-tertiary mt-1">Choose how the app appears on your device</Text>
            </View>
            <View>
              <Select label="Language" options={languageOptions} value={preferences.language} onValueChange={(value) => updatePreference('language', value)} />
              <Text className="text-xs text-tertiary mt-1">Interface language (forms remain in destination country language)</Text>
            </View>
          </View>
        </Card>

        {/* Analytics & Diagnostics */}
        <Card>
          <View className="flex-row items-center mb-4">
            <Text className="text-lg font-semibold text-primary mr-3">Analytics & Diagnostics</Text>
            <StatusBadge status={preferences.analyticsEnabled ? "info" : "neutral"} size="small" text={preferences.analyticsEnabled ? "Enabled" : "Disabled"} />
          </View>

          <View className="space-y-6">
            <View className="bg-surface-secondary p-4 rounded-lg">
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="text-base font-medium text-primary">Anonymous Analytics</Text>
                  <Text className="text-sm text-secondary mt-1">Help improve the app by sharing anonymous usage data</Text>
                  <Text className="text-xs text-tertiary mt-2">• No personal or passport data is collected{'\n'}• Only app usage patterns and performance metrics</Text>
                </View>
                <View className="ml-4">
                  <Toggle value={preferences.analyticsEnabled} onValueChange={(value) => updatePreference('analyticsEnabled', value)} />
                </View>
              </View>
            </View>

            <View className="bg-surface-secondary p-4 rounded-lg">
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="text-base font-medium text-primary">Crash Reporting</Text>
                  <Text className="text-sm text-secondary mt-1">Send anonymous crash reports to help fix issues</Text>
                  <Text className="text-xs text-tertiary mt-2">• Helps identify and fix app crashes{'\n'}• No personal data included in reports</Text>
                </View>
                <View className="ml-4">
                  <Toggle value={preferences.crashReportingEnabled} onValueChange={(value) => updatePreference('crashReportingEnabled', value)} />
                </View>
              </View>
            </View>
          </View>
        </Card>

        {/* Portal Accounts */}
        <PortalAccountsCard
          portalCredentials={portalCredentials}
          isDeletingCredential={isDeletingCredential}
          onDeleteCredential={handleDeletePortalCredential}
          onDeleteAllCredentials={handleDeleteAllPortalCredentials}
        />

        {/* Data Management */}
        <DataManagementCard
          storageStats={storageStats}
          onExportData={handleExportData}
          onRestoreBackup={() => navigation.navigate('RestoreBackup')}
          onClearCache={handleClearCache}
          onDeleteAllData={handleDeleteAllData}
        />

        {/* Form Data */}
        <Card testID={SETTINGS_IDS.formDataCard.id}>
          <View className="flex-row items-center mb-4">
            <Text className="text-lg font-semibold text-primary mr-3">Form Data</Text>
            <StatusBadge status="info" size="small" text="Country Schemas" />
          </View>
          <Text className="text-xs text-tertiary mb-4">Country entry form definitions bundled with the app or refreshed over the air.</Text>

          {schemaMetadata.length === 0 ? (
            <View className="bg-surface-secondary p-4 rounded-lg items-center mb-4">
              <Text className="text-sm text-tertiary">No schema data available yet.</Text>
            </View>
          ) : (
            <View className="space-y-2 mb-4">
              {schemaMetadata.map(meta => (
                <View key={meta.countryCode} testID={`${SETTINGS_IDS.schemaRow.id}-${meta.countryCode}`} className="bg-surface-secondary p-3 rounded-lg">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-sm font-medium text-primary">{meta.countryName}</Text>
                    <StatusBadge status="neutral" size="small" text={`v${meta.schemaVersion}`} />
                  </View>
                  <Text className="text-xs text-tertiary">Updated: {new Date(meta.lastUpdated).toLocaleDateString()}</Text>
                </View>
              ))}
            </View>
          )}
          <Button title={isRefreshingSchemas ? 'Checking for updates…' : 'Refresh Now'} onPress={handleRefreshSchemas} variant="secondary" fullWidth disabled={isRefreshingSchemas} testID={SETTINGS_IDS.refreshSchemasButton.id} />
          <Text className="text-xs text-tertiary mt-1 text-center">Manually check for updated country form definitions</Text>
        </Card>

        {/* App Information */}
        <Card>
          <View className="flex-row items-center mb-4">
            <Text className="text-lg font-semibold text-primary mr-3">App Information</Text>
            <StatusBadge status="info" size="small" text="MVP Version" />
          </View>
          <View className="space-y-4">
            <View className="bg-surface-secondary p-3 rounded-lg">
              <Text className="text-xs font-medium text-tertiary uppercase tracking-wide">Version</Text>
              <Text className="text-sm text-primary mt-1">1.0.0 (MVP)</Text>
            </View>
            <View className="bg-surface-secondary p-3 rounded-lg">
              <Text className="text-xs font-medium text-tertiary uppercase tracking-wide">Supported Countries</Text>
              <Text className="text-sm text-primary mt-2">{SUPPORTED_COUNTRIES.map(c => c.name).join(' • ')}</Text>
            </View>
            <View className="bg-surface-secondary p-3 rounded-lg">
              <Text className="text-xs font-medium text-tertiary uppercase tracking-wide">Schema Updates</Text>
              <Text className="text-sm text-primary mt-1">{preferences.lastSchemaUpdateCheck || 'Never checked'}</Text>
              <Text className="text-xs text-tertiary mt-1">Country form schemas are bundled with the app</Text>
            </View>
            <View className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <Text className="text-xs font-medium text-blue-800 dark:text-blue-200">Built for Privacy</Text>
              <Text className="text-xs text-accent mt-1">Local-first architecture ensures your travel data stays on your device</Text>
            </View>
          </View>
        </Card>

        {/* Quick Actions */}
        <Card>
          <Text className="text-lg font-semibold text-primary mb-4">Quick Actions</Text>
          <View className="flex-row gap-3">
            <View className="flex-1"><Button title="Refresh" onPress={handleRefreshSettings} variant="secondary" fullWidth /></View>
            <View className="flex-1"><Button title="Reset" onPress={handleResetSettings} variant="secondary" fullWidth /></View>
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

        {/* Bottom spacing */}
        <View className="h-8" />
      </View>
    </ScrollView>
    </ScreenContainer>
  );
}
