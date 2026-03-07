import React from 'react';
import { View, Text } from 'react-native';
import Button from './Button';
import { createAppError, logError, ERROR_CODES } from '../../utils/errorHandling';

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{
    error: Error;
    resetError: () => void;
  }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

function DefaultErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const isDevelopment = __DEV__;

  return (
    <View className="flex-1 items-center justify-center px-6 bg-white">
      <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-6">
        <Text className="text-red-600 text-2xl font-bold">!</Text>
      </View>
      
      <Text className="text-xl font-semibold text-gray-900 text-center mb-3">
        Something went wrong
      </Text>
      
      <Text className="text-base text-gray-600 text-center mb-8 max-w-sm leading-6">
        We're sorry for the inconvenience. Please try again or contact support if the problem persists.
      </Text>
      
      {isDevelopment && (
        <View className="mb-6 p-4 bg-gray-100 rounded-lg max-w-full">
          <Text className="text-sm font-mono text-gray-700 text-center">
            {error.message}
          </Text>
        </View>
      )}
      
      <Button
        title="Try Again"
        onPress={resetError}
        variant="primary"
        size="medium"
      />
    </View>
  );
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Convert to AppError and log with proper context
    const appError = createAppError(ERROR_CODES.UNKNOWN_ERROR, error.message);
    logError(appError, {
      screen: 'ErrorBoundary',
      action: 'componentDidCatch',
      timestamp: Date.now(),
      errorInfo: {
        componentStack: errorInfo.componentStack,
        errorBoundary: this.constructor.name,
      },
    });
    
    // Call the optional onError callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to handle errors
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  if (error) {
    throw error;
  }

  return { captureError, resetError };
}