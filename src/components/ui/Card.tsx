import React from 'react';
import { View, ViewProps, Pressable } from 'react-native';
import { trigger } from 'react-native-haptic-feedback';

export interface CardProps extends ViewProps {
  variant?: 'default' | 'outlined' | 'elevated' | 'ghost';
  padding?: 'none' | 'small' | 'medium' | 'large';
  radius?: 'small' | 'medium' | 'large';
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'none' | 'text';
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
  ...viewProps
}: CardProps) {
  const getCardStyles = (pressed = false) => {
    const baseStyles = 'bg-white transition-all duration-150';
    const pressedStyles = pressed && onPress ? 'scale-[0.98] shadow-sm' : '';

    const radiusStyles = {
      small: 'rounded-lg',
      medium: 'rounded-xl',
      large: 'rounded-2xl',
    };

    const variantStyles = {
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

    const interactiveStyles = onPress ? 'min-h-[44px]' : '';

    return `${baseStyles} ${radiusStyles[radius]} ${variantStyles[variant]} ${paddingStyles[padding]} ${interactiveStyles} ${pressedStyles} ${className || ''}`.trim();
  };

  const handlePress = () => {
    if (onPress) {
      trigger('impactLight', { enableVibrateFallback: true });
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
        style={({ pressed }) => ({
          opacity: pressed ? 0.95 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
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
      {...viewProps}
    >
      {children}
    </View>
  );
}
