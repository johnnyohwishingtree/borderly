import React from 'react';
import { View, Text } from 'react-native';
import LoadingIndicator, { LoadingIndicatorProps } from './LoadingIndicator';
import { HapticFeedback } from './HapticFeedback';
import { ScreenReaderUtils } from '../../utils/accessibility';

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
    ? 'absolute inset-0 bg-white/95 z-50 items-center justify-center px-6'
    : `py-8 px-6 items-center ${className}`;

  if (state === 'success') {
    return (
      <View className={containerClasses}>
        <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4">
          <Text className="text-green-600 text-2xl font-bold">✓</Text>
        </View>
        <Text 
          className="text-lg font-semibold text-gray-900 text-center mb-2"
          accessibilityRole="text"
        >
          Success!
        </Text>
        <Text 
          className="text-base text-gray-600 text-center"
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
        <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
          <Text className="text-red-600 text-2xl font-bold">!</Text>
        </View>
        
        <Text 
          className="text-lg font-semibold text-gray-900 text-center mb-2"
          accessibilityRole="text"
        >
          {state === 'timeout' ? 'Request Timed Out' : 'Error'}
        </Text>
        
        <Text 
          className="text-base text-gray-600 text-center mb-6 max-w-sm leading-6"
          accessibilityRole="text"
        >
          {state === 'timeout' 
            ? 'The request is taking longer than expected. Please check your connection and try again.'
            : errorMessage
          }
        </Text>

        <View className="flex-row gap-3">
          {onCancel && (
            <TouchableOpacity
              className="px-6 py-3 bg-gray-100 rounded-xl"
              onPress={() => {
                HapticFeedback.button();
                onCancel();
              }}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text className="text-gray-700 font-medium">Cancel</Text>
            </TouchableOpacity>
          )}
          
          {showRetryButton && onRetry && (
            <TouchableOpacity
              className="px-6 py-3 bg-blue-600 rounded-xl"
              onPress={() => {
                HapticFeedback.button();
                onRetry();
              }}
              accessibilityRole="button"
              accessibilityLabel={retryButtonText}
              accessibilityHint="Retry the failed operation"
            >
              <Text className="text-white font-medium">{retryButtonText}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return null;
}

// Predefined loading state patterns for common use cases
export const LoadingPatterns = {
  /**
   * Standard data fetching pattern
   */
  DataFetch: (props: Omit<LoadingStateProps, 'variant' | 'size'>) => (
    <LoadingStates 
      {...props}
      variant="spinner"
      size="medium"
      text="Loading data..."
    />
  ),

  /**
   * Form submission pattern with progress
   */
  FormSubmission: (props: Omit<LoadingStateProps, 'variant' | 'showProgress'>) => (
    <LoadingStates
      {...props}
      variant="spinner" 
      size="medium"
      text="Submitting form..."
      showProgress={true}
    />
  ),

  /**
   * File upload pattern with progress
   */
  FileUpload: (props: Omit<LoadingStateProps, 'variant' | 'showProgress' | 'cancelable'>) => (
    <LoadingStates
      {...props}
      variant="pulse"
      size="large"
      text="Uploading file..."
      showProgress={true}
      cancelable={true}
    />
  ),

  /**
   * Image processing pattern
   */
  ImageProcessing: (props: Omit<LoadingStateProps, 'variant'>) => (
    <LoadingStates
      {...props}
      variant="pulse"
      size="large"
      text="Processing image..."
    />
  ),

  /**
   * Camera scanning pattern
   */
  CameraScanning: (props: Omit<LoadingStateProps, 'variant' | 'size'>) => (
    <LoadingStates
      {...props}
      variant="dots"
      size="large"
      text="Scanning..."
    />
  ),

  /**
   * Navigation transition pattern
   */
  Navigation: (props: Omit<LoadingStateProps, 'variant' | 'size' | 'fullScreen'>) => (
    <LoadingStates
      {...props}
      variant="spinner"
      size="small"
      fullScreen={false}
    />
  ),

  /**
   * API call pattern with timeout
   */
  APICall: (props: Omit<LoadingStateProps, 'variant' | 'timeout'>) => (
    <LoadingStates
      {...props}
      variant="spinner"
      size="medium"
      timeout={10000}
      text="Connecting to server..."
    />
  ),

  /**
   * Full screen overlay for critical operations
   */
  CriticalOperation: (props: Omit<LoadingStateProps, 'fullScreen' | 'cancelable'>) => (
    <LoadingStates
      {...props}
      fullScreen={true}
      cancelable={false}
      size="large"
    />
  )
} as const;

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

// Missing import fix
import { TouchableOpacity } from 'react-native';