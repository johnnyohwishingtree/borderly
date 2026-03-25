/**
 * Production Performance Profiler — Helper Functions
 *
 * Standalone helper functions extracted from ProductionProfiler
 * for recommendation generation and trend analysis.
 */

import type { MMKV } from 'react-native-mmkv';

import type {
  PerformanceBenchmark,
  PerformanceMetrics,
  OptimizationRecommendation,
} from './productionProfilerTypes';

/**
 * Generate an optimization recommendation for a benchmark that is
 * in 'warning' or 'critical' status.
 */
export function generateRecommendation(
  benchmark: PerformanceBenchmark,
): OptimizationRecommendation | null {
  const recommendations: Record<string, OptimizationRecommendation> = {
    appStartTime: {
      id: 'optimize-app-start',
      priority: 'high',
      category: 'performance',
      title: 'Optimize App Startup Time',
      description:
        'App is taking longer than expected to start. Consider lazy loading and reducing initial bundle size.',
      impact: 'high',
      effort: 'medium',
      implementation: [
        'Implement lazy loading for non-critical screens',
        'Optimize initial bundle size',
        'Move heavy initialization to background',
        'Use React.lazy for component code splitting',
      ],
    },
    formGenerationTime: {
      id: 'optimize-form-generation',
      priority: 'medium',
      category: 'performance',
      title: 'Optimize Form Generation',
      description:
        'Form generation is slower than target. Consider caching and memoization.',
      impact: 'medium',
      effort: 'low',
      implementation: [
        'Add React.memo to form components',
        'Cache form schemas',
        'Optimize field mapping algorithm',
        'Use useMemo for expensive calculations',
      ],
    },
    memoryUsage: {
      id: 'reduce-memory-usage',
      priority: 'high',
      category: 'memory',
      title: 'Reduce Memory Consumption',
      description:
        'App is using more memory than target. Look for memory leaks and optimize data structures.',
      impact: 'high',
      effort: 'high',
      implementation: [
        'Audit for memory leaks',
        'Implement image lazy loading',
        'Optimize data structures',
        'Use weak references where appropriate',
      ],
    },
  };

  return recommendations[benchmark.metric] || null;
}

/**
 * Compute daily-average performance trends from historical data.
 *
 * @param storage       MMKV instance used by the profiler
 * @param thresholds    The profiler's threshold record (used to iterate metric keys)
 * @param days          Number of days of history to examine (default 14)
 */
export function getPerformanceTrends(
  storage: MMKV,
  thresholds: Record<keyof PerformanceMetrics, number>,
  days: number = 14,
): Array<{ date: string } & Partial<PerformanceMetrics>> {
  // Gather historical data for the requested window
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  const historical: Array<PerformanceMetrics & { timestamp: number }> = [];

  for (
    let date = new Date(startDate);
    date <= endDate;
    date.setDate(date.getDate() + 1)
  ) {
    const key = `metrics-${date.toISOString().split('T')[0]}`;
    const dayData = storage.getString(key);

    if (dayData) {
      historical.push(...JSON.parse(dayData));
    }
  }

  // Group by day
  const groupedByDay: Record<
    string,
    Array<PerformanceMetrics & { timestamp: number }>
  > = {};

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

    Object.keys(thresholds).forEach(metricKey => {
      const metric = metricKey as keyof PerformanceMetrics;
      const values = metrics
        .map(m => m[metric] as number)
        .filter(v => v > 0);

      if (values.length > 0) {
        (averages as any)[metric] =
          values.reduce((a, b) => a + b, 0) / values.length;
      }
    });

    return {
      date: day,
      ...averages,
    };
  });

  return trends.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Determine the status of a metric relative to its target threshold.
 */
export function getMetricStatus(
  metric: keyof PerformanceMetrics,
  value: number,
  target: number,
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

/**
 * Determine the trend direction from a series of metric values.
 */
export function getMetricTrend(
  values: number[],
): PerformanceBenchmark['trend'] {
  if (values.length < 4) {
    return 'stable';
  }

  const recentValues = values.slice(-3);
  const olderValues = values.slice(0, values.length - 3);

  const recentAvg =
    recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
  const olderAvg =
    olderValues.reduce((a, b) => a + b, 0) / olderValues.length;

  if (olderAvg === 0) {
    return recentAvg > 0 ? 'declining' : 'stable';
  }

  const relativeChange = (recentAvg - olderAvg) / olderAvg;
  if (Math.abs(relativeChange) < 0.05) {
    return 'stable';
  }

  return recentAvg < olderAvg ? 'improving' : 'declining';
}
