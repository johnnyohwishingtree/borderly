/**
 * Regression Detection Service
 *
 * Detects performance regressions using statistical analysis and machine learning
 * techniques. Provides early warning for performance degradations.
 */

import { MMKV } from '@/services/storage/mmkv';
import { sanitizePII } from '../../utils/piiSanitizer';
import type { PerformanceMetrics } from './productionProfiler';
import {
  DEFAULT_THRESHOLDS,
  METRIC_RECOMMENDATIONS,
} from './regressionDetectionTypes';
import type {
  RegressionAlert,
  RegressionThreshold,
  RegressionModel,
  RegressionReport,
} from './regressionDetectionTypes';
import {
  calculateStatistics,
  calculateMeanAbsoluteError,
  normalCDF,
} from './statisticalAnalysis';

// Re-export all types and constants for backward compatibility
export type {
  RegressionAlert,
  RegressionThreshold,
  StatisticalAnalysis,
  RegressionModel,
  RegressionReport,
} from './regressionDetectionTypes';
export { DEFAULT_THRESHOLDS } from './regressionDetectionTypes';

class RegressionDetection {
  private storage: MMKV;
  private models: Map<keyof PerformanceMetrics, RegressionModel> = new Map();
  private alertListeners: Array<(alert: RegressionAlert) => void> = [];
  private thresholds: Record<keyof PerformanceMetrics, RegressionThreshold>;
  private analysisIntervalId?: ReturnType<typeof setInterval>;
  private cleanupIntervalId?: ReturnType<typeof setInterval>;

  constructor() {
    this.storage = new MMKV({ id: 'regression-detection' });
    this.thresholds = { ...DEFAULT_THRESHOLDS };
    this.loadModels();
    this.startPeriodicAnalysis();
  }

  /** Analyze new performance data for regressions */
  analyzeMetrics(metrics: PerformanceMetrics): RegressionAlert[] {
    const alerts: RegressionAlert[] = [];

    Object.entries(metrics).forEach(([metricKey, value]) => {
      const metric = metricKey as keyof PerformanceMetrics;
      if (typeof value !== 'number') return;
      const alert = this.analyzeMetric(metric, value);
      if (alert) alerts.push(alert);
    });

    if (alerts.length > 0) {
      this.storeAlerts(alerts);
      this.notifyListeners(alerts);
    }

    return alerts;
  }

  /** Analyze a specific metric for regression */
  analyzeMetric(metric: keyof PerformanceMetrics, value: number): RegressionAlert | null {
    let model = this.models.get(metric);
    if (!model) {
      model = this.createModel(metric);
      this.models.set(metric, model);
    }

    this.updateModel(model, value);
    const regression = this.detectRegression(model, value);
    if (!regression) return null;

    const alert: RegressionAlert = {
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
      recommendation: this.generateRecommendation(metric),
      affectedUsers: this.estimateAffectedUsers(regression.deviation),
    };

    this.storeAlerts([alert]);
    this.notifyListeners([alert]);
    return alert;
  }

  /** Get current regression models */
  getModels(): RegressionModel[] {
    return Array.from(this.models.values());
  }

  /** Get recent regression alerts */
  getRecentAlerts(hours: number = 24): RegressionAlert[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.getStoredAlerts().filter(alert => alert.timestamp > cutoff);
  }

  /** Generate regression report */
  generateReport(): RegressionReport {
    const alerts = this.getRecentAlerts(24);
    const models = this.getModels();
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    const warningAlerts = alerts.filter(a => a.severity === 'warning').length;
    const affectedMetrics = [...new Set(alerts.map(a => a.metric))];

    let overallHealth: RegressionReport['summary']['overallHealth'] = 'excellent';
    if (criticalAlerts > 0) overallHealth = 'critical';
    else if (warningAlerts > 2) overallHealth = 'warning';
    else if (warningAlerts > 0) overallHealth = 'good';

    return {
      timestamp: Date.now(),
      summary: { totalAlerts: alerts.length, criticalAlerts, warningAlerts, affectedMetrics, overallHealth },
      alerts,
      models,
      recommendations: this.generateReportRecommendations(alerts),
    };
  }

