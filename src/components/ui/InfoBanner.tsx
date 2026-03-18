import { View, Text, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';

export interface InfoBannerProps {
  message: string;
  onDismiss: () => void;
  testID?: string;
}

/**
 * A subtle, dismissible informational banner.
 * Appears inline (not floating) at the top of a screen.
 */
export default function InfoBanner({ message, onDismiss, testID }: InfoBannerProps) {
  return (
    <View
      testID={testID}
      className="bg-blue-50 border-b border-blue-100 px-4 py-3 flex-row items-center justify-between"
      accessibilityRole="alert"
      accessibilityLabel={message}
    >
      <Text
        className="text-sm text-blue-800 flex-1 mr-3"
        numberOfLines={2}
      >
        ℹ️ {message}
      </Text>
      <TouchableOpacity
        onPress={onDismiss}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Dismiss banner"
        testID={testID ? `${testID}-dismiss` : undefined}
      >
        <X size={16} color="#1e40af" />
      </TouchableOpacity>
    </View>
  );
}
