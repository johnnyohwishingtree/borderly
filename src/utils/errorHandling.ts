/**
 * Error Handling Utilities
 * 
 * Provides centralized error handling, logging, and user-friendly messaging
 * for the Borderly application.
 */

import { Alert } from 'react-native';

export interface AppError {
  code: string;
  message: string;
  details?: string;
  recoverable: boolean;
  userMessage: string;
}

export interface ErrorContext {
  screen?: string;
  action?: string;
  userId?: string;
  timestamp: number;
  errorInfo?: Record<string, unknown>;
}

// Error types
export const ERROR_CODES = {
  // Network errors
  NETWORK_UNAVAILABLE: 'NETWORK_UNAVAILABLE',
  REQUEST_TIMEOUT: 'REQUEST_TIMEOUT',
  SERVER_ERROR: 'SERVER_ERROR',
  
  // Storage errors
  STORAGE_UNAVAILABLE: 'STORAGE_UNAVAILABLE',
  STORAGE_FULL: 'STORAGE_FULL',
  KEYCHAIN_ACCESS_DENIED: 'KEYCHAIN_ACCESS_DENIED',
  
  // Camera/MRZ errors
  CAMERA_UNAVAILABLE: 'CAMERA_UNAVAILABLE',
  CAMERA_PERMISSION_DENIED: 'CAMERA_PERMISSION_DENIED',
  MRZ_SCAN_FAILED: 'MRZ_SCAN_FAILED',
  
  // Form/validation errors
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  FORM_SUBMISSION_FAILED: 'FORM_SUBMISSION_FAILED',
  
  // General errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  PARSING_ERROR: 'PARSING_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

// Error message mappings
const ERROR_MESSAGES: Record<ErrorCode, { message: string; userMessage: string; recoverable: boolean }> = {
  [ERROR_CODES.NETWORK_UNAVAILABLE]: {
    message: 'Network connection is unavailable',
    userMessage: 'Please check your internet connection and try again.',
    recoverable: true,
  },
  [ERROR_CODES.REQUEST_TIMEOUT]: {
    message: 'Request timed out',
    userMessage: 'The request took too long. Please try again.',
    recoverable: true,
  },
  [ERROR_CODES.SERVER_ERROR]: {
    message: 'Server encountered an error',
    userMessage: 'Server is temporarily unavailable. Please try again later.',
    recoverable: true,
  },
  [ERROR_CODES.STORAGE_UNAVAILABLE]: {
    message: 'Device storage is unavailable',
    userMessage: 'Cannot access device storage. Please restart the app.',
    recoverable: false,
  },
  [ERROR_CODES.STORAGE_FULL]: {
    message: 'Device storage is full',
    userMessage: 'Not enough storage space. Please free up space and try again.',
    recoverable: true,
  },
  [ERROR_CODES.KEYCHAIN_ACCESS_DENIED]: {
    message: 'Keychain access denied',
    userMessage: 'Cannot access secure storage. Please check your biometric settings.',
    recoverable: true,
  },
  [ERROR_CODES.CAMERA_UNAVAILABLE]: {
    message: 'Camera is unavailable',
    userMessage: 'Camera is not available. Please check your device settings.',
    recoverable: true,
  },
  [ERROR_CODES.CAMERA_PERMISSION_DENIED]: {
    message: 'Camera permission denied',
    userMessage: 'Camera access is required. Please enable it in Settings.',
    recoverable: true,
  },
  [ERROR_CODES.MRZ_SCAN_FAILED]: {
    message: 'MRZ scanning failed',
    userMessage: 'Could not read passport. Please ensure good lighting and try again.',
    recoverable: true,
  },
  [ERROR_CODES.VALIDATION_FAILED]: {
    message: 'Form validation failed',
    userMessage: 'Please check the form fields and try again.',
    recoverable: true,
  },
  [ERROR_CODES.FORM_SUBMISSION_FAILED]: {
    message: 'Form submission failed',
    userMessage: 'Could not submit form. Please try again.',
    recoverable: true,
  },
  [ERROR_CODES.UNKNOWN_ERROR]: {
    message: 'An unknown error occurred',
    userMessage: 'Something went wrong. Please try again or contact support.',
    recoverable: true,
  },
  [ERROR_CODES.PARSING_ERROR]: {
    message: 'Failed to parse data',
    userMessage: 'Invalid data format. Please try again.',
    recoverable: true,
  },
};

/**
 * Creates an AppError from an error code
 */
export function createAppError(
  code: ErrorCode,
  details?: string,
  overrideMessage?: string
): AppError {
  const errorInfo = ERROR_MESSAGES[code];
  
  const error: AppError = {
    code,
    message: errorInfo.message,
    recoverable: errorInfo.recoverable,
    userMessage: overrideMessage || errorInfo.userMessage,
  };

  if (details) {
    error.details = details;
  }

  return error;
}

/**
 * Creates an AppError from a generic Error
 */
export function createAppErrorFromError(
  error: Error,
  fallbackCode: ErrorCode = ERROR_CODES.UNKNOWN_ERROR
): AppError {
  // Check if it's a network error
  if (error.message.toLowerCase().includes('network')) {
    return createAppError(ERROR_CODES.NETWORK_UNAVAILABLE, error.message);
  }
  
  // Check if it's a timeout
  if (error.message.toLowerCase().includes('timeout')) {
    return createAppError(ERROR_CODES.REQUEST_TIMEOUT, error.message);
  }
  
  // Check if it's a permissions error
  if (error.message.toLowerCase().includes('permission')) {
    return createAppError(ERROR_CODES.CAMERA_PERMISSION_DENIED, error.message);
  }
  
  // Default to fallback code
  return createAppError(fallbackCode, error.message);
}

/**
 * Logs an error for debugging/monitoring
 */
export function logError(
  error: AppError | Error,
  context?: ErrorContext
) {
  const timestamp = Date.now();
  const errorData = {
    ...context,
    timestamp,
    error: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
    } : error,
  };
  
  console.error('Borderly Error:', errorData);
  
  // In production, you might send this to a crash reporting service
  // like Crashlytics, Sentry, or Bugsnag
}

