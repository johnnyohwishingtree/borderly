/**
 * Regression Detection Service
 * 
 * Detects performance regressions using statistical analysis and machine learning
 * techniques. Provides early warning for performance degradations.
 */

import { MMKV } from 'react-native-mmkv';
import { sanitizePII } from '../../utils/piiSanitizer';
import type { PerformanceMetrics } from './productionProfiler';

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
const DEFAULT_THRESHOLDS: Record<keyof PerformanceMetrics, RegressionThreshold> = {
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

class RegressionDetection {
  private storage: MMKV;
  private models: Map<keyof PerformanceMetrics, RegressionModel> = new Map();
  private alertListeners: Array<(alert: RegressionAlert) => void> = [];
  private thresholds: Record<keyof PerformanceMetrics, RegressionThreshold>;

  constructor() {
    this.storage = new MMKV({
      id: 'regression-detection',
      encryptionKey: undefined, // Regression data is not sensitive
    });
    
    this.thresholds = { ...DEFAULT_THRESHOLDS };
    this.loadModels();
    this.startPeriodicAnalysis();
  }

  /**
   * Analyze new performance data for regressions
   */
  analyzeMetrics(metrics: PerformanceMetrics): RegressionAlert[] {
    const alerts: RegressionAlert[] = [];
    
    Object.entries(metrics).forEach(([metricKey, value]) => {
      const metric = metricKey as keyof PerformanceMetrics;
      if (typeof value !== 'number') return;

      const alert = this.analyzeMetric(metric, value);
      if (alert) {
        alerts.push(alert);
      }
    });

    // Store alerts
    if (alerts.length > 0) {
      this.storeAlerts(alerts);
      this.notifyListeners(alerts);
    }

    return alerts;
  }

  /**
   * Analyze a specific metric for regression
   */
  analyzeMetric(metric: keyof PerformanceMetrics, value: number): RegressionAlert | null {
    // Get or create model for this metric
    let model = this.models.get(metric);
    if (!model) {
      model = this.createModel(metric);
      this.models.set(metric, model);
    }

    // Update model with new data point
    this.updateModel(model, value);

    // Check for regression
    const regression = this.detectRegression(model, value);
    
    if (regression) {
      return {
        id: `regression-${metric}-${Date.now()}`,
        timestamp: Date.now(),
        metric,
        severity: regression.severity,
        message: regression.message,
        currentValue: value,
        expectedValue: regression.expectedValue,
        deviation: regression.deviation,
        confidence: regression.confidence,
        trend: regression.trend,
        recommendation: this.generateRecommendation(metric, regression),
        affectedUsers: this.estimateAffectedUsers(metric, regression.deviation),
      };
    }

    return null;
  }

  /**
   * Get current regression models
   */
  getModels(): RegressionModel[] {
    return Array.from(this.models.values());
  }

  /**
   * Get recent regression alerts
   */
  getRecentAlerts(hours: number = 24): RegressionAlert[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    const storedAlerts = this.getStoredAlerts();
    
    return storedAlerts.filter(alert => alert.timestamp > cutoff);
  }

  /**
   * Generate regression report
   */
  generateReport(): RegressionReport {
    const alerts = this.getRecentAlerts(24);
    const models = this.getModels();
    
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    const warningAlerts = alerts.filter(a => a.severity === 'warning').length;
    
    const affectedMetrics = [...new Set(alerts.map(a => a.metric))];
    
    let overallHealth: RegressionReport['summary']['overallHealth'] = 'excellent';
    if (criticalAlerts > 0) {
      overallHealth = 'critical';
    } else if (warningAlerts > 2) {
      overallHealth = 'warning';
    } else if (warningAlerts > 0) {
      overallHealth = 'good';
    }

    return {
      timestamp: Date.now(),
      summary: {
        totalAlerts: alerts.length,
        criticalAlerts,
        warningAlerts,
        affectedMetrics,
        overallHealth,
      },
      alerts,
      models,
      recommendations: this.generateReportRecommendations(alerts, models),
    };
  }

  /**
   * Update regression thresholds
   */
  updateThresholds(metric: keyof PerformanceMetrics, thresholds: Partial<RegressionThreshold>): void {
    this.thresholds[metric] = {
      ...this.thresholds[metric],
      ...thresholds,
    };
    
    // Update model thresholds
    const model = this.models.get(metric);
    if (model) {
      model.thresholds = this.thresholds[metric];
      this.saveModel(model);
    }
  }

  /**
   * Register alert listener
   */
  onAlert(listener: (alert: RegressionAlert) => void): () => void {
    this.alertListeners.push(listener);
    return () => {
      const index = this.alertListeners.indexOf(listener);
      if (index > -1) {
        this.alertListeners.splice(index, 1);
      }
    };
  }

  /**
   * Predict future performance
   */
  predictPerformance(metric: keyof PerformanceMetrics, hoursAhead: number): number | null {
    const model = this.models.get(metric);
    if (!model || model.dataPoints < model.thresholds.minimumDataPoints) {
      return null;
    }

    // Simple linear trend prediction
    const trend = model.baseline.trend;
    const trendStrength = model.baseline.trendStrength;
    const currentMean = model.baseline.mean;
    
    let prediction = currentMean;
    
    if (trend === 'improving' && trendStrength > 0.3) {
      prediction = currentMean * (1 - (trendStrength * hoursAhead * 0.001));
    } else if (trend === 'declining' && trendStrength > 0.3) {
      prediction = currentMean * (1 + (trendStrength * hoursAhead * 0.001));
    }
    
    return Math.max(0, prediction);
  }

  // Private methods

  private createModel(metric: keyof PerformanceMetrics): RegressionModel {
    return {
      metric,
      baseline: {
        mean: 0,
        median: 0,
        standardDeviation: 0,
        variance: 0,
        percentile95: 0,
        percentile99: 0,
        trend: 'stable',
        trendStrength: 0,
        outliers: [],
      },
      thresholds: this.thresholds[metric],
      lastUpdated: Date.now(),
      dataPoints: 0,
      accuracy: 0,
      predictions: {
        nextHour: 0,
        nextDay: 0,
        nextWeek: 0,
      },
    };
  }

  private updateModel(model: RegressionModel, newValue: number): void {
    // Get historical data for this metric
    const historicalData = this.getHistoricalData(model.metric);
    historicalData.push(newValue);
    
    // Update statistical analysis
    model.baseline = this.calculateStatistics(historicalData);
    model.dataPoints = historicalData.length;
    model.lastUpdated = Date.now();
    
    // Update predictions
    model.predictions = {
      nextHour: this.predictPerformance(model.metric, 1) || newValue,
      nextDay: this.predictPerformance(model.metric, 24) || newValue,
      nextWeek: this.predictPerformance(model.metric, 168) || newValue,
    };

    // Calculate model accuracy (simplified)
    if (historicalData.length > 10) {
      const recent = historicalData.slice(-10);
      const predicted = recent.map(() => model.baseline.mean);
      model.accuracy = 1 - (this.calculateMeanAbsoluteError(recent, predicted) / model.baseline.mean);
    }
    
    // Store updated model
    this.saveModel(model);
  }

  private calculateStatistics(data: number[]): StatisticalAnalysis {
    if (data.length === 0) {
      return {
        mean: 0,
        median: 0,
        standardDeviation: 0,
        variance: 0,
        percentile95: 0,
        percentile99: 0,
        trend: 'stable',
        trendStrength: 0,
        outliers: [],
      };
    }

    const sorted = [...data].sort((a, b) => a - b);
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    
    const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length;
    const standardDeviation = Math.sqrt(variance);
    
    const percentile95 = sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1];
    const percentile99 = sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1];
    
    // Detect outliers using IQR method
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    const outliers = data.filter(val => val < lowerBound || val > upperBound);
    
    // Calculate trend
    const { trend, trendStrength } = this.calculateTrend(data);
    
    return {
      mean,
      median,
      standardDeviation,
      variance,
      percentile95,
      percentile99,
      trend,
      trendStrength,
      outliers,
    };
  }

  private calculateTrend(data: number[]): { trend: 'improving' | 'declining' | 'stable'; trendStrength: number } {
    if (data.length < 3) return { trend: 'stable', trendStrength: 0 };
    
    // Use simple linear regression to detect trend
    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = data;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    if (Math.abs(slope) < 0.01) return { trend: 'stable', trendStrength: 0 };
    
    const trend = slope > 0 ? 'declining' : 'improving'; // For performance metrics, negative slope is improving
    const trendStrength = Math.min(1, Math.abs(slope) / (sumY / n * 0.1)); // Normalize by 10% of mean
    
    return { trend, trendStrength };
  }

  private detectRegression(
    model: RegressionModel, 
    currentValue: number
  ): {
    severity: 'warning' | 'critical';
    message: string;
    expectedValue: number;
    deviation: number;
    confidence: number;
    trend: 'improving' | 'declining' | 'stable';
  } | null {
    if (model.dataPoints < model.thresholds.minimumDataPoints) {
      return null; // Not enough data for reliable detection
    }

    const baseline = model.baseline;
    const expectedValue = baseline.mean;
    const threshold = baseline.standardDeviation * 2; // 2 standard deviations
    
    // Calculate deviation percentage
    const absoluteDeviation = Math.abs(currentValue - expectedValue);
    const deviationPercentage = (absoluteDeviation / expectedValue) * 100;
    
    // Check if this is a significant regression
    const isRegression = this.isSignificantRegression(
      model.metric,
      currentValue,
      expectedValue,
      deviationPercentage
    );
    
    if (!isRegression) return null;
    
    // Determine severity
    let severity: 'warning' | 'critical' = 'warning';
    if (deviationPercentage > model.thresholds.criticalDeviation) {
      severity = 'critical';
    }
    
    // Calculate statistical confidence
    const zScore = absoluteDeviation / baseline.standardDeviation;
    const confidence = this.normalCDF(zScore);
    
    if (confidence < model.thresholds.confidence) {
      return null; // Not confident enough in the detection
    }
    
    const message = this.generateRegressionMessage(
      model.metric,
      currentValue,
      expectedValue,
      deviationPercentage,
      severity
    );
    
    return {
      severity,
      message,
      expectedValue,
      deviation: deviationPercentage,
      confidence,
      trend: baseline.trend,
    };
  }

  private isSignificantRegression(
    metric: keyof PerformanceMetrics,
    current: number,
    expected: number,
    deviationPercentage: number
  ): boolean {
    const threshold = this.thresholds[metric];
    
    // Check if deviation exceeds warning threshold
    if (deviationPercentage < threshold.warningDeviation) {
      return false;
    }
    
    // For rates and accuracy metrics, lower values are regressions
    if (metric.includes('Rate') || metric.includes('Accuracy')) {
      return current < expected;
    }
    
    // For time and usage metrics, higher values are regressions
    return current > expected;
  }

  private generateRegressionMessage(
    metric: keyof PerformanceMetrics,
    current: number,
    expected: number,
    deviation: number,
    severity: 'warning' | 'critical'
  ): string {
    const metricName = metric.replace(/([A-Z])/g, ' $1').toLowerCase();
    const deviationStr = deviation.toFixed(1);
    
    if (severity === 'critical') {
      return `Critical regression detected in ${metricName}: ${deviationStr}% worse than expected`;
    } else {
      return `Performance regression detected in ${metricName}: ${deviationStr}% degradation`;
    }
  }

  private generateRecommendation(
    metric: keyof PerformanceMetrics,
    regression: { severity: 'warning' | 'critical'; deviation: number }
  ): string {
    const recommendations: Record<keyof PerformanceMetrics, string> = {
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
    
    return recommendations[metric] || 'Monitor the metric closely and investigate potential causes';
  }

  private estimateAffectedUsers(metric: keyof PerformanceMetrics, deviation: number): number {
    // Simplified estimation based on deviation severity
    const baseUsers = 100; // Assume base user population
    
    if (deviation > 50) return Math.round(baseUsers * 0.8); // High impact
    if (deviation > 30) return Math.round(baseUsers * 0.5); // Medium impact
    if (deviation > 15) return Math.round(baseUsers * 0.2); // Low impact
    
    return Math.round(baseUsers * 0.1); // Minimal impact
  }

  private normalCDF(z: number): number {
    // Approximation of the normal cumulative distribution function
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    
    return z > 0 ? 1 - prob : prob;
  }

  private calculateMeanAbsoluteError(actual: number[], predicted: number[]): number {
    if (actual.length !== predicted.length || actual.length === 0) return 0;
    
    const errors = actual.map((a, i) => Math.abs(a - predicted[i]));
    return errors.reduce((a, b) => a + b, 0) / errors.length;
  }

  private getHistoricalData(metric: keyof PerformanceMetrics): number[] {
    const key = `historical-${metric}`;
    const stored = this.storage.getString(key);
    return stored ? JSON.parse(stored) : [];
  }

  private storeHistoricalData(metric: keyof PerformanceMetrics, data: number[]): void {
    const key = `historical-${metric}`;
    
    // Keep only last 1000 data points to manage storage
    const limitedData = data.slice(-1000);
    this.storage.set(key, JSON.stringify(limitedData));
  }

  private saveModel(model: RegressionModel): void {
    const key = `model-${model.metric}`;
    this.storage.set(key, sanitizePII(JSON.stringify(model)));
  }

  private loadModels(): void {
    const allKeys = this.storage.getAllKeys();
    
    allKeys.forEach(key => {
      if (key.startsWith('model-')) {
        const stored = this.storage.getString(key);
        if (stored) {
          const model: RegressionModel = JSON.parse(stored);
          this.models.set(model.metric, model);
        }
      }
    });
  }

  private storeAlerts(alerts: RegressionAlert[]): void {
    const existingAlerts = this.getStoredAlerts();
    const allAlerts = [...existingAlerts, ...alerts];
    
    // Keep only last 500 alerts
    const limitedAlerts = allAlerts.slice(-500);
    
    this.storage.set('regression-alerts', sanitizePII(JSON.stringify(limitedAlerts)));
  }

  private getStoredAlerts(): RegressionAlert[] {
    const stored = this.storage.getString('regression-alerts');
    return stored ? JSON.parse(stored) : [];
  }

  private notifyListeners(alerts: RegressionAlert[]): void {
    alerts.forEach(alert => {
      this.alertListeners.forEach(listener => listener(alert));
    });
  }

  private generateReportRecommendations(alerts: RegressionAlert[], models: RegressionModel[]): string[] {
    const recommendations: string[] = [];
    
    // High-level recommendations based on alert patterns
    const criticalCount = alerts.filter(a => a.severity === 'critical').length;
    const warningCount = alerts.filter(a => a.severity === 'warning').length;
    
    if (criticalCount > 0) {
      recommendations.push('Immediate action required: Critical performance regressions detected');
      recommendations.push('Investigate recent code changes and deployments');
      recommendations.push('Consider rollback if regressions are severe');
    }
    
    if (warningCount > 2) {
      recommendations.push('Monitor performance closely: Multiple warning-level regressions detected');
      recommendations.push('Review performance optimization strategies');
    }
    
    // Metric-specific recommendations
    const affectedMetrics = [...new Set(alerts.map(a => a.metric))];
    if (affectedMetrics.includes('memoryUsage') || affectedMetrics.includes('memoryPressure')) {
      recommendations.push('Focus on memory optimization and leak detection');
    }
    
    if (affectedMetrics.some(m => m.includes('Time'))) {
      recommendations.push('Investigate timing-related performance issues');
    }
    
    if (affectedMetrics.some(m => m.includes('Rate'))) {
      recommendations.push('Review success rate metrics and error handling');
    }
    
    return recommendations;
  }

  private startPeriodicAnalysis(): void {
    // Run model updates every hour
    setInterval(() => {
      this.updateAllModels();
    }, 3600000);
    
    // Clean up old data every day
    setInterval(() => {
      this.cleanupOldData();
    }, 86400000);
  }

  private updateAllModels(): void {
    // Update predictions for all models
    this.models.forEach((model) => {
      model.predictions = {
        nextHour: this.predictPerformance(model.metric, 1) || model.baseline.mean,
        nextDay: this.predictPerformance(model.metric, 24) || model.baseline.mean,
        nextWeek: this.predictPerformance(model.metric, 168) || model.baseline.mean,
      };
      this.saveModel(model);
    });
  }

  private cleanupOldData(): void {
    const alerts = this.getStoredAlerts();
    const cutoff = Date.now() - (90 * 24 * 60 * 60 * 1000); // 90 days
    
    const recentAlerts = alerts.filter(alert => alert.timestamp > cutoff);
    this.storage.set('regression-alerts', sanitizePII(JSON.stringify(recentAlerts)));
  }
}

export const regressionDetection = new RegressionDetection();