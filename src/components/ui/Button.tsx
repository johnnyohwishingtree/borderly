import { Pressable, Text, ActivityIndicator } from 'react-native';
import { useColorScheme } from 'nativewind';
import { HapticFeedback } from './HapticFeedback';
import {
  TouchTargetUtils,
  ACCESSIBILITY_CONSTANTS,
  AccessibilityStateHelpers
} from '@/utils/accessibility';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'link' | 'tab';
  highContrastMode?: boolean;
  testID?: string;
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
  accessibilityRole = 'button',
  highContrastMode = false,
  testID,
}: ButtonProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const getButtonStyles = () => {
    const baseStyles = 'rounded-xl flex-row items-center justify-center transition-all duration-150';

    // Ensure minimum touch target sizes
    const sizeStyles = {
      small: `px-4 py-2.5 min-h-[${ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET}px]`,
      medium: `px-6 py-3.5 min-h-[${ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET}px]`,
      large: `px-8 py-4.5 min-h-[${Math.max(52, ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET)}px]`,
    };

    const variantStyles = highContrastMode ? {
      primary: 'bg-black border-2 border-white',
      secondary: 'bg-transparent',
      outline: 'bg-transparent border-2 border-black',
      danger: 'bg-red-700 border-2 border-white',
    } : {
      primary: 'bg-blue-600 dark:bg-blue-500 shadow-lg shadow-blue-600/25',
      secondary: 'bg-transparent',
      outline: 'bg-transparent border-2 border-border-default shadow-sm',
      danger: 'bg-red-600 dark:bg-red-500 shadow-lg shadow-red-600/25',
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

    const variantStyles = highContrastMode ? {
      primary: 'text-white',
      secondary: 'text-blue-800',
      outline: 'text-black',
      danger: 'text-white',
    } : {
      primary: 'text-white',
      secondary: 'text-blue-600 dark:text-blue-400',
      outline: 'text-primary',
      danger: 'text-white',
    };

    return `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]}`;
  };

  const handlePress = () => {
    if (!disabled && !loading) {
      // Trigger haptic feedback based on button size
      if (size === 'large') {
        HapticFeedback.button('large');
      } else if (size === 'medium') {
        HapticFeedback.button('medium');
      } else {
        HapticFeedback.button('small');
      }
      onPress();
    }
  };

  // Create accessibility state
  const accessibilityState = AccessibilityStateHelpers.createButtonState(
    disabled,
    loading,
    false
  );

  return (
    <Pressable
      className={getButtonStyles()}
      onPress={handlePress}
      disabled={disabled || loading}
      
      // Core accessibility props
      accessible={true}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState}
      
      // Enhanced accessibility
      importantForAccessibility="yes"
      hitSlop={TouchTargetUtils.getHitSlop(
        size === 'small' ? 80 : size === 'medium' ? 120 : 160,
        ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET
      )}
      
      // Testing
      testID={testID}
      
      style={({ pressed }) => ({
        opacity: pressed && !disabled && !loading ? 0.85 : 1,
        transform: [{ scale: pressed && !disabled && !loading ? 0.96 : 1 }],
        elevation: pressed && !disabled && !loading ? 2 : 0,
      })}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary'
            ? (highContrastMode ? '#FFFFFF' : 'white')
            : (highContrastMode ? '#000000' : (isDark ? '#93C5FD' : '#2563EB'))
          }
          className="mr-2"
          accessibilityLabel="Loading"
        />
      ) : null}
      <Text className={getTextStyles()} accessible={false}>
        {title}
      </Text>
    </Pressable>
  );
}
