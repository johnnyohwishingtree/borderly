import { useCallback, useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { X } from 'lucide-react-native';

export interface AutoFillBannerProps {
  /** Number of fields successfully auto-filled */
  filled: number;
  /** Total number of fields that were attempted */
  total: number;
  /** Called when the banner is dismissed (by user or auto-dismiss timer) */
  onDismiss: () => void;
  testID?: string;
}

/**
 * AutoFillBanner — shows "X of Y fields auto-filled" feedback after page-level auto-fill.
 *
 * - Success style (green) when all fields were filled.
 * - Warning style (amber) when some fields could not be filled.
 * - Auto-dismisses after 4 seconds.
 * - Can be manually dismissed via the X button.
 */
export function AutoFillBanner({ filled, total, onDismiss, testID }: AutoFillBannerProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  const dismiss = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    // Call immediately — don't wait for animation to complete
    onDismiss();
  }, [opacity, onDismiss]);

  useEffect(() => {
    // Fade in on mount
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Auto-dismiss after 4 s
    const timer = setTimeout(dismiss, 4000);
    return () => clearTimeout(timer);
  }, [opacity, dismiss]);

  const isWarning = filled < total;
  const bgColor = isWarning ? '#FFFBEB' : '#F0FDF4';
  const borderColor = isWarning ? '#FCD34D' : '#86EFAC';
  const textColor = isWarning ? '#92400E' : '#166534';
  const iconColor = isWarning ? '#B45309' : '#16A34A';
  const fieldWord = total === 1 ? 'field' : 'fields';

  return (
    <Animated.View style={{ opacity }} testID={testID ?? 'autofill-banner'}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: bgColor,
          borderTopWidth: 1,
          borderTopColor: borderColor,
        }}
      >
        <Text
          style={{ flex: 1, fontSize: 13, color: textColor, fontWeight: '500' }}
          testID="autofill-banner-message"
        >
          {filled} of {total} {fieldWord} auto-filled — please review before continuing
        </Text>
        <Pressable
          onPress={dismiss}
          style={{ marginLeft: 8, padding: 4 }}
          accessibilityLabel="Dismiss auto-fill notification"
          testID="autofill-banner-dismiss"
        >
          <X size={16} color={iconColor} />
        </Pressable>
      </View>
    </Animated.View>
  );
}
