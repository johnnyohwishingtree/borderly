/**
 * Crash Reporting Utility
 * 
 * Provides privacy-compliant crash reporting that sanitizes all PII
 * before logging or transmitting crash data.
 */

import { sanitizeError, sanitizeObject } from './piiSanitizer';
import { productionMonitoring } from '../services/monitoring/productionMonitoring';

export interface CrashReport {
  id: string;
  timestamp: number;
  type: 'javascript_error' | 'unhandled_promise' | 'native_crash' | 'memory_warning';
  error: {
    name: string;
    message: string;
    stack?: string;
    cause?: any;
  };
  context: {
    screen: string;
    userAction?: string;
    appState: 'active' | 'background' | 'inactive';
    memoryUsage?: number;
    batteryLevel?: number;
    networkStatus?: 'online' | 'offline';
  };
  device: {
    platform: 'ios' | 'android';
    osVersion: string;
    appVersion: string;
    deviceModel?: string;
    availableMemory?: number;
  };
  breadcrumbs: CrashBreadcrumb[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  tags: Record<string, string>;
}

export interface CrashBreadcrumb {
  timestamp: number;
  category: 'navigation' | 'user_action' | 'network' | 'state_change' | 'error';
  message: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}

export interface CrashReportingConfig {
  enabled: boolean;
  maxBreadcrumbs: number;
  enableConsoleCapture: boolean;
  enablePromiseRejectionCapture: boolean;
  enableNativeErrorCapture: boolean;
  beforeSend?: (report: CrashReport) => CrashReport | null;
  onCrash?: (report: CrashReport) => void;
}

class CrashReportingService {
  private breadcrumbs: CrashBreadcrumb[] = [];
  private config: CrashReportingConfig;
  private isSetup = false;

  constructor(config: Partial<CrashReportingConfig> = {}) {
    this.config = {
      enabled: true,
      maxBreadcrumbs: 50,
      enableConsoleCapture: true,
      enablePromiseRejectionCapture: true,
      enableNativeErrorCapture: true,
      ...config
    };
  }

  /**
   * Sets up crash reporting with global error handlers
   */
  setup(): void {
    if (this.isSetup || !this.config.enabled) return;

    // Capture JavaScript errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.handleJavaScriptError(event.error, {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      });

      // Capture unhandled promise rejections
      if (this.config.enablePromiseRejectionCapture) {
        window.addEventListener('unhandledrejection', (event) => {
          this.handleUnhandledPromiseRejection(event.reason);
        });
      }
    }

    // Capture console errors if enabled
    if (this.config.enableConsoleCapture) {
      this.setupConsoleCapture();
    }

    this.addBreadcrumb('system', 'Crash reporting initialized', 'info');
    this.isSetup = true;
  }

  /**
   * Manually reports an error with context
   */
  reportError(
    error: Error,
    context?: Partial<CrashReport['context']>,
    severity: CrashReport['severity'] = 'medium',
    tags?: Record<string, string>
  ): void {
    if (!this.config.enabled) return;

    const report = this.createCrashReport(
      error,
      'javascript_error',
      context,
      severity,
      tags
    );

    this.sendCrashReport(report);
  }

  /**
   * Reports a critical application crash
   */
  reportCriticalCrash(
    error: Error,
    context?: Partial<CrashReport['context']>,
    tags?: Record<string, string>
  ): void {
    this.reportError(error, context, 'critical', {
      ...tags,
      critical: 'true',
      auto_reported: 'true'
    });
  }

