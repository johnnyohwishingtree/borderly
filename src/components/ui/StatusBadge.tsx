import React from 'react';
import { View, Text, ViewProps } from 'react-native';

export interface StatusBadgeProps extends ViewProps {
  status: 'success' | 'error' | 'warning' | 'info' | 'neutral';
  size?: 'small' | 'medium' | 'large';
  variant?: 'filled' | 'outlined' | 'soft';
  text: string;
}

export default function StatusBadge({
  status,
  size = 'medium',
  variant = 'soft',
  text,
  className,
  ...viewProps
}: StatusBadgeProps) {
  const getBadgeStyles = () => {
    const baseStyles = 'flex-row items-center justify-center rounded-full';

    const sizeStyles = {
      small: 'px-2 py-1',
      medium: 'px-3 py-1.5',
      large: 'px-4 py-2',
    };

    const statusStyles = {
      success: {
        filled: 'bg-green-600',
        outlined: 'bg-transparent border-2 border-green-600',
        soft: 'bg-green-100',
      },
      error: {
        filled: 'bg-red-600',
        outlined: 'bg-transparent border-2 border-red-600',
        soft: 'bg-red-100',
      },
      warning: {
        filled: 'bg-yellow-600',
        outlined: 'bg-transparent border-2 border-yellow-600',
        soft: 'bg-yellow-100',
      },
      info: {
        filled: 'bg-blue-600',
        outlined: 'bg-transparent border-2 border-blue-600',
        soft: 'bg-blue-100',
      },
      neutral: {
        filled: 'bg-gray-600',
        outlined: 'bg-transparent border-2 border-gray-600',
        soft: 'bg-gray-100',
      },
    };

    return `${baseStyles} ${sizeStyles[size]} ${statusStyles[status][variant]} ${className || ''}`.trim();
  };

  const getTextStyles = () => {
    const baseStyles = 'font-semibold';

    const sizeStyles = {
      small: 'text-xs',
      medium: 'text-sm',
      large: 'text-base',
    };

    const textColors = {
      success: {
        filled: 'text-white',
        outlined: 'text-green-600',
        soft: 'text-green-800',
      },
      error: {
        filled: 'text-white',
        outlined: 'text-red-600',
        soft: 'text-red-800',
      },
      warning: {
        filled: 'text-white',
        outlined: 'text-yellow-600',
        soft: 'text-yellow-800',
      },
      info: {
        filled: 'text-white',
        outlined: 'text-blue-600',
        soft: 'text-blue-800',
      },
      neutral: {
        filled: 'text-white',
        outlined: 'text-gray-600',
        soft: 'text-gray-800',
      },
    };

    return `${baseStyles} ${sizeStyles[size]} ${textColors[status][variant]}`;
  };

  return (
    <View className={getBadgeStyles()} {...viewProps}>
      <Text className={getTextStyles()}>{text}</Text>
    </View>
  );
}