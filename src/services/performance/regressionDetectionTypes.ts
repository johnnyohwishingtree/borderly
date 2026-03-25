/**
 * Regression Detection Types
 *
 * Type definitions and default constants for the regression detection service.
 */

import type { PerformanceMetrics } from './productionProfiler';

export type { PerformanceMetrics } from './productionProfiler';

export interface RegressionAlert {
  id: string;
  timestamp: number;
  metric: keyof PerformanceMetrics;
  severity: 'warning' | 'critical';
  message: string;
  currentValue: number;
  expectedValue: number;
  deviation: number;
  confidence: number; // 0-1, statistical confidence
  trend: 'improving' | 'declining' | 'stable';
  recommendation: string;
  affectedUsers?: number;
}

export interface RegressionThreshold {
  metric: keyof PerformanceMetrics;
  warningDeviation: number; // Percentage deviation for warning
  criticalDeviation: number; // Percentage deviation for critical
  minimumDataPoints: number; // Minimum data points needed for analysis
  confidence: number; // Required statistical confidence (0-1)
}

export interface StatisticalAnalysis {
  mean: number;
  median: number;
  standardDeviation: number;
  variance: number;
  percentile95: number;
  percentile99: number;
  trend: 'improving' | 'declining' | 'stable';
  trendStrength: number; // 0-1, strength of trend
  outliers: number[];
  seasonality?: {
    detected: boolean;
    period?: number; // in milliseconds
    amplitude?: number;
  };
}

export interface RegressionModel {
  metric: keyof PerformanceMetrics;
  baseline: StatisticalAnalysis;
  thresholds: RegressionThreshold;
  lastUpdated: number;
  dataPoints: number;
  accuracy: number; // Model accuracy (0-1)
  predictions: {
    nextHour: number;
    nextDay: number;
    nextWeek: number;
  };
}

export interface RegressionReport {
  timestamp: number;
  summary: {
    totalAlerts: number;
    criticalAlerts: number;
    warningAlerts: number;
    affectedMetrics: string[];
    overallHealth: 'excellent' | 'good' | 'warning' | 'critical';
  };
  alerts: RegressionAlert[];
  models: RegressionModel[];
  recommendations: string[];
}

// Default thresholds for regression detection
export const DEFAULT_THRESHOLDS: Record<keyof PerformanceMetrics, RegressionThreshold> = {
  appStartTime: {
    metric: 'appStartTime',
    warningDeviation: 20,
    criticalDeviation: 50,
    minimumDataPoints: 50,
    confidence: 0.95,
  },
  firstScreenRenderTime: {
    metric: 'firstScreenRenderTime',
    warningDeviation: 30,
    criticalDeviation: 60,
    minimumDataPoints: 50,
    confidence: 0.95,
  },
  formGenerationTime: {
    metric: 'formGenerationTime',
    warningDeviation: 25,
    criticalDeviation: 50,
    minimumDataPoints: 100,
    confidence: 0.9,
  },
  autoFillSuccessRate: {
    metric: 'autoFillSuccessRate',
    warningDeviation: 5,
    criticalDeviation: 10,
    minimumDataPoints: 100,
    confidence: 0.95,
  },
  mrzScanTime: {
    metric: 'mrzScanTime',
    warningDeviation: 30,
    criticalDeviation: 60,
    minimumDataPoints: 30,
    confidence: 0.9,
  },
  mrzAccuracy: {
    metric: 'mrzAccuracy',
    warningDeviation: 2,
    criticalDeviation: 5,
    minimumDataPoints: 50,
    confidence: 0.95,
  },
  keychainAccessTime: {
    metric: 'keychainAccessTime',
    warningDeviation: 50,
    criticalDeviation: 100,
    minimumDataPoints: 100,
    confidence: 0.9,
  },
  databaseQueryTime: {
    metric: 'databaseQueryTime',
    warningDeviation: 40,
    criticalDeviation: 80,
    minimumDataPoints: 100,
    confidence: 0.9,
  },
  memoryUsage: {
    metric: 'memoryUsage',
    warningDeviation: 15,
    criticalDeviation: 30,
    minimumDataPoints: 50,
    confidence: 0.95,
  },
  memoryPressure: {
    metric: 'memoryPressure',
    warningDeviation: 20,
    criticalDeviation: 40,
    minimumDataPoints: 50,
    confidence: 0.9,
  },
  screenTransitionTime: {
    metric: 'screenTransitionTime',
    warningDeviation: 40,
    criticalDeviation: 80,
    minimumDataPoints: 100,
    confidence: 0.9,
  },
  userFlowCompletionRate: {
    metric: 'userFlowCompletionRate',
    warningDeviation: 5,
    criticalDeviation: 10,
    minimumDataPoints: 50,
    confidence: 0.95,
  },
  portalResponseTime: {
    metric: 'portalResponseTime',
    warningDeviation: 50,
    criticalDeviation: 100,
    minimumDataPoints: 30,
    confidence: 0.85,
  },
  portalSuccessRate: {
    metric: 'portalSuccessRate',
    warningDeviation: 3,
    criticalDeviation: 7,
    minimumDataPoints: 50,
    confidence: 0.95,
  },
  errorRate: {
    metric: 'errorRate',
    warningDeviation: 50,
    criticalDeviation: 100,
    minimumDataPoints: 100,
    confidence: 0.9,
  },
  crashRate: {
    metric: 'crashRate',
    warningDeviation: 25,
    criticalDeviation: 50,
    minimumDataPoints: 100,
    confidence: 0.95,
  },
};

/**
 * Metric-specific recommendation strings for regression alerts
 */
export const METRIC_RECOMMENDATIONS: Record<keyof PerformanceMetrics, string> = {
  appStartTime: 'Investigate app initialization, consider lazy loading non-critical components',
  firstScreenRenderTime: 'Optimize initial render performance, check for blocking operations',
  formGenerationTime: 'Review form generation logic, consider caching form schemas',
  autoFillSuccessRate: 'Check auto-fill mapping logic, validate data quality',
  mrzScanTime: 'Optimize camera initialization, check ML model performance',
  mrzAccuracy: 'Review MRZ parsing logic, check camera focus and lighting',
  keychainAccessTime: 'Investigate keychain operations, check for device-specific issues',
  databaseQueryTime: 'Review database queries, consider adding indexes',
  memoryUsage: 'Investigate memory leaks, optimize data structures',
  memoryPressure: 'Review memory allocation patterns, implement memory cleanup',
  screenTransitionTime: 'Optimize navigation performance, check for heavy operations',
  userFlowCompletionRate: 'Analyze user behavior, identify UX friction points',
  portalResponseTime: 'Check network conditions, implement request timeouts',
  portalSuccessRate: 'Monitor portal availability, implement retry mechanisms',
  errorRate: 'Investigate error patterns, improve error handling',
  crashRate: 'Review crash logs, fix critical stability issues',
};
