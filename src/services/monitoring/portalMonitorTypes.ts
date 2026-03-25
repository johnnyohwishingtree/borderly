/**
 * Portal Monitor Types
 *
 * Type definitions for the portal monitoring service.
 */

export interface MonitoringConfig {
  checkIntervalMinutes: number;
  retryAttempts: number;
  alertThresholds: {
    responseTimeMs: number;
    errorRate: number;
    unhealthyDuration: number;
  };
  enableAlerts: boolean;
  enableAutoResponse: boolean;
}

export interface PortalAlert {
  id: string;
  countryCode: string;
  portalName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'performance' | 'availability' | 'ssl' | 'structure_change';
  message: string;
  detectedAt: string;
  resolvedAt?: string;
  status: 'active' | 'acknowledged' | 'resolved' | 'suppressed';
  metadata: {
    responseTime?: number;
    httpStatus?: number;
    errorCount?: number;
    impact?: string;
  };
}

export interface MonitoringStatus {
  isRunning: boolean;
  lastCheckAt?: string;
  nextCheckAt?: string;
  monitoredPortals: number;
  activeAlerts: number;
  healthyPortals: number;
  degradedPortals: number;
  offlinePortals: number;
}

export interface AutoResponse {
  trigger: string;
  action: 'notify_users' | 'disable_automation' | 'switch_fallback' | 'update_schema';
  executed: boolean;
  executedAt?: string;
}
