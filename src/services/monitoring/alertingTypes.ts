/**
 * Alerting Types
 *
 * Shared type definitions for the alerting subsystem.
 */

export type { MonitoringEvent } from './productionMonitoring';

import type { MonitoringEvent } from './productionMonitoring';

export interface Alert {
  id: string;
  ruleId: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  category: string;
  eventCount: number;
  timeWindow: number;
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledgedAt?: number;
  acknowledgedBy?: string;
  resolvedAt?: number;
  context: Record<string, any>;
  tags: Record<string, string>;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  category: string;
  condition: AlertCondition;
  threshold: number;
  timeWindow: number; // minutes
  severity: Alert['severity'];
  enabled: boolean;
  cooldown: number; // minutes - prevent alert spam
  actions: AlertAction[];
  tags: Record<string, string>;
}

export interface AlertCondition {
  type: 'event_count' | 'error_rate' | 'performance_threshold' | 'custom';
  eventType?: MonitoringEvent['type'];
  eventCategory?: string;
  eventSeverity?: MonitoringEvent['severity'];
  metricName?: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'contains';
  value: number | string;
  field?: string; // field to check in event data
}

export interface AlertAction {
  type: 'log' | 'console' | 'webhook' | 'local_notification' | 'custom';
  config: Record<string, any>;
  enabled: boolean;
}

export interface AlertingConfig {
  enabled: boolean;
  maxActiveAlerts: number;
  defaultCooldown: number;
  retentionDays: number;
  enableConsoleOutput: boolean;
  enableLocalNotifications: boolean;
}
