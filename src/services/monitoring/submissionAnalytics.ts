import { getCountryFullName } from '../../constants/countries';

/**
 * Submission Analytics Service
 *
 * Collects and analyzes anonymized metrics about form submissions,
 * portal performance, and user experience. No personally identifiable
 * information is collected or stored.
 */

export interface SubmissionMetric {
  id: string;
  countryCode: string;
  timestamp: string;
  submissionMethod: 'manual' | 'guided' | 'test';
  status: 'success' | 'failed' | 'abandoned' | 'test_success' | 'test_failed';
  duration: {
    preparationMs: number;
    submissionMs: number;
    totalMs: number;
  };
  formStats: {
    totalFields: number;
    autoFilledFields: number;
    userInputFields: number;
    completionPercentage: number;
  };
  portalPerformance: {
    responseTimeMs?: number;
    portalStatus: 'healthy' | 'degraded' | 'offline' | 'error';
    errorType?: string;
  };
  userExperience: {
    retryAttempts: number;
    helpViewed: boolean;
    guideStepsViewed: number;
    errorsEncountered: string[];
  };
  deviceInfo: {
    platform: 'ios' | 'android' | 'web';
    appVersion: string;
  };
}

export interface AnalyticsReport {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalSubmissions: number;
    successRate: number;
    averageDuration: number;
    mostActiveCountry: string;
    completionRate: number;
  };
  countryBreakdown: CountryAnalytics[];
  performanceTrends: PerformanceTrend[];
  errorAnalysis: ErrorAnalysis;
  userExperienceInsights: UXInsights;
}

export interface CountryAnalytics {
  countryCode: string;
  countryName: string;
  submissionCount: number;
  successRate: number;
  averageDuration: number;
  commonErrors: string[];
  portalHealthScore: number;
}

export interface PerformanceTrend {
  date: string;
  successRate: number;
  averageResponseTime: number;
  submissionVolume: number;
}

export interface ErrorAnalysis {
  topErrors: Array<{
    error: string;
    frequency: number;
    affectedCountries: string[];
  }>;
  errorTrends: Array<{
    date: string;
    errorCount: number;
    errorType: string;
  }>;
}

