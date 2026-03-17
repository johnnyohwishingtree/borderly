/**
 * Common automation patterns (circuit breaker, rate limiter, condition waiting)
 */

export class AutomationPatterns {
  /**
   * Wait for multiple conditions to be met
   */
  static async waitForConditions(
    conditions: Array<() => Promise<boolean>>,
    mode: 'all' | 'any' = 'all',
    timeout: number = 30000,
    pollInterval: number = 500
  ): Promise<{ success: boolean; metConditions: boolean[]; error?: string }> {
    const startTime = Date.now();
    const results: boolean[] = new Array(conditions.length).fill(false);

    while (Date.now() - startTime < timeout) {
      // Check all conditions
      for (let i = 0; i < conditions.length; i++) {
        try {
          results[i] = await conditions[i]();
        } catch {
          // Condition check failed, keep as false
        }
      }

      // Check if we meet the criteria
      const success = mode === 'all'
        ? results.every(r => r)
        : results.some(r => r);

      if (success) {
        return { success: true, metConditions: results };
      }

      // Wait before next check
      await new Promise<void>(resolve => setTimeout(() => resolve(), pollInterval));
    }

    return {
      success: false,
      metConditions: results,
      error: `Timeout waiting for conditions (mode: ${mode})`
    };
  }

  /**
   * Perform operation with circuit breaker pattern
   */
  static createCircuitBreaker<T>(
    operation: () => Promise<T>,
    options: {
      failureThreshold: number;
      resetTimeout: number;
      monitoringWindow: number;
    } = {
      failureThreshold: 5,
      resetTimeout: 60000,
      monitoringWindow: 300000
    }
  ) {
    let failures = 0;
    let lastFailureTime = 0;
    let state: 'closed' | 'open' | 'half-open' = 'closed';

    return async (): Promise<T> => {
      const now = Date.now();

      // Reset if monitoring window has passed
      if (now - lastFailureTime > options.monitoringWindow) {
        failures = 0;
        state = 'closed';
      }

      // Check if circuit breaker is open
      if (state === 'open') {
        if (now - lastFailureTime < options.resetTimeout) {
          throw new Error('Circuit breaker is open - operation blocked');
        } else {
          state = 'half-open';
        }
      }

      try {
        const result = await operation();

        // Reset on success
        if (state === 'half-open') {
          state = 'closed';
          failures = 0;
        }

        return result;

      } catch (error) {
        failures++;
        lastFailureTime = now;

        if (failures >= options.failureThreshold) {
          state = 'open';
        }

        throw error;
      }
    };
  }

  /**
   * Execute operations with rate limiting
   */
  static createRateLimiter(
    maxOperations: number,
    timeWindow: number
  ) {
    const operations: number[] = [];

    return async <T>(operation: () => Promise<T>): Promise<T> => {
      const now = Date.now();

      // Remove operations outside the time window
      while (operations.length > 0 && now - operations[0] > timeWindow) {
        operations.shift();
      }

      // Check if we're at the limit
      if (operations.length >= maxOperations) {
        const waitTime = timeWindow - (now - operations[0]);
        await new Promise<void>(resolve => setTimeout(() => resolve(), waitTime));
      }

      operations.push(now);
      return await operation();
    };
  }
}
