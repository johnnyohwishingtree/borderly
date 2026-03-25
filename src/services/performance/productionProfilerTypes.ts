/**
 * Production Performance Profiler — Type Definitions
 *
 * All interfaces and type aliases used by the production profiler
 * and its helper functions.
 */

export interface PerformanceMetrics {
  // App lifecycle metrics
  appStartTime: number;
  firstScreenRenderTime: number;

  // Form generation performance
  formGenerationTime: number;
  autoFillSuccessRate: number;

  // Camera and OCR performance
  mrzScanTime: number;
  mrzAccuracy: number;

  // Storage performance
  keychainAccessTime: number;
  databaseQueryTime: number;

  // Memory metrics
  memoryUsage: number;
  memoryPressure: 'low' | 'moderate' | 'high';

  // User interaction metrics
  screenTransitionTime: number;
  userFlowCompletionRate: number;

  // Network metrics (for government portals)
  portalResponseTime: number;
  portalSuccessRate: number;

  // Error metrics
  errorRate: number;
  crashRate: number;
}

export interface PerformanceBenchmark {
  metric: keyof PerformanceMetrics;
  target: number;
  current: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  trend: 'improving' | 'stable' | 'declining';
}

export interface OptimizationRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: 'performance' | 'memory' | 'user-experience' | 'reliability';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  implementation: string[];
}

export interface PerformanceAlert {
  id: string;
  timestamp: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  metric: keyof PerformanceMetrics;
  message: string;
  threshold: number;
  actualValue: number;
  recommendation?: OptimizationRecommendation;
}
