/**
 * Error handling and retry utilities for automation
 */

export class ErrorHandling {
  /**
   * Create retry configuration with exponential backoff
   */
  static createRetryConfig(
    maxAttempts: number = 3,
    baseDelay: number = 1000,
    maxDelay: number = 10000,
    backoffFactor: number = 2
  ) {
    return {
      maxAttempts,
      baseDelay,
      maxDelay,
      backoffFactor,
      shouldRetry: (error: Error, attempt: number): boolean => {
        // Don't retry certain types of errors
        if (error.message.includes('Element not found') ||
            error.message.includes('Timeout') ||
            error.message.includes('Security validation failed')) {
          return false;
        }

        return attempt < maxAttempts;
      },
      getDelay: (attempt: number): number => {
        const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt - 1), maxDelay);
        // Add jitter to prevent thundering herd
        return delay + Math.random() * 1000;
      }
    };
  }

  /**
   * Wrap function with retry logic
   */
  static withRetry<T>(
    fn: () => Promise<T>,
    config = ErrorHandling.createRetryConfig()
  ): () => Promise<T> {
    return async (): Promise<T> => {
      let lastError: Error;

      for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
        try {
          return await fn();
        } catch (error) {
          lastError = error as Error;

          if (!config.shouldRetry(lastError, attempt) || attempt === config.maxAttempts) {
            throw lastError;
          }

          const delay = config.getDelay(attempt);
          await new Promise<void>(resolve => setTimeout(() => resolve(), delay));
        }
      }

      throw lastError!;
    };
  }

  /**
   * Categorize errors for better handling
   */
  static categorizeError(error: Error): {
    category: 'network' | 'element' | 'validation' | 'timeout' | 'security' | 'unknown';
    severity: 'low' | 'medium' | 'high';
    retryable: boolean;
    userMessage: string;
  } {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return {
        category: 'network',
        severity: 'medium',
        retryable: true,
        userMessage: 'Network connection issue. Please check your internet connection.'
      };
    }

    if (message.includes('element not found') || message.includes('selector')) {
      return {
        category: 'element',
        severity: 'high',
        retryable: false,
        userMessage: 'Form element not found. The page may have changed.'
      };
    }

    if (message.includes('validation') || message.includes('invalid')) {
      return {
        category: 'validation',
        severity: 'medium',
        retryable: false,
        userMessage: 'Data validation failed. Please check your information.'
      };
    }

    if (message.includes('timeout')) {
      return {
        category: 'timeout',
        severity: 'medium',
        retryable: true,
        userMessage: 'Operation timed out. The page may be loading slowly.'
      };
    }

    if (message.includes('security') || message.includes('permission')) {
      return {
        category: 'security',
        severity: 'high',
        retryable: false,
        userMessage: 'Security check failed. Please try manual submission.'
      };
    }

    return {
      category: 'unknown',
      severity: 'medium',
      retryable: true,
      userMessage: 'An unexpected error occurred. Please try again.'
    };
  }
}