export interface UXInsights {
  averageRetryAttempts: number;
  helpUsageRate: number;
  guideCompletionRate: number;
  abandonmentRate: number;
  timeToSuccess: number;
}

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
      summary: this.generateSummary(filteredMetrics),
      countryBreakdown: this.generateCountryBreakdown(filteredMetrics),
      performanceTrends: this.generatePerformanceTrends(filteredMetrics),
      errorAnalysis: this.generateErrorAnalysis(filteredMetrics),
      userExperienceInsights: this.generateUXInsights(filteredMetrics)
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
   * Generates summary statistics
   */
  private generateSummary(metrics: SubmissionMetric[]): AnalyticsReport['summary'] {
    if (metrics.length === 0) {
      return {
        totalSubmissions: 0,
        successRate: 0,
        averageDuration: 0,
        mostActiveCountry: '',
        completionRate: 0
      };
    }

    const successful = metrics.filter(m => 
      m.status === 'success' || m.status === 'test_success'
    ).length;

    const totalDuration = metrics.reduce((sum, m) => sum + m.duration.totalMs, 0);
    
    const countryFrequency = new Map<string, number>();
    metrics.forEach(m => {
      countryFrequency.set(m.countryCode, (countryFrequency.get(m.countryCode) || 0) + 1);
    });
    
    const mostActiveCountry = Array.from(countryFrequency.entries())
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

    const completed = metrics.filter(m => 
      m.status !== 'abandoned' && m.formStats.completionPercentage === 100
    ).length;

    return {
      totalSubmissions: metrics.length,
      successRate: (successful / metrics.length) * 100,
      averageDuration: totalDuration / metrics.length,
      mostActiveCountry,
      completionRate: (completed / metrics.length) * 100
    };
  }

  /**
   * Generates country breakdown analytics
   */
  private generateCountryBreakdown(metrics: SubmissionMetric[]): CountryAnalytics[] {
    const countryMetrics = new Map<string, SubmissionMetric[]>();
    
    metrics.forEach(metric => {
      if (!countryMetrics.has(metric.countryCode)) {
        countryMetrics.set(metric.countryCode, []);
      }
      countryMetrics.get(metric.countryCode)!.push(metric);
    });

    return Array.from(countryMetrics.entries()).map(([countryCode, metricData]) => {
      const successful = metricData.filter(m =>
        m.status === 'success' || m.status === 'test_success'
      ).length;

      const totalDuration = metricData.reduce((sum, m) => sum + m.duration.totalMs, 0);

      const errors = new Map<string, number>();
      metricData.forEach(m => {
        m.userExperience.errorsEncountered.forEach(error => {
          errors.set(error, (errors.get(error) || 0) + 1);
        });
      });

      const commonErrors = Array.from(errors.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([error]) => error);

      return {
        countryCode,
        countryName: this.getCountryName(countryCode),
        submissionCount: metricData.length,
        successRate: metricData.length > 0 ? (successful / metricData.length) * 100 : 0,
        averageDuration: metricData.length > 0 ? totalDuration / metricData.length : 0,
        commonErrors,
        portalHealthScore: this.getPortalHealthScore(countryCode)
      };
    });
  }

  /**
   * Generates performance trends
   */
  private generatePerformanceTrends(metrics: SubmissionMetric[]): PerformanceTrend[] {
    const dailyMetrics = new Map<string, SubmissionMetric[]>();
    
    metrics.forEach(metric => {
      const date = metric.timestamp.split('T')[0]; // Get date part only
      if (!dailyMetrics.has(date)) {
        dailyMetrics.set(date, []);
      }
      dailyMetrics.get(date)!.push(metric);
    });

    return Array.from(dailyMetrics.entries())
      .map(([date, dayMetrics]) => {
        const successful = dayMetrics.filter(m => 
          m.status === 'success' || m.status === 'test_success'
        ).length;
        
        const avgResponseTime = dayMetrics
          .filter(m => m.portalPerformance.responseTimeMs)
          .reduce((sum, m) => sum + (m.portalPerformance.responseTimeMs || 0), 0) / dayMetrics.length;

        return {
          date,
          successRate: dayMetrics.length > 0 ? (successful / dayMetrics.length) * 100 : 0,
          averageResponseTime: avgResponseTime || 0,
          submissionVolume: dayMetrics.length
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Generates error analysis
   */
  private generateErrorAnalysis(metrics: SubmissionMetric[]): ErrorAnalysis {
    const errorCounts = new Map<string, { count: number; countries: Set<string> }>();
    const dailyErrors = new Map<string, Map<string, number>>();

    metrics.forEach(metric => {
      const date = metric.timestamp.split('T')[0];
      
      metric.userExperience.errorsEncountered.forEach(error => {
        // Overall error tracking
        if (!errorCounts.has(error)) {
          errorCounts.set(error, { count: 0, countries: new Set() });
        }
        const errorData = errorCounts.get(error)!;
        errorData.count++;
        errorData.countries.add(metric.countryCode);

        // Daily error tracking
        if (!dailyErrors.has(date)) {
          dailyErrors.set(date, new Map());
        }
        const dayErrors = dailyErrors.get(date)!;
        dayErrors.set(error, (dayErrors.get(error) || 0) + 1);
      });
    });

    const topErrors = Array.from(errorCounts.entries())
      .map(([error, data]) => ({
        error,
        frequency: data.count,
        affectedCountries: Array.from(data.countries)
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    const errorTrends = Array.from(dailyErrors.entries())
      .flatMap(([date, errors]) => 
        Array.from(errors.entries()).map(([errorType, count]) => ({
          date,
          errorCount: count,
          errorType
        }))
      )
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      topErrors,
      errorTrends
    };
  }

  /**
   * Generates UX insights
   */
  private generateUXInsights(metrics: SubmissionMetric[]): UXInsights {
    if (metrics.length === 0) {
      return {
        averageRetryAttempts: 0,
        helpUsageRate: 0,
        guideCompletionRate: 0,
        abandonmentRate: 0,
        timeToSuccess: 0
      };
    }

    const totalRetries = metrics.reduce((sum, m) => sum + m.userExperience.retryAttempts, 0);
    const helpUsed = metrics.filter(m => m.userExperience.helpViewed).length;
    const guidesCompleted = metrics.filter(m => m.userExperience.guideStepsViewed > 0).length;
    const abandoned = metrics.filter(m => m.status === 'abandoned').length;
    const successful = metrics.filter(m => 
      m.status === 'success' || m.status === 'test_success'
    );
    const totalSuccessTime = successful.reduce((sum, m) => sum + m.duration.totalMs, 0);

    return {
      averageRetryAttempts: totalRetries / metrics.length,
      helpUsageRate: (helpUsed / metrics.length) * 100,
      guideCompletionRate: (guidesCompleted / metrics.length) * 100,
      abandonmentRate: (abandoned / metrics.length) * 100,
      timeToSuccess: successful.length > 0 ? totalSuccessTime / successful.length : 0
    };
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
   * Gets country name from country code
   */
  private getCountryName(countryCode: string): string {
    return getCountryFullName(countryCode);
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