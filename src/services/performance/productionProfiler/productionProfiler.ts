/**
 * Production Performance Profiler
 *
 * Real-time performance monitoring and optimization recommendations
 * for production environments. Delegates alert management and metrics
 * persistence to focused helper modules.
 */

import { MMKV } from 'react-native-mmkv';
import {
  generateRecommendation,
  getMetricStatus,
  getMetricTrend,
  getPerformanceTrends,
} from './profilerHelpers';
import { checkThresholds, storeAlert, getRecentAlerts } from './alerting';
import {
  flushMetricsBuffer,
  getHistoricalData,
  trackMemoryUsage,
  recordError,
} from './metricsStorage';

import type {
  PerformanceMetrics,
  PerformanceBenchmark,
  OptimizationRecommendation,
  PerformanceAlert,
} from './productionProfilerTypes';

// Re-export all types so existing imports from this module continue to work
export type {
  PerformanceMetrics,
  PerformanceBenchmark,
  OptimizationRecommendation,
  PerformanceAlert,
} from './productionProfilerTypes';

const OPERATION_MAP: Record<string, keyof PerformanceMetrics> = {
  'app-start': 'appStartTime',
  'screen-render': 'firstScreenRenderTime',
  'form-generation': 'formGenerationTime',
  'mrz-scan': 'mrzScanTime',
  'keychain-access': 'keychainAccessTime',
  'database-query': 'databaseQueryTime',
  'screen-transition': 'screenTransitionTime',
  'portal-request': 'portalResponseTime',
};

class ProductionProfiler {
  private storage: MMKV;
  private metricsBuffer: Array<PerformanceMetrics & { timestamp: number }> = [];
  private alertListeners: Array<(alert: PerformanceAlert) => void> = [];

  // Performance thresholds
  private thresholds: Record<keyof PerformanceMetrics, number> = {
    appStartTime: 3000,
    firstScreenRenderTime: 1000,
    formGenerationTime: 500,
    autoFillSuccessRate: 0.9,
    mrzScanTime: 2000,
    mrzAccuracy: 0.95,
    keychainAccessTime: 100,
    databaseQueryTime: 200,
    memoryUsage: 150 * 1024 * 1024,
    memoryPressure: 0,
    screenTransitionTime: 300,
    userFlowCompletionRate: 0.8,
    portalResponseTime: 5000,
    portalSuccessRate: 0.95,
    errorRate: 0.01,
    crashRate: 0.001,
  };

  constructor() {
    this.storage = new MMKV({ id: 'performance-profiler' });
    this.startPerformanceTracking();
  }

  private startPerformanceTracking(): void {
    setInterval(() => {
      trackMemoryUsage((metric, value) => this.recordMetric(metric, value));
    }, 30000);

    setInterval(() => {
      flushMetricsBuffer(this.storage, this.metricsBuffer);
      this.metricsBuffer = [];
    }, 300000);
  }

  recordMetric(metric: keyof PerformanceMetrics, value: number): void {
    const timestamp = Date.now();
    const currentMetrics = this.getCurrentMetrics();

    // Use Object.assign to set dynamic metric key without `any`
    Object.assign(currentMetrics, { [metric]: value });

    this.metricsBuffer.push({
      ...currentMetrics,
      timestamp,
    } as PerformanceMetrics & { timestamp: number });

    checkThresholds(metric, value, this.thresholds, alert =>
      storeAlert(this.storage, alert, this.alertListeners),
    );

    this.storage.set('current-metrics', JSON.stringify(currentMetrics));
  }

  async measureAsync<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await fn();
      const metricKey = OPERATION_MAP[operation];
      if (metricKey) {
        this.recordMetric(metricKey, Date.now() - startTime);
      }
      return result;
    } catch (error) {
      recordError(
        this.storage, operation, error as Error,
        Date.now() - startTime, () => this.getCurrentMetrics(),
      );
      throw error;
    }
  }

  measureSync<T>(operation: string, fn: () => T): T {
    const startTime = Date.now();
    try {
      const result = fn();
      const metricKey = OPERATION_MAP[operation];
      if (metricKey) {
        this.recordMetric(metricKey, Date.now() - startTime);
      }
      return result;
    } catch (error) {
      recordError(
        this.storage, operation, error as Error,
        Date.now() - startTime, () => this.getCurrentMetrics(),
      );
      throw error;
    }
  }

  getCurrentMetrics(): PerformanceMetrics {
    const storedMetrics = this.storage.getString('current-metrics');
    if (storedMetrics) {
      return JSON.parse(storedMetrics);
    }

    return {
      appStartTime: 0,
      firstScreenRenderTime: 0,
      formGenerationTime: 0,
      autoFillSuccessRate: 0,
      mrzScanTime: 0,
      mrzAccuracy: 0,
      keychainAccessTime: 0,
      databaseQueryTime: 0,
      memoryUsage: 0,
      memoryPressure: 'low',
      screenTransitionTime: 0,
      userFlowCompletionRate: 0,
      portalResponseTime: 0,
      portalSuccessRate: 0,
      errorRate: 0,
      crashRate: 0,
    };
  }

  getBenchmarks(): PerformanceBenchmark[] {
    const current = this.getCurrentMetrics();
    const historical = getHistoricalData(this.storage, 7);

    return Object.entries(this.thresholds).map(([metricKey, target]) => {
      const metric = metricKey as keyof PerformanceMetrics;
      const currentValue = current[metric] as number;
      const historicalValues = historical.map(h => h[metric] as number);

      return {
        metric,
        target,
        current: currentValue,
        status: getMetricStatus(metric, currentValue, target),
        trend: getMetricTrend(historicalValues),
      };
    });
  }

  getOptimizationRecommendations(): OptimizationRecommendation[] {
    const benchmarks = this.getBenchmarks();
    const recommendations: OptimizationRecommendation[] = [];

    benchmarks.forEach(benchmark => {
      if (benchmark.status === 'warning' || benchmark.status === 'critical') {
        const recommendation = generateRecommendation(benchmark);
        if (recommendation) {
          recommendations.push(recommendation);
        }
      }
    });

    return recommendations.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const impactWeight = { high: 3, medium: 2, low: 1 };
      return (
        priorityWeight[b.priority] + impactWeight[b.impact] -
        (priorityWeight[a.priority] + impactWeight[a.impact])
      );
    });
  }

  getHealthScore(): number {
    const benchmarks = this.getBenchmarks();
    let totalScore = 0;

    benchmarks.forEach(benchmark => {
      switch (benchmark.status) {
        case 'excellent': totalScore += 100; break;
        case 'good': totalScore += 80; break;
        case 'warning': totalScore += 60; break;
        case 'critical': totalScore += 20; break;
      }
    });

    return Math.round(totalScore / benchmarks.length);
  }

  onAlert(listener: (alert: PerformanceAlert) => void): () => void {
    this.alertListeners.push(listener);
    return () => {
      const index = this.alertListeners.indexOf(listener);
      if (index > -1) {
        this.alertListeners.splice(index, 1);
      }
    };
  }

  getDashboardData() {
    return {
      healthScore: this.getHealthScore(),
      metrics: this.getCurrentMetrics(),
      benchmarks: this.getBenchmarks(),
      recommendations: this.getOptimizationRecommendations(),
      alerts: getRecentAlerts(this.storage),
      trends: getPerformanceTrends(this.storage, this.thresholds),
    };
  }

  resetForTesting(): void {
    const allKeys = this.storage.getAllKeys();
    allKeys.forEach(key => this.storage.delete(key));
    this.metricsBuffer = [];
    this.alertListeners = [];
  }
}

export const productionProfiler = new ProductionProfiler();
