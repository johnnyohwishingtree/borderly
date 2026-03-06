import React from 'react';
import { View, ViewProps } from 'react-native';

export interface CardProps extends ViewProps {
  variant?: 'default' | 'outlined' | 'elevated' | 'ghost';
  padding?: 'none' | 'small' | 'medium' | 'large';
  radius?: 'small' | 'medium' | 'large';
}

export default function Card({
  variant = 'default',
  padding = 'medium',
  radius = 'medium',
  className,
  children,
  ...viewProps
}: CardProps) {
  const getCardStyles = () => {
    const baseStyles = 'bg-white';

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

    return `${baseStyles} ${radiusStyles[radius]} ${variantStyles[variant]} ${paddingStyles[padding]} ${className || ''}`.trim();
  };

  return (
    <View className={getCardStyles()} {...viewProps}>
      {children}
    </View>
  );
}
