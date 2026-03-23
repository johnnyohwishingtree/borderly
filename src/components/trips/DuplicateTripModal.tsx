import { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { DatePickerField } from '@/components/ui';
import { useAccessibilityFocus } from '@/hooks/useAccessibilityFocus';

export interface DuplicateTripModalProps {
  visible: boolean;
  onClose: () => void;
  /** Called with the ISO departure date string when the user confirms */
  onConfirm: (newDepartureDate: string) => void;
  loading?: boolean;
  error?: string | null;
  testID?: string;
}

/**
 * Modal for duplicating a trip. The user picks a new departure date before
 * confirming. Calls `onConfirm` with the selected ISO date string.
 */
export default function DuplicateTripModal({
  visible,
  onClose,
  onConfirm,
  loading = false,
  error = null,
  testID = 'duplicate-trip-modal',
}: DuplicateTripModalProps) {
  const [departureDate, setDepartureDate] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);

  const { ref: titleRef } = useAccessibilityFocus({ shouldFocus: visible, delay: 350 });

  const handleConfirm = () => {
    if (!departureDate) {
      setDateError('Please select a new departure date');
      return;
    }
    setDateError(null);
    onConfirm(departureDate);
  };

  const handleClose = () => {
    setDepartureDate('');
    setDateError(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
      testID={testID}
    >
      <KeyboardAvoidingView
        className="flex-1 bg-gray-50 dark:bg-gray-900"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View className="bg-white dark:bg-gray-800 px-4 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={handleClose}
            activeOpacity={0.7}
            testID="duplicate-trip-modal-cancel"
            accessibilityLabel="Cancel duplicate trip"
            accessibilityRole="button"
            accessibilityState={{ disabled: loading }}
            disabled={loading}
          >
            <Text className="text-blue-600 dark:text-blue-400 font-medium">Cancel</Text>
          </TouchableOpacity>

          <Text
            ref={titleRef}
            className="text-lg font-bold text-gray-900 dark:text-white"
            accessibilityRole="header"
            testID="duplicate-trip-modal-title"
          >
            Duplicate Trip
          </Text>

          <TouchableOpacity
            onPress={handleConfirm}
            activeOpacity={0.7}
            testID="duplicate-trip-modal-confirm"
            accessibilityLabel="Confirm duplicate trip"
            accessibilityRole="button"
            accessibilityState={{ disabled: loading }}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#2563eb" testID="duplicate-trip-loading-indicator" />
            ) : (
              <Text className="text-blue-600 dark:text-blue-400 font-medium">Duplicate</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Body */}
        <View className="p-4">
          <View className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <Text className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              New Departure Date
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              All leg dates will shift relative to this new start date.
            </Text>
            <DatePickerField
              value={departureDate}
              onChange={date => {
                setDepartureDate(date);
                setDateError(null);
              }}
              label="Departure date"
              placeholder="Select departure date"
              required
              error={dateError ?? undefined}
              testID="duplicate-trip-departure-date"
            />
          </View>

          {/* Error live region */}
          {error ? (
            <View
              className="mt-3 bg-red-50 dark:bg-red-900/20 rounded-lg p-3"
              accessibilityLiveRegion="polite"
              accessibilityRole="text"
              testID="duplicate-trip-modal-error"
            >
              <Text className="text-red-600 dark:text-red-400 text-sm">{error}</Text>
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
