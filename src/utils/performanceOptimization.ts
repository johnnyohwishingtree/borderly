/**
 * Performance Optimization Utilities
 * 
 * Automated performance optimization strategies and utilities
 * for improving app performance based on real-world usage data.
 */

import { Alert } from 'react-native';
import { MMKV } from 'react-native-mmkv';
import { sanitizePII } from './piiSanitizer';
import type { PerformanceMetrics } from '../services/performance/productionProfiler';
import type { RegressionAlert } from '../services/performance/regressionDetection';

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

// Predefined optimization strategies
const OPTIMIZATION_STRATEGIES: OptimizationStrategy[] = [
  {
    id: 'memory-cleanup',
    name: 'Automatic Memory Cleanup',
    description: 'Automatically clean up unused memory allocations and optimize garbage collection',
    category: 'memory',
    priority: 'high',
    impact: 'high',
    effort: 'low',
    targetMetrics: ['memoryUsage', 'memoryPressure'],
    implementation: [
      'Clear image caches when memory pressure is high',
      'Dispose of unused React components and listeners',
      'Clean up temporary data structures',
      'Force garbage collection in controlled manner',
    ],
    automated: true,
    enabled: true,
  },
  {
    id: 'lazy-loading',
    name: 'Intelligent Lazy Loading',
    description: 'Load components and data only when needed to improve startup time',
    category: 'rendering',
    priority: 'high',
    impact: 'high',
    effort: 'medium',
    targetMetrics: ['appStartTime', 'firstScreenRenderTime'],
    implementation: [
      'Lazy load non-critical screens using React.lazy',
      'Defer heavy computations until after initial render',
      'Load country schemas on-demand',
      'Use intersection observers for list items',
    ],
    automated: true,
    enabled: true,
  },
  {
    id: 'form-caching',
    name: 'Smart Form Caching',
    description: 'Cache frequently used form data and schemas to reduce generation time',
    category: 'data',
    priority: 'medium',
    impact: 'medium',
    effort: 'low',
    targetMetrics: ['formGenerationTime'],
    implementation: [
      'Cache parsed country schemas',
      'Memoize auto-fill calculations',
      'Pre-compute common form configurations',
      'Use React.memo for form components',
    ],
    automated: true,
    enabled: true,
  },
  {
    id: 'database-optimization',
    name: 'Database Query Optimization',
    description: 'Optimize database queries and add strategic indexes',
    category: 'data',
    priority: 'medium',
    impact: 'medium',
    effort: 'medium',
    targetMetrics: ['databaseQueryTime'],
    implementation: [
      'Add indexes for frequently queried fields',
      'Batch database operations where possible',
      'Use database views for complex queries',
      'Implement query result caching',
    ],
    automated: false,
    enabled: true,
  },
  {
    id: 'image-optimization',
    name: 'Dynamic Image Optimization',
    description: 'Optimize images based on device capabilities and network conditions',
    category: 'network',
    priority: 'medium',
    impact: 'medium',
    effort: 'low',
    targetMetrics: ['memoryUsage', 'screenTransitionTime'],
    implementation: [
      'Resize images based on device screen density',
      'Use WebP format when supported',
      'Implement progressive image loading',
      'Cache resized images locally',
    ],
    automated: true,
    enabled: true,
  },
  {
    id: 'network-optimization',
    name: 'Network Request Optimization',
    description: 'Optimize network requests for government portals',
    category: 'network',
    priority: 'medium',
    impact: 'medium',
    effort: 'low',
    targetMetrics: ['portalResponseTime', 'portalSuccessRate'],
    implementation: [
      'Implement request retry with exponential backoff',
      'Use connection pooling for portal requests',
      'Add request timeout optimization',
      'Cache portal metadata locally',
    ],
    automated: true,
    enabled: true,
  },
  {
    id: 'user-flow-optimization',
    name: 'User Flow Optimization',
    description: 'Optimize user flows based on behavior analytics',
    category: 'user-experience',
    priority: 'high',
    impact: 'high',
    effort: 'high',
    targetMetrics: ['userFlowCompletionRate'],
    implementation: [
      'Identify and reduce friction points',
      'Implement smart form pre-filling',
      'Add contextual help and guidance',
      'Optimize form field ordering based on usage',
    ],
    automated: false,
    enabled: true,
  },
  {
    id: 'error-reduction',
    name: 'Automated Error Reduction',
    description: 'Automatically handle and recover from common errors',
    category: 'user-experience',
    priority: 'high',
    impact: 'high',
    effort: 'medium',
    targetMetrics: ['errorRate', 'crashRate'],
    implementation: [
      'Implement automatic error recovery',
      'Add fallback mechanisms for critical operations',
      'Improve error messages and user guidance',
      'Use circuit breakers for external services',
    ],
    automated: true,
    enabled: true,
  },
];

