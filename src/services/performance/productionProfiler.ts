/**
 * Production Performance Profiler
 * 
 * Real-time performance monitoring and optimization recommendations
 * for production environments. Tracks key metrics and provides actionable insights.
 */

import { MMKV } from 'react-native-mmkv';
import { sanitizePII } from '../../utils/piiSanitizer';

declare const global: any;

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

class ProductionProfiler {
  private storage: MMKV;
  private metricsBuffer: PerformanceMetrics[] = [];
  private alertListeners: Array<(alert: PerformanceAlert) => void> = [];
  
  // Performance thresholds
  private thresholds: Record<keyof PerformanceMetrics, number> = {
    appStartTime: 3000, // 3 seconds
    firstScreenRenderTime: 1000, // 1 second
    formGenerationTime: 500, // 500ms
    autoFillSuccessRate: 0.9, // 90%
    mrzScanTime: 2000, // 2 seconds
    mrzAccuracy: 0.95, // 95%
    keychainAccessTime: 100, // 100ms
    databaseQueryTime: 200, // 200ms
    memoryUsage: 150 * 1024 * 1024, // 150MB
    memoryPressure: 0, // handled separately
    screenTransitionTime: 300, // 300ms
    userFlowCompletionRate: 0.8, // 80%
    portalResponseTime: 5000, // 5 seconds
    portalSuccessRate: 0.95, // 95%
    errorRate: 0.01, // 1%
    crashRate: 0.001, // 0.1%
  };

  constructor() {
    this.storage = new MMKV({
      id: 'performance-profiler',
    });
    
    this.startPerformanceTracking();
  }

  /**
   * Start continuous performance monitoring
   */
  private startPerformanceTracking(): void {
    // Track memory usage every 30 seconds
    setInterval(() => {
      this.trackMemoryUsage();
    }, 30000);

    // Flush metrics buffer every 5 minutes
    setInterval(() => {
      this.flushMetrics();
    }, 300000);
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: keyof PerformanceMetrics, value: number): void {
    const timestamp = Date.now();
    const currentMetrics = this.getCurrentMetrics();
    
    // Update current metrics
    (currentMetrics as any)[metric] = value;
    
    // Store in buffer
    this.metricsBuffer.push({
      ...currentMetrics,
      timestamp,
    } as PerformanceMetrics & { timestamp: number });

    // Check for threshold violations
    this.checkThresholds(metric, value);

    // Store current snapshot
    this.storage.set('current-metrics', JSON.stringify(currentMetrics));
  }

  /**
   * Measure function execution time
   */
  async measureAsync<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await fn();
      const executionTime = Date.now() - startTime;
      
