/**
 * Alerting Service
 * 
 * Manages real-time alerts and notifications for critical system events
 * while maintaining privacy compliance.
 */

import { sanitizeObject } from '../../utils/piiSanitizer';
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

class AlertingService {
  private alerts: Alert[] = [];
  private rules: AlertRule[] = [];
  private config: AlertingConfig;
  private ruleLastTriggered: Map<string, number> = new Map();
  private eventBuffer: MonitoringEvent[] = [];

  constructor(config: Partial<AlertingConfig> = {}) {
    this.config = {
      enabled: true,
      maxActiveAlerts: 50,
      defaultCooldown: 5,
      retentionDays: 7,
      enableConsoleOutput: true,
      enableLocalNotifications: false,
      ...config
    };
    
    this.setupDefaultRules();
  }

  private setupDefaultRules(): void {
    this.rules = [
      {
        id: 'critical_errors',
        name: 'Critical Errors',
        description: 'Alerts when critical errors occur',
        category: 'errors',
        condition: {
          type: 'event_count',
          eventType: 'error',
          eventSeverity: 'critical',
          operator: 'gte',
          value: 1
        },
        threshold: 1,
        timeWindow: 1,
        severity: 'critical',
        enabled: true,
        cooldown: 1,
        actions: [
          { type: 'console', config: {}, enabled: true },
          { type: 'log', config: { level: 'error' }, enabled: true }
        ],
        tags: { category: 'critical', auto_generated: 'true' }
      },
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        description: 'Alerts when error rate exceeds threshold',
        category: 'errors',
        condition: {
          type: 'error_rate',
          eventType: 'error',
          operator: 'gt',
          value: 10 // 10 errors
        },
        threshold: 10,
        timeWindow: 5,
        severity: 'high',
        enabled: true,
        cooldown: 10,
        actions: [
          { type: 'console', config: {}, enabled: true }
        ],
        tags: { category: 'performance', auto_generated: 'true' }
      },
      {
        id: 'slow_performance',
        name: 'Slow Performance',
        description: 'Alerts when operations are consistently slow',
        category: 'performance',
        condition: {
          type: 'performance_threshold',
          eventType: 'performance',
          field: 'data.value',
          operator: 'gt',
          value: 3000 // 3 seconds
        },
        threshold: 5,
        timeWindow: 10,
        severity: 'medium',
        enabled: true,
        cooldown: 15,
        actions: [
          { type: 'log', config: { level: 'warn' }, enabled: true }
        ],
        tags: { category: 'performance' }
      },
      {
        id: 'form_generation_failures',
        name: 'Form Generation Failures',
        description: 'Alerts when form generation repeatedly fails',
        category: 'form_engine',
        condition: {
          type: 'event_count',
          eventType: 'error',
          eventCategory: 'form_generation',
          operator: 'gte',
          value: 3
        },
        threshold: 3,
        timeWindow: 5,
        severity: 'high',
        enabled: true,
        cooldown: 10,
        actions: [
          { type: 'console', config: {}, enabled: true }
        ],
        tags: { category: 'form_engine', business_critical: 'true' }
      },
      {
        id: 'camera_failures',
        name: 'Camera/OCR Failures',
        description: 'Alerts when camera or OCR operations fail repeatedly',
        category: 'camera',
        condition: {
          type: 'event_count',
          eventType: 'error',
          eventCategory: 'camera',
          operator: 'gte',
          value: 5
        },
        threshold: 5,
        timeWindow: 10,
        severity: 'medium',
        enabled: true,
        cooldown: 10,
        actions: [
          { type: 'console', config: {}, enabled: true }
        ],
        tags: { category: 'camera' }
      }
    ];
  }

  /**
   * Processes a monitoring event and checks for alert triggers
   */
  processEvent(event: MonitoringEvent): void {
    if (!this.config.enabled) return;

    // Add to event buffer for analysis
    this.eventBuffer.push(event);
    this.maintainEventBuffer();

    // Check all enabled rules
    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      if (this.isInCooldown(rule.id)) continue;

      if (this.evaluateRule(rule, event)) {
        this.triggerAlert(rule, event);
      }
    }
  }

  /**
   * Creates and triggers an alert
   */
  triggerAlert(rule: AlertRule, triggerEvent: MonitoringEvent): void {
    const relatedEvents = this.getRelatedEvents(rule, triggerEvent);
    
    const alert: Alert = {
      id: this.generateAlertId(),
      ruleId: rule.id,
      timestamp: Date.now(),
      severity: rule.severity,
      title: rule.name,
      message: this.generateAlertMessage(rule, triggerEvent, relatedEvents),
      category: rule.category,
      eventCount: relatedEvents.length,
      timeWindow: rule.timeWindow,
      status: 'active',
      context: this.sanitizeContext({
        triggerEvent: {
          type: triggerEvent.type,
          category: triggerEvent.category,
          severity: triggerEvent.severity,
          timestamp: triggerEvent.timestamp
        },
        rule: {
          name: rule.name,
          condition: rule.condition
        },
        relatedEventCount: relatedEvents.length
      }),
      tags: { ...rule.tags }
    };

    this.alerts.push(alert);
    this.ruleLastTriggered.set(rule.id, Date.now());

    // Execute alert actions
    this.executeAlertActions(alert, rule.actions);

    this.maintainAlerts();
  }

  /**
   * Acknowledges an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy?: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert || alert.status !== 'active') return false;

    alert.status = 'acknowledged';
    alert.acknowledgedAt = Date.now();
    alert.acknowledgedBy = acknowledgedBy || 'system';

    return true;
  }

  /**
   * Resolves an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert || alert.status === 'resolved') return false;

    alert.status = 'resolved';
    alert.resolvedAt = Date.now();

    return true;
  }

  /**
   * Gets active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => a.status === 'active');
  }

  /**
   * Gets all alerts within a time range
   */
  getAlerts(timeRange?: { start: number; end: number }): Alert[] {
    let alerts = this.alerts;
    
    if (timeRange) {
      alerts = alerts.filter(a => 
        a.timestamp >= timeRange.start && a.timestamp <= timeRange.end
      );
    }

    return alerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Adds a new alert rule
   */
  addRule(rule: Omit<AlertRule, 'id'>): string {
    const newRule: AlertRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substring(2)}`
    };

    this.rules.push(newRule);
    return newRule.id;
  }

  /**
   * Updates an existing rule
   */
  updateRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const ruleIndex = this.rules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) return false;

    this.rules[ruleIndex] = { ...this.rules[ruleIndex], ...updates };
    return true;
  }

  /**
   * Removes a rule
   */
  removeRule(ruleId: string): boolean {
    const ruleIndex = this.rules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) return false;

    this.rules.splice(ruleIndex, 1);
    this.ruleLastTriggered.delete(ruleId);
    return true;
  }

  /**
   * Gets all rules
   */
  getRules(): AlertRule[] {
    return [...this.rules];
  }

  /**
   * Gets alerting statistics
   */
  getStatistics(): {
    totalAlerts: number;
    activeAlerts: number;
    alertsByCategory: Record<string, number>;
    alertsBySeverity: Record<string, number>;
    ruleStats: Record<string, { triggered: number; lastTriggered?: number }>;
  } {
    const stats = {
      totalAlerts: this.alerts.length,
      activeAlerts: this.getActiveAlerts().length,
      alertsByCategory: {} as Record<string, number>,
      alertsBySeverity: {} as Record<string, number>,
      ruleStats: {} as Record<string, { triggered: number; lastTriggered?: number }>
    };

    // Aggregate by category and severity
    this.alerts.forEach(alert => {
      stats.alertsByCategory[alert.category] = 
        (stats.alertsByCategory[alert.category] || 0) + 1;
      stats.alertsBySeverity[alert.severity] = 
        (stats.alertsBySeverity[alert.severity] || 0) + 1;
    });

    // Rule statistics
    this.rules.forEach(rule => {
      const triggeredCount = this.alerts.filter(a => a.ruleId === rule.id).length;
      stats.ruleStats[rule.id] = {
        triggered: triggeredCount,
        lastTriggered: this.ruleLastTriggered.get(rule.id)
      };
    });

    return stats;
  }

  /**
   * Updates alerting configuration
   */
  updateConfig(config: Partial<AlertingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private evaluateRule(rule: AlertRule, event: MonitoringEvent): boolean {
    const { condition } = rule;

    // Filter events for the time window
    const windowStart = Date.now() - (rule.timeWindow * 60 * 1000);
    const windowEvents = this.eventBuffer.filter(e => e.timestamp >= windowStart);

    switch (condition.type) {
      case 'event_count':
        return this.evaluateEventCount(condition, windowEvents, rule.threshold);
      
      case 'error_rate':
        return this.evaluateErrorRate(condition, windowEvents, rule.threshold);
      
      case 'performance_threshold':
        return this.evaluatePerformanceThreshold(condition, windowEvents, rule.threshold);
      
      case 'custom':
        return this.evaluateCustomCondition(condition, event, windowEvents);
      
      default:
        return false;
    }
  }

  private evaluateEventCount(
    condition: AlertCondition, 
    events: MonitoringEvent[], 
    threshold: number
  ): boolean {
    const matchingEvents = events.filter(event => {
      if (condition.eventType && event.type !== condition.eventType) return false;
      if (condition.eventCategory && event.category !== condition.eventCategory) return false;
      if (condition.eventSeverity && event.severity !== condition.eventSeverity) return false;
      return true;
    });

    return this.compareValue(matchingEvents.length, condition.operator, threshold);
  }

  private evaluateErrorRate(
    condition: AlertCondition, 
    events: MonitoringEvent[], 
    threshold: number
  ): boolean {
    const errorEvents = events.filter(e => e.type === 'error');
    return this.compareValue(errorEvents.length, condition.operator, threshold);
  }

  private evaluatePerformanceThreshold(
    condition: AlertCondition, 
    events: MonitoringEvent[], 
    threshold: number
  ): boolean {
    const perfEvents = events.filter(e => 
      e.type === 'performance' && 
      (!condition.eventCategory || e.category === condition.eventCategory)
    );

    const exceedingEvents = perfEvents.filter(event => {
      const value = condition.field ? 
        this.getNestedValue(event, condition.field) : 
        event.data.value;
      
      if (typeof value !== 'number') return false;
      return this.compareValue(value, condition.operator, condition.value as number);
    });

    return exceedingEvents.length >= threshold;
  }

  private evaluateCustomCondition(
    condition: AlertCondition, 
    event: MonitoringEvent, 
    windowEvents: MonitoringEvent[]
  ): boolean {
    // Placeholder for custom condition evaluation
    // This would be implemented based on specific requirements
    return false;
  }

  private compareValue(
    actual: number, 
    operator: AlertCondition['operator'], 
    expected: number
  ): boolean {
    switch (operator) {
      case 'gt': return actual > expected;
      case 'gte': return actual >= expected;
      case 'lt': return actual < expected;
      case 'lte': return actual <= expected;
      case 'eq': return actual === expected;
      default: return false;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private getRelatedEvents(rule: AlertRule, triggerEvent: MonitoringEvent): MonitoringEvent[] {
    const windowStart = Date.now() - (rule.timeWindow * 60 * 1000);
    return this.eventBuffer.filter(event => {
      if (event.timestamp < windowStart) return false;
      
      const { condition } = rule;
      if (condition.eventType && event.type !== condition.eventType) return false;
      if (condition.eventCategory && event.category !== condition.eventCategory) return false;
      if (condition.eventSeverity && event.severity !== condition.eventSeverity) return false;
      
      return true;
    });
  }

  private generateAlertMessage(
    rule: AlertRule, 
    triggerEvent: MonitoringEvent, 
    relatedEvents: MonitoringEvent[]
  ): string {
    const { condition, timeWindow } = rule;
    
    switch (condition.type) {
      case 'event_count':
        return `${relatedEvents.length} ${condition.eventType || 'events'} of type '${condition.eventCategory || 'any'}' occurred in the last ${timeWindow} minutes`;
      
      case 'error_rate':
        return `High error rate detected: ${relatedEvents.length} errors in the last ${timeWindow} minutes`;
      
      case 'performance_threshold':
        return `Performance threshold exceeded: ${relatedEvents.length} slow operations detected in the last ${timeWindow} minutes`;
      
      default:
        return `Alert condition '${rule.name}' triggered with ${relatedEvents.length} related events`;
    }
  }

  private executeAlertActions(alert: Alert, actions: AlertAction[]): void {
    for (const action of actions) {
      if (!action.enabled) continue;

      try {
        switch (action.type) {
          case 'console':
            if (this.config.enableConsoleOutput) {
              console.warn(`🚨 ALERT: ${alert.title}`, {
                id: alert.id,
                severity: alert.severity,
                message: alert.message,
                category: alert.category
              });
            }
            break;
          
          case 'log':
            const level = action.config.level;
            if (level && ['log', 'warn', 'error', 'info', 'debug'].includes(level)) {
              console[level as keyof Console](`Alert: ${alert.title} - ${alert.message}`);
            } else {
              console.warn(`Alert: ${alert.title} - ${alert.message}`);
            }
            break;
          
          // Additional action types would be implemented here
          // case 'webhook':, 'local_notification', etc.
        }
      } catch (error) {
        console.error('Failed to execute alert action:', error);
      }
    }
  }

  private isInCooldown(ruleId: string): boolean {
    const lastTriggered = this.ruleLastTriggered.get(ruleId);
    if (!lastTriggered) return false;

    const rule = this.rules.find(r => r.id === ruleId);
    const cooldown = rule?.cooldown || this.config.defaultCooldown;
    const cooldownMs = cooldown * 60 * 1000;

    return (Date.now() - lastTriggered) < cooldownMs;
  }

  private maintainEventBuffer(): void {
    // Keep events for the maximum time window of any rule plus some buffer
    const maxTimeWindow = this.rules.length > 0 ? Math.max(...this.rules.map(r => r.timeWindow)) : 0;
    const retentionMs = (maxTimeWindow + 30) * 60 * 1000; // 30 minute buffer
    const cutoff = Date.now() - retentionMs;
    
    this.eventBuffer = this.eventBuffer.filter(e => e.timestamp > cutoff);
  }

  private maintainAlerts(): void {
    // Enforce max active alerts
    const activeAlerts = this.getActiveAlerts();
    if (activeAlerts.length > this.config.maxActiveAlerts) {
      const oldestActive = activeAlerts
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(0, activeAlerts.length - this.config.maxActiveAlerts);
      
      oldestActive.forEach(alert => this.resolveAlert(alert.id));
    }

    // Remove old alerts based on retention policy
    const retentionMs = this.config.retentionDays * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - retentionMs;
    this.alerts = this.alerts.filter(a => a.timestamp > cutoff);
  }

  private sanitizeContext(context: Record<string, any>): Record<string, any> {
    return sanitizeObject(context, {
      preserveStructure: true,
      whitelistedFields: [
        'timestamp', 'type', 'category', 'severity', 'name', 
        'condition', 'relatedEventCount', 'duration', 'value'
      ]
    });
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
}

export const alerting = new AlertingService();
export { AlertingService };