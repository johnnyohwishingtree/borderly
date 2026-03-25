/**
 * Submission Analytics Service
 *
 * Collects and analyzes anonymized metrics about form submissions,
 * portal performance, and user experience. No personally identifiable
 * information is collected or stored.
 */

import type {
  SubmissionMetric,
  AnalyticsReport,
} from './submissionAnalyticsTypes';
import {
  generateSummary,
  generateCountryBreakdown,
  generatePerformanceTrends,
  generateErrorAnalysis,
  generateUXInsights,
} from './submissionReportGenerator';

// Re-export all types so existing imports from this module continue to work
export type {
  SubmissionMetric,
  AnalyticsReport,
  CountryAnalytics,
  PerformanceTrend,
  ErrorAnalysis,
  UXInsights,
} from './submissionAnalyticsTypes';

/**
 * Submission Analytics - Privacy-compliant metrics collection
 *
 * Collects anonymized metrics about submission success rates,
 * performance, and user experience to improve the app.
 */
export class SubmissionAnalytics {
  private metrics: Map<string, SubmissionMetric[]> = new Map();
  private readonly maxMetricsPerCountry = 1000;

  /**
   * Records a submission metric (anonymized)
   */
  recordSubmission(metric: Omit<SubmissionMetric, 'id' | 'timestamp'>): void {
    const fullMetric: SubmissionMetric = {
      id: this.generateMetricId(),
      timestamp: new Date().toISOString(),
      ...metric
    };

    // Remove any potential PII
    const sanitizedMetric = this.sanitizeMetric(fullMetric);

    // Store metric
    if (!this.metrics.has(metric.countryCode)) {
      this.metrics.set(metric.countryCode, []);
    }

    const countryMetrics = this.metrics.get(metric.countryCode)!;
    countryMetrics.push(sanitizedMetric);

    // Keep only recent metrics
    if (countryMetrics.length > this.maxMetricsPerCountry) {
      countryMetrics.shift();
    }

    // Log in development
    if (__DEV__) {
      console.log('[SubmissionAnalytics]', {
        country: metric.countryCode,
        status: metric.status,
        duration: metric.duration.totalMs,
        successRate: this.getSuccessRate(metric.countryCode)
      });
    }
  }

  /**
   * Records a test submission metric
   */
  recordTestSubmission(
    countryCode: string,
    success: boolean,
    duration: number,
    formStats: SubmissionMetric['formStats'],
    errors: string[] = []
  ): void {
    this.recordSubmission({
      countryCode,
      submissionMethod: 'test',
      status: success ? 'test_success' : 'test_failed',
      duration: {
        preparationMs: 0,
        submissionMs: duration,
        totalMs: duration
      },
      formStats,
      portalPerformance: {
        portalStatus: 'healthy' // Test submissions don't hit real portals
      },
      userExperience: {
        retryAttempts: 0,
        helpViewed: false,
        guideStepsViewed: 0,
        errorsEncountered: errors
      },
      deviceInfo: {
        platform: 'ios', // Default for tests
        appVersion: '1.0.0'
      }
    });
  }

  /**
   * Records portal performance metric
   */
  recordPortalPerformance(
    countryCode: string,
    responseTimeMs: number,
    status: SubmissionMetric['portalPerformance']['portalStatus'],
    errorType?: string
  ): void {
    // Create a lightweight metric for portal performance
    this.recordSubmission({
      countryCode,
      submissionMethod: 'manual', // Portal checks are manual
      status: status === 'healthy' ? 'success' : 'failed',
      duration: {
        preparationMs: 0,
        submissionMs: responseTimeMs,
        totalMs: responseTimeMs
      },
      formStats: {
        totalFields: 0,
        autoFilledFields: 0,
        userInputFields: 0,
        completionPercentage: 100
      },
      portalPerformance: {
        responseTimeMs,
        portalStatus: status,
        ...(errorType !== undefined ? { errorType } : {}),
      },
      userExperience: {
        retryAttempts: 0,
        helpViewed: false,
        guideStepsViewed: 0,
        errorsEncountered: errorType ? [errorType] : []
      },
      deviceInfo: {
        platform: 'ios',
        appVersion: '1.0.0'
      }
    });
  }

