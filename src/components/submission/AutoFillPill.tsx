import { Pressable, Animated } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { useRef, useEffect } from 'react';
import { AUTOFILL_PILL_IDS } from './testIDs';

export interface AutoFillPillProps {
  /** Called when the user taps the pill — triggers auto-fill immediately */
  onAutoFill: () => void;
  /** Called when the user long-presses to dismiss */
  onDismiss: () => void;
  testID?: string;
}

/**
 * AutoFillPill — 1Password-style floating icon.
 *
 * Small circular Borderly icon floating at the bottom-right of the
 * WebView. Single tap fills all form fields. Long-press dismisses.
 * No text, no card, no profile selector — just an icon.
 */
export function AutoFillPill({
  onAutoFill,
  onDismiss,
  testID,
}: AutoFillPillProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 200,
      friction: 15,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  return (
    <Animated.View
      className="absolute bottom-6 right-4 z-50"
      style={{ transform: [{ scale: scaleAnim }] }}
      pointerEvents="box-none"
      testID={testID ?? AUTOFILL_PILL_IDS.container.id}
    >
      <Pressable
        onPress={onAutoFill}
        onLongPress={onDismiss}
        className="w-14 h-14 rounded-full bg-blue-600 items-center justify-center shadow-lg elevation-8"
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
        accessibilityRole="button"
        accessibilityLabel="Auto-fill all form fields"
        accessibilityHint="Long press to dismiss"
        testID={AUTOFILL_PILL_IDS.fillButton.id}
      >
        <Sparkles size={24} color="#ffffff" />
      </Pressable>
    </Animated.View>
  );
}
