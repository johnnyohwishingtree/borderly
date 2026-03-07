import React, { useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { trigger, HapticFeedbackTypes } from 'react-native-haptic-feedback';
import Clipboard from '@react-native-clipboard/clipboard';
import { CheckIcon, DocumentDuplicateIcon } from 'react-native-heroicons/outline';

export interface CopyableFieldProps {
  label: string;
  value: string | number | boolean;
  portalFieldName?: string;
  helpText?: string;
  formatValue?: (value: string | number | boolean) => string;
  accessibilityLabel?: string;
}

export default function CopyableField({
  label,
  value,
  portalFieldName,
  helpText,
  formatValue,
  accessibilityLabel,
}: CopyableFieldProps) {
  const [copied, setCopied] = useState(false);

  const formattedValue = formatValue ? formatValue(value) : String(value);
  const displayValue = formattedValue || 'Not provided';

  const handleCopy = async () => {
    if (!formattedValue) {
      Alert.alert('Cannot Copy', 'No value to copy');
      return;
    }

    try {
      await Clipboard.setString(formattedValue);
      setCopied(true);
      
      // Haptic feedback
      trigger(HapticFeedbackTypes.notificationSuccess, {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      Alert.alert('Copy Failed', 'Unable to copy to clipboard');
    }
  };

  return (
    <View className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
      {/* Field Label */}
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-sm font-medium text-gray-900 mb-1">
            {label}
          </Text>
          {portalFieldName && (
            <Text className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-md self-start">
              Portal field: {portalFieldName}
            </Text>
          )}
        </View>
      </View>

      {/* Value Display and Copy Button */}
      <Pressable
        onPress={handleCopy}
        className={`
          mt-2 p-3 rounded-lg border-2 border-dashed border-gray-300 
          bg-white flex-row items-center justify-between
          ${copied ? 'border-green-400 bg-green-50' : 'border-gray-300'}
        `}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || `Copy ${label}: ${displayValue}`}
        accessibilityHint="Double tap to copy this value to clipboard"
        style={({ pressed }) => ({
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View className="flex-1 mr-3">
          <Text 
            className={`text-base font-mono ${
              formattedValue ? 'text-gray-900' : 'text-gray-400 italic'
            }`}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {displayValue}
          </Text>
        </View>

        <View className="flex-row items-center">
          {copied ? (
            <>
              <CheckIcon size={20} color="#10B981" />
              <Text className="text-sm font-medium text-green-600 ml-2">
                Copied!
              </Text>
            </>
          ) : (
            <>
              <DocumentDuplicateIcon size={20} color="#6B7280" />
              <Text className="text-sm font-medium text-gray-600 ml-2">
                Copy
              </Text>
            </>
          )}
        </View>
      </Pressable>

      {/* Help Text */}
      {helpText && (
        <Text className="text-xs text-gray-500 mt-2 leading-4">
          {helpText}
        </Text>
      )}
    </View>
  );
}