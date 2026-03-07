import React from 'react';
import { View, Text } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Button } from './Button';
import { AppError } from '../../utils/errorHandling';

export interface ErrorMessageProps {
  error?: AppError | string | null;
  title?: string;
  showRetry?: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'inline' | 'card' | 'fullscreen';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

/**
 * ErrorMessage Component
 * 
 * A reusable component for displaying error messages with consistent styling
 * and optional retry/dismiss actions. Supports multiple display variants and
 * integrates with the app's error handling system.
 */
export function ErrorMessage({
  error,
  title,
  showRetry = false,
  onRetry,
  onDismiss,
  variant = 'inline',
  size = 'medium',
  className = '',
}: ErrorMessageProps) {
  // Don't render if no error
  if (!error) return null;

  // Extract error details
  const isAppError = typeof error === 'object' && error !== null;
  const errorMessage = isAppError ? error.userMessage : error;
  const errorTitle = title || (isAppError ? 'Error' : 'Something went wrong');
  const isRecoverable = isAppError ? error.recoverable : true;

  // Size-based styling
  const sizeStyles = {
    small: {
      container: 'p-3',
      icon: 'text-lg',
      title: 'text-sm font-medium',
      message: 'text-xs',
      button: 'small' as const,
    },
    medium: {
      container: 'p-4',
      icon: 'text-xl',
      title: 'text-base font-semibold',
      message: 'text-sm',
      button: 'medium' as const,
    },
    large: {
      container: 'p-6',
      icon: 'text-2xl',
      title: 'text-lg font-semibold',
      message: 'text-base',
      button: 'large' as const,
    },
  };

  const currentSize = sizeStyles[size];

  // Variant-specific styling
  const getVariantStyles = () => {
    switch (variant) {
      case 'inline':
        return 'bg-red-50 border border-red-200 rounded-lg';
      case 'card':
        return 'bg-red-50 border border-red-200 rounded-xl shadow-sm';
      case 'fullscreen':
        return 'flex-1 bg-white items-center justify-center';
      default:
        return 'bg-red-50 border border-red-200 rounded-lg';
    }
  };

  const getIconStyles = () => {
    switch (variant) {
      case 'fullscreen':
        return 'w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-6';
      default:
        return '';
    }
  };

  const renderIcon = () => {
    if (variant === 'fullscreen') {
      return (
        <View className={getIconStyles()}>
          <MaterialIcons name="error" size={32} color="#DC2626" />
        </View>
      );
    }
    return (
      <MaterialIcons 
        name="error-outline" 
        size={variant === 'inline' ? 20 : 24} 
        color="#DC2626" 
        style={{ marginRight: 8 }}
      />
    );
  };

  const renderActions = () => {
    if (!showRetry && !onDismiss) return null;

    const buttonSpacing = variant === 'fullscreen' ? 'space-y-3' : 'space-y-2';

    return (
      <View className={`mt-4 ${buttonSpacing}`}>
        {showRetry && isRecoverable && onRetry && (
          <Button
            title="Try Again"
            onPress={onRetry}
            variant="primary"
            size={currentSize.button}
          />
        )}
        {onDismiss && (
          <Button
            title="Dismiss"
            onPress={onDismiss}
            variant="outline"
            size={currentSize.button}
          />
        )}
      </View>
    );
  };

  if (variant === 'fullscreen') {
    return (
      <View className={`${getVariantStyles()} px-6 ${className}`}>
        {renderIcon()}
        
        <Text className={`${currentSize.title} text-red-800 text-center mb-3`}>
          {errorTitle}
        </Text>
        
        <Text className={`${currentSize.message} text-red-600 text-center max-w-sm leading-6`}>
          {errorMessage}
        </Text>
        
        {renderActions()}
      </View>
    );
  }

  return (
    <View className={`${getVariantStyles()} ${currentSize.container} ${className}`}>
      <View className="flex-row items-start">
        {renderIcon()}
        
        <View className="flex-1">
          <Text className={`${currentSize.title} text-red-800 mb-1`}>
            {errorTitle}
          </Text>
          
          <Text className={`${currentSize.message} text-red-600 leading-5`}>
            {errorMessage}
          </Text>
          
          {renderActions()}
        </View>
      </View>
    </View>
  );
}

/**
 * Hook for managing error state with ErrorMessage component
 */
export function useErrorMessage() {
  const [error, setError] = React.useState<AppError | string | null>(null);

  const showError = React.useCallback((err: AppError | string) => {
    setError(err);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return { error, showError, clearError };
}

export default ErrorMessage;