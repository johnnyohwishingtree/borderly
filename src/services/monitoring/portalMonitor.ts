/**
 * Portal Monitor Service
 * 
 * Continuously monitors government portal health, performance,
 * and availability. Provides alerting and automatic response
 * to portal issues. All monitoring is defensive and read-only.
 */

import { portalHealthChecker, PortalHealthStatus, PortalHealthIssue } from '../testing/portalHealthChecker';
import { submissionAnalytics } from './submissionAnalytics';

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

/**
 * Portal Monitor - Continuous health monitoring
 * 
 * Monitors government portals for availability, performance,
 * and structural changes. Provides alerting and automatic
 * responses to ensure reliable user experience.
 */
export class PortalMonitor {
  private readonly config: MonitoringConfig;
  private isMonitoring: boolean = false;
  private monitoringInterval: ReturnType<typeof setInterval> | undefined;
  private readonly alerts: Map<string, PortalAlert[]> = new Map();
  private readonly autoResponses: Map<string, AutoResponse[]> = new Map();
  private readonly portals: Map<string, { name: string; url: string }> = new Map();

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      checkIntervalMinutes: 5,
      retryAttempts: 3,
      alertThresholds: {
        responseTimeMs: 10000, // 10 seconds
        errorRate: 0.1, // 10%
        unhealthyDuration: 15 * 60 * 1000 // 15 minutes
      },
      enableAlerts: true,
      enableAutoResponse: true,
      ...config
    };

    this.initializePortals();
  }

  /**
   * Starts continuous portal monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.log('[PortalMonitor] Already monitoring');
      return;
    }

    this.isMonitoring = true;
    
    // Initial check
    this.performHealthChecks();

    // Schedule recurring checks
    this.monitoringInterval = setInterval(
      () => this.performHealthChecks(),
      this.config.checkIntervalMinutes * 60 * 1000
    );

    console.log(`[PortalMonitor] Started monitoring ${this.portals.size} portals`);
  }

  /**
   * Stops portal monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    console.log('[PortalMonitor] Stopped monitoring');
  }

  /**
   * Adds a portal to monitor
   */
  addPortal(countryCode: string, portalName: string, portalUrl: string): void {
    this.portals.set(countryCode, { name: portalName, url: portalUrl });
    console.log(`[PortalMonitor] Added ${portalName} (${countryCode}) to monitoring`);
  }

  /**
   * Removes a portal from monitoring
   */
  removePortal(countryCode: string): void {
    this.portals.delete(countryCode);
    console.log(`[PortalMonitor] Removed ${countryCode} from monitoring`);
  }

  /**
   * Performs health checks on all monitored portals
   */
  private async performHealthChecks(): Promise<void> {
    console.log('[PortalMonitor] Performing health checks...');

    const checkPromises = Array.from(this.portals.entries()).map(
      async ([countryCode, portal]) => {
        try {
          const healthStatus = await portalHealthChecker.checkPortalHealth(
            countryCode,
            portal.name,
            portal.url
          );

          // Record analytics
          submissionAnalytics.recordPortalPerformance(
            countryCode,
            healthStatus.responseTime || 0,
            healthStatus.status,
            healthStatus.issues.length > 0 ? healthStatus.issues[0].type : undefined
          );

          // Process health status and generate alerts
          await this.processHealthStatus(healthStatus);

          // Execute auto-responses if needed
          if (this.config.enableAutoResponse) {
            await this.executeAutoResponses(countryCode, healthStatus);
          }

        } catch (error) {
          console.error(`[PortalMonitor] Error checking ${countryCode}:`, error);
          
          // Create error alert
          this.createAlert({
            countryCode,
            portalName: portal.name,
            severity: 'high',
            type: 'availability',
            message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            metadata: {
              impact: 'Portal health status unknown'
            }
          });
        }
      }
    );

    await Promise.allSettled(checkPromises);
    console.log('[PortalMonitor] Health checks completed');
  }

  /**
   * Processes health status and generates alerts
   */
  private async processHealthStatus(healthStatus: PortalHealthStatus): Promise<void> {
    const { countryCode, portalName, status, responseTime, issues } = healthStatus;

    // Check for performance issues
    if (responseTime && responseTime > this.config.alertThresholds.responseTimeMs) {
      this.createAlert({
        countryCode,
        portalName,
        severity: 'medium',
        type: 'performance',
        message: `Slow response time: ${responseTime}ms`,
        metadata: {
          responseTime,
          impact: 'Users may experience delays'
        }
      });
    }

    // Check for availability issues
    if (status === 'offline' || status === 'error') {
      this.createAlert({
        countryCode,
        portalName,
        severity: status === 'offline' ? 'critical' : 'high',
        type: 'availability',
        message: `Portal is ${status}`,
        metadata: {
          ...(healthStatus.metadata.httpStatus !== undefined ? { httpStatus: healthStatus.metadata.httpStatus } : {}),
          impact: 'Users cannot submit forms'
        }
      });
    }

    // Process individual issues
    issues.forEach(issue => {
      this.createAlertFromIssue(countryCode, portalName, issue);
    });

    // Check for sustained unhealthy status
    const isConsistentlyUnhealthy = !portalHealthChecker.isPortalConsistentlyHealthy(
      countryCode,
      this.config.alertThresholds.unhealthyDuration / (60 * 60 * 1000) // Convert to hours
    );

    if (isConsistentlyUnhealthy && status !== 'healthy') {
      this.createAlert({
        countryCode,
        portalName,
        severity: 'high',
        type: 'availability',
        message: `Portal has been unhealthy for extended period`,
        metadata: {
          impact: 'Sustained service degradation'
        }
      });
    }
  }

  /**
   * Creates alert from health issue
   */
  private createAlertFromIssue(
    countryCode: string,
    portalName: string,
    issue: PortalHealthIssue
  ): void {
    const severityMap: Record<PortalHealthIssue['type'], PortalAlert['severity']> = {
      ssl_expired: 'critical',
      connection_timeout: 'high',
      http_error: 'high',
      structure_changed: 'medium',
      slow_response: 'low'
    };

    const typeMap: Record<PortalHealthIssue['type'], PortalAlert['type']> = {
      ssl_expired: 'ssl',
      connection_timeout: 'availability',
      http_error: 'availability',
      structure_changed: 'structure_change',
      slow_response: 'performance'
    };

    this.createAlert({
      countryCode,
      portalName,
      severity: severityMap[issue.type] || 'medium',
      type: typeMap[issue.type] || 'availability',
      message: issue.message,
      metadata: {
        impact: this.getIssueImpact(issue.type)
      }
    });
  }

  /**
   * Creates a new alert
   */
  private createAlert(alertData: Omit<PortalAlert, 'id' | 'detectedAt' | 'status'>): void {
    // Check for duplicate alerts
    const existingAlerts = this.getActiveAlerts(alertData.countryCode);
    const isDuplicate = existingAlerts.some(alert => 
      alert.type === alertData.type && 
      alert.message === alertData.message
    );

    if (isDuplicate) {
      return; // Don't create duplicate alerts
    }

    const alert: PortalAlert = {
      id: this.generateAlertId(),
      detectedAt: new Date().toISOString(),
      status: 'active',
      ...alertData
    };

    if (!this.alerts.has(alertData.countryCode)) {
      this.alerts.set(alertData.countryCode, []);
    }

    this.alerts.get(alertData.countryCode)!.push(alert);

    if (this.config.enableAlerts) {
      this.dispatchAlert(alert);
    }

    // Keep only recent alerts
    const countryAlerts = this.alerts.get(alertData.countryCode)!;
    if (countryAlerts.length > 100) {
      countryAlerts.shift();
    }
  }

  /**
   * Executes automatic responses to portal issues
   */
  private async executeAutoResponses(
    countryCode: string,
    healthStatus: PortalHealthStatus
  ): Promise<void> {
    const responses: AutoResponse[] = [];

    // Auto-response for offline portals
    if (healthStatus.status === 'offline') {
      responses.push({
        trigger: 'portal_offline',
        action: 'notify_users',
        executed: false
      });
    }

    // Auto-response for SSL issues
    const hasSslIssue = healthStatus.issues.some(issue => issue.type === 'ssl_expired');
    if (hasSslIssue) {
      responses.push({
        trigger: 'ssl_issue',
        action: 'disable_automation',
        executed: false
      });
    }

    // Auto-response for structure changes
    const hasStructureChange = healthStatus.issues.some(issue => issue.type === 'structure_changed');
    if (hasStructureChange) {
      responses.push({
        trigger: 'structure_change',
        action: 'update_schema',
        executed: false
      });
    }

    // Execute responses
    for (const response of responses) {
      try {
        await this.executeResponse(countryCode, response);
        response.executed = true;
        response.executedAt = new Date().toISOString();
      } catch (error) {
        console.error(`[PortalMonitor] Failed to execute response:`, error);
      }
    }

    if (responses.length > 0) {
      if (!this.autoResponses.has(countryCode)) {
        this.autoResponses.set(countryCode, []);
      }
      this.autoResponses.get(countryCode)!.push(...responses);
    }
  }

  /**
   * Executes a specific auto-response action
   */
  private async executeResponse(countryCode: string, response: AutoResponse): Promise<void> {
    switch (response.action) {
      case 'notify_users':
        // In a real app, this would send notifications or update UI
        console.log(`[PortalMonitor] Notifying users about ${countryCode} portal issue`);
        break;
        
      case 'disable_automation':
        // In a real app, this would disable automated submission
        console.log(`[PortalMonitor] Disabling automation for ${countryCode}`);
        break;
        
      case 'switch_fallback':
        // In a real app, this would switch to manual mode
        console.log(`[PortalMonitor] Switching ${countryCode} to fallback mode`);
        break;
        
      case 'update_schema':
        // In a real app, this would trigger schema validation
        console.log(`[PortalMonitor] Requesting schema update for ${countryCode}`);
        break;
    }
  }

  /**
   * Dispatches alert to notification systems
   */
  private dispatchAlert(alert: PortalAlert): void {
    // In a real app, this would integrate with notification services
    if (__DEV__) {
      console.log(`[PortalMonitor] ALERT [${alert.severity.toUpperCase()}]:`, {
        country: alert.countryCode,
        portal: alert.portalName,
        type: alert.type,
        message: alert.message
      });
    }
  }

  /**
   * Gets impact description for issue type
   */
  private getIssueImpact(issueType: PortalHealthIssue['type']): string {
    const impacts = {
      ssl_expired: 'Security risk, users cannot access portal securely',
      connection_timeout: 'Users cannot access portal',
      http_error: 'Portal returning errors, submissions may fail',
      structure_changed: 'Automation may not work correctly',
      slow_response: 'Users experience delays'
    };

    return impacts[issueType] || 'Unknown impact';
  }

  /**
   * Initializes default portals to monitor
   */
  private initializePortals(): void {
    const defaultPortals = [
      { code: 'JPN', name: 'Visit Japan Web', url: 'https://vjw-lp.digital.go.jp/en/' },
      { code: 'MYS', name: 'Malaysia Digital Arrival Card', url: 'https://imigresen-online.imi.gov.my/mdac/main' },
      { code: 'SGP', name: 'SG Arrival Card', url: 'https://eservices.ica.gov.sg/sgarrivalcard/' },
      { code: 'THA', name: 'Thailand Pass', url: 'https://tp.consular.go.th/' },
      { code: 'VNM', name: 'Vietnam eVisa', url: 'https://evisa.xuatnhapcanh.gov.vn/' },
      { code: 'USA', name: 'ESTA', url: 'https://esta.cbp.dhs.gov/' },
      { code: 'GBR', name: 'UK eVisa', url: 'https://www.gov.uk/apply-to-come-to-the-uk' },
      { code: 'CAN', name: 'eTA', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta.html' }
    ];

    defaultPortals.forEach(portal => {
      this.addPortal(portal.code, portal.name, portal.url);
    });
  }

  /**
   * Generates unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gets active alerts for a country
   */
  getActiveAlerts(countryCode: string): PortalAlert[] {
    const alerts = this.alerts.get(countryCode) || [];
    return alerts.filter(alert => alert.status === 'active');
  }

  /**
   * Gets all active alerts
   */
  getAllActiveAlerts(): PortalAlert[] {
    const allAlerts: PortalAlert[] = [];
    this.alerts.forEach(alerts => {
      allAlerts.push(...alerts.filter(alert => alert.status === 'active'));
    });
    return allAlerts;
  }

  /**
   * Acknowledges an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    for (const alerts of this.alerts.values()) {
      const alert = alerts.find(a => a.id === alertId);
      if (alert && alert.status === 'active') {
        alert.status = 'acknowledged';
        return true;
      }
    }
    return false;
  }

  /**
   * Resolves an alert
   */
  resolveAlert(alertId: string): boolean {
    for (const alerts of this.alerts.values()) {
      const alert = alerts.find(a => a.id === alertId);
      if (alert && alert.status !== 'resolved') {
        alert.status = 'resolved';
        alert.resolvedAt = new Date().toISOString();
        return true;
      }
    }
    return false;
  }

  /**
   * Gets monitoring status
   */
  getMonitoringStatus(): MonitoringStatus {
    const healthSummary = portalHealthChecker.getHealthSummary();
    const activeAlerts = this.getAllActiveAlerts().length;

    const result: MonitoringStatus = {
      isRunning: this.isMonitoring,
      monitoredPortals: this.portals.size,
      activeAlerts,
      healthyPortals: healthSummary.healthy,
      degradedPortals: healthSummary.degraded,
      offlinePortals: healthSummary.offline
    };

    if (this.isMonitoring) {
      result.nextCheckAt = new Date(Date.now() + this.config.checkIntervalMinutes * 60 * 1000).toISOString();
    }

    return result;
  }

  /**
   * Gets auto-response history for a country
   */
  getAutoResponses(countryCode: string): AutoResponse[] {
    return this.autoResponses.get(countryCode) || [];
  }

  /**
   * Gets monitoring configuration
   */
  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  /**
   * Updates monitoring configuration
   */
  updateConfig(config: Partial<MonitoringConfig>): void {
    Object.assign(this.config, config);
    
    // Restart monitoring if interval changed
    if (this.isMonitoring && config.checkIntervalMinutes) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  /**
   * Clears monitoring data for testing purposes
   */
  clearData(): void {
    this.alerts.clear();
    this.autoResponses.clear();
    portalHealthChecker.clearHistory();
  }
}

/**
 * Default instance for app-wide use
 */
export const portalMonitor = new PortalMonitor();