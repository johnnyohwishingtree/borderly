/**
 * Error Tracking Service
 * Captures and tracks application errors with PII sanitization
 */

import { sanitizeError, sanitizeObject, sanitizeString } from '../../utils/piiSanitizer';

export interface ErrorReport {
  id: string;
  timestamp: number;
  type: 'javascript' | 'unhandled_promise' | 'native' | 'network' | 'validation' | 'user';
  severity: 'low' | 'medium' | 'high' | 'critical';
  error: {
    name: string;
    message: string;
    stack?: string;
    cause?: any;
  };
  context: {
    screen?: string;
    flow?: string;
    userAction?: string;
    deviceInfo?: DeviceInfo;
    appState?: AppState;
  };
  breadcrumbs: Breadcrumb[];
  tags: Record<string, string>;
  fingerprint: string;
}

export interface DeviceInfo {
  platform: string;
  version: string;
  model?: string;
  isEmulator?: boolean;
  memoryUsage?: number;
}

export interface AppState {
  version: string;
  buildNumber: string;
  isDebug: boolean;
  activeScreen: string;
  hasProfile: boolean;
  tripCount: number;
}

export interface Breadcrumb {
  timestamp: number;
  type: 'navigation' | 'user_action' | 'network' | 'state_change' | 'error';
  message: string;
  data?: Record<string, any>;
  level: 'info' | 'warning' | 'error';
}

export interface ErrorTrackingOptions {
  maxBreadcrumbs?: number;
  enableAutoCapture?: boolean;
  enableNetworkTracking?: boolean;
  enableNavigationTracking?: boolean;
  enableUserActionTracking?: boolean;
  beforeSend?: (report: ErrorReport) => ErrorReport | null;
}

class ErrorTracker {
  private errors: ErrorReport[] = [];
  private breadcrumbs: Breadcrumb[] = [];
  private deviceInfo?: DeviceInfo;
  private appState?: AppState;
  private isEnabled: boolean = true;
  private options: Required<ErrorTrackingOptions>;

  constructor(options: ErrorTrackingOptions = {}) {
    this.options = {
      maxBreadcrumbs: options.maxBreadcrumbs || 50,
      enableAutoCapture: options.enableAutoCapture ?? true,
      enableNetworkTracking: options.enableNetworkTracking ?? true,
      enableNavigationTracking: options.enableNavigationTracking ?? true,
      enableUserActionTracking: options.enableUserActionTracking ?? true,
      beforeSend: options.beforeSend,
    };

    if (this.options.enableAutoCapture) {
      this.setupErrorHandlers();
    }
  }

  /**
   * Initialize error tracking with device and app information
   */
  initialize(deviceInfo: DeviceInfo, appState: AppState): void {
    this.deviceInfo = deviceInfo;
    this.appState = appState;
    
    this.addBreadcrumb({
      type: 'state_change',
      message: 'Error tracking initialized',
      level: 'info',
    });
  }

  /**
   * Enable or disable error tracking
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Update app state
   */
  updateAppState(appState: Partial<AppState>): void {
    this.appState = { ...this.appState, ...appState } as AppState;
  }

  /**
   * Manually capture an error
   */
  captureError(
    error: Error,
    context: {
      screen?: string;
      flow?: string;
      userAction?: string;
      severity?: ErrorReport['severity'];
      tags?: Record<string, string>;
    } = {}
  ): string {
    if (!this.isEnabled) return '';

    const errorReport: ErrorReport = {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      type: 'javascript',
      severity: context.severity || this.determineSeverity(error),
      error: sanitizeError(error),
      context: {
        screen: context.screen ? sanitizeString(context.screen) : undefined,
        flow: context.flow ? sanitizeString(context.flow) : undefined,
        userAction: context.userAction ? sanitizeString(context.userAction) : undefined,
        deviceInfo: this.deviceInfo,
        appState: this.appState,
      },
      breadcrumbs: [...this.breadcrumbs],
      tags: context.tags || {},
      fingerprint: this.generateFingerprint(error),
    };

    // Apply beforeSend hook if configured
    const finalReport = this.options.beforeSend 
      ? this.options.beforeSend(errorReport)
      : errorReport;

    if (finalReport) {
      this.errors.push(finalReport);
      this.pruneOldErrors();
      
      this.addBreadcrumb({
        type: 'error',
        message: `Error captured: ${error.name}`,
        data: { errorId: finalReport.id },
        level: 'error',
      });
    }

    return errorReport.id;
  }

  /**
   * Capture a network error
   */
  captureNetworkError(
    url: string,
    method: string,
    statusCode: number,
    error: Error
  ): string {
    if (!this.isEnabled || !this.options.enableNetworkTracking) return '';

    const networkError = new Error(`Network ${method} ${statusCode}: ${error.message}`);
    networkError.name = 'NetworkError';

    return this.captureError(networkError, {
      severity: statusCode >= 500 ? 'high' : 'medium',
      tags: {
        type: 'network',
        url: sanitizeString(url),
        method,
        statusCode: statusCode.toString(),
      },
    });
  }

