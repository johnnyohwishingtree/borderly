import { View, ViewProps, Pressable } from 'react-native';
import { HapticFeedback } from './HapticFeedback';
import { TouchTargetUtils, ACCESSIBILITY_CONSTANTS } from '../../utils/accessibility';

export interface CardProps extends ViewProps {
  variant?: 'default' | 'outlined' | 'elevated' | 'ghost';
  padding?: 'none' | 'small' | 'medium' | 'large';
  radius?: 'small' | 'medium' | 'large';
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'none' | 'text';
  accessibilityState?: any;
  highContrastMode?: boolean;
  testID?: string;
}

export default function Card({
  variant = 'default',
  padding = 'medium',
  radius = 'medium',
  className,
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = onPress ? 'button' : 'none',
  accessibilityState,
  highContrastMode = false,
  testID,
  ...viewProps
}: CardProps) {
  const getCardStyles = (pressed = false) => {
    const baseStyles = highContrastMode 
      ? 'bg-white border-2 border-black transition-all duration-150' 
      : 'bg-white transition-all duration-150';
    const pressedStyles = pressed && onPress ? 'scale-[0.98] shadow-sm' : '';

    const radiusStyles = {
      small: 'rounded-lg',
      medium: 'rounded-xl',
      large: 'rounded-2xl',
    };

    const variantStyles = highContrastMode ? {
      default: '',
      outlined: 'border-2 border-black',
      elevated: 'border-2 border-black shadow-lg',
      ghost: 'bg-gray-100 border-2 border-gray-800',
    } : {
      default: '',
      outlined: 'border border-gray-200',
      elevated: 'shadow-lg shadow-gray-900/10 border border-gray-100',
      ghost: 'bg-gray-50/50',
    };

    const paddingStyles = {
      none: '',
      small: 'p-3',
      medium: 'p-4',
      large: 'p-6',
    };

    // Ensure minimum touch target for interactive cards
    const interactiveStyles = onPress ? `min-h-[${ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET}px]` : '';

    return `${baseStyles} ${radiusStyles[radius]} ${variantStyles[variant]} ${paddingStyles[padding]} ${interactiveStyles} ${pressedStyles} ${className || ''}`.trim();
  };

  const handlePress = () => {
    if (onPress) {
      HapticFeedback.card();
      onPress();
    }
  };

  if (onPress) {
    return (
      <Pressable
        className={getCardStyles()}
        onPress={handlePress}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={accessibilityState}
        accessible={true}
        importantForAccessibility="yes"
        hitSlop={TouchTargetUtils.getHitSlop(100, ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET)}
        style={({ pressed }) => ({
          opacity: pressed ? 0.95 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
        testID={testID}
        {...viewProps}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      className={getCardStyles()}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessible={accessibilityRole !== 'none'}
      testID={testID}
      {...viewProps}
    >
      {children}
    </View>
  );
}
