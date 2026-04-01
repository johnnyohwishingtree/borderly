import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { trigger, HapticFeedbackTypes } from 'react-native-haptic-feedback';
import { Check, Copy } from 'lucide-react-native';
import { copyWithTimeout } from '@/utils/clipboard';
import { COPYABLE_FIELD_IDS } from './testIDs';

export interface CopyableFieldProps {
  label: string;
  value: string | number | boolean;
  portalFieldName?: string;
  helpText?: string;
  formatValue?: (value: string | number | boolean) => string;
  accessibilityLabel?: string;
  travelerName?: string; // Optional: show which traveler this data belongs to
  showTravelerBadge?: boolean; // Whether to show traveler identification badge
}

export default function CopyableField({
  label,
  value,
  portalFieldName,
  helpText,
  formatValue,
  accessibilityLabel,
  travelerName,
  showTravelerBadge = false,
}: CopyableFieldProps) {
  const [copied, setCopied] = useState(false);
  // Keeps a reference to the clipboard-clear cancellation function so we can
  // cancel it if the component unmounts or another copy supersedes the first.
  const cancelClearRef = useRef<(() => void) | null>(null);

  // Clean up any pending clipboard clear on unmount.
  useEffect(() => {
    return () => {
      cancelClearRef.current?.();
    };
  }, []);

  const formattedValue = formatValue ? formatValue(value) : String(value);
  const displayValue = formattedValue || 'Not provided';

  const handleCopy = () => {
    if (!formattedValue) {
      Alert.alert('Cannot Copy', 'No value to copy');
      return;
    }

    try {
      // Cancel any existing clipboard clear before scheduling a new one.
      cancelClearRef.current?.();
      cancelClearRef.current = copyWithTimeout(formattedValue);

      setCopied(true);

      // Haptic feedback
      trigger(HapticFeedbackTypes.notificationSuccess, {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert('Copy Failed', 'Unable to copy to clipboard');
    }
  };

  return (
    <View className="mb-4 p-4 bg-surface-secondary rounded-xl border border-border-default">
      {/* Field Label */}
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <View className="flex-row items-center flex-wrap gap-1 mb-1">
            <Text className="text-sm font-medium text-primary">
              {label}
            </Text>
            {showTravelerBadge && travelerName && (
              <View className="bg-purple-100 dark:bg-purple-900 px-2 py-1 rounded-md ml-2">
                <Text className="text-xs font-medium text-purple-700 dark:text-purple-300">
                  {travelerName}
                </Text>
              </View>
            )}
          </View>
          {portalFieldName && (
            <Text className="text-xs text-accent bg-blue-50 dark:bg-blue-950 px-2 py-1 rounded-md self-start">
              Portal field: {portalFieldName}
            </Text>
          )}
        </View>
      </View>

      {/* Value Display and Copy Button */}
      <Pressable
        onPress={handleCopy}
        className={`
          mt-2 p-3 rounded-lg border-2 border-dashed
          flex-row items-center justify-between
          ${copied
            ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-950'
            : 'border-border-default bg-surface'
          }
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
              formattedValue
                ? 'text-primary'
                : 'text-muted italic'
            }`}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {displayValue}
          </Text>
        </View>

        <View
          className="flex-row items-center"
          accessibilityLiveRegion="polite"
          accessibilityLabel={copied ? 'Copied to clipboard' : undefined}
          testID={COPYABLE_FIELD_IDS.copyStatusArea.id}
        >
          {copied ? (
            <>
              <Check size={20} color="#10B981" accessible={false} />
              <Text className="text-sm font-medium text-success ml-2">
                Copied!
              </Text>
            </>
          ) : (
            <>
              <Copy size={20} color="#6B7280" accessible={false} />
              <Text className="text-sm font-medium text-secondary ml-2">
                Copy
              </Text>
            </>
          )}
        </View>
      </Pressable>

      {/* Help Text */}
      {helpText && (
        <Text className="text-xs text-tertiary mt-2 leading-4">
          {helpText}
        </Text>
      )}
    </View>
  );
}
