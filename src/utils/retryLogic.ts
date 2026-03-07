/**
 * Retry Logic Utilities
 * 
 * Provides configurable retry mechanisms for network requests,
 * storage operations, and other potentially failing operations.
 */

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  shouldRetry?: (error: Error, attempt: number) => boolean;
  onRetry?: (error: Error, attempt: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffStrategy: 'exponential',
};

/**
 * Default function to determine if an error should trigger a retry
 */
function defaultShouldRetry(error: Error, _attempt: number): boolean {
  const errorMessage = error.message.toLowerCase();
  
  // Retry for network-related errors
  const retryableErrors = [
    'network',
    'timeout',
    'connection',
    'fetch',
    'econnreset',
    'enotfound',
    'etimedout',
    'econnrefused',
  ];
  
  const isRetryableError = retryableErrors.some(keyword => 
    errorMessage.includes(keyword)
  );
  
  // Don't retry authentication or authorization errors
  const nonRetryableErrors = [
    'unauthorized',
    'forbidden',
    'authentication',
    'permission',
    'invalid_grant',
  ];
  
  const isNonRetryableError = nonRetryableErrors.some(keyword =>
    errorMessage.includes(keyword)
  );
  
  return isRetryableError && !isNonRetryableError;
}

/**
 * Calculates the delay for a retry attempt
 */
function calculateDelay(
  attempt: number,
  config: RetryConfig
): number {
  let delay: number;
  
  switch (config.backoffStrategy) {
    case 'linear':
      delay = config.baseDelay * attempt;
      break;
    case 'exponential':
      delay = config.baseDelay * Math.pow(2, attempt - 1);
      break;
    case 'fixed':
    default:
      delay = config.baseDelay;
      break;
  }
  
  // Add some jitter to avoid thundering herd
  const jitter = Math.random() * 0.1 * delay;
  delay += jitter;
  
  return Math.min(delay, config.maxDelay);
}

/**
 * Sleeps for the specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retries an async function with configurable retry logic
 */
export async function retryAsync<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  const fullConfig: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
    shouldRetry: config.shouldRetry || defaultShouldRetry,
  };
  
  const startTime = Date.now();
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= fullConfig.maxAttempts; attempt++) {
    try {
      const data = await operation();
      return {
        success: true,
        data,
        attempts: attempt,
        totalTime: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error as Error;
      
      // Check if we should retry
      const shouldRetry = fullConfig.shouldRetry!(lastError, attempt);
      const isLastAttempt = attempt === fullConfig.maxAttempts;
      
      if (!shouldRetry || isLastAttempt) {
        break;
      }
      
      // Call onRetry callback if provided
      if (fullConfig.onRetry) {
        fullConfig.onRetry(lastError, attempt);
      }
      
      // Calculate and wait for the retry delay
      const delay = calculateDelay(attempt, fullConfig);
      await sleep(delay);
    }
  }
  
  const result: RetryResult<T> = {
    success: false,
    attempts: fullConfig.maxAttempts,
    totalTime: Date.now() - startTime,
  };

  if (lastError) {
    result.error = lastError;
  }

  return result;
}

/**
 * Retries a synchronous function that might throw
 */
export function retry<T>(
  operation: () => T,
  config: Partial<RetryConfig> = {}
): RetryResult<T> {
  const fullConfig: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
    shouldRetry: config.shouldRetry || defaultShouldRetry,
  };
  
  const startTime = Date.now();
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= fullConfig.maxAttempts; attempt++) {
    try {
      const data = operation();
      return {
        success: true,
        data,
        attempts: attempt,
        totalTime: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error as Error;
      
      // Check if we should retry
      const shouldRetry = fullConfig.shouldRetry!(lastError, attempt);
      const isLastAttempt = attempt === fullConfig.maxAttempts;
      
      if (!shouldRetry || isLastAttempt) {
        break;
      }
      
      // Call onRetry callback if provided
      if (fullConfig.onRetry) {
        fullConfig.onRetry(lastError, attempt);
      }
    }
  }
  
  const syncResult: RetryResult<T> = {
    success: false,
    attempts: fullConfig.maxAttempts,
    totalTime: Date.now() - startTime,
  };

  if (lastError) {
    syncResult.error = lastError;
  }

  return syncResult;
}

/**
 * Creates a retry wrapper function
 */
export function withRetry<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  config: Partial<RetryConfig> = {}
) {
  return async (...args: T): Promise<R> => {
    const result = await retryAsync(() => operation(...args), config);
    
    if (result.success) {
      return result.data!;
    } else {
      throw result.error;
    }
  };
}

/**
 * Predefined retry configurations for common use cases
 */
export const RETRY_CONFIGS = {
  // For network requests
  network: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffStrategy: 'exponential' as const,
  },
  
  // For critical storage operations
  storage: {
    maxAttempts: 5,
    baseDelay: 500,
    maxDelay: 2000,
    backoffStrategy: 'linear' as const,
  },
  
  // For camera/scanner operations
  camera: {
    maxAttempts: 2,
    baseDelay: 1000,
    maxDelay: 2000,
    backoffStrategy: 'fixed' as const,
  },
  
  // For quick operations that should fail fast
  quick: {
    maxAttempts: 2,
    baseDelay: 100,
    maxDelay: 500,
    backoffStrategy: 'fixed' as const,
  },
} as const;

/**
 * Circuit breaker to prevent cascading failures
 */
export class CircuitBreaker {
  private failureCount = 0;
  private nextAttempt = Date.now();
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private failureThreshold = 5,
    private timeout = 60000 // 1 minute
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is open');
      } else {
        this.state = 'HALF_OPEN';
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure() {
    this.failureCount++;
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
  
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      nextAttempt: this.nextAttempt,
    };
  }
  
  reset() {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.nextAttempt = Date.now();
  }
}