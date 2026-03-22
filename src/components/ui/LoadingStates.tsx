import React from 'react';
import { View, Text } from 'react-native';
import LoadingIndicator, { LoadingIndicatorProps } from './LoadingIndicator';
import { HapticFeedback } from './HapticFeedback';
import { ScreenReaderUtils } from '../../utils/accessibility';
import Button from './Button';

/**
 * Centralized loading states component providing consistent loading UX patterns
 * across the entire application. Includes accessibility and haptic feedback.
 */

export interface LoadingStateProps extends Omit<LoadingIndicatorProps, 'fullScreen'> {
  state: 'idle' | 'loading' | 'success' | 'error' | 'timeout';
  errorMessage?: string;
  successMessage?: string;
  onRetry?: () => void;
  onCancel?: () => void;
  showRetryButton?: boolean;
  retryButtonText?: string;
  fullScreen?: boolean;
  announceStateChanges?: boolean;
  className?: string;
}

export default function LoadingStates({
  state,
  errorMessage = 'Something went wrong. Please try again.',
  successMessage = 'Completed successfully',
  onRetry,
  onCancel,
  showRetryButton = true,
  retryButtonText = 'Try Again',
  fullScreen = false,
  announceStateChanges = true,
  className = '',
  ...loadingProps
}: LoadingStateProps) {
  
  // Announce state changes for screen readers
  React.useEffect(() => {
    if (!announceStateChanges) return;
    
    switch (state) {
      case 'loading':
        ScreenReaderUtils.announce('Loading, please wait');
        break;
      case 'success':
        ScreenReaderUtils.announce(successMessage);
        HapticFeedback.success();
        break;
      case 'error':
        ScreenReaderUtils.announce(`Error: ${errorMessage}`);
        HapticFeedback.error();
        break;
      case 'timeout':
        ScreenReaderUtils.announce('Request timed out');
        HapticFeedback.warning();
        break;
    }
  }, [state, successMessage, errorMessage, announceStateChanges]);

  if (state === 'idle') {
    return null;
  }

  if (state === 'loading') {
    return (
      <LoadingIndicator 
        fullScreen={fullScreen}
        {...loadingProps}
      />
    );
  }

  const containerClasses = fullScreen
    ? 'absolute inset-0 bg-white/95 dark:bg-gray-900/95 z-50 items-center justify-center px-6'
    : `py-8 px-6 items-center ${className}`;

  if (state === 'success') {
    return (
      <View className={containerClasses}>
        <View className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full items-center justify-center mb-4">
          <Text className="text-green-600 dark:text-green-400 text-2xl font-bold">✓</Text>
        </View>
        <Text
          className="text-lg font-semibold text-gray-900 dark:text-gray-100 text-center mb-2"
          accessibilityRole="text"
        >
          Success!
        </Text>
        <Text
          className="text-base text-gray-600 dark:text-gray-400 text-center"
          accessibilityRole="text"
        >
          {successMessage}
        </Text>
      </View>
    );
  }

  if (state === 'error' || state === 'timeout') {
    return (
      <View className={containerClasses}>
        <View className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full items-center justify-center mb-4">
          <Text className="text-red-600 dark:text-red-400 text-2xl font-bold">!</Text>
        </View>

        <Text
          className="text-lg font-semibold text-gray-900 dark:text-gray-100 text-center mb-2"
          accessibilityRole="text"
        >
          {state === 'timeout' ? 'Request Timed Out' : 'Error'}
        </Text>

        <Text
          className="text-base text-gray-600 dark:text-gray-400 text-center mb-6 max-w-sm leading-6"
          accessibilityRole="text"
        >
          {state === 'timeout' 
            ? 'The request is taking longer than expected. Please check your connection and try again.'
            : errorMessage
          }
        </Text>

        <View className="flex-row gap-3">
          {onCancel && (
            <Button
              title="Cancel"
              onPress={onCancel}
              variant="outline"
              accessibilityLabel="Cancel"
            />
          )}

          {showRetryButton && onRetry && (
            <Button
              title={retryButtonText}
              onPress={onRetry}
              variant="primary"
              accessibilityLabel={retryButtonText}
              accessibilityHint="Retry the failed operation"
            />
          )}
        </View>
      </View>
    );
  }

  return null;
}

// Hook for managing loading states
export function useLoadingState(initialState: LoadingStateProps['state'] = 'idle') {
  const [state, setState] = React.useState<LoadingStateProps['state']>(initialState);
  const [error, setError] = React.useState<string | undefined>();
  const [success, setSuccess] = React.useState<string | undefined>();

  const setLoading = React.useCallback(() => {
    setState('loading');
    setError(undefined);
    setSuccess(undefined);
  }, []);

  const setLoadingSuccess = React.useCallback((message?: string) => {
    setState('success');
    setSuccess(message);
    setError(undefined);
  }, []);

  const setLoadingError = React.useCallback((message: string) => {
    setState('error');
    setError(message);
    setSuccess(undefined);
  }, []);

  const setLoadingTimeout = React.useCallback(() => {
    setState('timeout');
    setError(undefined);
    setSuccess(undefined);
  }, []);

  const reset = React.useCallback(() => {
    setState('idle');
    setError(undefined);
    setSuccess(undefined);
  }, []);

  const retry = React.useCallback(() => {
    setState('loading');
    setError(undefined);
    setSuccess(undefined);
  }, []);

  return {
    state,
    error,
    success,
    setLoading,
    setLoadingSuccess,
    setLoadingError,
    setLoadingTimeout,
    reset,
    retry,
  };
}

