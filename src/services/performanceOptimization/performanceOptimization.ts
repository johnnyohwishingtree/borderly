/**
 * Performance Optimization Utilities
 *
 * Automated performance optimization strategies and utilities
 * for improving app performance based on real-world usage data.
 */

import { mmkvService } from '../storage';
import { sanitizePII } from '../../utils/piiSanitizer';
import type { PerformanceMetrics } from '../performance/productionProfiler';
import type { RegressionAlert } from '../performance/regressionDetection';
import type {
  OptimizationStrategy,
  OptimizationResult,
  OptimizationRecommendation,
  PerformanceBudget,
} from './types';
import { OPTIMIZATION_STRATEGIES } from './strategies';
import {
  evaluateStrategy,
  executeStrategyImplementation,
  captureMetrics,
  calculateImprovement,
  updateBudgetStatus,
  sanitizeError,
} from './strategyExecutor';

declare const global: any;

class PerformanceOptimization {
  private static readonly STORAGE_PREFIX = 'perf_opt_';
  private strategies: Map<string, OptimizationStrategy> = new Map();
  private optimizationHistory: OptimizationResult[] = [];
  private performanceBudgets: PerformanceBudget[] = [];

  constructor() {
    this.loadStrategies();
    this.loadOptimizationHistory();
    this.initializePerformanceBudgets();
  }

  private storageGet(key: string): string | undefined {
    return mmkvService.getString(`${PerformanceOptimization.STORAGE_PREFIX}${key}`);
  }

  private storageSet(key: string, value: string): void {
    mmkvService.setString(`${PerformanceOptimization.STORAGE_PREFIX}${key}`, value);
  }

  /**
   * Reset instance for testing - reloads data from storage
   */
  resetForTesting(): void {
    this.optimizationHistory = [];
    this.performanceBudgets = [];
    this.strategies.clear();

    this.loadStrategies();
    this.loadOptimizationHistory();
    this.initializePerformanceBudgets();
  }

  /**
   * Get optimization recommendations based on current performance and alerts
   */
  getRecommendations(
    currentMetrics: PerformanceMetrics,
    alerts: RegressionAlert[]
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    this.strategies.forEach(strategy => {
      if (!strategy.enabled) return;

      const relevantAlerts = alerts.filter(alert =>
        strategy.targetMetrics.includes(alert.metric)
      );

      const recommendation = evaluateStrategy(
        strategy,
        currentMetrics,
        relevantAlerts,
        this.optimizationHistory
      );

      if (recommendation) {
        recommendations.push(recommendation);
      }
    });

    return recommendations.sort((a, b) =>
      (b.potentialImpact * b.confidence) - (a.potentialImpact * a.confidence)
    );
  }

  /**
   * Execute an optimization strategy
   */
  async executeStrategy(strategyId: string): Promise<OptimizationResult> {
    const startTime = Date.now();
    let beforeMetrics: Partial<PerformanceMetrics> = {};
    let afterMetrics: Partial<PerformanceMetrics> = {};

    try {
      const strategy = this.strategies.get(strategyId);
      if (!strategy) {
        throw new Error(`Strategy ${strategyId} not found`);
      }
      beforeMetrics = await captureMetrics(strategy.targetMetrics, () => this.getCurrentMemoryUsage());

      await executeStrategyImplementation(strategy);

      // Wait a moment for changes to take effect (skip delay in test environment)
      if (typeof jest === 'undefined' && !(global as any).__TEST__) {
        await new Promise<void>(resolve => setTimeout(resolve, 1000));
      }

      afterMetrics = await captureMetrics(strategy.targetMetrics, () => this.getCurrentMemoryUsage());

      const improvement = calculateImprovement(beforeMetrics, afterMetrics);

      const result: OptimizationResult = {
        strategyId,
        timestamp: Date.now(),
        success: true,
        metricsImpact: {
          before: beforeMetrics,
          after: afterMetrics,
          improvement,
        },
        executionTime: Date.now() - startTime,
      };

      this.storeOptimizationResult(result);
      return result;

    } catch (error) {
      const result: OptimizationResult = {
        strategyId,
        timestamp: Date.now(),
        success: false,
        metricsImpact: {
          before: beforeMetrics,
          after: afterMetrics,
          improvement: {},
        },
        error: sanitizeError(error),
        executionTime: Date.now() - startTime,
      };

      this.storeOptimizationResult(result);
      return result;
    }
  }

