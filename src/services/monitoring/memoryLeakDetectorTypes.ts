/**
 * Types and configuration for the Memory Leak Detection Service
 */

// Type declaration for window in non-browser environments
declare global {
  interface Window {
    performance?: {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    };
  }
  var window: Window | undefined;
}

export interface MemoryLeak {
  id: string;
  type: 'listener' | 'component' | 'timer' | 'cache' | 'network' | 'native';
  source: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  memoryGrowth: number; // bytes
  detectedAt: number;
  samples: MemorySample[];
  recommendations: string[];
  autoFixable: boolean;
}

export interface MemorySample {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external?: number;
  rss?: number;
  source: string;
}

export interface LeakDetectionConfig {
  sampleInterval: number; // milliseconds
  analysisWindow: number; // milliseconds
  growthThreshold: number; // bytes
  minSamples: number;
  enableAutoFix: boolean;
  alertThreshold: number; // bytes
}

export interface ComponentMemoryTracker {
  componentName: string;
  mountTime: number;
  unmountTime?: number;
  memoryAtMount: number;
  memoryAtUnmount?: number;
  leakSuspected: boolean;
}

export const DEFAULT_CONFIG: LeakDetectionConfig = {
  sampleInterval: 15000, // 15 seconds
  analysisWindow: 5 * 60 * 1000, // 5 minutes
  growthThreshold: 5 * 1024 * 1024, // 5MB
  minSamples: 10,
  enableAutoFix: true,
  alertThreshold: 80 * 1024 * 1024, // 80MB
};
