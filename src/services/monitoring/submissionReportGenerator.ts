/**
 * Report Generation Functions for Submission Analytics
 *
 * Pure functions that generate analytics reports from submission metrics.
 * Extracted from SubmissionAnalytics class to keep files under 500 lines.
 */

import { getCountryFullName } from '../../constants/countries';
import type {
  SubmissionMetric,
  AnalyticsReport,
  CountryAnalytics,
  PerformanceTrend,
  ErrorAnalysis,
  UXInsights,
} from './submissionAnalyticsTypes';

/**
 * Generates summary statistics from a set of metrics
 */
export function generateSummary(
  metrics: SubmissionMetric[]
): AnalyticsReport['summary'] {
  if (metrics.length === 0) {
    return {
      totalSubmissions: 0,
      successRate: 0,
      averageDuration: 0,
      mostActiveCountry: '',
      completionRate: 0,
    };
  }

  const successful = metrics.filter(
    m => m.status === 'success' || m.status === 'test_success'
  ).length;

  const totalDuration = metrics.reduce(
    (sum, m) => sum + m.duration.totalMs,
    0
  );

  const countryFrequency = new Map<string, number>();
  metrics.forEach(m => {
    countryFrequency.set(
      m.countryCode,
      (countryFrequency.get(m.countryCode) || 0) + 1
    );
  });

  const mostActiveCountry =
    Array.from(countryFrequency.entries()).sort(([, a], [, b]) => b - a)[0]?.[0] ||
    '';

  const completed = metrics.filter(
    m => m.status !== 'abandoned' && m.formStats.completionPercentage === 100
  ).length;

  return {
    totalSubmissions: metrics.length,
    successRate: (successful / metrics.length) * 100,
    averageDuration: totalDuration / metrics.length,
    mostActiveCountry,
    completionRate: (completed / metrics.length) * 100,
  };
}

/**
 * Generates country breakdown analytics
 *
 * @param metrics - The metrics to analyze
 * @param getPortalHealthScore - Callback to get portal health score for a country code
 */
export function generateCountryBreakdown(
  metrics: SubmissionMetric[],
  getPortalHealthScore: (countryCode: string) => number
): CountryAnalytics[] {
  const countryMetrics = new Map<string, SubmissionMetric[]>();

  metrics.forEach(metric => {
    if (!countryMetrics.has(metric.countryCode)) {
      countryMetrics.set(metric.countryCode, []);
    }
    countryMetrics.get(metric.countryCode)!.push(metric);
  });

  return Array.from(countryMetrics.entries()).map(
    ([countryCode, metricData]) => {
      const successful = metricData.filter(
        m => m.status === 'success' || m.status === 'test_success'
      ).length;

      const totalDuration = metricData.reduce(
        (sum, m) => sum + m.duration.totalMs,
        0
      );

      const errors = new Map<string, number>();
      metricData.forEach(m => {
        m.userExperience.errorsEncountered.forEach(error => {
          errors.set(error, (errors.get(error) || 0) + 1);
        });
      });

      const commonErrors = Array.from(errors.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([error]) => error);

      return {
        countryCode,
        countryName: getCountryFullName(countryCode),
        submissionCount: metricData.length,
        successRate:
          metricData.length > 0
            ? (successful / metricData.length) * 100
            : 0,
        averageDuration:
          metricData.length > 0 ? totalDuration / metricData.length : 0,
        commonErrors,
        portalHealthScore: getPortalHealthScore(countryCode),
      };
    }
  );
}

/**
 * Generates performance trends grouped by day
 */
export function generatePerformanceTrends(
  metrics: SubmissionMetric[]
): PerformanceTrend[] {
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
      const successful = dayMetrics.filter(
        m => m.status === 'success' || m.status === 'test_success'
      ).length;

      const avgResponseTime =
        dayMetrics
          .filter(m => m.portalPerformance.responseTimeMs)
          .reduce(
            (sum, m) => sum + (m.portalPerformance.responseTimeMs || 0),
            0
          ) / dayMetrics.length;

      return {
        date,
        successRate:
          dayMetrics.length > 0
            ? (successful / dayMetrics.length) * 100
            : 0,
        averageResponseTime: avgResponseTime || 0,
        submissionVolume: dayMetrics.length,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Generates error analysis from metrics
 */
export function generateErrorAnalysis(
  metrics: SubmissionMetric[]
): ErrorAnalysis {
  const errorCounts = new Map<
    string,
    { count: number; countries: Set<string> }
  >();
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
      affectedCountries: Array.from(data.countries),
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);

  const errorTrends = Array.from(dailyErrors.entries())
    .flatMap(([date, errors]) =>
      Array.from(errors.entries()).map(([errorType, count]) => ({
        date,
        errorCount: count,
        errorType,
      }))
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    topErrors,
    errorTrends,
  };
}

/**
 * Generates UX insights from metrics
 */
export function generateUXInsights(metrics: SubmissionMetric[]): UXInsights {
  if (metrics.length === 0) {
    return {
      averageRetryAttempts: 0,
      helpUsageRate: 0,
      guideCompletionRate: 0,
      abandonmentRate: 0,
      timeToSuccess: 0,
    };
  }

  const totalRetries = metrics.reduce(
    (sum, m) => sum + m.userExperience.retryAttempts,
    0
  );
  const helpUsed = metrics.filter(m => m.userExperience.helpViewed).length;
  const guidesCompleted = metrics.filter(
    m => m.userExperience.guideStepsViewed > 0
  ).length;
  const abandoned = metrics.filter(m => m.status === 'abandoned').length;
  const successful = metrics.filter(
    m => m.status === 'success' || m.status === 'test_success'
  );
  const totalSuccessTime = successful.reduce(
    (sum, m) => sum + m.duration.totalMs,
    0
  );

  return {
    averageRetryAttempts: totalRetries / metrics.length,
    helpUsageRate: (helpUsed / metrics.length) * 100,
    guideCompletionRate: (guidesCompleted / metrics.length) * 100,
    abandonmentRate: (abandoned / metrics.length) * 100,
    timeToSuccess:
      successful.length > 0 ? totalSuccessTime / successful.length : 0,
  };
}