  /**
   * Execute automated optimizations
   */
  async executeAutomatedOptimizations(
    currentMetrics: PerformanceMetrics,
    alerts: RegressionAlert[]
  ): Promise<OptimizationResult[]> {
    const recommendations = this.getRecommendations(currentMetrics, alerts);
    const automatedRecommendations = recommendations.filter(r =>
      r.strategy.automated && r.confidence > 0.7 && r.potentialImpact > 50
    );

    const results: OptimizationResult[] = [];

    for (const recommendation of automatedRecommendations) {
      try {
        const result = await this.executeStrategy(recommendation.strategy.id);
        results.push(result);

        // Brief pause between optimizations (skip delay in test environment)
        if (typeof jest === 'undefined' && !(global as any).__TEST__) {
          await new Promise<void>(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Failed to execute automated optimization ${recommendation.strategy.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Measure the execution time of an async function
   */
  async measureAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    category?: string
  ): Promise<T> {
    const startTime = Date.now();
    const startMemory = this.getCurrentMemoryUsage();

    try {
      const result = await fn();
      const executionTime = Date.now() - startTime;
      const endMemory = this.getCurrentMemoryUsage();
      const memoryDelta = endMemory - startMemory;

      this.recordPerformanceMeasurement({
        operation,
        category: category || 'general',
        executionTime,
        memoryDelta,
        success: true,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.recordPerformanceMeasurement({
        operation,
        category: category || 'general',
        executionTime,
        memoryDelta: 0,
        success: false,
        error: sanitizeError(error),
        timestamp: Date.now(),
      });

      throw error;
    }
  }

  /**
   * Measure the execution time of a sync function
   */
  measureSync<T>(
    operation: string,
    fn: () => T,
    category?: string
  ): T {
    const startTime = Date.now();
    const startMemory = this.getCurrentMemoryUsage();

    try {
      const result = fn();
      const executionTime = Date.now() - startTime;
      const endMemory = this.getCurrentMemoryUsage();
      const memoryDelta = endMemory - startMemory;

      this.recordPerformanceMeasurement({
        operation,
        category: category || 'general',
        executionTime,
        memoryDelta,
        success: true,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.recordPerformanceMeasurement({
        operation,
        category: category || 'general',
        executionTime,
        memoryDelta: 0,
        success: false,
        error: sanitizeError(error),
        timestamp: Date.now(),
      });

      throw error;
    }
  }

  /**
   * Get performance budgets status
   */
  getPerformanceBudgets(): PerformanceBudget[] {
    return this.performanceBudgets;
  }

  /**
   * Update performance budgets
   */
  updatePerformanceBudgets(currentMetrics: PerformanceMetrics): void {
    this.performanceBudgets.forEach(budget => {
      const currentValue = currentMetrics[budget.metric];
      if (typeof currentValue === 'number') {
        updateBudgetStatus(budget, currentValue);
      }
    });

    this.savePerformanceBudgets();
  }

  /**
   * Get optimization effectiveness report
   */
  getOptimizationReport(): {
    totalOptimizations: number;
    successRate: number;
    averageImprovement: number;
    topStrategies: Array<{
      strategyId: string;
      successRate: number;
      averageImprovement: number;
      executionCount: number;
    }>;
  } {
    const results = this.optimizationHistory;
    const successfulResults = results.filter(r => r.success);

    const successRate = results.length > 0 ? successfulResults.length / results.length : 0;

    const improvements = successfulResults.flatMap(r =>
      Object.values(r.metricsImpact.improvement)
    );
    const averageImprovement = improvements.length > 0
      ? improvements.reduce((a, b) => a + b, 0) / improvements.length
      : 0;

    const strategyStats = new Map<string, {
      successes: number;
      total: number;
      improvements: number[]
    }>();

    results.forEach(result => {
      const stats = strategyStats.get(result.strategyId) || {
        successes: 0,
        total: 0,
        improvements: []
      };

      stats.total++;
      if (result.success) {
        stats.successes++;
        const resultImprovement = Object.values(result.metricsImpact.improvement)
          .reduce((a, b) => a + b, 0) / Object.keys(result.metricsImpact.improvement).length || 0;
        stats.improvements.push(resultImprovement);
      }

      strategyStats.set(result.strategyId, stats);
    });

    const topStrategies = Array.from(strategyStats.entries())
      .map(([strategyId, stats]) => ({
        strategyId,
        successRate: stats.total > 0 ? stats.successes / stats.total : 0,
        averageImprovement: stats.improvements.length > 0
          ? stats.improvements.reduce((a, b) => a + b, 0) / stats.improvements.length
          : 0,
        executionCount: stats.total,
      }))
      .sort((a, b) => (b.successRate * b.averageImprovement) - (a.successRate * a.averageImprovement));

    return {
      totalOptimizations: results.length,
      successRate,
      averageImprovement,
      topStrategies,
    };
  }

  // Private methods

  private loadStrategies(): void {
    OPTIMIZATION_STRATEGIES.forEach(strategy => {
      this.strategies.set(strategy.id, strategy);
    });

    try {
      const customStrategies = this.storageGet('custom-strategies');
      if (customStrategies) {
        const strategies: OptimizationStrategy[] = JSON.parse(customStrategies);
        strategies.forEach(strategy => {
          this.strategies.set(strategy.id, strategy);
        });
      }
    } catch (error) {
      console.error('Failed to load custom strategies:', sanitizeError(error));
    }
  }

  private loadOptimizationHistory(): void {
    try {
      const history = this.storageGet('optimization-history');
      if (history) {
        this.optimizationHistory = JSON.parse(history);
      }
    } catch (error) {
      console.error('Failed to load optimization history:', sanitizeError(error));
      this.optimizationHistory = [];
    }
  }

  private initializePerformanceBudgets(): void {
    const defaultBudgets: PerformanceBudget[] = [
      { metric: 'appStartTime', target: 2500, current: 0, status: 'within_budget', trend: 'stable' },
      { metric: 'formGenerationTime', target: 300, current: 0, status: 'within_budget', trend: 'stable' },
      { metric: 'mrzScanTime', target: 1500, current: 0, status: 'within_budget', trend: 'stable' },
      { metric: 'memoryUsage', target: 100 * 1024 * 1024, current: 0, status: 'within_budget', trend: 'stable' },
      { metric: 'userFlowCompletionRate', target: 0.85, current: 0, status: 'within_budget', trend: 'stable' },
      { metric: 'errorRate', target: 0.005, current: 0, status: 'within_budget', trend: 'stable' },
    ];

    const storedBudgets = this.storageGet('performance-budgets');
    if (storedBudgets) {
      this.performanceBudgets = JSON.parse(storedBudgets);
    } else {
      this.performanceBudgets = defaultBudgets;
      this.savePerformanceBudgets();
    }
  }

  private getCurrentMemoryUsage(): number {
    try {
      // @ts-ignore - Platform-specific memory APIs
      if (typeof global !== 'undefined' && global.performance?.memory) {
        return global.performance.memory.usedJSHeapSize;
      }
    } catch {
      // Fallback
    }

    return 0;
  }

  private recordPerformanceMeasurement(measurement: {
    operation: string;
    category: string;
    executionTime: number;
    memoryDelta: number;
    success: boolean;
    error?: string;
    timestamp: number;
  }): void {
    const measurements = this.getStoredMeasurements();
    measurements.push(sanitizePII(measurement));

    // Keep only last 1000 measurements
    if (measurements.length > 1000) {
      measurements.splice(0, measurements.length - 1000);
    }

    this.storageSet('performance-measurements', JSON.stringify(measurements));
  }

  private getStoredMeasurements(): Array<any> {
    const stored = this.storageGet('performance-measurements');
    return stored ? JSON.parse(stored) : [];
  }

  private storeOptimizationResult(result: OptimizationResult): void {
    this.optimizationHistory.push(result);

    // Keep only last 100 results
    if (this.optimizationHistory.length > 100) {
      this.optimizationHistory.splice(0, this.optimizationHistory.length - 100);
    }

    this.storageSet('optimization-history', sanitizePII(JSON.stringify(this.optimizationHistory)));
  }

  private savePerformanceBudgets(): void {
    this.storageSet('performance-budgets', JSON.stringify(this.performanceBudgets));
  }
}

export const performanceOptimization = new PerformanceOptimization();
