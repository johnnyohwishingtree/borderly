import { ScrollView, View, Text } from 'react-native';
import { ScreenContainer } from '@/components/ui';

export default function PrivacyPolicyScreen() {
  return (
    <ScreenContainer className="bg-gray-50 dark:bg-gray-900">
    <ScrollView className="flex-1" testID="privacy-policy-screen">
      <View className="p-4 space-y-4">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">Privacy Policy</Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">Last updated: March 2026</Text>
        </View>

        {/* Introduction */}
        <View className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800 mb-4">
          <Text className="text-base font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Your Privacy is Our Priority
          </Text>
          <Text className="text-sm text-blue-800 dark:text-blue-200">
            Borderly is designed from the ground up to protect your personal and passport data.
            Everything stays on your device — we never collect, transmit, or store your data on external servers.
          </Text>
        </View>

        {/* Section: Data Storage */}
        <View className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 mb-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">1. Data Storage</Text>
          <Text className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            All sensitive information, including passport data and biometric keys, is stored exclusively
            on your device using the operating system's secure Keychain (iOS Keychain / Android Keystore).
          </Text>
          <View className="space-y-1 mt-2">
            <Text className="text-sm text-gray-700 dark:text-gray-300">• Passport data is encrypted at rest</Text>
            <Text className="text-sm text-gray-700 dark:text-gray-300">• Encryption keys are biometric-protected</Text>
            <Text className="text-sm text-gray-700 dark:text-gray-300">• iCloud/Google backup is excluded for sensitive data</Text>
            <Text className="text-sm text-gray-700 dark:text-gray-300">• Trip data is stored in a local encrypted database</Text>
          </View>
        </View>

        {/* Section: Data Sharing */}
        <View className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 mb-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">2. Data Sharing</Text>
          <Text className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            Borderly does not share your data with any third parties. All communication with government
            portals is direct, device-to-government, and only when you explicitly initiate it.
          </Text>
          <View className="space-y-1 mt-2">
            <Text className="text-sm text-gray-700 dark:text-gray-300">• No analytics services receive personal data</Text>
            <Text className="text-sm text-gray-700 dark:text-gray-300">• No crash reports include PII</Text>
            <Text className="text-sm text-gray-700 dark:text-gray-300">• No advertising or data brokers</Text>
          </View>
        </View>

        {/* Section: Clipboard */}
        <View className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 mb-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">3. Clipboard Protection</Text>
          <Text className="text-sm text-gray-700 dark:text-gray-300">
            When you copy passport information to the clipboard for pasting into government portals,
            Borderly automatically clears the clipboard after 60 seconds to prevent other apps
            from reading sensitive data.
          </Text>
        </View>

        {/* Section: App Lock */}
        <View className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 mb-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">4. App Lock</Text>
          <Text className="text-sm text-gray-700 dark:text-gray-300">
            After 5 minutes of inactivity, Borderly automatically locks and requires biometric
            re-authentication to access your data. This prevents unauthorized access if you leave
            the app open unattended.
          </Text>
        </View>

        {/* Section: Government Portals */}
        <View className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 mb-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">5. Government Portals</Text>
          <Text className="text-sm text-gray-700 dark:text-gray-300">
            When using the Submission Guide to fill out government portal forms (e.g., Visit Japan Web,
            Malaysia MDAC, Singapore SG Arrival Card), you are directly interacting with those
            government websites. Borderly does not intercept, proxy, or store any data submitted
            to these portals.
          </Text>
        </View>

        {/* Section: Family Profiles */}
        <View className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 mb-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">6. Family Profiles</Text>
          <Text className="text-sm text-gray-700 dark:text-gray-300">
            Each family member's profile is stored in an isolated, separately encrypted Keychain entry.
            Family member data is never shared between devices or backed up to the cloud.
          </Text>
        </View>

        {/* Section: Your Rights */}
        <View className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 mb-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">7. Your Rights</Text>
          <Text className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            Because all data is stored locally on your device, you have full control:
          </Text>
          <View className="space-y-1 mt-2">
            <Text className="text-sm text-gray-700 dark:text-gray-300">• Export your data at any time from Settings</Text>
            <Text className="text-sm text-gray-700 dark:text-gray-300">• Delete all data from Settings → Data Management</Text>
            <Text className="text-sm text-gray-700 dark:text-gray-300">• Remove individual family member profiles</Text>
            <Text className="text-sm text-gray-700 dark:text-gray-300">• Uninstalling the app removes all data</Text>
          </View>
        </View>

        {/* Section: Contact */}
        <View className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl mb-4">
          <Text className="text-base font-semibold text-gray-900 dark:text-white mb-2">Questions?</Text>
          <Text className="text-sm text-gray-700 dark:text-gray-300">
            If you have any questions about this privacy policy or how Borderly handles your data,
            please use the Feedback option in Settings.
          </Text>
        </View>

        {/* Bottom spacing */}
        <View className="h-8" />
      </View>
    </ScrollView>
    </ScreenContainer>
  );
}
