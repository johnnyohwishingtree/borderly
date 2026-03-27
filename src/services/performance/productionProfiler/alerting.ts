/**
 * Alert management functions for the Production Profiler.
 *
 * Handles threshold checking, alert storage, and alert retrieval.
 */

import type { MMKV } from '@/services/storage/mmkv';
import { sanitizePII } from '../../../utils/piiSanitizer';
import type { PerformanceAlert, PerformanceMetrics } from './productionProfilerTypes';

export function checkThresholds(
  metric: keyof PerformanceMetrics,
  value: number,
  thresholds: Record<keyof PerformanceMetrics, number>,
  onViolation: (alert: PerformanceAlert) => void,
): void {
  const threshold = thresholds[metric];
  if (!threshold) return;

  const isRate = metric.includes('Rate') || metric.includes('Accuracy');
  const violated = isRate ? value < threshold : value > threshold;
  if (!violated) return;

  const severity: PerformanceAlert['severity'] = isRate
    ? value < threshold * 0.8
      ? 'critical'
      : 'warning'
    : value > threshold * 1.5
      ? 'critical'
      : 'warning';

  onViolation({
    id: `${metric}-${Date.now()}`,
    timestamp: Date.now(),
    severity,
    metric,
    message: `${metric} threshold violation: ${value} (threshold: ${threshold})`,
    threshold,
    actualValue: value,
  });
}

export function storeAlert(
  storage: MMKV,
  alert: PerformanceAlert,
  listeners: Array<(alert: PerformanceAlert) => void>,
): void {
  const alerts = getStoredAlerts(storage);
  alerts.push(alert);

  if (alerts.length > 100) {
    alerts.splice(0, alerts.length - 100);
  }

  storage.set('performance-alerts', sanitizePII(JSON.stringify(alerts)));
  listeners.forEach(listener => listener(alert));
}

export function getStoredAlerts(storage: MMKV): PerformanceAlert[] {
  const stored = storage.getString('performance-alerts');
  return stored ? JSON.parse(stored) : [];
}

export function getRecentAlerts(
  storage: MMKV,
  hours: number = 24,
): PerformanceAlert[] {
  const alerts = getStoredAlerts(storage);
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  return alerts.filter(alert => alert.timestamp > cutoff);
}
