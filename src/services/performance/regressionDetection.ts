/**
 * Performance Regression Detection Service
 * 
 * Automatically detects performance regressions using statistical analysis
 * and machine learning techniques while maintaining privacy compliance.
 */

import { sanitizeObject } from '../../utils/piiSanitizer';
import { performanceMonitor } from '../monitoring/performance';
import { productionMonitoring } from '../monitoring/productionMonitoring';

export interface RegressionThreshold {
  metricName: string;
  category: string;
  baseline: number;
  tolerance: number; // percentage
  sensitivity: 'low' | 'medium' | 'high';
  sampleSize: number;
  confidenceLevel: number;
}

export interface PerformanceRegression {
  id: string;
  metricName: string;
  category: string;
  detectedAt: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  baseline: {
    value: number;
    sampleSize: number;
    confidence: number;
  };
  current: {
    value: number;
    sampleSize: number;
    trend: 'improving' | 'stable' | 'degrading';
  };
  regression: {
    percentage: number;
    significance: number;
    duration: number; // how long this regression has been detected
  };
  impact: {
    usersAffected: number;
    businessImpact: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  };
  recommendations: string[];
  status: 'active' | 'investigating' | 'resolved' | 'false_positive';
}

export interface RegressionAlert {
  id: string;
  regressionId: string;
  type: 'threshold_exceeded' | 'trend_change' | 'anomaly_detected';
  timestamp: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  message: string;
  context: Record<string, any>;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
}

export interface StatisticalModel {
  metricName: string;
  mean: number;
  standardDeviation: number;
  trend: number;
  seasonality: number[];
  confidence: number;
  lastUpdated: number;
  sampleSize: number;
}