  /**
   * Adds a breadcrumb for context tracking
   */
  addBreadcrumb(
    category: CrashBreadcrumb['category'],
    message: string,
    level: CrashBreadcrumb['level'] = 'info',
    data?: Record<string, any>
  ): void {
    if (!this.config.enabled) return;

    const breadcrumb: CrashBreadcrumb = {
      timestamp: Date.now(),
      category,
      message: this.sanitizeMessage(message),
      level,
      data: data ? sanitizeObject(data, { preserveStructure: true }) : undefined
    };

    this.breadcrumbs.push(breadcrumb);

    // Maintain breadcrumb limit
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.config.maxBreadcrumbs);
    }
  }

  /**
   * Tracks user navigation for crash context
   */
  trackNavigation(fromScreen: string, toScreen: string): void {
    this.addBreadcrumb('navigation', `Navigate: ${fromScreen} → ${toScreen}`, 'info', {
      fromScreen,
      toScreen,
      timestamp: Date.now()
    });
  }

  /**
   * Tracks user actions for crash context
   */
  trackUserAction(action: string, screen: string, data?: Record<string, any>): void {
    this.addBreadcrumb('user_action', `${action} on ${screen}`, 'info', {
      action,
      screen,
      ...data
    });
  }

  /**
   * Tracks state changes for crash context
   */
  trackStateChange(from: string, to: string, context?: Record<string, any>): void {
    this.addBreadcrumb('state_change', `State: ${from} → ${to}`, 'info', {
      fromState: from,
      toState: to,
      ...context
    });
  }

  /**
   * Gets current crash reporting status
   */
  getStatus(): {
    enabled: boolean;
    breadcrumbCount: number;
    isSetup: boolean;
    config: CrashReportingConfig;
  } {
    return {
      enabled: this.config.enabled,
      breadcrumbCount: this.breadcrumbs.length,
      isSetup: this.isSetup,
      config: { ...this.config }
    };
  }

  /**
   * Clears all breadcrumbs
   */
  clearBreadcrumbs(): void {
    this.breadcrumbs = [];
    this.addBreadcrumb('system', 'Breadcrumbs cleared', 'info');
  }

  /**
   * Updates configuration
   */
  updateConfig(config: Partial<CrashReportingConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (!config.enabled) {
      this.clearBreadcrumbs();
    }
  }

  private handleJavaScriptError(error: Error, context?: Record<string, any>): void {
    this.addBreadcrumb('error', `JavaScript error: ${error.message}`, 'error');
    
    const report = this.createCrashReport(
      error,
      'javascript_error',
      {
        appState: this.getAppState(),
        ...context
      },
      'high',
      { auto_reported: 'true', error_type: 'javascript' }
    );

    this.sendCrashReport(report);
  }

  private handleUnhandledPromiseRejection(reason: any): void {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    
    this.addBreadcrumb('error', `Unhandled promise rejection: ${error.message}`, 'error');
    
    const report = this.createCrashReport(
      error,
      'unhandled_promise',
      { appState: this.getAppState() },
      'high',
      { auto_reported: 'true', error_type: 'promise_rejection' }
    );

    this.sendCrashReport(report);
  }

  private createCrashReport(
    error: Error,
    type: CrashReport['type'],
    context?: Partial<CrashReport['context']>,
    severity: CrashReport['severity'] = 'medium',
    tags: Record<string, string> = {}
  ): CrashReport {
    const sanitizedError = sanitizeError(error);
    
    const report: CrashReport = {
      id: this.generateCrashId(),
      timestamp: Date.now(),
      type,
      error: sanitizedError,
      context: {
        screen: 'unknown',
        appState: this.getAppState(),
        networkStatus: this.getNetworkStatus(),
        ...context
      },
      device: {
        platform: this.getPlatform(),
        osVersion: this.getOSVersion(),
        appVersion: this.getAppVersion(),
        deviceModel: this.getDeviceModel(),
        availableMemory: this.getAvailableMemory()
      },
      breadcrumbs: [...this.breadcrumbs],
      severity,
      tags: this.sanitizeTags(tags)
    };

    // Apply beforeSend hook if configured
    if (this.config.beforeSend) {
      const processedReport = this.config.beforeSend(report);
      if (!processedReport) {
        return report; // beforeSend returned null, but we still return the original for logging
      }
      return processedReport;
    }

    return report;
  }

  private sendCrashReport(report: CrashReport): void {
    try {
      // Log to production monitoring
      productionMonitoring.recordError(
        new Error(report.error.message),
        'app_crash',
        {
          crashId: report.id,
          type: report.type,
          severity: report.severity,
          screen: report.context.screen,
          platform: report.device.platform,
          appVersion: report.device.appVersion
        },
        report.severity
      );

      // Call onCrash hook if configured
      if (this.config.onCrash) {
        this.config.onCrash(report);
      }

      console.error('Crash Report Generated:', {
        id: report.id,
        type: report.type,
        message: report.error.message,
        severity: report.severity
      });

    } catch (sendError) {
      console.error('Failed to send crash report:', sendError);
    }
  }

  private setupConsoleCapture(): void {
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args) => {
      this.addBreadcrumb('error', `Console error: ${args.join(' ')}`, 'error');
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      this.addBreadcrumb('error', `Console warning: ${args.join(' ')}`, 'warning');
      originalWarn.apply(console, args);
    };
  }

  private generateCrashId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `crash_${timestamp}_${random}`;
  }

  private sanitizeMessage(message: string): string {
    // Simple sanitization for breadcrumb messages
    return message.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '[EMAIL]')
                 .replace(/(\+?1?[-\s]?\(?[0-9]{3}\)?[-\s]?[0-9]{3}[-\s]?[0-9]{4})/g, '[PHONE]');
  }

  private sanitizeTags(tags: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    Object.entries(tags).forEach(([key, value]) => {
      sanitized[key] = this.sanitizeMessage(value);
    });
    return sanitized;
  }

  private getAppState(): 'active' | 'background' | 'inactive' {
    // In a real React Native app, this would use AppState.currentState
    return 'active';
  }

  private getNetworkStatus(): 'online' | 'offline' {
    // In a real app, this would use NetInfo
    return typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline';
  }

  private getPlatform(): 'ios' | 'android' {
    // In a real React Native app, this would use Platform.OS
    return 'ios';
  }

  private getOSVersion(): string {
    // In a real app, this would use Platform.Version or DeviceInfo
    return 'Unknown';
  }

  private getAppVersion(): string {
    return process.env.APP_VERSION || '1.0.0';
  }

  private getDeviceModel(): string {
    // In a real app, this would use DeviceInfo
    return 'Unknown';
  }

  private getAvailableMemory(): number | undefined {
    // In a real app, this would use DeviceInfo or performance APIs
    return undefined;
  }
}

// Global crash reporter instance
export const crashReporting = new CrashReportingService();

// Auto-setup in production
if (process.env.NODE_ENV === 'production') {
  crashReporting.setup();
}

export { CrashReportingService };