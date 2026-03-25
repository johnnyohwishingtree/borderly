/**
 * Test Environment Utilities
 */

export class TestEnvironment {
  /**
   * Checks if running in test environment
   */
  static isTestEnvironment(): boolean {
    const proc = (globalThis as any).process;
    return (proc?.env?.NODE_ENV === 'test') ||
           (proc?.env?.JEST_WORKER_ID !== undefined) ||
           (globalThis as any).it !== undefined;
  }

  /**
   * Creates isolated test environment
   */
  static createIsolatedEnvironment(): {
    cleanup: () => void;
    logs: string[];
    errors: string[];
  } {
    const logs: string[] = [];
    const errors: string[] = [];

    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;

    console.log = (...args) => {
      logs.push(args.map(arg => String(arg)).join(' '));
      if (!this.isTestEnvironment()) {
        originalConsoleLog(...args);
      }
    };

    console.error = (...args) => {
      errors.push(args.map(arg => String(arg)).join(' '));
      if (!this.isTestEnvironment()) {
        originalConsoleError(...args);
      }
    };

    return {
      cleanup: () => {
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
      },
      logs,
      errors
    };
  }

  /**
   * Creates mock timers for testing
   */
  static mockTime(dateString: string = '2026-06-01T00:00:00.000Z'): {
    restore: () => void;
    advanceTime: (ms: number) => void;
  } {
    const originalDate = Date;
    const mockDate = new Date(dateString);
    let currentTime = mockDate.getTime();

    // Mock Date constructor and Date.now()
    (globalThis as any).Date = class extends Date {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(currentTime);
        } else {
          super(...(args as [any]));
        }
      }

      static now(): number {
        return currentTime;
      }
    } as any;

    return {
      restore: () => {
        (globalThis as any).Date = originalDate;
      },
      advanceTime: (ms: number) => {
        currentTime += ms;
      }
    };
  }

  /**
   * Creates network simulation for testing
   */
  static simulateNetwork(options: {
    delay?: number;
    failureRate?: number;
    timeoutRate?: number;
  } = {}): {
    restore: () => void;
    getRequestLog: () => Array<{ url: string; method: string; success: boolean }>;
  } {
    const { delay = 100, failureRate = 0, timeoutRate = 0 } = options;
    const requestLog: Array<{ url: string; method: string; success: boolean }> = [];
    const originalFetch = (globalThis as any).fetch;

    (globalThis as any).fetch = async (url: any, fetchOptions: any = {}) => {
      const method = fetchOptions.method || 'GET';

      // Simulate network delay
      if (delay > 0) {
        await new Promise<void>(resolve => setTimeout(resolve, delay));
      }

      // Simulate timeout
      if (Math.random() < timeoutRate) {
        requestLog.push({ url: String(url), method, success: false });
        throw new Error('Network timeout');
      }

      // Simulate failure
      if (Math.random() < failureRate) {
        requestLog.push({ url: String(url), method, success: false });
        return new Response(null, { status: 500, statusText: 'Internal Server Error' });
      }

      requestLog.push({ url: String(url), method, success: true });

      // Simulate successful response
      return new Response('OK', { status: 200, statusText: 'OK' });
    };

    return {
      restore: () => {
        (globalThis as any).fetch = originalFetch;
      },
      getRequestLog: () => [...requestLog]
    };
  }
}