  /** Update regression thresholds */
  updateThresholds(metric: keyof PerformanceMetrics, thresholds: Partial<RegressionThreshold>): void {
    this.thresholds[metric] = { ...this.thresholds[metric], ...thresholds };
    const model = this.models.get(metric);
    if (model) {
      model.thresholds = this.thresholds[metric];
      this.saveModel(model);
    }
  }

  /** Register alert listener */
  onAlert(listener: (alert: RegressionAlert) => void): () => void {
    this.alertListeners.push(listener);
    return () => {
      const index = this.alertListeners.indexOf(listener);
      if (index > -1) this.alertListeners.splice(index, 1);
    };
  }

  /** Clear all data for testing purposes */
  clearAllData(): void {
    this.models.clear();
    this.storage.getAllKeys().forEach(key => this.storage.delete(key));
  }

  /** Predict future performance */
  predictPerformance(metric: keyof PerformanceMetrics, hoursAhead: number): number | null {
    const model = this.models.get(metric);
    if (!model || model.dataPoints < model.thresholds.minimumDataPoints) return null;

    const { trend, trendStrength } = model.baseline;
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
    const thresholds = this.thresholds[metric] || {
      metric, warningDeviation: 20, criticalDeviation: 40, minimumDataPoints: 30, confidence: 0.9,
    };

    return {
      metric,
      baseline: {
        mean: 0, median: 0, standardDeviation: 0, variance: 0,
        percentile95: 0, percentile99: 0, trend: 'stable', trendStrength: 0, outliers: [],
      },
      thresholds,
      lastUpdated: Date.now(),
      dataPoints: 0,
      accuracy: 0,
      predictions: { nextHour: 0, nextDay: 0, nextWeek: 0 },
    };
  }

  private updateModel(model: RegressionModel, newValue: number): void {
    const historicalData = this.getHistoricalData(model.metric);
    historicalData.push(newValue);
    this.storeHistoricalData(model.metric, historicalData);

    model.baseline = calculateStatistics(historicalData);
    model.dataPoints = historicalData.length;
    model.lastUpdated = Date.now();

    const meanValue = model.baseline.mean || newValue;
    const trendFactor = model.baseline.trend === 'improving' ? 0.95 :
                       model.baseline.trend === 'declining' ? 1.05 : 1.0;

    model.predictions = {
      nextHour: meanValue * Math.pow(trendFactor, 1),
      nextDay: meanValue * Math.pow(trendFactor, 24),
      nextWeek: meanValue * Math.pow(trendFactor, 168),
    };

    if (historicalData.length > 10) {
      const recent = historicalData.slice(-10);
      const predicted = recent.map(() => model.baseline.mean);
      const mae = calculateMeanAbsoluteError(recent, predicted);
      model.accuracy = model.baseline.mean !== 0
        ? Math.max(0, Math.min(1, 1 - (mae / Math.abs(model.baseline.mean))))
        : (mae === 0 ? 1 : 0);
    } else {
      model.accuracy = historicalData.length >= model.thresholds.minimumDataPoints ? 0.8 : 0.1;
    }

    this.saveModel(model);
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
    if (model.dataPoints < model.thresholds.minimumDataPoints) return null;

    const baseline = model.baseline;
    const expectedValue = baseline.mean;
    const absoluteDeviation = Math.abs(currentValue - expectedValue);
    const deviationPercentage = expectedValue !== 0
      ? (absoluteDeviation / Math.abs(expectedValue)) * 100
      : (absoluteDeviation > 0 ? 100 : 0);

    if (!this.isSignificantRegression(model.metric, currentValue, expectedValue, deviationPercentage)) {
      return null;
    }

    const severity: 'warning' | 'critical' =
      deviationPercentage > model.thresholds.criticalDeviation ? 'critical' : 'warning';

    const zScore = baseline.standardDeviation !== 0 ? absoluteDeviation / baseline.standardDeviation : 1;
    const confidence = normalCDF(zScore);
    const requiredConfidence = Math.min(model.thresholds.confidence, 0.7);
    if (confidence < requiredConfidence) return null;

    const message = this.generateRegressionMessage(model.metric, deviationPercentage, severity);
    return { severity, message, expectedValue, deviation: deviationPercentage, confidence, trend: baseline.trend };
  }

