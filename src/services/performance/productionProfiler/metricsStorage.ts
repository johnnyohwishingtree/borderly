/**
 * Metrics persistence and historical data management.
 *
 * Handles flushing metrics to storage, cleanup of old data,
 * retrieval of historical data, and error tracking.
 */

import type { MMKV } from 'react-native-mmkv';
import { sanitizePII } from '../../../utils/piiSanitizer';
import type { PerformanceMetrics } from './productionProfilerTypes';

declare const __DEV__: boolean;
declare const global: { performance?: { memory?: { usedJSHeapSize: number } } };

export function flushMetricsBuffer(
  storage: MMKV,
  buffer: Array<PerformanceMetrics & { timestamp: number }>,
): void {
  if (buffer.length === 0) return;

  const historicalKey = `metrics-${new Date().toISOString().split('T')[0]}`;
  const existing = storage.getString(historicalKey);
  const existingData = existing ? JSON.parse(existing) : [];

  existingData.push(...buffer);
  storage.set(historicalKey, sanitizePII(JSON.stringify(existingData)));

  cleanupOldData(storage);
}

export function cleanupOldData(storage: MMKV): void {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);

  const allKeys = storage.getAllKeys();
  allKeys.forEach(key => {
    if (key.startsWith('metrics-')) {
      const dateStr = key.replace('metrics-', '');
      const date = new Date(dateStr);
      if (date < cutoffDate) {
        storage.delete(key);
      }
    }
  });
}

export function getHistoricalData(
  storage: MMKV,
  days: number,
): Array<PerformanceMetrics & { timestamp: number }> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  const data: Array<PerformanceMetrics & { timestamp: number }> = [];

  for (
    let date = new Date(startDate);
    date <= endDate;
    date.setDate(date.getDate() + 1)
  ) {
    const key = `metrics-${date.toISOString().split('T')[0]}`;
    const dayData = storage.getString(key);
    if (dayData) {
      data.push(...JSON.parse(dayData));
    }
  }

  return data;
}

export function trackMemoryUsage(
  recordMetric: (metric: keyof PerformanceMetrics, value: number) => void,
): void {
  if (__DEV__) return;

  try {
    if (typeof global !== 'undefined' && global.performance?.memory) {
      const memory = global.performance.memory;
      recordMetric('memoryUsage', memory.usedJSHeapSize);
    }
  } catch (error) {
    console.warn('Memory tracking not available:', error);
  }
}

export function recordError(
  storage: MMKV,
  operation: string,
  error: Error,
  executionTime: number,
  getCurrentMetrics: () => PerformanceMetrics,
): void {
  const errorMetrics = getCurrentMetrics();

  // Simplified rate calculation
  const recentOperations = 100;
  const recentErrors = 1;
  errorMetrics.errorRate =
    recentOperations > 0 ? recentErrors / recentOperations : 0;

  storage.set('current-metrics', JSON.stringify(errorMetrics));

  console.error(`Performance error in ${operation}:`, {
    message: sanitizePII(error.message),
    executionTime,
    timestamp: Date.now(),
  });

  recordErrorForTracking(storage);
}

export function recordErrorForTracking(storage: MMKV): void {
  const key = 'error-tracking';
  const existing = storage.getString(key);
  const errors = existing ? JSON.parse(existing) : [];
  errors.push(Date.now());

  const recentErrors = errors.slice(-100);
  storage.set(key, JSON.stringify(recentErrors));
}
