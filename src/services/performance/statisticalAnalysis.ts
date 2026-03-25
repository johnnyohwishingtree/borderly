/**
 * Statistical Analysis Functions
 *
 * Pure statistical functions used by the regression detection service.
 * Extracted as standalone functions for reusability and testability.
 */

import type { StatisticalAnalysis } from './regressionDetectionTypes';

/**
 * Calculate comprehensive statistics for a dataset
 */
export function calculateStatistics(data: number[]): StatisticalAnalysis {
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
  const { trend, trendStrength } = calculateTrend(data);

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

/**
 * Calculate trend direction and strength using simple linear regression
 */
export function calculateTrend(data: number[]): { trend: 'improving' | 'declining' | 'stable'; trendStrength: number } {
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
  const mean = sumY / n;

  if (Math.abs(slope) < 0.01) return { trend: 'stable', trendStrength: 0 };

  const trend = slope > 0 ? 'declining' : 'improving'; // For performance metrics, negative slope is improving
  const trendStrength = mean !== 0 ? Math.min(1, Math.abs(slope) / (Math.abs(mean) * 0.1)) : Math.min(1, Math.abs(slope)); // Normalize by 10% of mean

  return { trend, trendStrength };
}

/**
 * Approximation of the normal cumulative distribution function
 */
export function normalCDF(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

  return z > 0 ? 1 - prob : prob;
}

/**
 * Calculate mean absolute error between actual and predicted values
 */
export function calculateMeanAbsoluteError(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length || actual.length === 0) return 0;

  const errors = actual.map((a, i) => Math.abs(a - predicted[i]));
  return errors.reduce((a, b) => a + b, 0) / errors.length;
}