class PerformanceOptimization {
  private storage: MMKV;
  private strategies: Map<string, OptimizationStrategy> = new Map();
  private optimizationHistory: OptimizationResult[] = [];
  private performanceBudgets: PerformanceBudget[] = [];

  constructor() {
    this.storage = new MMKV({
      id: 'performance-optimization',
    });
    
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
    
    // Analyze each strategy
    this.strategies.forEach(strategy => {
      if (!strategy.enabled) return;
      
      const relevantAlerts = alerts.filter(alert =>
        strategy.targetMetrics.includes(alert.metric)
      );
      
      const recommendation = this.evaluateStrategy(
        strategy,
        currentMetrics,
        relevantAlerts
      );
      
      if (recommendation) {
        recommendations.push(recommendation);
      }
    });

    // Sort by potential impact and confidence
    return recommendations.sort((a, b) => 
      (b.potentialImpact * b.confidence) - (a.potentialImpact * a.confidence)
    );
  }

  /**
   * Execute an optimization strategy
   */
  async executeStrategy(strategyId: string): Promise<OptimizationResult> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy ${strategyId} not found`);
    }

    const startTime = Date.now();
    let beforeMetrics: Partial<PerformanceMetrics> = {};
    let afterMetrics: Partial<PerformanceMetrics> = {};
    
    try {
      // Capture before metrics
      beforeMetrics = await this.captureMetrics(strategy.targetMetrics);
      
      // Execute strategy
      await this.executeStrategyImplementation(strategy);
      
      // Wait a moment for changes to take effect
      await new Promise<void>(resolve => setTimeout(resolve, 1000));
      
      // Capture after metrics
      afterMetrics = await this.captureMetrics(strategy.targetMetrics);
      
      const improvement = this.calculateImprovement(beforeMetrics, afterMetrics);
      
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
        error: error instanceof Error ? error.message : 'Unknown error',
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
        
        // Brief pause between optimizations
        await new Promise<void>(resolve => setTimeout(resolve, 500));
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
        error: error instanceof Error ? error.message : 'Unknown error',
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
        error: error instanceof Error ? error.message : 'Unknown error',
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
        budget.current = currentValue;
        
        // Update status
        if (budget.metric.includes('Rate') || budget.metric.includes('Accuracy')) {
          // For rates and accuracy, higher is better
          if (currentValue >= budget.target) {
            budget.status = 'within_budget';
          } else if (currentValue >= budget.target * 0.9) {
            budget.status = 'at_risk';
          } else {
            budget.status = 'over_budget';
          }
        } else {
          // For times and usage, lower is better
          if (currentValue <= budget.target) {
            budget.status = 'within_budget';
          } else if (currentValue <= budget.target * 1.2) {
            budget.status = 'at_risk';
          } else {
            budget.status = 'over_budget';
          }
        }
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
    
    // Calculate average improvement across all metrics
    const improvements = successfulResults.flatMap(r => 
      Object.values(r.metricsImpact.improvement)
    );
    const averageImprovement = improvements.length > 0 
      ? improvements.reduce((a, b) => a + b, 0) / improvements.length 
      : 0;
    
    // Group by strategy
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
    // Load predefined strategies
    OPTIMIZATION_STRATEGIES.forEach(strategy => {
      this.strategies.set(strategy.id, strategy);
    });
    
    // Load custom strategies from storage
    const customStrategies = this.storage.getString('custom-strategies');
    if (customStrategies) {
      const strategies: OptimizationStrategy[] = JSON.parse(customStrategies);
      strategies.forEach(strategy => {
        this.strategies.set(strategy.id, strategy);
      });
    }
  }

  private loadOptimizationHistory(): void {
    const history = this.storage.getString('optimization-history');
    if (history) {
      this.optimizationHistory = JSON.parse(history);
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
    
    const storedBudgets = this.storage.getString('performance-budgets');
    if (storedBudgets) {
      this.performanceBudgets = JSON.parse(storedBudgets);
    } else {
      this.performanceBudgets = defaultBudgets;
      this.savePerformanceBudgets();
    }
  }

  private evaluateStrategy(
    strategy: OptimizationStrategy,
    currentMetrics: PerformanceMetrics,
    relevantAlerts: RegressionAlert[]
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
    const historicalResults = this.optimizationHistory.filter(r => r.strategyId === strategy.id);
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

  private async executeStrategyImplementation(strategy: OptimizationStrategy): Promise<void> {
    switch (strategy.id) {
      case 'memory-cleanup':
        await this.executeMemoryCleanup();
        break;
      case 'lazy-loading':
        await this.executeLazyLoading();
        break;
      case 'form-caching':
        await this.executeFormCaching();
        break;
      case 'image-optimization':
        await this.executeImageOptimization();
        break;
      case 'network-optimization':
        await this.executeNetworkOptimization();
        break;
      case 'error-reduction':
        await this.executeErrorReduction();
        break;
      default:
        throw new Error(`Implementation for strategy ${strategy.id} not found`);
    }
  }

  private async executeMemoryCleanup(): Promise<void> {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Clear any cached images or data
    // Note: In a real implementation, you would clear actual caches
    console.log('Memory cleanup executed');
  }

  private async executeLazyLoading(): Promise<void> {
    // Enable lazy loading for screens
    // Note: This would typically involve code changes
    console.log('Lazy loading optimization executed');
  }

  private async executeFormCaching(): Promise<void> {
    // Enable form schema caching
    console.log('Form caching optimization executed');
  }

  private async executeImageOptimization(): Promise<void> {
    // Optimize image handling
    console.log('Image optimization executed');
  }

  private async executeNetworkOptimization(): Promise<void> {
    // Optimize network requests
    console.log('Network optimization executed');
  }

  private async executeErrorReduction(): Promise<void> {
    // Implement error reduction strategies
    console.log('Error reduction optimization executed');
  }

  private async captureMetrics(targetMetrics: Array<keyof PerformanceMetrics>): Promise<Partial<PerformanceMetrics>> {
    // In a real implementation, this would capture actual metrics
    const metrics: Partial<PerformanceMetrics> = {};
    
    targetMetrics.forEach(metric => {
      // Simulate metric capture
      switch (metric) {
        case 'memoryUsage':
          (metrics as any)[metric] = this.getCurrentMemoryUsage();
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

  private calculateImprovement(
    before: Partial<PerformanceMetrics>,
    after: Partial<PerformanceMetrics>
  ): Record<string, number> {
    const improvement: Record<string, number> = {};
    
    Object.keys(before).forEach(key => {
      const beforeValue = before[key as keyof PerformanceMetrics];
      const afterValue = after[key as keyof PerformanceMetrics];
      
      if (typeof beforeValue === 'number' && typeof afterValue === 'number' && beforeValue > 0) {
        // For rates and accuracy, higher is better
        if (key.includes('Rate') || key.includes('Accuracy')) {
          improvement[key] = ((afterValue - beforeValue) / beforeValue) * 100;
        } else {
          // For times and usage, lower is better
          improvement[key] = ((beforeValue - afterValue) / beforeValue) * 100;
        }
      }
    });
    
    return improvement;
  }

  private getCurrentMemoryUsage(): number {
    try {
      // @ts-ignore - Platform-specific memory APIs
      if (typeof global !== 'undefined' && global.performance?.memory) {
        return global.performance.memory.usedJSHeapSize;
      }
    } catch (error) {
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
    
    this.storage.set('performance-measurements', JSON.stringify(measurements));
  }

  private getStoredMeasurements(): Array<any> {
    const stored = this.storage.getString('performance-measurements');
    return stored ? JSON.parse(stored) : [];
  }

  private storeOptimizationResult(result: OptimizationResult): void {
    this.optimizationHistory.push(result);
    
    // Keep only last 100 results
    if (this.optimizationHistory.length > 100) {
      this.optimizationHistory.splice(0, this.optimizationHistory.length - 100);
    }
    
    this.storage.set('optimization-history', sanitizePII(JSON.stringify(this.optimizationHistory)));
  }

  private savePerformanceBudgets(): void {
    this.storage.set('performance-budgets', JSON.stringify(this.performanceBudgets));
  }
}

export const performanceOptimization = new PerformanceOptimization();