  /**
   * Generates analytics report for a time period
   */
  generateReport(
    startDate: Date,
    endDate: Date,
    countries?: string[]
  ): AnalyticsReport {
    const filteredMetrics = this.getMetricsInPeriod(startDate, endDate, countries);

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      summary: generateSummary(filteredMetrics),
      countryBreakdown: generateCountryBreakdown(
        filteredMetrics,
        (code) => this.getPortalHealthScore(code)
      ),
      performanceTrends: generatePerformanceTrends(filteredMetrics),
      errorAnalysis: generateErrorAnalysis(filteredMetrics),
      userExperienceInsights: generateUXInsights(filteredMetrics)
    };
  }

  /**
   * Gets success rate for a specific country
   */
  getSuccessRate(countryCode: string, days: number = 30): number {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const metrics = this.getMetricsInPeriod(cutoff, new Date(), [countryCode]);

    if (metrics.length === 0) return 0;

    const successful = metrics.filter(m =>
      m.status === 'success' || m.status === 'test_success'
    ).length;

    return (successful / metrics.length) * 100;
  }

  /**
   * Gets average processing time for a country
   */
  getAverageProcessingTime(countryCode: string, days: number = 30): number {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const metrics = this.getMetricsInPeriod(cutoff, new Date(), [countryCode]);

    if (metrics.length === 0) return 0;

    const totalTime = metrics.reduce((sum, m) => sum + m.duration.totalMs, 0);
    return totalTime / metrics.length;
  }

  /**
   * Gets portal health score based on recent metrics
   */
  getPortalHealthScore(countryCode: string, days: number = 7): number {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const metrics = this.getMetricsInPeriod(cutoff, new Date(), [countryCode]);

    if (metrics.length === 0) return 50; // Unknown

    const healthyMetrics = metrics.filter(m =>
      m.portalPerformance.portalStatus === 'healthy'
    ).length;

    return (healthyMetrics / metrics.length) * 100;
  }

  /**
   * Gets top errors for a country
   */
  getTopErrors(countryCode: string, limit: number = 5): Array<{
    error: string;
    count: number;
    percentage: number;
  }> {
    const countryMetrics = this.metrics.get(countryCode) || [];
    const errorCounts = new Map<string, number>();

    countryMetrics.forEach(metric => {
      metric.userExperience.errorsEncountered.forEach(error => {
        errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
      });
    });

    const totalErrors = Array.from(errorCounts.values()).reduce((sum, count) => sum + count, 0);

    return Array.from(errorCounts.entries())
      .map(([error, count]) => ({
        error,
        count,
        percentage: totalErrors > 0 ? (count / totalErrors) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Gets metrics in a specific time period
   */
  private getMetricsInPeriod(
    startDate: Date,
    endDate: Date,
    countries?: string[]
  ): SubmissionMetric[] {
    const allMetrics: SubmissionMetric[] = [];

    const countriesToCheck = countries || Array.from(this.metrics.keys());

    countriesToCheck.forEach(countryCode => {
      const countryMetrics = this.metrics.get(countryCode) || [];
      const filteredMetrics = countryMetrics.filter(metric => {
        const metricDate = new Date(metric.timestamp);
        return metricDate >= startDate && metricDate <= endDate;
      });
      allMetrics.push(...filteredMetrics);
    });

    return allMetrics;
  }

  /**
   * Sanitizes metric to remove any potential PII
   */
  private sanitizeMetric(metric: SubmissionMetric): SubmissionMetric {
    // Remove any potential PII from error messages
    const sanitizedErrors = metric.userExperience.errorsEncountered.map(error => {
      // Remove personal data patterns from error messages
      return error
        .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]')
        .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
        .replace(/\b\d{16}\b/g, '[CARD]')
        .replace(/\b[A-Z0-9]{6,12}\b/g, '[PASSPORT]');
    });

    return {
      ...metric,
      userExperience: {
        ...metric.userExperience,
        errorsEncountered: sanitizedErrors
      }
    };
  }

  /**
   * Generates unique metric ID
   */
  private generateMetricId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gets all tracked countries
   */
  getTrackedCountries(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Gets test summary for testing purposes
   */
  getTestSummary(): {
    totalTests: number;
    totalCountries: number;
    avgSuccessRate: number;
  } {
    const allMetrics = Array.from(this.metrics.values()).flat();
    const countries = this.getTrackedCountries();
    const successfulTests = allMetrics.filter(m => m.status === 'success').length;

    return {
      totalTests: allMetrics.length,
      totalCountries: countries.length,
      avgSuccessRate: allMetrics.length > 0 ? (successfulTests / allMetrics.length) * 100 : 0
    };
  }

  /**
   * Clears analytics data for testing purposes
   */
  clearData(): void {
    this.metrics.clear();
  }

  /**
   * Exports analytics data (anonymized)
   */
  exportData(): { [countryCode: string]: SubmissionMetric[] } {
    const exported: { [countryCode: string]: SubmissionMetric[] } = {};

    this.metrics.forEach((metrics, countryCode) => {
      exported[countryCode] = metrics.map(m => this.sanitizeMetric(m));
    });

    return exported;
  }
}

/**
 * Default instance for app-wide use
 */
export const submissionAnalytics = new SubmissionAnalytics();
