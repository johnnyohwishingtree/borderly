import { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, Pressable } from 'react-native';

export interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  text?: string;
  variant?: 'spinner' | 'skeleton' | 'overlay';
  fullScreen?: boolean;
  timeout?: number; // Timeout in milliseconds
  onTimeout?: () => void;
  onCancel?: () => void;
  cancelable?: boolean;
}

export default function LoadingSpinner({
  size = 'medium',
  color,
  text,
  variant = 'spinner',
  fullScreen = false,
  timeout,
  onTimeout,
  onCancel,
  cancelable = false,
}: LoadingSpinnerProps) {
  const [showTimeout, setShowTimeout] = useState(false);

  useEffect(() => {
    if (timeout && timeout > 0) {
      const timer = setTimeout(() => {
        setShowTimeout(true);
        if (onTimeout) {
          onTimeout();
        }
      }, timeout);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [timeout, onTimeout]);
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
        accessibilityLabel="Loading"
      />
      {text && (
        <Text className={getTextStyles()}>
          {text}
        </Text>
      )}
      
      {showTimeout && (
        <Text className="text-orange-600 text-sm mt-2 text-center">
          This is taking longer than expected...
        </Text>
      )}
      
      {cancelable && onCancel && (
        <Pressable
          onPress={onCancel}
          className="mt-4 py-2 px-4 bg-gray-100 rounded-lg"
          accessibilityLabel="Cancel loading"
          accessibilityHint="Cancel the current operation"
        >
          <Text className="text-gray-700 text-center font-medium">
            Cancel
          </Text>
        </Pressable>
      )}
    </View>
  );
}