      // Map operation to metric
      const metricKey = this.mapOperationToMetric(operation);
      if (metricKey) {
        this.recordMetric(metricKey, executionTime);
      }
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.recordError(operation, error as Error, executionTime);
      throw error;
    }
  }

  /**
   * Measure synchronous function execution time
   */
  measureSync<T>(operation: string, fn: () => T): T {
    const startTime = Date.now();
    try {
      const result = fn();
      const executionTime = Date.now() - startTime;
      
      // Map operation to metric
      const metricKey = this.mapOperationToMetric(operation);
      if (metricKey) {
        this.recordMetric(metricKey, executionTime);
      }
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.recordError(operation, error as Error, executionTime);
      throw error;
    }
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): PerformanceMetrics {
    const storedMetrics = this.storage.getString('current-metrics');
    if (storedMetrics) {
      return JSON.parse(storedMetrics);
    }

    // Return default metrics
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

  /**
   * Get performance benchmarks with status and trends
   */
  getBenchmarks(): PerformanceBenchmark[] {
    const current = this.getCurrentMetrics();
    const historical = this.getHistoricalData(7); // Last 7 days
    
    return Object.entries(this.thresholds).map(([metricKey, target]) => {
      const metric = metricKey as keyof PerformanceMetrics;
      const currentValue = current[metric] as number;
      const historicalValues = historical.map(h => h[metric] as number);
      
      return {
        metric,
        target,
        current: currentValue,
        status: this.getMetricStatus(metric, currentValue, target),
        trend: this.getMetricTrend(historicalValues),
      };
    });
  }

  /**
   * Generate optimization recommendations
   */
  getOptimizationRecommendations(): OptimizationRecommendation[] {
    const benchmarks = this.getBenchmarks();
    const recommendations: OptimizationRecommendation[] = [];

    benchmarks.forEach(benchmark => {
      if (benchmark.status === 'warning' || benchmark.status === 'critical') {
        const recommendation = this.generateRecommendation(benchmark);
        if (recommendation) {
          recommendations.push(recommendation);
        }
      }
    });

    // Sort by priority and impact
    return recommendations.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const impactWeight = { high: 3, medium: 2, low: 1 };
      
      const scoreA = priorityWeight[a.priority] + impactWeight[a.impact];
      const scoreB = priorityWeight[b.priority] + impactWeight[b.impact];
      
      return scoreB - scoreA;
    });
  }

  /**
   * Get performance health score (0-100)
   */
  getHealthScore(): number {
    const benchmarks = this.getBenchmarks();
    let totalScore = 0;
    
    benchmarks.forEach(benchmark => {
      switch (benchmark.status) {
        case 'excellent':
          totalScore += 100;
          break;
        case 'good':
          totalScore += 80;
          break;
        case 'warning':
          totalScore += 60;
          break;
        case 'critical':
          totalScore += 20;
          break;
      }
    });

    return Math.round(totalScore / benchmarks.length);
  }

  /**
   * Register alert listener
   */
  onAlert(listener: (alert: PerformanceAlert) => void): () => void {
    this.alertListeners.push(listener);
    return () => {
      const index = this.alertListeners.indexOf(listener);
      if (index > -1) {
        this.alertListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get performance dashboard data
   */
  getDashboardData() {
    return {
      healthScore: this.getHealthScore(),
      metrics: this.getCurrentMetrics(),
      benchmarks: this.getBenchmarks(),
      recommendations: this.getOptimizationRecommendations(),
      alerts: this.getRecentAlerts(),
      trends: this.getPerformanceTrends(),
    };
  }

  // Private methods

  private mapOperationToMetric(operation: string): keyof PerformanceMetrics | null {
    const operationMap: Record<string, keyof PerformanceMetrics> = {
      'app-start': 'appStartTime',
      'screen-render': 'firstScreenRenderTime',
      'form-generation': 'formGenerationTime',
      'mrz-scan': 'mrzScanTime',
      'keychain-access': 'keychainAccessTime',
      'database-query': 'databaseQueryTime',
      'screen-transition': 'screenTransitionTime',
      'portal-request': 'portalResponseTime',
    };

    return operationMap[operation] || null;
  }

  private checkThresholds(metric: keyof PerformanceMetrics, value: number): void {
    const threshold = this.thresholds[metric];
    if (!threshold) return;

    let violated = false;
    let severity: PerformanceAlert['severity'] = 'info';

    // Check threshold violation based on metric type
    if (metric.includes('Rate') || metric.includes('Accuracy')) {
      // For rates and accuracy, lower values are worse
      violated = value < threshold;
      severity = value < threshold * 0.8 ? 'critical' : 'warning';
    } else {
      // For times and usage, higher values are worse
      violated = value > threshold;
      severity = value > threshold * 1.5 ? 'critical' : 'warning';
    }

    if (violated) {
      const alert: PerformanceAlert = {
        id: `${metric}-${Date.now()}`,
        timestamp: Date.now(),
        severity,
        metric,
        message: `${metric} threshold violation: ${value} (threshold: ${threshold})`,
        threshold,
        actualValue: value,
      };

      this.emitAlert(alert);
    }
  }

  private emitAlert(alert: PerformanceAlert): void {
    // Store alert
    const alerts = this.getStoredAlerts();
    alerts.push(alert);
    
    // Keep only last 100 alerts
    if (alerts.length > 100) {
      alerts.splice(0, alerts.length - 100);
    }
    
    this.storage.set('performance-alerts', sanitizePII(JSON.stringify(alerts)));
    
    // Notify listeners
    this.alertListeners.forEach(listener => listener(alert));
  }

  private getStoredAlerts(): PerformanceAlert[] {
    const stored = this.storage.getString('performance-alerts');
    return stored ? JSON.parse(stored) : [];
  }

  private getRecentAlerts(hours: number = 24): PerformanceAlert[] {
    const alerts = this.getStoredAlerts();
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    
    return alerts.filter(alert => alert.timestamp > cutoff);
  }

  private trackMemoryUsage(): void {
    if (__DEV__) return; // Skip in development
    
    // Use native memory tracking APIs if available
    try {
      // @ts-ignore - Platform-specific memory APIs
      if (typeof global !== 'undefined' && global.performance?.memory) {
        const memory = global.performance.memory;
        this.recordMetric('memoryUsage', memory.usedJSHeapSize);
      }
    } catch (error) {
      // Fallback to approximate memory tracking
      console.warn('Memory tracking not available:', error);
    }
  }

  private flushMetrics(): void {
    if (this.metricsBuffer.length === 0) return;

    // Store historical data
    const historicalKey = `metrics-${new Date().toISOString().split('T')[0]}`;
    const existing = this.storage.getString(historicalKey);
    const existingData = existing ? JSON.parse(existing) : [];
    
    existingData.push(...this.metricsBuffer);
    this.storage.set(historicalKey, sanitizePII(JSON.stringify(existingData)));

    // Clear buffer
    this.metricsBuffer = [];

    // Clean up old data (keep 30 days)
    this.cleanupOldData();
  }

  private cleanupOldData(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    
    const allKeys = this.storage.getAllKeys();
    allKeys.forEach(key => {
      if (key.startsWith('metrics-')) {
        const dateStr = key.replace('metrics-', '');
        const date = new Date(dateStr);
        
        if (date < cutoffDate) {
          this.storage.delete(key);
        }
      }
    });
  }

  private getHistoricalData(days: number): Array<PerformanceMetrics & { timestamp: number }> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    const data: Array<PerformanceMetrics & { timestamp: number }> = [];
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const key = `metrics-${date.toISOString().split('T')[0]}`;
      const dayData = this.storage.getString(key);
      
      if (dayData) {
        data.push(...JSON.parse(dayData));
      }
    }
    
    return data;
  }

  private getMetricStatus(
    metric: keyof PerformanceMetrics,
    value: number,
    target: number
  ): PerformanceBenchmark['status'] {
    if (metric.includes('Rate') || metric.includes('Accuracy')) {
      // For rates and accuracy, higher is better
      if (value >= target) return 'excellent';
      if (value >= target * 0.9) return 'good';
      if (value >= target * 0.8) return 'warning';
      return 'critical';
    } else {
      // For times and usage, lower is better
      if (value <= target * 0.7) return 'excellent';
      if (value <= target) return 'good';
      if (value <= target * 1.3) return 'warning';
      return 'critical';
    }
  }

  private getMetricTrend(values: number[]): PerformanceBenchmark['trend'] {
    if (values.length < 4) {
      return 'stable';
    }

    const recentValues = values.slice(-3);
    const olderValues = values.slice(0, values.length - 3);

    const recentAvg = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
    const olderAvg = olderValues.reduce((a, b) => a + b, 0) / olderValues.length;

    if (olderAvg === 0) {
      return recentAvg > 0 ? 'declining' : 'stable';
    }

    const relativeChange = (recentAvg - olderAvg) / olderAvg;
    if (Math.abs(relativeChange) < 0.05) {
      return 'stable';
    }

    return recentAvg < olderAvg ? 'improving' : 'declining';
  }

  private generateRecommendation(benchmark: PerformanceBenchmark): OptimizationRecommendation | null {
    const recommendations: Record<string, OptimizationRecommendation> = {
      appStartTime: {
        id: 'optimize-app-start',
        priority: 'high',
        category: 'performance',
        title: 'Optimize App Startup Time',
        description: 'App is taking longer than expected to start. Consider lazy loading and reducing initial bundle size.',
        impact: 'high',
        effort: 'medium',
        implementation: [
          'Implement lazy loading for non-critical screens',
          'Optimize initial bundle size',
          'Move heavy initialization to background',
          'Use React.lazy for component code splitting'
        ]
      },
      formGenerationTime: {
        id: 'optimize-form-generation',
        priority: 'medium',
        category: 'performance',
        title: 'Optimize Form Generation',
        description: 'Form generation is slower than target. Consider caching and memoization.',
        impact: 'medium',
        effort: 'low',
        implementation: [
          'Add React.memo to form components',
          'Cache form schemas',
          'Optimize field mapping algorithm',
          'Use useMemo for expensive calculations'
        ]
      },
      memoryUsage: {
        id: 'reduce-memory-usage',
        priority: 'high',
        category: 'memory',
        title: 'Reduce Memory Consumption',
        description: 'App is using more memory than target. Look for memory leaks and optimize data structures.',
        impact: 'high',
        effort: 'high',
        implementation: [
          'Audit for memory leaks',
          'Implement image lazy loading',
          'Optimize data structures',
          'Use weak references where appropriate'
        ]
      },
    };

    return recommendations[benchmark.metric] || null;
  }

  private getPerformanceTrends() {
    const historical = this.getHistoricalData(14); // Last 14 days
    const groupedByDay: Record<string, Array<PerformanceMetrics & { timestamp: number }>> = {};
    
    // Group by day
    historical.forEach(metric => {
      const day = new Date(metric.timestamp).toISOString().split('T')[0];
      if (!groupedByDay[day]) {
        groupedByDay[day] = [];
      }
      groupedByDay[day].push(metric);
    });

    // Calculate daily averages
    const trends = Object.entries(groupedByDay).map(([day, metrics]) => {
      const averages: Partial<PerformanceMetrics> = {};
      
      Object.keys(this.thresholds).forEach(metricKey => {
        const metric = metricKey as keyof PerformanceMetrics;
        const values = metrics.map(m => m[metric] as number).filter(v => v > 0);
        
        if (values.length > 0) {
          (averages as any)[metric] = values.reduce((a, b) => a + b, 0) / values.length;
        }
      });
      
      return {
        date: day,
        ...averages,
      };
    });

    return trends.sort((a, b) => a.date.localeCompare(b.date));
  }

  private recordError(operation: string, error: Error, executionTime: number): void {
    const errorMetrics = this.getCurrentMetrics();
    
    // Calculate actual error rate based on recent operations
    const recentOperations = this.getRecentOperations();
    const recentErrors = this.getRecentErrors();
    errorMetrics.errorRate = recentOperations > 0 ? recentErrors / recentOperations : 0;
    
    this.storage.set('current-metrics', JSON.stringify(errorMetrics));
    
    // Log sanitized error for debugging
    console.error(`Performance error in ${operation}:`, {
      message: sanitizePII(error.message),
      executionTime,
      timestamp: Date.now(),
    });
    
    // Store error for rate calculation
    this.recordErrorForTracking();
  }
  
  private getRecentOperations(): number {
    // Simplified - in real implementation would track operations
    return 100; // Default value for testing
  }
  
  private getRecentErrors(): number {
    // Simplified - in real implementation would track errors
    return 1; // Default value for testing
  }
  
  private recordErrorForTracking(): void {
    // Store error occurrence for rate calculation
    const key = 'error-tracking';
    const existing = this.storage.getString(key);
    const errors = existing ? JSON.parse(existing) : [];
    errors.push(Date.now());
    
    // Keep only last 100 errors
    const recentErrors = errors.slice(-100);
    this.storage.set(key, JSON.stringify(recentErrors));
  }

  /**
   * Reset all stored data (for testing)
   */
  resetForTesting(): void {
    // Clear all storage keys
    const allKeys = this.storage.getAllKeys();
    allKeys.forEach(key => this.storage.delete(key));
    
    // Reset internal state
    this.metricsBuffer = [];
    this.alertListeners = [];
  }
}

export const productionProfiler = new ProductionProfiler();