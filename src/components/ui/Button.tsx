import { Pressable, Text, ActivityIndicator } from 'react-native';
import { trigger, HapticFeedbackTypes } from 'react-native-haptic-feedback';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  hapticType?: HapticFeedbackTypes;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  accessibilityLabel,
  accessibilityHint,
  hapticType = HapticFeedbackTypes.impactLight,
}: ButtonProps) {
  const getButtonStyles = () => {
    const baseStyles = 'rounded-xl flex-row items-center justify-center transition-all duration-150';

    const sizeStyles = {
      small: 'px-4 py-2.5 min-h-[36px]',
      medium: 'px-6 py-3.5 min-h-[44px]',
      large: 'px-8 py-4.5 min-h-[52px]',
    };

    const variantStyles = {
      primary: 'bg-blue-600 shadow-lg shadow-blue-600/25',
      secondary: 'bg-gray-600 shadow-lg shadow-gray-600/20',
      outline: 'bg-transparent border-2 border-gray-300 shadow-sm',
    };

    const disabledStyles = disabled || loading ? 'opacity-50 shadow-none' : '';
    const widthStyles = fullWidth ? 'w-full' : '';

    return `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${disabledStyles} ${widthStyles}`;
  };

  const getTextStyles = () => {
    const baseStyles = 'font-semibold tracking-wide';

    const sizeStyles = {
      small: 'text-sm',
      medium: 'text-base',
      large: 'text-lg',
    };

    const variantStyles = {
      primary: 'text-white',
      secondary: 'text-white',
      outline: 'text-gray-700',
    };

    return `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]}`;
  };

  const handlePress = () => {
    if (!disabled && !loading) {
      // Trigger haptic feedback
      trigger(hapticType, {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
      onPress();
    }
  };

  return (
    <Pressable
      className={getButtonStyles()}
      onPress={handlePress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        disabled: disabled || loading,
        busy: loading,
      }}
      style={({ pressed }) => ({
        opacity: pressed && !disabled && !loading ? 0.85 : 1,
        transform: [{ scale: pressed && !disabled && !loading ? 0.96 : 1 }],
        elevation: pressed && !disabled && !loading ? 2 : 0,
      })}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' ? '#374151' : 'white'}
          style={{ marginRight: 8 }}
        />
      ) : null}
      <Text className={getTextStyles()}>{title}</Text>
    </Pressable>
  );
}
