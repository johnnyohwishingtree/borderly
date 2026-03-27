/**
 * ExportBackupModal
 *
 * A full-screen modal sheet that walks the user through creating an
 * encrypted .borderly backup file and sharing it via the OS share sheet.
 *
 * Layout:
 *  - Title + subtitle
 *  - Passphrase input (secureTextEntry)
 *  - Confirm passphrase input (secureTextEntry)
 *  - Passphrase strength indicator
 *  - Inline validation error (live region)
 *  - Export button (shows loading state during encryption)
 *  - Cancel / close button
 */

import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Input, Button, Card } from '@/components/ui';
import { useBackupExport, type PassphraseStrength } from '@/hooks/useBackupExport';
import { EXPORT_BACKUP_IDS } from './testIDs';

// ---------------------------------------------------------------------------
// Sub-component: strength indicator
// ---------------------------------------------------------------------------

interface StrengthIndicatorProps {
  strength: PassphraseStrength;
  visible: boolean;
}

function StrengthIndicator({ strength, visible }: StrengthIndicatorProps) {
  if (!visible) return null;

  const config: Record<PassphraseStrength, { label: string; color: string; filledBars: number }> = {
    weak:   { label: 'Weak',   color: '#EF4444', filledBars: 1 },
    fair:   { label: 'Fair',   color: '#F59E0B', filledBars: 2 },
    strong: { label: 'Strong', color: '#10B981', filledBars: 3 },
  };

  const { label, color, filledBars } = config[strength];

  return (
    <View
      className="mt-1 mb-4"
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`Passphrase strength: ${label}`}
      testID={EXPORT_BACKUP_IDS.passphraseStrengthIndicator.id}
    >
      {/* Bar segments */}
      <View className="flex-row gap-1 mb-1">
        {[1, 2, 3].map((bar) => (
          <View
            key={bar}
            className="h-1.5 flex-1 rounded-full"
            style={{
              backgroundColor: bar <= filledBars ? color : '#E5E7EB',
            }}
          />
        ))}
      </View>
      <Text
        className="text-xs font-medium"
        style={{ color }}
        accessibilityElementsHidden={true}
      >
        {label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------

export interface ExportBackupModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ExportBackupModal({
  visible,
  onClose,
}: ExportBackupModalProps) {
  const {
    passphrase,
    confirmPassphrase,
    isLoading,
    error,
    strength,
    setPassphrase,
    setConfirmPassphrase,
    handleExport,
    reset,
  } = useBackupExport();

  const handleClose = () => {
    reset();
    onClose();
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
        className="flex-1 bg-white dark:bg-gray-900"
        contentContainerStyle={{ padding: 24 }}
        keyboardShouldPersistTaps="handled"
        testID={EXPORT_BACKUP_IDS.modal.id}
      >
        {/* Header row */}
        <View className="flex-row items-center justify-between mb-6">
          <Text
            className="text-2xl font-bold text-gray-900 dark:text-white"
            accessibilityRole="header"
          >
            Create Backup
          </Text>
          <TouchableOpacity
            onPress={handleClose}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Close backup modal"
            testID={EXPORT_BACKUP_IDS.exportBackupCloseButton.id}
            className="p-2"
          >
            <Text className="text-base text-blue-600 dark:text-blue-400 font-medium">Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* Description */}
        <Card>
          <View className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-2">
            <Text className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">🔒 Encrypted Backup</Text>
            <Text className="text-sm text-blue-800 dark:text-blue-200">
              Your backup is encrypted with AES-256-GCM. Choose a strong passphrase — you will need
              it to restore your data. There is no way to recover a forgotten passphrase.
            </Text>
          </View>
        </Card>

        <View className="mt-4">
          {/* Passphrase field */}
          <Input
            label="Passphrase"
            placeholder="Enter passphrase"
            secureTextEntry={true}
            value={passphrase}
            onChangeText={setPassphrase}
            required
            accessibilityLabel="Passphrase, required, minimum 8 characters"
            autoCapitalize="none"
            autoComplete="password-new"
            testID={EXPORT_BACKUP_IDS.passphraseField.id}
          />

          {/* Strength indicator — shown once user starts typing */}
          <StrengthIndicator
            strength={strength}
            visible={passphrase.length > 0}
          />

          {/* Confirm passphrase field */}
          <Input
            label="Confirm Passphrase"
            placeholder="Confirm passphrase"
            secureTextEntry={true}
            value={confirmPassphrase}
            onChangeText={setConfirmPassphrase}
            required
            accessibilityLabel="Confirm passphrase, required"
            autoCapitalize="none"
            autoComplete="password-new"
            testID={EXPORT_BACKUP_IDS.confirmPassphraseField.id}
          />

          {/* Inline error (live region so screen readers announce it) */}
          {error ? (
            <View
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4"
              accessible={true}
              accessibilityRole="text"
              accessibilityLiveRegion="polite"
              testID={EXPORT_BACKUP_IDS.exportErrorMessage.id}
            >
              <Text className="text-sm text-red-700 dark:text-red-300">{error}</Text>
            </View>
          ) : null}

          {/* Validation hints */}
          <View className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-6">
            <Text className="text-xs text-gray-600 dark:text-gray-400 mb-1">Passphrase requirements:</Text>
            <Text
              className={`text-xs ${passphrase.length >= 8 ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}
            >
              {passphrase.length >= 8 ? '✓' : '○'} Minimum 8 characters
            </Text>
            <Text
              className={`text-xs ${
                confirmPassphrase.length > 0 && passphrase === confirmPassphrase
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {confirmPassphrase.length > 0 && passphrase === confirmPassphrase
                ? '✓'
                : '○'}{' '}
              Passphrases match
            </Text>
          </View>

          {/* Export button */}
          {isLoading ? (
            <View className="flex-row items-center justify-center py-3 mb-3">
              <ActivityIndicator
                size="small"
                color="#2563EB"
                accessibilityLabel="Encrypting backup, please wait"
              />
              <Text className="text-sm text-gray-600 dark:text-gray-400 ml-2">Encrypting backup…</Text>
            </View>
          ) : (
            <Button
              title="Export Backup"
              onPress={handleExport}
              variant="primary"
              size="large"
              fullWidth
              accessibilityLabel="Export encrypted backup file"
              accessibilityHint="Encrypts your data and opens the share sheet"
              testID={EXPORT_BACKUP_IDS.exportBackupSubmitButton.id}
            />
          )}

          {/* Cancel (bottom) */}
          <View className="mt-4">
            <Button
              title="Cancel"
              onPress={handleClose}
              variant="outline"
              size="medium"
              fullWidth
              accessibilityLabel="Cancel and close backup modal"
              testID={EXPORT_BACKUP_IDS.exportBackupCancelButton.id}
            />
          </View>
        </View>
      </ScrollView>
    </Modal>
  );
}
