/**
 * Enhanced Error Handler Service
 * 
 * Provides centralized error handling with recovery mechanisms,
 * user feedback, and integration with the retry system.
 */

import { Alert } from 'react-native';
import { 
  AppError, 
  ErrorContext, 
  ERROR_CODES, 
  createAppError, 
  createAppErrorFromError,
  logError,
  showErrorAlert
} from '../../utils/errorHandling';
import { retryAsync, RetryConfig, RETRY_CONFIGS } from '../../utils/retryLogic';

export interface ErrorRecoveryOptions {
  showUserFeedback?: boolean;
  enableRetry?: boolean;
  retryConfig?: Partial<RetryConfig>;
  fallbackAction?: () => void | Promise<void>;
  onRecoverySuccess?: () => void;
  onRecoveryFailure?: (error: AppError) => void;
}

export interface ErrorRecoveryResult {
  recovered: boolean;
  error?: AppError;
  attempts?: number;
  recoveredViaFallback?: boolean;
}

/**
 * Enhanced error handler with recovery mechanisms
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private recoveryCallbacks = new Map<string, () => Promise<void>>();

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle an error with automatic recovery attempts
   */
  async handleError(
    error: Error | AppError,
    context?: ErrorContext,
    options?: ErrorRecoveryOptions
  ): Promise<ErrorRecoveryResult> {
    const {
      showUserFeedback = true,
      enableRetry = false,
      retryConfig,
      fallbackAction,
      onRecoverySuccess,
      onRecoveryFailure
    } = options || {};

    // Convert to AppError if needed
    const appError = error instanceof Error 
      ? createAppErrorFromError(error)
      : error;

    // Log the error (sanitized to avoid PII leakage)
    const sanitizedError = {
      ...appError,
      message: appError.userMessage || 'An error occurred',
      details: appError.code // Only log error code, not details that may contain PII
    };
    logError(sanitizedError as AppError, context);

    // Try automatic recovery if enabled and error is recoverable
    if (enableRetry && appError.recoverable) {
      const recoveryResult = await this.attemptRecovery(
        appError, 
        retryConfig,
        context
      );

      if (recoveryResult.recovered) {
        onRecoverySuccess?.();
        return recoveryResult;
      }

      // If recovery failed, try fallback
      if (fallbackAction) {
        try {
          await fallbackAction();
          return { recovered: true, recoveredViaFallback: true };
        } catch (fallbackError) {
          const fallbackAppError = createAppErrorFromError(fallbackError as Error);
          logError(fallbackAppError, { ...context, action: 'fallback' });
        }
      }

      onRecoveryFailure?.(appError);
    }

    // Show user feedback if requested
    if (showUserFeedback) {
      this.showUserErrorFeedback(appError, options);
    }

    return { recovered: false, error: appError };
  }

  /**
   * Attempt automatic recovery for recoverable errors
   */
  private async attemptRecovery(
    appError: AppError,
    retryConfig?: Partial<RetryConfig>,
    context?: ErrorContext
  ): Promise<ErrorRecoveryResult> {
    // Get appropriate retry configuration
    const config = this.getRetryConfigForError(appError, retryConfig);
    
    // Get recovery callback for this error type
    const recoveryCallback = this.getRecoveryCallback(appError.code);
    
    if (!recoveryCallback) {
      return { recovered: false, error: appError };
    }

    try {
      const result = await retryAsync(recoveryCallback, config);
      
      if (result.success) {
        logError(appError, {
          ...context,
          action: 'auto_recovery_success',
          attempts: result.attempts,
          duration: result.totalTime
        });
        return { recovered: true, attempts: result.attempts };
      }

      return { 
        recovered: false, 
        error: result.error ? createAppErrorFromError(result.error) : appError,
        attempts: result.attempts
      };
    } catch (recoveryError) {
      return { 
        recovered: false, 
        error: createAppErrorFromError(recoveryError as Error),
        attempts: 0
      };
    }
  }

  /**
   * Get appropriate retry configuration for error type
   */
  private getRetryConfigForError(
    appError: AppError,
    customConfig?: Partial<RetryConfig>
  ): RetryConfig {
    // First determine the correct base configuration based on error type
    const baseConfig = (() => {
      switch (appError.code) {
        case ERROR_CODES.NETWORK_UNAVAILABLE:
        case ERROR_CODES.REQUEST_TIMEOUT:
        case ERROR_CODES.SERVER_ERROR:
          return RETRY_CONFIGS.network;
          
        case ERROR_CODES.STORAGE_UNAVAILABLE:
        case ERROR_CODES.KEYCHAIN_ACCESS_DENIED:
          return RETRY_CONFIGS.storage;
          
        case ERROR_CODES.CAMERA_UNAVAILABLE:
        case ERROR_CODES.MRZ_SCAN_FAILED:
          return RETRY_CONFIGS.camera;
          
        default:
          return RETRY_CONFIGS.quick;
      }
    })();

    // Merge custom config with the appropriate base config
    return customConfig ? { ...baseConfig, ...customConfig } : baseConfig;
  }

  /**
   * Get recovery callback for error code
   */
  private getRecoveryCallback(errorCode: string): (() => Promise<void>) | undefined {
    return this.recoveryCallbacks.get(errorCode);
  }

  /**
   * Register a recovery callback for an error code
   */
  registerRecoveryCallback(errorCode: string, callback: () => Promise<void>): void {
    this.recoveryCallbacks.set(errorCode, callback);
  }

  /**
   * Show user-friendly error feedback
   */
  private showUserErrorFeedback(appError: AppError, options?: ErrorRecoveryOptions): void {
    const { retryConfig, enableRetry } = options || {};
    
    // Determine if retry should be offered
    const shouldShowRetry = enableRetry && appError.recoverable;
    
    if (shouldShowRetry && this.recoveryCallbacks.has(appError.code)) {
      // Show alert with retry option
      showErrorAlert(
        appError,
        () => this.handleError(appError, undefined, options),
        () => {/* user cancelled */}
      );
    } else {
      // Show simple error alert
      Alert.alert('Error', appError.userMessage, [{ text: 'OK' }]);
    }
  }

  /**
   * Handle network connectivity errors
   */
  async handleNetworkError(
    error: Error,
    context?: ErrorContext,
    options?: ErrorRecoveryOptions
  ): Promise<ErrorRecoveryResult> {
    const networkError = createAppError(
      ERROR_CODES.NETWORK_UNAVAILABLE,
      error.message,
      'Please check your internet connection and try again.'
    );

    return this.handleError(networkError, context, {
      enableRetry: true,
      retryConfig: RETRY_CONFIGS.network,
      ...options
    });
  }

  /**
   * Handle storage/keychain errors
   */
  async handleStorageError(
    error: Error,
    context?: ErrorContext,
    options?: ErrorRecoveryOptions
  ): Promise<ErrorRecoveryResult> {
    const storageError = createAppError(
      ERROR_CODES.STORAGE_UNAVAILABLE,
      error.message,
      'Unable to access secure storage. Please restart the app or check your device settings.'
    );

    return this.handleError(storageError, context, {
      enableRetry: true,
      retryConfig: RETRY_CONFIGS.storage,
      ...options
    });
  }

  /**
   * Handle camera/MRZ scanning errors
   */
  async handleCameraError(
    error: Error,
    context?: ErrorContext,
    options?: ErrorRecoveryOptions
  ): Promise<ErrorRecoveryResult> {
    let cameraError: AppError;

    if (error.message.toLowerCase().includes('permission')) {
      cameraError = createAppError(
        ERROR_CODES.CAMERA_PERMISSION_DENIED,
        error.message,
        'Camera access is required to scan your passport. Please enable camera permission in Settings.'
      );
    } else {
      cameraError = createAppError(
        ERROR_CODES.CAMERA_UNAVAILABLE,
        error.message,
        'Camera is not available. Please check your device and try again.'
      );
    }

    return this.handleError(cameraError, context, {
      enableRetry: true,
      retryConfig: RETRY_CONFIGS.camera,
      ...options
    });
  }

  /**
   * Handle form validation errors
   */
  async handleValidationError(
    error: Error,
    context?: ErrorContext,
    options?: ErrorRecoveryOptions
  ): Promise<ErrorRecoveryResult> {
    const validationError = createAppError(
      ERROR_CODES.VALIDATION_FAILED,
      error.message,
      'Please check the form fields and correct any errors before continuing.'
    );

    return this.handleError(validationError, context, {
      enableRetry: false, // Don't auto-retry validation errors
      showUserFeedback: true,
      ...options
    });
  }

  /**
   * Handle MRZ scanning failures
   */
  async handleMRZError(
    error: Error,
    context?: ErrorContext,
    options?: ErrorRecoveryOptions
  ): Promise<ErrorRecoveryResult> {
    const mrzError = createAppError(
      ERROR_CODES.MRZ_SCAN_FAILED,
      error.message,
      'Could not read your passport. Please ensure good lighting and hold your passport steady.'
    );

    return this.handleError(mrzError, context, {
      enableRetry: true,
      retryConfig: RETRY_CONFIGS.camera,
      ...options
    });
  }

  /**
   * Create a wrapped function with automatic error handling
   * 
   * WARNING: This wrapper should only be used for operations where recovery 
   * implies the original action can be successfully retried. Do NOT use with 
   * fallbackActions that change the application flow, as this will cause
   * unexpected re-execution of the original function after the fallback.
   */
  withErrorHandling<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context?: Partial<ErrorContext>,
    options?: ErrorRecoveryOptions
  ) {
    return async (...args: T): Promise<R> => {
      try {
        return await fn(...args);
      } catch (error) {
        const fullContext: ErrorContext = {
          timestamp: Date.now(),
          ...context
        };

        const result = await this.handleError(error as Error, fullContext, options);
        
        if (result.recovered && !result.recoveredViaFallback) {
          // Only retry if recovered through automatic mechanisms, not via fallback
          return await fn(...args);
        }
        
        // Re-throw the error if not recovered or recovered via fallback
        throw result.error || error;
      }
    };
  }

  /**
   * Clear all registered recovery callbacks
   */
  clearRecoveryCallbacks(): void {
    this.recoveryCallbacks.clear();
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Convenience functions
export const handleNetworkError = errorHandler.handleNetworkError.bind(errorHandler);
export const handleStorageError = errorHandler.handleStorageError.bind(errorHandler);
export const handleCameraError = errorHandler.handleCameraError.bind(errorHandler);
export const handleValidationError = errorHandler.handleValidationError.bind(errorHandler);
export const handleMRZError = errorHandler.handleMRZError.bind(errorHandler);
export const withErrorHandling = errorHandler.withErrorHandling.bind(errorHandler);