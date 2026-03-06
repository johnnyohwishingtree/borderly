import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

export interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  text?: string;
  variant?: 'spinner' | 'skeleton' | 'overlay';
  fullScreen?: boolean;
}

export default function LoadingSpinner({
  size = 'medium',
  color,
  text,
  variant = 'spinner',
  fullScreen = false,
}: LoadingSpinnerProps) {
  const getSpinnerSize = () => {
    switch (size) {
      case 'small':
        return 'small' as const;
      case 'medium':
        return 32;
      case 'large':
        return 48;
      default:
        return 32;
    }
  };

  const getSpinnerColor = () => {
    if (color) return color;
    return '#3B82F6'; // blue-600
  };

  const getContainerStyles = () => {
    const baseStyles = 'items-center justify-center';
    
    if (fullScreen) {
      return `${baseStyles} absolute inset-0 bg-white/90 z-50`;
    }
    
    if (variant === 'overlay') {
      return `${baseStyles} absolute inset-0 bg-black/20 z-40`;
    }
    
    return `${baseStyles} py-8`;
  };

  const getTextStyles = () => {
    const baseStyles = 'text-gray-600 font-medium mt-3';
    
    const sizeStyles = {
      small: 'text-sm',
      medium: 'text-base',
      large: 'text-lg',
    };
    
    return `${baseStyles} ${sizeStyles[size]}`;
  };

  if (variant === 'skeleton') {
    return (
      <View className="space-y-3 p-4">
        <View className="h-4 bg-gray-200 rounded-lg animate-pulse" />
        <View className="h-4 bg-gray-200 rounded-lg animate-pulse w-4/5" />
        <View className="h-4 bg-gray-200 rounded-lg animate-pulse w-3/5" />
      </View>
    );
  }

  return (
    <View className={getContainerStyles()}>
      <ActivityIndicator
        size={getSpinnerSize()}
        color={getSpinnerColor()}
      />
      {text && (
        <Text className={getTextStyles()}>
          {text}
        </Text>
      )}
    </View>
  );
}