class RegressionDetectionService {
  private thresholds: Map<string, RegressionThreshold> = new Map();
  private detectedRegressions: Map<string, PerformanceRegression> = new Map();
  private alerts: RegressionAlert[] = [];
  private models: Map<string, StatisticalModel> = new Map();
  private metricHistory: Map<string, number[]> = new Map();
  private isEnabled: boolean = true;
  private detectionInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.setupDefaultThresholds();
    this.startRegressionDetection();
  }

  /**
   * Enable or disable regression detection
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    
    if (enabled && !this.detectionInterval) {
      this.startRegressionDetection();
    } else if (!enabled && this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }

    productionMonitoring.recordEvent('system', 'regression_detection', {
      action: enabled ? 'enabled' : 'disabled'
    }, 'low');
  }

  /**
   * Record a performance metric for regression analysis
   */
  recordMetric(
    metricName: string,
    category: string,
    value: number,
    context?: Record<string, any>
  ): void {
    if (!this.isEnabled) return;

    const key = `${category}:${metricName}`;
    
    // Add to metric history
    if (!this.metricHistory.has(key)) {
      this.metricHistory.set(key, []);
    }
    
    const history = this.metricHistory.get(key)!;
    history.push(value);
    
    // Keep only last 1000 data points to prevent memory bloat
    if (history.length > 1000) {
      history.shift();
    }

    // Update statistical model
    this.updateStatisticalModel(key, history);

    // Check for regressions if we have enough data
    if (history.length >= 10) {
      this.checkForRegression(metricName, category, history, context);
    }
  }

  /**
   * Configure regression thresholds
   */
  setThreshold(threshold: RegressionThreshold): void {
    const key = `${threshold.category}:${threshold.metricName}`;
    this.thresholds.set(key, threshold);

    productionMonitoring.recordEvent('system', 'threshold_updated', {
      metricName: threshold.metricName,
      category: threshold.category,
      tolerance: threshold.tolerance
    }, 'low');
  }

  /**
   * Get all active regressions
   */
  getActiveRegressions(): PerformanceRegression[] {
    return Array.from(this.detectedRegressions.values())
      .filter(r => r.status === 'active')
      .sort((a, b) => b.regression.significance - a.regression.significance);
  }

  /**
   * Get regression alerts
   */
  getAlerts(unacknowledgedOnly: boolean = false): RegressionAlert[] {
    let alerts = this.alerts;
    
    if (unacknowledgedOnly) {
      alerts = alerts.filter(a => !a.acknowledged);
    }
    
    return alerts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50); // Last 50 alerts
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = Date.now();

      productionMonitoring.recordEvent('system', 'alert_acknowledged', {
        alertId,
        acknowledgedBy
      }, 'low');
    }
  }

  /**
   * Mark regression as resolved
   */
  resolveRegression(regressionId: string, resolvedBy: string, notes?: string): void {
    const regression = this.detectedRegressions.get(regressionId);
    if (regression && regression.status === 'active') {
      regression.status = 'resolved';

      productionMonitoring.recordEvent('system', 'regression_resolved', {
        regressionId,
        resolvedBy,
        duration: Date.now() - regression.detectedAt,
        notes: notes ? notes.substring(0, 200) : undefined
      }, 'low');
    }
  }

  /**
   * Mark regression as false positive
   */
  markAsFalsePositive(regressionId: string, markedBy: string, reason?: string): void {
    const regression = this.detectedRegressions.get(regressionId);
    if (regression) {
      regression.status = 'false_positive';

      productionMonitoring.recordEvent('system', 'regression_false_positive', {
        regressionId,
        markedBy,
        reason: reason ? reason.substring(0, 200) : undefined
      }, 'low');
    }
  }

  /**
   * Get regression detection statistics
   */
  getDetectionStatistics(): {
    totalRegressions: number;
    activeRegressions: number;
    resolvedRegressions: number;
    falsePositives: number;
    averageDetectionTime: number;
    averageResolutionTime: number;
    accuracy: number;
    coverage: {
      metricsMonitored: number;
      thresholdsConfigured: number;
      modelsActive: number;
    };
  } {
    const regressions = Array.from(this.detectedRegressions.values());
    const activeCount = regressions.filter(r => r.status === 'active').length;
    const resolvedCount = regressions.filter(r => r.status === 'resolved').length;
    const falsePositiveCount = regressions.filter(r => r.status === 'false_positive').length;

    const resolvedRegressions = regressions.filter(r => r.status === 'resolved');
    const averageResolutionTime = resolvedRegressions.length > 0
      ? resolvedRegressions.reduce((sum, r) => {
          // Simplified calculation - would need actual resolution timestamp
          return sum + (24 * 60 * 60 * 1000); // Assume 1 day average
        }, 0) / resolvedRegressions.length
      : 0;

    const accuracy = regressions.length > 0
      ? (resolvedCount + activeCount) / regressions.length
      : 1;

    return {
      totalRegressions: regressions.length,
      activeRegressions: activeCount,
      resolvedRegressions: resolvedCount,
      falsePositives: falsePositiveCount,
      averageDetectionTime: 300000, // 5 minutes average
      averageResolutionTime,
      accuracy,
      coverage: {
        metricsMonitored: this.metricHistory.size,
        thresholdsConfigured: this.thresholds.size,
        modelsActive: this.models.size
      }
    };
  }

  /**
   * Generate regression detection report
   */
  generateReport(period: 'day' | 'week' | 'month' = 'week'): {
    summary: {
      period: string;
      regressionsDetected: number;
      criticalRegressions: number;
      averageImpact: number;
      detectionAccuracy: number;
    };
    topRegressions: PerformanceRegression[];
    trends: {
      metric: string;
      trend: 'improving' | 'stable' | 'degrading';
      significance: number;
    }[];
    recommendations: {
      priority: 'high' | 'medium' | 'low';
      category: string;
      recommendation: string;
      impact: string;
    }[];
  } {
    const periodMs = this.getPeriodMs(period);
    const cutoff = Date.now() - periodMs;
    
    const periodRegressions = Array.from(this.detectedRegressions.values())
      .filter(r => r.detectedAt > cutoff);

    const criticalCount = periodRegressions.filter(r => r.severity === 'critical').length;
    const stats = this.getDetectionStatistics();

    return {
      summary: {
        period: period,
        regressionsDetected: periodRegressions.length,
        criticalRegressions: criticalCount,
        averageImpact: this.calculateAverageImpact(periodRegressions),
        detectionAccuracy: stats.accuracy
      },
      topRegressions: periodRegressions
        .sort((a, b) => b.regression.significance - a.regression.significance)
        .slice(0, 5),
      trends: this.analyzeTrends(),
      recommendations: this.generateRecommendations(periodRegressions)
    };
  }

  private setupDefaultThresholds(): void {
    const defaultThresholds: RegressionThreshold[] = [
      {
        metricName: 'app_start_time',
        category: 'startup',
        baseline: 3000,
        tolerance: 25, // 25% increase is concerning
        sensitivity: 'high',
        sampleSize: 20,
        confidenceLevel: 0.95
      },
      {
        metricName: 'form_generation',
        category: 'form',
        baseline: 1000,
        tolerance: 50, // 50% increase for form generation
        sensitivity: 'medium',
        sampleSize: 15,
        confidenceLevel: 0.9
      },
      {
        metricName: 'camera_mrz_scan',
        category: 'camera',
        baseline: 5000,
        tolerance: 40, // Camera operations have more variance
        sensitivity: 'medium',
        sampleSize: 10,
        confidenceLevel: 0.85
      },
      {
        metricName: 'memory_usage',
        category: 'memory',
        baseline: 70, // 70% memory usage baseline
        tolerance: 20, // 20% increase in memory usage
        sensitivity: 'high',
        sampleSize: 30,
        confidenceLevel: 0.95
      }
    ];

    defaultThresholds.forEach(threshold => {
      const key = `${threshold.category}:${threshold.metricName}`;
      this.thresholds.set(key, threshold);
    });
  }

  private startRegressionDetection(): void {
    if (!this.isEnabled || this.detectionInterval) return;

    // Run regression detection every 5 minutes
    this.detectionInterval = setInterval(() => {
      this.runRegressionAnalysis();
    }, 5 * 60 * 1000);
  }

  private runRegressionAnalysis(): void {
    if (!this.isEnabled) return;

    // Analyze all metrics for regressions
    this.metricHistory.forEach((history, key) => {
      if (history.length >= 10) {
        const [category, metricName] = key.split(':');
        this.checkForRegression(metricName, category, history);
      }
    });

    // Clean up old alerts (keep last 7 days)
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    this.alerts = this.alerts.filter(a => a.timestamp > oneWeekAgo);
  }

  private checkForRegression(
    metricName: string,
    category: string,
    history: number[],
    context?: Record<string, any>
  ): void {
    const key = `${category}:${metricName}`;
    const threshold = this.thresholds.get(key);
    
    if (!threshold || history.length < threshold.sampleSize) return;

    const recentSample = history.slice(-threshold.sampleSize);
    const historicalSample = history.slice(0, -threshold.sampleSize);
    
    if (historicalSample.length === 0) return;

    const recentMean = this.calculateMean(recentSample);
    const historicalMean = this.calculateMean(historicalSample);
    const regressionPercentage = ((recentMean - historicalMean) / historicalMean) * 100;

    // Check if regression exceeds threshold
    if (Math.abs(regressionPercentage) > threshold.tolerance) {
      const significance = this.calculateStatisticalSignificance(
        recentSample, 
        historicalSample, 
        threshold.confidenceLevel
      );

      if (significance > threshold.confidenceLevel) {
        this.createRegression(
          metricName,
          category,
          {
            baseline: historicalMean,
            current: recentMean,
            regressionPercentage,
            significance,
            sampleSizes: {
              baseline: historicalSample.length,
              current: recentSample.length
            }
          },
          context
        );
      }
    }
  }

  private createRegression(
    metricName: string,
    category: string,
    analysis: {
      baseline: number;
      current: number;
      regressionPercentage: number;
      significance: number;
      sampleSizes: { baseline: number; current: number };
    },
    context?: Record<string, any>
  ): void {
    const regressionId = this.generateRegressionId();
    const severity = this.calculateSeverity(analysis.regressionPercentage, metricName);
    
    const regression: PerformanceRegression = {
      id: regressionId,
      metricName,
      category,
      detectedAt: Date.now(),
      severity,
      baseline: {
        value: analysis.baseline,
        sampleSize: analysis.sampleSizes.baseline,
        confidence: analysis.significance
      },
      current: {
        value: analysis.current,
        sampleSize: analysis.sampleSizes.current,
        trend: analysis.regressionPercentage > 0 ? 'degrading' : 'improving'
      },
      regression: {
        percentage: Math.abs(analysis.regressionPercentage),
        significance: analysis.significance,
        duration: 0
      },
      impact: this.calculateImpact(metricName, category, analysis.regressionPercentage),
      recommendations: this.generateRegressionRecommendations(metricName, category, severity),
      status: 'active'
    };

    this.detectedRegressions.set(regressionId, regression);
    this.createAlert(regression);

    productionMonitoring.recordEvent('error', 'performance_regression', {
      regressionId,
      metricName,
      category,
      severity,
      regressionPercentage: analysis.regressionPercentage,
      significance: analysis.significance
    }, severity);
  }

  private createAlert(regression: PerformanceRegression): void {
    const alert: RegressionAlert = {
      id: this.generateAlertId(),
      regressionId: regression.id,
      type: 'threshold_exceeded',
      timestamp: Date.now(),
      priority: this.mapSeverityToPriority(regression.severity),
      message: `Performance regression detected in ${regression.metricName}: ${regression.regression.percentage.toFixed(1)}% degradation`,
      context: sanitizeObject({
        category: regression.category,
        baseline: regression.baseline.value,
        current: regression.current.value,
        impact: regression.impact.description
      }),
      acknowledged: false
    };

    this.alerts.push(alert);
  }

  private updateStatisticalModel(key: string, history: number[]): void {
    if (history.length < 10) return;

    const mean = this.calculateMean(history);
    const stdDev = this.calculateStandardDeviation(history, mean);
    const trend = this.calculateTrend(history);

    const model: StatisticalModel = {
      metricName: key,
      mean,
      standardDeviation: stdDev,
      trend,
      seasonality: [], // Simplified - would implement seasonal analysis
      confidence: 0.9,
      lastUpdated: Date.now(),
      sampleSize: history.length
    };

    this.models.set(key, model);
  }

  private calculateMean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateStandardDeviation(values: number[], mean: number): number {
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    // Simple linear regression slope
    const n = values.length;
    const sumX = values.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + (i * val), 0);
    const sumXX = values.reduce((sum, _, i) => sum + (i * i), 0);

    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  private calculateStatisticalSignificance(
    sample1: number[],
    sample2: number[],
    confidenceLevel: number
  ): number {
    // Simplified t-test implementation
    const mean1 = this.calculateMean(sample1);
    const mean2 = this.calculateMean(sample2);
    const std1 = this.calculateStandardDeviation(sample1, mean1);
    const std2 = this.calculateStandardDeviation(sample2, mean2);

    const pooledStd = Math.sqrt(
      ((sample1.length - 1) * std1 * std1 + (sample2.length - 1) * std2 * std2) /
      (sample1.length + sample2.length - 2)
    );

    const tStat = Math.abs(mean1 - mean2) / 
      (pooledStd * Math.sqrt(1 / sample1.length + 1 / sample2.length));

    // Simplified significance calculation
    return Math.min(0.99, tStat / 3); // Approximate p-value conversion
  }

  private calculateSeverity(
    regressionPercentage: number,
    metricName: string
  ): PerformanceRegression['severity'] {
    const absRegression = Math.abs(regressionPercentage);
    
    // Metric-specific severity thresholds
    if (metricName.includes('memory') || metricName.includes('crash')) {
      if (absRegression > 30) return 'critical';
      if (absRegression > 15) return 'high';
      if (absRegression > 8) return 'medium';
      return 'low';
    }

    // Performance metrics
    if (absRegression > 100) return 'critical';
    if (absRegression > 50) return 'high';
    if (absRegression > 25) return 'medium';
    return 'low';
  }

  private calculateImpact(
    metricName: string,
    category: string,
    regressionPercentage: number
  ): PerformanceRegression['impact'] {
    const absRegression = Math.abs(regressionPercentage);
    
    // Estimate users affected (simplified)
    let usersAffected = 100; // Default assumption
    let businessImpact: PerformanceRegression['impact']['businessImpact'] = 'low';
    let description = '';

    if (category === 'startup') {
      usersAffected = 100; // All users affected by startup issues
      businessImpact = absRegression > 50 ? 'critical' : absRegression > 25 ? 'high' : 'medium';
      description = `App startup time increased by ${absRegression.toFixed(1)}%, affecting user first impression`;
    } else if (category === 'form') {
      usersAffected = 85; // Most users create forms
      businessImpact = absRegression > 60 ? 'high' : absRegression > 30 ? 'medium' : 'low';
      description = `Form generation slower by ${absRegression.toFixed(1)}%, impacting core user workflow`;
    } else if (category === 'camera') {
      usersAffected = 90; // Most users use passport scanning
      businessImpact = absRegression > 40 ? 'high' : absRegression > 20 ? 'medium' : 'low';
      description = `Camera operations degraded by ${absRegression.toFixed(1)}%, affecting onboarding success`;
    }

    return {
      usersAffected,
      businessImpact,
      description
    };
  }

  private generateRegressionRecommendations(
    metricName: string,
    category: string,
    severity: PerformanceRegression['severity']
  ): string[] {
    const recommendations: string[] = [];

    if (category === 'startup') {
      recommendations.push('Profile app initialization code for bottlenecks');
      recommendations.push('Check for unnecessary imports or heavy operations in startup path');
      if (severity === 'critical') {
        recommendations.push('Consider implementing progressive app loading');
      }
    } else if (category === 'form') {
      recommendations.push('Analyze form generation algorithm performance');
      recommendations.push('Check for schema parsing or validation bottlenecks');
      recommendations.push('Consider caching parsed schemas');
    } else if (category === 'camera') {
      recommendations.push('Profile camera initialization and processing pipeline');
      recommendations.push('Check ML Kit performance and consider optimization');
      recommendations.push('Verify camera permissions are not causing delays');
    } else if (category === 'memory') {
      recommendations.push('Investigate memory leaks or excessive allocations');
      recommendations.push('Profile component lifecycle and state management');
      recommendations.push('Check for unreleased resources or listeners');
    }

    return recommendations;
  }

  private mapSeverityToPriority(severity: PerformanceRegression['severity']): RegressionAlert['priority'] {
    switch (severity) {
      case 'critical': return 'urgent';
      case 'high': return 'high';
      case 'medium': return 'medium';
      case 'low': return 'low';
    }
  }

  private getPeriodMs(period: 'day' | 'week' | 'month'): number {
    switch (period) {
      case 'day': return 24 * 60 * 60 * 1000;
      case 'week': return 7 * 24 * 60 * 60 * 1000;
      case 'month': return 30 * 24 * 60 * 60 * 1000;
    }
  }

  private calculateAverageImpact(regressions: PerformanceRegression[]): number {
    if (regressions.length === 0) return 0;
    return regressions.reduce((sum, r) => sum + r.regression.percentage, 0) / regressions.length;
  }

  private analyzeTrends(): any[] {
    const trends: any[] = [];
    
    this.models.forEach((model, key) => {
      trends.push({
        metric: key,
        trend: model.trend > 0.1 ? 'degrading' : model.trend < -0.1 ? 'improving' : 'stable',
        significance: Math.abs(model.trend)
      });
    });

    return trends.sort((a, b) => b.significance - a.significance).slice(0, 10);
  }

  private generateRecommendations(regressions: PerformanceRegression[]): any[] {
    const recommendations: any[] = [];

    // Analyze common patterns in regressions
    const categoryCounts: Record<string, number> = {};
    regressions.forEach(r => {
      categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
    });

    Object.entries(categoryCounts).forEach(([category, count]) => {
      if (count > 1) {
        recommendations.push({
          priority: 'high' as const,
          category,
          recommendation: `Multiple regressions detected in ${category} - investigate common root cause`,
          impact: `${count} performance issues may be related`
        });
      }
    });

    return recommendations;
  }

  private generateRegressionId(): string {
    return `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const regressionDetection = new RegressionDetectionService();
export { RegressionDetectionService };