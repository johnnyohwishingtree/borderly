/**
 * Global type declarations for Borderly app
 */

declare global {
  // React Native global
  const __DEV__: boolean;
  
  // Global object (Node.js environment)
  const global: typeof globalThis;

  // Performance API (available in both browser and Node.js environments)
  interface Performance {
    now(): number;
    mark(name: string): void;
    measure(name: string, startMark?: string, endMark?: string): void;
    getEntriesByType(type: string): PerformanceEntry[];
    getEntriesByName(name: string, type?: string): PerformanceEntry[];
    clearMarks(name?: string): void;
    clearMeasures(name?: string): void;
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }

  interface PerformanceEntry {
    name: string;
    entryType: string;
    startTime: number;
    duration: number;
  }

  const performance: Performance;
  
  // Memory profiling globals
  interface GlobalThis {
    gc?: () => void;
    performance?: Performance;
  }

  // Extend globalThis with our custom properties
  var globalThis: GlobalThis & typeof globalThis & {
    gc?: () => void;
    performance?: Performance;
  };

  // Browser-like globals that may exist in some RN environments (e.g. React Native Web)
  var navigator: {
    hardwareConcurrency?: number;
    deviceMemory?: number;
    userAgent?: string;
  } | undefined;

  // Node.js globals (for testing environment)
  const process: {
    memoryUsage?: () => {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
      arrayBuffers: number;
    };
  };

  // NodeJS namespace for timeout types
  namespace NodeJS {
    interface Timeout {
      ref(): void;
      unref(): void;
    }
    interface Timer extends Timeout {}
  }
}

export {};