  private isSignificantRegression(
    metric: keyof PerformanceMetrics,
    current: number,
    expected: number,
    deviationPercentage: number
  ): boolean {
    const threshold = this.thresholds[metric] || {
      metric, warningDeviation: 20, criticalDeviation: 40, minimumDataPoints: 30, confidence: 0.9,
    };

    if (deviationPercentage < threshold.warningDeviation) return false;

    // For rates and accuracy metrics, lower values are regressions
    if (metric.includes('Rate') || metric.includes('Accuracy')) return current < expected;
    // For time and usage metrics, higher values are regressions
    return current > expected;
  }

  private generateRegressionMessage(
    metric: keyof PerformanceMetrics,
    deviation: number,
    severity: 'warning' | 'critical'
  ): string {
    const metricName = metric.replace(/([A-Z])/g, ' $1').toLowerCase();
    const deviationStr = deviation.toFixed(1);

    return severity === 'critical'
      ? `Critical regression detected in ${metricName}: ${deviationStr}% worse than expected`
      : `Performance regression detected in ${metricName}: ${deviationStr}% degradation`;
  }

  private generateRecommendation(metric: keyof PerformanceMetrics): string {
    return METRIC_RECOMMENDATIONS[metric] || 'Monitor the metric closely and investigate potential causes';
  }

  private estimateAffectedUsers(deviation: number): number {
    const baseUsers = 100;
    if (deviation > 50) return Math.round(baseUsers * 0.8);
    if (deviation > 30) return Math.round(baseUsers * 0.5);
    if (deviation > 15) return Math.round(baseUsers * 0.2);
    return Math.round(baseUsers * 0.1);
  }

  private getHistoricalData(metric: keyof PerformanceMetrics): number[] {
    const stored = this.storage.getString(`historical-${metric}`);
    return stored ? JSON.parse(stored) : [];
  }

  private storeHistoricalData(metric: keyof PerformanceMetrics, data: number[]): void {
    this.storage.set(`historical-${metric}`, JSON.stringify(data.slice(-1000)));
  }

  private saveModel(model: RegressionModel): void {
    this.storage.set(`model-${model.metric}`, sanitizePII(JSON.stringify(model)));
  }

  private loadModels(): void {
    this.storage.getAllKeys().forEach(key => {
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
    const allAlerts = [...this.getStoredAlerts(), ...alerts].slice(-500);
    this.storage.set('regression-alerts', sanitizePII(JSON.stringify(allAlerts)));
  }

  private getStoredAlerts(): RegressionAlert[] {
    const stored = this.storage.getString('regression-alerts');
    return stored ? JSON.parse(stored) : [];
  }

  private notifyListeners(alerts: RegressionAlert[]): void {
    alerts.forEach(alert => this.alertListeners.forEach(listener => listener(alert)));
  }

  private generateReportRecommendations(alerts: RegressionAlert[]): string[] {
    const recommendations: string[] = [];
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
    this.analysisIntervalId = setInterval(() => this.updateAllModels(), 3600000);
    this.cleanupIntervalId = setInterval(() => this.cleanupOldData(), 86400000);
  }

  dispose(): void {
    if (this.analysisIntervalId) clearInterval(this.analysisIntervalId);
    if (this.cleanupIntervalId) clearInterval(this.cleanupIntervalId);
  }

  private updateAllModels(): void {
    this.models.forEach((model) => {
      const meanValue = model.baseline.mean;
      const trendFactor = model.baseline.trend === 'improving' ? 0.95 :
                         model.baseline.trend === 'declining' ? 1.05 : 1.0;
      model.predictions = {
        nextHour: meanValue * Math.pow(trendFactor, 1),
        nextDay: meanValue * Math.pow(trendFactor, 24),
        nextWeek: meanValue * Math.pow(trendFactor, 168),
      };
      this.saveModel(model);
    });
  }

  private cleanupOldData(): void {
    const cutoff = Date.now() - (90 * 24 * 60 * 60 * 1000);
    const recentAlerts = this.getStoredAlerts().filter(alert => alert.timestamp > cutoff);
    this.storage.set('regression-alerts', sanitizePII(JSON.stringify(recentAlerts)));
  }
}

export const regressionDetection = new RegressionDetection();
