/**
 * Performance Monitoring Types
 * Type definitions for the performance monitoring service
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

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: number;
  category: 'startup' | 'navigation' | 'form' | 'camera' | 'memory' | 'network';
  metadata?: Record<string, any>;
}

export interface UserFlowMetric {
  flowId: string;
  flowName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  steps: PerformanceStep[];
  success: boolean;
  errorMessage?: string;
}

export interface PerformanceStep {
  stepId: string;
  stepName: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface MemoryMetrics {
  used: number;
  total: number;
  percentage: number;
  timestamp: number;
}
