/**
 * RestoreBackupModal
 *
 * Full-screen flow for restoring a Borderly backup.
 * Accessible from:
 *   - Settings → Data Management → "Restore from Backup"
 *   - Welcome / onboarding screen → "Restore from Backup" link
 *
 * Steps rendered:
 *   idle            → "Pick a backup file" prompt
 *   passphrase      → Passphrase entry form
 *   loading         → Activity spinner
 *   confirming-replace → Conflict dialog
 *   success         → Success confirmation
 *   error           → Inline error with retry
 */

import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Shield, FileCheck, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react-native';
import { useBackupRestore } from '@/hooks/useBackupRestore';
import { Button, Card } from '@/components/ui';
import { useProfileStore } from '@/stores/useProfileStore';
import { RESTORE_BACKUP_IDS } from './testIDs';

export default function RestoreBackupModal() {
  const navigation = useNavigation();
  const {
    step,
    passphrase,
    errorMessage,
    secureTextEntry,
    pickFile,
    setPassphrase,
    toggleSecureEntry,
    submitPassphrase,
    confirmReplace,
    reset,
  } = useBackupRestore();

  const { loadFamilyProfiles, setOnboardingComplete } = useProfileStore();

  const handleSuccess = async () => {
    // Reload profile state so the app routes to Home
    await loadFamilyProfiles();
    setOnboardingComplete(true);
    navigation.goBack();
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      testID={RESTORE_BACKUP_IDS.screen.id}
      accessibilityLabel="Restore from backup screen"
    >
      <View className="flex-1 p-6">
        {/* Header */}
        <View className="items-center mb-8">
          <Text className="text-base text-gray-600 dark:text-gray-400 text-center">
            Restore your profiles, trips, and QR codes from a .borderly backup file.
          </Text>
        </View>

        {/* ── Step: idle ── */}
        {step === 'idle' && (
          <View testID={RESTORE_BACKUP_IDS.stepIdle.id}>
            <Card className="mb-6">
              <View className="flex-row items-start mb-4">
                <Shield size={20} color="#2563eb" accessibilityElementsHidden />
                <View className="ml-3 flex-1">
                  <Text className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                    What gets restored
                  </Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400">
                    • All traveler profiles and passport data{'\n'}
                    • Trips, legs, and form data{'\n'}
                    • Saved QR codes{'\n'}
                    • App preferences
                  </Text>
                </View>
              </View>
            </Card>

            <Button
              title="Pick a Backup File"
              onPress={pickFile}
              size="large"
              fullWidth
              testID={RESTORE_BACKUP_IDS.pickFileButton.id}
              accessibilityRole="button"
              accessibilityLabel="Pick a backup file from your device"
              accessibilityHint="Opens the document picker to select a .borderly backup file"
            />

            <Text className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
              Select a .borderly file from your device or cloud storage
            </Text>
          </View>
        )}

        {/* ── Step: passphrase ── */}
        {step === 'passphrase' && (
          <View testID={RESTORE_BACKUP_IDS.stepPassphrase.id}>
            <View className="flex-row items-center mb-6 bg-green-50 dark:bg-green-900/20 p-4 rounded-xl">
              <FileCheck size={20} color="#16a34a" accessibilityElementsHidden />
              <Text className="ml-3 text-sm font-medium text-green-800 dark:text-green-200">
                Backup file selected successfully
              </Text>
            </View>

            <Card className="mb-6">
              <Text className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                Enter your backup passphrase
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                This is the passphrase you chose when you created the backup.
              </Text>

              <View className="relative">
                <TextInput
                  value={passphrase}
                  onChangeText={setPassphrase}
                  placeholder="Enter passphrase…"
                  secureTextEntry={secureTextEntry}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={submitPassphrase}
                  testID={RESTORE_BACKUP_IDS.passphraseField.id}
                  accessibilityLabel="Backup passphrase, required"
                  accessibilityHint="Enter the passphrase used when this backup was created"
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-base text-gray-900 dark:text-white bg-white dark:bg-gray-800 pr-12"
                />
                <TouchableOpacity
                  onPress={toggleSecureEntry}
                  testID={RESTORE_BACKUP_IDS.toggleSecureEntry.id}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={secureTextEntry ? 'Show passphrase' : 'Hide passphrase'}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: 12,
                    padding: 4,
                  }}
                >
                  {secureTextEntry ? (
                    <Eye size={20} color="#6b7280" accessibilityElementsHidden />
                  ) : (
                    <EyeOff size={20} color="#6b7280" accessibilityElementsHidden />
                  )}
                </TouchableOpacity>
              </View>
            </Card>

            <Button
              title="Decrypt & Restore"
              onPress={submitPassphrase}
              size="large"
              fullWidth
              disabled={passphrase.length === 0}
              testID={RESTORE_BACKUP_IDS.submitPassphraseButton.id}
              accessibilityRole="button"
              accessibilityLabel="Decrypt and restore backup"
            />

            <Pressable
              onPress={reset}
              testID={RESTORE_BACKUP_IDS.cancelPassphraseButton.id}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Cancel and go back to file selection"
              className="mt-4 items-center py-3"
            >
              <Text className="text-base text-gray-500 dark:text-gray-400">Cancel</Text>
            </Pressable>
          </View>
        )}

        {/* ── Step: loading ── */}
        {step === 'loading' && (
          <View
            className="flex-1 items-center justify-center py-16"
            testID={RESTORE_BACKUP_IDS.stepLoading.id}
            accessible
            accessibilityLabel="Decrypting and restoring your backup, please wait"
            accessibilityLiveRegion="polite"
          >
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-base text-gray-600 dark:text-gray-400 mt-4">Restoring your data…</Text>
            <Text className="text-sm text-gray-400 dark:text-gray-600 mt-1">This may take a moment</Text>
          </View>
        )}

        {/* ── Step: confirming-replace ── */}
        {step === 'confirming-replace' && (
          <View testID={RESTORE_BACKUP_IDS.stepConflict.id}>
            <Card className="mb-6 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
              <View className="flex-row items-start">
                <AlertCircle size={20} color="#d97706" accessibilityElementsHidden />
                <View className="ml-3 flex-1">
                  <Text className="text-base font-semibold text-amber-900 dark:text-amber-100 mb-2">
                    Existing data detected
                  </Text>
                  <Text className="text-sm text-amber-800 dark:text-amber-200">
                    Your device already has Borderly data. Restoring will{' '}
                    <Text className="font-semibold">replace all current data</Text> with the
                    backup contents. This cannot be undone.
                  </Text>
                </View>
              </View>
            </Card>

            <Button
              title="Replace all data"
              onPress={confirmReplace}
              size="large"
              fullWidth
              testID={RESTORE_BACKUP_IDS.confirmReplaceButton.id}
              accessibilityRole="button"
              accessibilityLabel="Replace all existing data with backup"
              accessibilityHint="This will permanently overwrite your current profiles, trips, and QR codes"
            />

            <Pressable
              onPress={reset}
              testID={RESTORE_BACKUP_IDS.cancelReplaceButton.id}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Cancel and keep existing data"
              className="mt-4 items-center py-3"
            >
              <Text className="text-base text-gray-500 dark:text-gray-400">Cancel — keep my current data</Text>
            </Pressable>
          </View>
        )}

        {/* ── Step: success ── */}
        {step === 'success' && (
          <View
            className="flex-1 items-center justify-center py-8"
            testID={RESTORE_BACKUP_IDS.stepSuccess.id}
          >
            <View className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full items-center justify-center mb-6">
              <CheckCircle size={40} color="#16a34a" accessibilityElementsHidden />
            </View>
            <Text
              className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center"
              accessibilityRole="header"
            >
              Restore complete!
            </Text>
            <Text className="text-base text-gray-600 dark:text-gray-400 text-center mb-8">
              Your profiles, trips, and QR codes have been restored successfully.
            </Text>

            <Button
              title="Go to Home"
              onPress={handleSuccess}
              size="large"
              fullWidth
              testID={RESTORE_BACKUP_IDS.goToHomeButton.id}
              accessibilityRole="button"
              accessibilityLabel="Go to home screen"
            />
          </View>
        )}

        {/* ── Step: error ── */}
        {step === 'error' && (
          <View testID={RESTORE_BACKUP_IDS.stepError.id}>
            <Card className="mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              <View className="flex-row items-start">
                <AlertCircle size={20} color="#dc2626" accessibilityElementsHidden />
                <View className="ml-3 flex-1">
                  <Text className="text-base font-semibold text-red-900 dark:text-red-100 mb-2">
                    Restore failed
                  </Text>
                  <Text
                    className="text-sm text-red-800 dark:text-red-200"
                    testID={RESTORE_BACKUP_IDS.errorMessage.id}
                    accessibilityRole="text"
                    accessibilityLiveRegion="polite"
                  >
                    {errorMessage}
                  </Text>
                </View>
              </View>
            </Card>

            <Button
              title="Try again"
              onPress={reset}
              size="large"
              fullWidth
              testID={RESTORE_BACKUP_IDS.tryAgainButton.id}
              accessibilityRole="button"
              accessibilityLabel="Try restoring from backup again"
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
}