  /**
   * Capture a validation error
   */
  captureValidationError(
    field: string,
    value: any,
    rule: string,
    context?: string
  ): string {
    if (!this.isEnabled) return '';

    const validationError = new Error(`Validation failed for field '${field}': ${rule}`);
    validationError.name = 'ValidationError';

    return this.captureError(validationError, {
      severity: 'low',
      tags: {
        type: 'validation',
        field: sanitizeString(field),
        rule,
        context: context ? sanitizeString(context) : '',
      },
    });
  }

  /**
   * Add a breadcrumb trail item
   */
  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    if (!this.isEnabled) return;

    const fullBreadcrumb: Breadcrumb = {
      ...breadcrumb,
      timestamp: Date.now(),
      message: sanitizeString(breadcrumb.message),
      data: breadcrumb.data ? sanitizeObject(breadcrumb.data) : undefined,
    };

    this.breadcrumbs.push(fullBreadcrumb);

    // Keep only the most recent breadcrumbs
    if (this.breadcrumbs.length > this.options.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.options.maxBreadcrumbs);
    }
  }

  /**
   * Track navigation events
   */
  trackNavigation(from: string, to: string): void {
    if (!this.isEnabled || !this.options.enableNavigationTracking) return;

    this.addBreadcrumb({
      type: 'navigation',
      message: `Navigated from ${sanitizeString(from)} to ${sanitizeString(to)}`,
      data: { from: sanitizeString(from), to: sanitizeString(to) },
      level: 'info',
    });

    this.updateAppState({ activeScreen: sanitizeString(to) });
  }

  /**
   * Track user actions
   */
  trackUserAction(action: string, data?: Record<string, any>): void {
    if (!this.isEnabled || !this.options.enableUserActionTracking) return;

    this.addBreadcrumb({
      type: 'user_action',
      message: `User action: ${sanitizeString(action)}`,
      data: data ? sanitizeObject(data) : undefined,
      level: 'info',
    });
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    recentErrors: ErrorReport[];
  } {
    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};

    this.errors.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    });

    // Get recent errors (last 24 hours)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentErrors = this.errors.filter(error => error.timestamp > oneDayAgo);

    return {
      totalErrors: this.errors.length,
      errorsByType,
      errorsBySeverity,
      recentErrors,
    };
  }

  /**
   * Clear all errors and breadcrumbs
   */
  clear(): void {
    this.errors = [];
    this.breadcrumbs = [];
  }

  /**
   * Export error data (sanitized)
   */
  exportErrors(): {
    errors: ErrorReport[];
    breadcrumbs: Breadcrumb[];
  } {
    return {
      errors: this.errors,
      breadcrumbs: this.breadcrumbs,
    };
  }

  /**
   * Set up global error handlers
   */
  private setupErrorHandlers(): void {
    // Global JavaScript errors
    if (typeof ErrorUtils !== 'undefined') {
      const originalGlobalHandler = ErrorUtils.getGlobalHandler();
      
      ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        this.captureError(error, {
          severity: isFatal ? 'critical' : 'high',
          tags: { type: 'global', isFatal: String(isFatal) },
        });
        
        if (originalGlobalHandler) {
          originalGlobalHandler(error, isFatal);
        }
      });
    }

    // Unhandled promise rejections
    if (typeof process !== 'undefined' && process.on) {
      process.on('unhandledRejection', (reason: any) => {
        const error = reason instanceof Error 
          ? reason 
          : new Error(`Unhandled promise rejection: ${String(reason)}`);
        
        this.captureError(error, {
          severity: 'high',
          tags: { type: 'unhandled_promise' },
        });
      });
    }
  }

  /**
   * Determine error severity based on error type and message
   */
  private determineSeverity(error: Error): ErrorReport['severity'] {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Critical errors
    if (name.includes('security') || message.includes('unauthorized')) {
      return 'critical';
    }

    // High severity errors
    if (name.includes('network') || name.includes('timeout') || message.includes('crash')) {
      return 'high';
    }

    // Medium severity errors
    if (name.includes('validation') || name.includes('parse')) {
      return 'medium';
    }

    // Default to medium
    return 'medium';
  }

  /**
   * Generate a unique fingerprint for error grouping
   */
  private generateFingerprint(error: Error): string {
    const key = `${error.name}_${error.message}_${error.stack?.split('\n')[0] || ''}`;
    return btoa(key).replace(/=/g, '').substring(0, 16);
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Remove old errors to prevent memory leaks
   */
  private pruneOldErrors(): void {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    this.errors = this.errors.filter(error => error.timestamp > oneWeekAgo);
  }
}

// Singleton instance
export const errorTracker = new ErrorTracker();

// Convenience functions
export const captureError = errorTracker.captureError.bind(errorTracker);
export const captureNetworkError = errorTracker.captureNetworkError.bind(errorTracker);
export const captureValidationError = errorTracker.captureValidationError.bind(errorTracker);
export const addBreadcrumb = errorTracker.addBreadcrumb.bind(errorTracker);
export const trackNavigation = errorTracker.trackNavigation.bind(errorTracker);
export const trackUserAction = errorTracker.trackUserAction.bind(errorTracker);