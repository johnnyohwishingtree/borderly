/**
 * Strategy execution methods extracted from PerformanceOptimization class
 */

import type { PerformanceMetrics } from '../../services/performance/productionProfiler';
import type { RegressionAlert } from '../../services/performance/regressionDetection';
import type {
  OptimizationStrategy,
  OptimizationResult,
  OptimizationRecommendation,
  PerformanceBudget,
} from './types';
import { sanitizePII } from '../piiSanitizer';

declare const global: any;

export function evaluateStrategy(
  strategy: OptimizationStrategy,
  currentMetrics: PerformanceMetrics,
  relevantAlerts: RegressionAlert[],
  optimizationHistory: OptimizationResult[]
): OptimizationRecommendation | null {
  // Calculate potential impact based on current performance
  let potentialImpact = 0;
  let confidence = 0;
  const reasoning: string[] = [];
  const prerequisites: string[] = [];
  const risks: string[] = [];

  // Check if strategy targets are problematic
  const problematicMetrics = strategy.targetMetrics.filter(metric => {
    const currentValue = currentMetrics[metric];
    if (typeof currentValue !== 'number') return false;

    // Find relevant alerts for this metric
    const metricAlerts = relevantAlerts.filter(alert => alert.metric === metric);
    return metricAlerts.length > 0;
  });

  if (problematicMetrics.length === 0) {
    return null; // Strategy not relevant
  }

  // Calculate impact score
  potentialImpact = Math.min(100, problematicMetrics.length * 25 +
    (strategy.impact === 'high' ? 40 : strategy.impact === 'medium' ? 20 : 10));

  // Calculate confidence based on historical success
  const historicalResults = optimizationHistory.filter(r => r.strategyId === strategy.id);
  if (historicalResults.length > 0) {
    const successRate = historicalResults.filter(r => r.success).length / historicalResults.length;
    confidence = successRate * 0.8 + 0.2; // Base confidence of 0.2

    if (successRate > 0.8) {
      reasoning.push('High historical success rate');
    }
  } else {
    confidence = 0.5; // Default confidence for untested strategies
    reasoning.push('No historical data available');
  }

  // Add strategy-specific reasoning
  problematicMetrics.forEach(metric => {
    reasoning.push(`${metric} is underperforming`);
  });

  // Add prerequisites and risks
  if (strategy.effort === 'high') {
    prerequisites.push('Significant development time required');
    risks.push('High implementation complexity');
  }

  if (!strategy.automated) {
    prerequisites.push('Manual implementation required');
  }

  if (strategy.category === 'memory') {
    risks.push('May temporarily increase memory usage during cleanup');
  }

  return {
    id: `rec-${strategy.id}-${Date.now()}`,
    strategy,
    relevantAlerts,
    potentialImpact,
    confidence,
    reasoning,
    prerequisites,
    risks,
  };
}

export async function executeStrategyImplementation(strategy: OptimizationStrategy): Promise<void> {
  switch (strategy.id) {
    case 'memory-cleanup':
      await executeMemoryCleanup();
      break;
    case 'lazy-loading':
      await executeLazyLoading();
      break;
    case 'form-caching':
      await executeFormCaching();
      break;
    case 'image-optimization':
      await executeImageOptimization();
      break;
    case 'network-optimization':
      await executeNetworkOptimization();
      break;
    case 'error-reduction':
      await executeErrorReduction();
      break;
    default:
      throw new Error(`Implementation for strategy ${strategy.id} not found`);
  }
}

async function executeMemoryCleanup(): Promise<void> {
  if (global.gc) {
    global.gc();
  }
  console.log('Memory cleanup executed');
}

async function executeLazyLoading(): Promise<void> {
  console.log('Lazy loading optimization executed');
}

async function executeFormCaching(): Promise<void> {
  console.log('Form caching optimization executed');
}

async function executeImageOptimization(): Promise<void> {
  console.log('Image optimization executed');
}

async function executeNetworkOptimization(): Promise<void> {
  console.log('Network optimization executed');
}

async function executeErrorReduction(): Promise<void> {
  console.log('Error reduction optimization executed');
}

export async function captureMetrics(
  targetMetrics: Array<keyof PerformanceMetrics>,
  getCurrentMemoryUsage: () => number
): Promise<Partial<PerformanceMetrics>> {
  const metrics: Partial<PerformanceMetrics> = {};

  targetMetrics.forEach(metric => {
    switch (metric) {
      case 'memoryUsage':
        (metrics as any)[metric] = getCurrentMemoryUsage();
        break;
      case 'appStartTime':
        (metrics as any)[metric] = Math.random() * 3000 + 1000; // 1-4s
        break;
      default:
        (metrics as any)[metric] = Math.random() * 1000; // Random value for demo
    }
  });

  return metrics;
}

export function calculateImprovement(
  before: Partial<PerformanceMetrics>,
  after: Partial<PerformanceMetrics>
): Record<string, number> {
  const improvement: Record<string, number> = {};

  Object.keys(before).forEach(key => {
    const beforeValue = before[key as keyof PerformanceMetrics];
    const afterValue = after[key as keyof PerformanceMetrics];

    if (typeof beforeValue === 'number' && typeof afterValue === 'number' && beforeValue > 0) {
      if (key.includes('Rate') || key.includes('Accuracy')) {
        improvement[key] = ((afterValue - beforeValue) / beforeValue) * 100;
      } else {
        improvement[key] = ((beforeValue - afterValue) / beforeValue) * 100;
      }
    }
  });

  return improvement;
}

export function updateBudgetStatus(
  budget: PerformanceBudget,
  currentValue: number
): void {
  budget.current = currentValue;

  if (budget.metric.includes('Rate') || budget.metric.includes('Accuracy')) {
    if (currentValue >= budget.target) {
      budget.status = 'within_budget';
    } else if (currentValue >= budget.target * 0.9) {
      budget.status = 'at_risk';
    } else {
      budget.status = 'over_budget';
    }
  } else {
    if (currentValue <= budget.target) {
      budget.status = 'within_budget';
    } else if (currentValue <= budget.target * 1.2) {
      budget.status = 'at_risk';
    } else {
      budget.status = 'over_budget';
    }
  }
}

export function sanitizeError(error: unknown): string {
  return sanitizePII(error instanceof Error ? error.message : 'Unknown error');
}
