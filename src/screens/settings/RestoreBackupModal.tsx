/**
 * RestoreBackupModal
 *
 * A full-screen modal sheet that walks the user through restoring data from
 * an encrypted .borderly backup file.
 *
 * Layout:
 *  - Title + subtitle
 *  - Backup file content text area (paste .borderly contents here)
 *  - Passphrase input (secureTextEntry)
 *  - Inline validation/decryption error (live region)
 *  - Restore button (shows loading state during decryption)
 *  - Success state (shown after a successful import)
 *  - Cancel / close button
 */

import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Button, Card } from '@/components/ui';
import { useBackupRestore } from '@/hooks/useBackupRestore';

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------

export interface RestoreBackupModalProps {
  visible: boolean;
  onClose: () => void;
  /** Called after a successful restore so the caller can react (e.g., reload state). */
  onRestoreComplete?: () => void;
}

export default function RestoreBackupModal({
  visible,
  onClose,
  onRestoreComplete,
}: RestoreBackupModalProps) {
  const {
    fileContent,
    passphrase,
    isLoading,
    error,
    isSuccess,
    setFileContent,
    setPassphrase,
    handleRestore,
    reset,
  } = useBackupRestore();

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleDone = () => {
    reset();
    onClose();
    onRestoreComplete?.();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
      accessible={true}
      accessibilityViewIsModal={true}
    >
      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ padding: 24 }}
        keyboardShouldPersistTaps="handled"
        testID="restore-backup-modal"
      >
        {/* Header row */}
        <View className="flex-row items-center justify-between mb-6">
          <Text
            className="text-2xl font-bold text-gray-900"
            accessibilityRole="header"
            testID="restore-backup-heading"
          >
            Restore Backup
          </Text>
          <TouchableOpacity
            onPress={handleClose}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Close restore modal"
            testID="restore-backup-close-button"
            className="p-2"
          >
            <Text className="text-base text-blue-600 font-medium">Cancel</Text>
          </TouchableOpacity>
        </View>

        {isSuccess ? (
          // --- Success state ---
          <View testID="restore-success-view">
            <View className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <Text
                className="text-base font-semibold text-green-900 mb-2"
                accessibilityRole="header"
              >
                ✓ Restore Complete
              </Text>
              <Text className="text-sm text-green-800">
                Your backup has been successfully decrypted and imported. Restart the app
                to see your restored data.
              </Text>
            </View>
            <Button
              title="Done"
              onPress={handleDone}
              variant="primary"
              size="large"
              fullWidth
              accessibilityLabel="Finish restore and close modal"
              testID="restore-done-button"
            />
          </View>
        ) : (
          // --- Input state ---
          <View>
            {/* Description */}
            <Card>
              <View className="bg-blue-50 p-4 rounded-lg mb-2">
                <Text className="text-sm font-semibold text-blue-900 mb-1">🔒 Encrypted Restore</Text>
                <Text className="text-sm text-blue-800">
                  Paste the contents of your .borderly backup file below, then enter the
                  passphrase you chose when you created the backup.
                </Text>
              </View>
            </Card>

            <View className="mt-4">
              {/* Backup file content field */}
              <Text
                className="text-sm font-medium text-gray-700 mb-1"
                accessibilityElementsHidden={true}
              >
                Backup File Content
              </Text>
              <TextInput
                multiline
                numberOfLines={4}
                value={fileContent}
                onChangeText={setFileContent}
                placeholder="Paste your .borderly file contents here"
                className="border border-gray-300 rounded-lg p-3 mb-4 text-sm text-gray-900 bg-gray-50"
                style={{ minHeight: 100, textAlignVertical: 'top' }}
                accessible={true}
                accessibilityLabel="Backup file content, required. Paste your .borderly file contents here"
                autoCapitalize="none"
                autoCorrect={false}
                testID="restore-file-content-input"
              />

              {/* Passphrase field */}
              <Text
                className="text-sm font-medium text-gray-700 mb-1"
                accessibilityElementsHidden={true}
              >
                Passphrase
              </Text>
              <TextInput
                value={passphrase}
                onChangeText={setPassphrase}
                placeholder="Enter backup passphrase"
                secureTextEntry={true}
                className="border border-gray-300 rounded-lg p-3 mb-4 text-sm text-gray-900"
                accessible={true}
                accessibilityLabel="Backup passphrase, required"
                autoCapitalize="none"
                autoComplete="password"
                testID="restore-passphrase-input"
              />

              {/* Inline error (live region so screen readers announce it) */}
              {error ? (
                <View
                  className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4"
                  accessible={true}
                  accessibilityRole="text"
                  accessibilityLiveRegion="polite"
                  testID="restore-error-message"
                >
                  <Text className="text-sm text-red-700">{error}</Text>
                </View>
              ) : null}

              {/* Restore button */}
              {isLoading ? (
                <View className="flex-row items-center justify-center py-3 mb-3">
                  <ActivityIndicator
                    size="small"
                    color="#2563EB"
                    accessibilityLabel="Decrypting backup, please wait"
                  />
                  <Text className="text-sm text-gray-600 ml-2">Decrypting backup…</Text>
                </View>
              ) : (
                <Button
                  title="Restore Backup"
                  onPress={handleRestore}
                  variant="primary"
                  size="large"
                  fullWidth
                  accessibilityLabel="Restore backup from file"
                  accessibilityHint="Decrypts your backup file and restores all data"
                  testID="restore-backup-submit-button"
                />
              )}

              {/* Warning */}
              <View className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4 mb-3">
                <Text
                  className="text-xs text-amber-800"
                  accessibilityRole="text"
                >
                  ⚠️ Restoring a backup will merge the backed-up data with your current
                  data. Existing profiles, trips, and QR codes will be preserved.
                </Text>
              </View>

              {/* Cancel (bottom) */}
              <View className="mt-2">
                <Button
                  title="Cancel"
                  onPress={handleClose}
                  variant="outline"
                  size="medium"
                  fullWidth
                  accessibilityLabel="Cancel and close restore modal"
                  testID="restore-backup-cancel-button"
                />
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </Modal>
  );
}
