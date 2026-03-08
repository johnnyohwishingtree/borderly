import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, Pressable } from 'react-native';

export interface LoadingIndicatorProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  text?: string;
  variant?: 'spinner' | 'dots' | 'pulse';
  fullScreen?: boolean;
  timeout?: number; // Timeout in milliseconds
  onTimeout?: () => void;
  onCancel?: () => void;
  cancelable?: boolean;
  showProgress?: boolean;
  progress?: number; // 0-1 for progress indicator
}

export default function LoadingIndicator({
  size = 'medium',
  color,
  text,
  variant = 'spinner',
  fullScreen = false,
  timeout,
  onTimeout,
  onCancel,
  cancelable = false,
  showProgress = false,
  progress = 0,
}: LoadingIndicatorProps) {
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

  const renderProgressIndicator = () => {
    if (!showProgress) return null;

    const progressPercentage = Math.round(progress * 100);
    
    return (
      <View className="w-48 mt-4">
        <View className="w-full bg-gray-200 rounded-full h-2">
          <View 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </View>
        <Text className="text-xs text-gray-500 mt-1 text-center">
          {progressPercentage}%
        </Text>
      </View>
    );
  };

  const renderDotsIndicator = () => {
    return (
      <View className="flex-row items-center space-x-1">
        {[0, 1, 2].map((index) => (
          <View
            key={index}
            className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"
            style={{
              animationDelay: `${index * 200}ms`,
            }}
          />
        ))}
      </View>
    );
  };

  const renderPulseIndicator = () => {
    return (
      <View className="relative">
        <View className="w-12 h-12 bg-blue-100 rounded-full animate-pulse" />
        <View className="absolute inset-0 w-12 h-12 bg-blue-200 rounded-full animate-pulse" 
              style={{ animationDelay: '500ms' }} />
        <View className="absolute inset-2 w-8 h-8 bg-blue-600 rounded-full" />
      </View>
    );
  };

  const renderLoadingIndicator = () => {
    switch (variant) {
      case 'dots':
        return renderDotsIndicator();
      case 'pulse':
        return renderPulseIndicator();
      case 'spinner':
      default:
        return (
          <ActivityIndicator
            size={getSpinnerSize()}
            color={getSpinnerColor()}
            accessibilityLabel="Loading"
          />
        );
    }
  };

  return (
    <View className={getContainerStyles()}>
      {renderLoadingIndicator()}
      
      {text && (
        <Text className={getTextStyles()}>
          {text}
        </Text>
      )}

      {renderProgressIndicator()}
      
      {showTimeout && (
        <Text className="text-orange-600 text-sm mt-2 text-center max-w-sm">
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