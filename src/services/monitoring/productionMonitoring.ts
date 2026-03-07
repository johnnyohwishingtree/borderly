/**
 * Production Monitoring Service
 * 
 * Provides comprehensive monitoring for the Borderly app in production
 * while maintaining strict privacy compliance and zero-server PII policy.
 */

import { sanitizeError, sanitizeObject } from '../../utils/piiSanitizer';

export interface MonitoringEvent {
  type: 'error' | 'performance' | 'user_action' | 'system';
  timestamp: number;
  category: string;
  data: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  sessionId: string;
  appVersion: string;
  platform: 'ios' | 'android';
  userId?: string; // Hashed, non-reversible identifier
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percent';
  category: 'startup' | 'form_generation' | 'camera' | 'navigation' | 'storage';
  context?: Record<string, any>;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: (event: MonitoringEvent) => boolean;
  threshold: number;
  timeWindow: number; // minutes
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

class ProductionMonitoringService {
  private events: MonitoringEvent[] = [];
  private sessionId: string;
  private alertRules: AlertRule[] = [];
  private isEnabled: boolean = true;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupDefaultAlertRules();
  }

  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `${timestamp}-${random}`;
  }

  private setupDefaultAlertRules(): void {
    this.alertRules = [
      {
        id: 'critical_crashes',
        name: 'Critical App Crashes',
        condition: (event) => 
          event.type === 'error' && 
          event.severity === 'critical' && 
          event.category === 'app_crash',
        threshold: 1,
        timeWindow: 5,
        severity: 'critical',
        enabled: true
      },
      {
        id: 'form_generation_errors',
        name: 'Form Generation Failures',
        condition: (event) => 
          event.type === 'error' && 
          event.category === 'form_generation',
        threshold: 3,
        timeWindow: 10,
        severity: 'high',
        enabled: true
      },
      {
        id: 'camera_failures',
        name: 'Camera/OCR Failures',
        condition: (event) => 
          event.type === 'error' && 
          (event.category === 'camera' || event.category === 'ocr'),
        threshold: 5,
        timeWindow: 15,
        severity: 'medium',
        enabled: true
      },
      {
        id: 'slow_performance',
        name: 'Slow Performance',
        condition: (event) => 
          event.type === 'performance' && 
          event.data.duration > 5000, // 5 seconds
        threshold: 10,
        timeWindow: 30,
        severity: 'medium',
        enabled: true
      }
    ];
  }

  /**
   * Records a monitoring event with automatic PII sanitization
   */
  recordEvent(
    type: MonitoringEvent['type'],
    category: string,
    data: Record<string, any>,
    severity: MonitoringEvent['severity'] = 'low'
  ): void {
    if (!this.isEnabled) return;

    // Sanitize all data to ensure no PII leaks
    const sanitizedData = sanitizeObject(data, {
      preserveStructure: true,
      whitelistedFields: [
        'duration',
        'timestamp',
        'count',
        'success',
        'failed',
        'platform',
        'version',
        'category',
        'type'
      ]
    });

    const event: MonitoringEvent = {
      type,
      timestamp: Date.now(),
      category,
      data: sanitizedData,
      severity,
      sessionId: this.sessionId,
      appVersion: this.getAppVersion(),
      platform: this.getPlatform(),
    };

    this.events.push(event);
    this.checkAlerts(event);
    this.maintainEventHistory();
  }

  /**
   * Records performance metrics
   */
  recordPerformance(metric: PerformanceMetric): void {
    this.recordEvent('performance', metric.category, {
      name: metric.name,
      value: metric.value,
      unit: metric.unit,
      context: sanitizeObject(metric.context || {}, { preserveStructure: true })
    }, 'low');
  }

  /**
   * Records error with automatic sanitization
   */
  recordError(
    error: Error,
    category: string,
    context?: Record<string, any>,
    severity: MonitoringEvent['severity'] = 'medium'
  ): void {
    const sanitizedError = sanitizeError(error);
    const sanitizedContext = context ? sanitizeObject(context, { preserveStructure: true }) : {};

    this.recordEvent('error', category, {
      ...sanitizedError,
      context: sanitizedContext,
      errorType: error.constructor.name
    }, severity);
  }

  /**
   * Records user action (privacy-safe analytics)
   */
  recordUserAction(
    action: string,
    screen: string,
    context?: Record<string, any>
  ): void {
    this.recordEvent('user_action', 'navigation', {
      action,
      screen,
      context: sanitizeObject(context || {}, { preserveStructure: true })
    }, 'low');
  }

  /**
   * Starts performance timing for an operation
   */
  startTiming(operation: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.recordPerformance({
        name: operation,
        value: duration,
        unit: 'ms',
        category: this.getCategoryFromOperation(operation)
      });
    };
  }

  /**
   * Gets current monitoring status
   */
  getStatus(): {
    isEnabled: boolean;
    sessionId: string;
    eventCount: number;
    criticalEvents: number;
    lastEvent?: MonitoringEvent;
  } {
    const criticalEvents = this.events.filter(e => e.severity === 'critical').length;
    
    return {
      isEnabled: this.isEnabled,
      sessionId: this.sessionId,
      eventCount: this.events.length,
      criticalEvents,
      lastEvent: this.events[this.events.length - 1]
    };
  }

  /**
   * Exports sanitized monitoring data for analysis
   */
  exportData(timeRange?: { start: number; end: number }): MonitoringEvent[] {
    let events = this.events;
    
    if (timeRange) {
      events = events.filter(e => 
        e.timestamp >= timeRange.start && e.timestamp <= timeRange.end
      );
    }

    // Double-sanitize before export to ensure no PII
    return events.map(event => ({
      ...event,
      data: sanitizeObject(event.data, { preserveStructure: true })
    }));
  }

  /**
   * Enables/disables monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (enabled) {
      this.recordEvent('system', 'monitoring', { action: 'enabled' }, 'low');
    }
  }

  private checkAlerts(event: MonitoringEvent): void {
    for (const rule of this.alertRules) {
      if (!rule.enabled || !rule.condition(event)) continue;

      const windowStart = Date.now() - (rule.timeWindow * 60 * 1000);
      const recentEvents = this.events.filter(e => 
        e.timestamp >= windowStart && rule.condition(e)
      );

      if (recentEvents.length >= rule.threshold) {
        this.triggerAlert(rule, recentEvents);
      }
    }
  }

  private triggerAlert(rule: AlertRule, events: MonitoringEvent[]): void {
    // Record the alert as a monitoring event
    this.recordEvent('system', 'alert', {
      ruleId: rule.id,
      ruleName: rule.name,
      eventCount: events.length,
      timeWindow: rule.timeWindow,
      threshold: rule.threshold,
      triggeredAt: Date.now()
    }, rule.severity);

    // In a real implementation, this would send notifications
    // to monitoring services (Firebase, Sentry, etc.)
    console.warn(`Alert triggered: ${rule.name}`, {
      eventCount: events.length,
      severity: rule.severity
    });
  }

  private maintainEventHistory(): void {
    // Keep only last 1000 events to prevent memory bloat
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }

  private getCategoryFromOperation(operation: string): PerformanceMetric['category'] {
    if (operation.includes('camera') || operation.includes('ocr')) return 'camera';
    if (operation.includes('form') || operation.includes('generate')) return 'form_generation';
    if (operation.includes('navigate') || operation.includes('screen')) return 'navigation';
    if (operation.includes('storage') || operation.includes('keychain')) return 'storage';
    if (operation.includes('startup') || operation.includes('init')) return 'startup';
    return 'form_generation'; // default
  }

  private getAppVersion(): string {
    // In a real app, this would come from package.json or build config
    return process.env.APP_VERSION || '1.0.0';
  }

  private getPlatform(): 'ios' | 'android' {
    // In a real app, this would use Platform.OS from react-native
    return 'ios'; // default for development
  }
}

export const productionMonitoring = new ProductionMonitoringService();
export { ProductionMonitoringService };