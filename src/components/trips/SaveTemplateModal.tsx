/**
 * SaveTemplateModal
 *
 * A slide-up modal that lets the user confirm the name for a new trip template
 * before saving.  The initial name is pre-filled from the trip name and can
 * be edited inline.
 */

import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BookmarkPlus } from 'lucide-react-native';

export interface SaveTemplateModalProps {
  /** Controls modal visibility. */
  visible: boolean;
  /** Initial value for the template name field (typically the trip name). */
  initialName: string;
  /** Called when the user taps "Save". Receives the confirmed name. */
  onSave: (name: string) => void | Promise<void>;
  /** Called when the user taps "Cancel" or dismisses the modal. */
  onCancel: () => void;
  /** Test ID prefix for integration / E2E tests. */
  testID?: string;
}

export default function SaveTemplateModal({
  visible,
  initialName,
  onSave,
  onCancel,
  testID = 'save-template-modal',
}: SaveTemplateModalProps) {
  const [name, setName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const inputRef = useRef<TextInput>(null);

  // Reset state each time the modal is shown
  useEffect(() => {
    if (visible) {
      setName(initialName);
      setError(undefined);
      setIsSaving(false);
      // Delay auto-focus slightly so the slide animation has started
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [visible, initialName]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a name for the template.');
      return;
    }
    setError(undefined);
    setIsSaving(true);
    try {
      await onSave(trimmed);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
      testID={testID}
      accessibilityViewIsModal={true}
    >
      <KeyboardAvoidingView
        className="flex-1 bg-gray-50 dark:bg-gray-900"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View className="bg-white dark:bg-gray-800 px-4 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={onCancel}
            activeOpacity={0.7}
            testID={`${testID}-cancel`}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            disabled={isSaving}
          >
            <Text className="text-blue-600 dark:text-blue-400 font-medium">Cancel</Text>
          </TouchableOpacity>

          <Text
            className="text-lg font-bold text-gray-900 dark:text-white"
            accessibilityRole="header"
            testID={`${testID}-title`}
          >
            Save as Template
          </Text>

          <TouchableOpacity
            onPress={handleSave}
            activeOpacity={0.7}
            testID={`${testID}-save`}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Save template"
            accessibilityHint="Saves this trip as a reusable template"
            accessibilityState={{ disabled: isSaving || !name.trim() }}
            disabled={isSaving || !name.trim()}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              <Text
                className={`font-semibold ${
                  name.trim() ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Body */}
        <View className="flex-1 p-4">
          {/* Icon + description */}
          <View className="items-center mb-6 mt-4">
            <View className="w-16 h-16 bg-blue-50 dark:bg-blue-950 rounded-full items-center justify-center mb-3">
              <BookmarkPlus
                size={32}
                color="#2563eb"
                accessibilityElementsHidden={true}
                importantForAccessibility="no-hide-descendants"
              />
            </View>
            <Text className="text-base text-gray-600 dark:text-gray-400 text-center px-4">
              Templates save your destinations and typical durations — not dates or submitted data.
            </Text>
          </View>

          {/* Name field */}
          <View className="bg-white dark:bg-gray-800 rounded-xl px-4 py-4 mb-2">
            <Text
              className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              accessibilityElementsHidden={true}
              importantForAccessibility="no-hide-descendants"
            >
              Template name
            </Text>
            <TextInput
              ref={inputRef}
              value={name}
              onChangeText={text => {
                setName(text);
                if (error) setError(undefined);
              }}
              placeholder="e.g., Japan–Singapore Loop"
              placeholderTextColor="#9ca3af"
              returnKeyType="done"
              onSubmitEditing={handleSave}
              className="text-base text-gray-900 dark:text-white"
              testID={`${testID}-name-input`}
              accessibilityLabel="Template name, required"
              accessibilityHint="Enter a name for this reusable trip template"
            />
          </View>

          {/* Inline error */}
          {error && (
            <Text
              className="text-red-500 text-sm ml-1"
              accessibilityLiveRegion="polite"
              accessibilityRole="text"
              testID={`${testID}-error`}
            >
              {error}
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
