/**
 * Performance Optimization Types
 */

import type { PerformanceMetrics } from '../../services/performance/productionProfiler';
import type { RegressionAlert } from '../../services/performance/regressionDetection';

export interface OptimizationStrategy {
  id: string;
  name: string;
  description: string;
  category: 'memory' | 'rendering' | 'data' | 'network' | 'user-experience';
  priority: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  targetMetrics: Array<keyof PerformanceMetrics>;
  implementation: string[];
  automated: boolean;
  enabled: boolean;
}

export interface OptimizationResult {
  strategyId: string;
  timestamp: number;
  success: boolean;
  metricsImpact: {
    before: Partial<PerformanceMetrics>;
    after: Partial<PerformanceMetrics>;
    improvement: Record<string, number>; // percentage improvement
  };
  error?: string;
  executionTime: number;
}

export interface OptimizationRecommendation {
  id: string;
  strategy: OptimizationStrategy;
  relevantAlerts: RegressionAlert[];
  potentialImpact: number; // 0-100 score
  confidence: number; // 0-1 confidence in recommendation
  reasoning: string[];
  prerequisites: string[];
  risks: string[];
}

export interface PerformanceBudget {
  metric: keyof PerformanceMetrics;
  target: number;
  current: number;
  status: 'within_budget' | 'at_risk' | 'over_budget';
  trend: 'improving' | 'stable' | 'declining';
}