/**
 * Shows an error alert to the user
 */
export function showErrorAlert(
  error: AppError,
  onRetry?: () => void,
  onCancel?: () => void
) {
  const buttons = [];
  
  if (onCancel) {
    buttons.push({
      text: 'Cancel',
      style: 'cancel' as const,
      onPress: onCancel,
    });
  }
  
  if (error.recoverable && onRetry) {
    buttons.push({
      text: 'Try Again',
      onPress: onRetry,
    });
  } else {
    buttons.push({
      text: 'OK',
      onPress: onCancel,
    });
  }
  
  Alert.alert(
    'Error',
    error.userMessage,
    buttons
  );
}

/**
 * Handles an error by logging it and optionally showing an alert
 */
export function handleError(
  error: Error | AppError,
  context?: ErrorContext,
  options?: {
    showAlert?: boolean;
    onRetry?: () => void;
    onCancel?: () => void;
    fallbackErrorCode?: ErrorCode;
  }
) {
  const { 
    showAlert = true,
    onRetry,
    onCancel,
    fallbackErrorCode = ERROR_CODES.UNKNOWN_ERROR
  } = options || {};
  
  // Convert Error to AppError if needed
  const appError = error instanceof Error 
    ? createAppErrorFromError(error, fallbackErrorCode)
    : error;
  
  // Log the error
  logError(appError, context);
  
  // Show alert if requested
  if (showAlert) {
    showErrorAlert(appError, onRetry, onCancel);
  }
  
  return appError;
}

/**
 * Wraps an async function with error handling
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: ErrorContext,
  fallbackErrorCode?: ErrorCode
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const options: { showAlert: boolean; fallbackErrorCode?: ErrorCode } = { showAlert: false };
      if (fallbackErrorCode) {
        options.fallbackErrorCode = fallbackErrorCode;
      }
      throw handleError(error as Error, context, options);
    }
  };
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: any): error is AppError {
  return error && 
    typeof error.code === 'string' &&
    typeof error.message === 'string' &&
    typeof error.recoverable === 'boolean' &&
    typeof error.userMessage === 'string';
}