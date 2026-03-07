/**
 * Performance Monitoring Service
 * Tracks key performance metrics for user flows while maintaining privacy compliance
 */

import { sanitizeObject, sanitizeString } from '../../utils/piiSanitizer';

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

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private activeFlows: Map<string, UserFlowMetric> = new Map();
  private memoryCheckInterval?: NodeJS.Timeout;
  private isEnabled: boolean = true;
  
  constructor() {
    this.startMemoryMonitoring();
  }

  /**
   * Enable or disable performance monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled && this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = undefined;
    } else if (enabled && !this.memoryCheckInterval) {
      this.startMemoryMonitoring();
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(
    name: string,
    value: number,
    unit: PerformanceMetric['unit'],
    category: PerformanceMetric['category'],
    metadata?: Record<string, any>
  ): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      id: this.generateId(),
      name: sanitizeString(name),
      value,
      unit,
      category,
      timestamp: Date.now(),
      metadata: metadata ? sanitizeObject(metadata, { preserveStructure: false }) : undefined,
    };

    this.metrics.push(metric);
    this.pruneOldMetrics();
  }

  /**
   * Start timing a user flow
   */
  startFlow(flowName: string, flowId?: string): string {
    if (!this.isEnabled) return '';

    const id = flowId || this.generateId();
    const flow: UserFlowMetric = {
      flowId: id,
      flowName: sanitizeString(flowName),
      startTime: Date.now(),
      steps: [],
      success: false,
    };

    this.activeFlows.set(id, flow);
    return id;
  }

  /**
   * Add a step to an active flow
   */
  addFlowStep(flowId: string, stepName: string, stepId?: string): string {
    if (!this.isEnabled) return '';

    const flow = this.activeFlows.get(flowId);
    if (!flow) return '';

    const id = stepId || this.generateId();
    const step: PerformanceStep = {
      stepId: id,
      stepName: sanitizeString(stepName),
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      success: false,
    };

    flow.steps.push(step);
    return id;
  }

  /**
   * Complete a flow step
   */
  completeFlowStep(
    flowId: string, 
    stepId: string, 
    success: boolean = true,
    metadata?: Record<string, any>
  ): void {
    if (!this.isEnabled) return;

    const flow = this.activeFlows.get(flowId);
    if (!flow) return;

    const step = flow.steps.find(s => s.stepId === stepId);
    if (!step) return;

    step.endTime = Date.now();
    step.duration = step.endTime - step.startTime;
    step.success = success;
    if (metadata) {
      step.metadata = sanitizeObject(metadata);
    }
  }

  /**
   * Complete a user flow
   */
  completeFlow(flowId: string, success: boolean = true, errorMessage?: string): void {
    if (!this.isEnabled) return;

    const flow = this.activeFlows.get(flowId);
    if (!flow) return;

    flow.endTime = Date.now();
    flow.duration = flow.endTime - flow.startTime;
    flow.success = success;
    if (errorMessage) {
      flow.errorMessage = sanitizeString(errorMessage);
    }

    // Record flow metric
    this.recordMetric(
      `flow_${flow.flowName}`,
      flow.duration,
      'ms',
      'navigation',
      {
        success,
        stepCount: flow.steps.length,
        averageStepDuration: flow.steps.length > 0 
          ? flow.steps.reduce((sum, step) => sum + step.duration, 0) / flow.steps.length
          : 0,
      }
    );

    this.activeFlows.delete(flowId);
  }

  /**
   * Record app startup metrics
   */
  recordStartupMetrics(metrics: {
    appStartTime: number;
    jsLoadTime: number;
    splashScreenDuration: number;
    timeToInteractive: number;
  }): void {
    if (!this.isEnabled) return;

    this.recordMetric('app_start_time', metrics.appStartTime, 'ms', 'startup');
    this.recordMetric('js_load_time', metrics.jsLoadTime, 'ms', 'startup');
    this.recordMetric('splash_duration', metrics.splashScreenDuration, 'ms', 'startup');
    this.recordMetric('time_to_interactive', metrics.timeToInteractive, 'ms', 'startup');
  }

  /**
   * Record form generation performance
   */
  recordFormPerformance(
    formType: string,
    generationTime: number,
    fieldCount: number,
    autoFillCount: number
  ): void {
    if (!this.isEnabled) return;

    this.recordMetric(
      `form_generation_${sanitizeString(formType)}`,
      generationTime,
      'ms',
      'form',
      {
        fieldCount,
        autoFillCount,
        autoFillPercentage: (autoFillCount / fieldCount) * 100,
      }
    );
  }

  /**
   * Record camera operation performance
   */
  recordCameraPerformance(
    operation: 'mrz_scan' | 'qr_scan',
    duration: number,
    success: boolean,
    retryCount: number = 0
  ): void {
    if (!this.isEnabled) return;

    this.recordMetric(
      `camera_${operation}`,
      duration,
      'ms',
      'camera',
      {
        success,
        retryCount,
      }
    );
  }

  /**
   * Get current memory usage
   */
  private getCurrentMemoryUsage(): MemoryMetrics | null {
    // In React Native, memory monitoring is platform-specific
    // This would need to be implemented with native modules
    // For now, return null as a placeholder
    return null;
  }

  /**
   * Start monitoring memory usage
   */
  private startMemoryMonitoring(): void {
    if (!this.isEnabled) return;

    this.memoryCheckInterval = setInterval(() => {
      const memoryMetrics = this.getCurrentMemoryUsage();
      if (memoryMetrics) {
        this.recordMetric(
          'memory_usage',
          memoryMetrics.percentage,
          'percentage',
          'memory',
          {
            used: memoryMetrics.used,
            total: memoryMetrics.total,
          }
        );
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(category?: PerformanceMetric['category']): {
    metrics: PerformanceMetric[];
    averages: Record<string, number>;
    counts: Record<string, number>;
  } {
    const filteredMetrics = category 
      ? this.metrics.filter(m => m.category === category)
      : this.metrics;

    const averages: Record<string, number> = {};
    const counts: Record<string, number> = {};

    // Group metrics by name and calculate averages
    const metricsByName = filteredMetrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric.value);
      return acc;
    }, {} as Record<string, number[]>);

    Object.entries(metricsByName).forEach(([name, values]) => {
      averages[name] = values.reduce((sum, val) => sum + val, 0) / values.length;
      counts[name] = values.length;
    });

    return {
      metrics: filteredMetrics,
      averages,
      counts,
    };
  }

  /**
   * Clear old metrics to prevent memory leaks
   */
  private pruneOldMetrics(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.metrics = this.metrics.filter(metric => metric.timestamp > oneHourAgo);
  }

  /**
   * Generate unique ID for flows and steps
   */
  private generateId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all metrics and active flows
   */
  clear(): void {
    this.metrics = [];
    this.activeFlows.clear();
  }

  /**
   * Get active flows count
   */
  getActiveFlowsCount(): number {
    return this.activeFlows.size;
  }

  /**
   * Export metrics for analysis (sanitized)
   */
  exportMetrics(): {
    metrics: PerformanceMetric[];
    activeFlows: UserFlowMetric[];
  } {
    return {
      metrics: this.metrics,
      activeFlows: Array.from(this.activeFlows.values()),
    };
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Convenience functions
export const recordMetric = performanceMonitor.recordMetric.bind(performanceMonitor);
export const startFlow = performanceMonitor.startFlow.bind(performanceMonitor);
export const completeFlow = performanceMonitor.completeFlow.bind(performanceMonitor);
export const addFlowStep = performanceMonitor.addFlowStep.bind(performanceMonitor);
export const completeFlowStep = performanceMonitor.completeFlowStep.bind(performanceMonitor);