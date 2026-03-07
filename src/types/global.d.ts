/**
 * Global type declarations for Borderly app
 */

declare global {
  // React Native global
  const __DEV__: boolean;
  
  // Memory profiling globals
  interface GlobalThis {
    gc?: () => void;
    performance?: {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    };
  }

  // Extend globalThis with our custom properties
  var globalThis: GlobalThis & typeof globalThis & {
    gc?: () => void;
    performance?: {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    };
  };

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
}

export {};