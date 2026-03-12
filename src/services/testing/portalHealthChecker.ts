/**
 * Portal Health Checker Service
 * 
 * Provides defensive monitoring and health checking for government portals.
 * This service performs non-intrusive monitoring to detect portal availability,
 * SSL issues, and basic structural changes without submitting any data.
 */

export interface PortalHealthStatus {
  countryCode: string;
  portalName: string;
  url: string;
  status: 'healthy' | 'degraded' | 'offline' | 'error';
  responseTime?: number;
  lastChecked: string;
  issues: PortalHealthIssue[];
  metadata: {
    sslValid: boolean;
    canConnect: boolean;
    expectedElements: boolean;
    httpStatus?: number;
  };
}

export interface PortalHealthIssue {
  type: 'ssl_expired' | 'connection_timeout' | 'http_error' | 'structure_changed' | 'slow_response';
  severity: 'warning' | 'error' | 'critical';
  message: string;
  detectedAt: string;
}

export interface PortalHealthConfig {
  timeoutMs: number;
  maxRetries: number;
  expectedResponseTimeMs: number;
  checkIntervalMs: number;
}

/**
 * Portal Health Checker - Defensive monitoring service
 * 
 * Performs read-only checks of government portals to ensure they are
 * accessible and functional for users. No data is submitted to portals.
 */
export class PortalHealthChecker {
  private readonly config: PortalHealthConfig;
  private readonly healthHistory: Map<string, PortalHealthStatus[]> = new Map();

  constructor(config: Partial<PortalHealthConfig> = {}) {
    this.config = {
      timeoutMs: 10000,
      maxRetries: 3,
      expectedResponseTimeMs: 5000,
      checkIntervalMs: 5 * 60 * 1000, // 5 minutes
      ...config
    };
  }

  /**
   * Performs a comprehensive health check of a government portal
   */
  async checkPortalHealth(
    countryCode: string,
    portalName: string,
    portalUrl: string
  ): Promise<PortalHealthStatus> {
    const startTime = Date.now();
    const status: PortalHealthStatus = {
      countryCode,
      portalName,
      url: portalUrl,
      status: 'error',
      lastChecked: new Date().toISOString(),
      issues: [],
      metadata: {
        sslValid: false,
        canConnect: false,
        expectedElements: false,
      }
    };

    try {
      // 1. Basic connectivity and SSL check
      const connectivityResult = await this.checkConnectivity(portalUrl);
      status.metadata.canConnect = connectivityResult.canConnect;
      status.metadata.sslValid = connectivityResult.sslValid;
      if (connectivityResult.httpStatus !== undefined) {
        status.metadata.httpStatus = connectivityResult.httpStatus;
      }
      status.responseTime = Date.now() - startTime;

      if (!connectivityResult.canConnect) {
        status.issues.push({
          type: 'connection_timeout',
          severity: 'critical',
          message: `Cannot connect to ${portalName}`,
          detectedAt: new Date().toISOString()
        });
        status.status = 'offline';
        return status;
      }

      // 2. SSL validation
      if (!connectivityResult.sslValid) {
        status.issues.push({
          type: 'ssl_expired',
          severity: 'critical',
          message: 'SSL certificate issues detected',
          detectedAt: new Date().toISOString()
        });
      }

      // 3. HTTP status check
      if (connectivityResult.httpStatus && (connectivityResult.httpStatus >= 400 || connectivityResult.httpStatus === 302)) {
        status.issues.push({
          type: 'http_error',
          severity: 'error',
          message: `HTTP ${connectivityResult.httpStatus} error`,
          detectedAt: new Date().toISOString()
        });
        status.status = 'error';
        return status;
      }

      // 4. Response time check
      const responseTime = Date.now() - startTime;
      if (responseTime > this.config.expectedResponseTimeMs) {
        status.issues.push({
          type: 'slow_response',
          severity: 'warning',
          message: `Slow response time: ${responseTime}ms`,
          detectedAt: new Date().toISOString()
        });
      }

      // 5. Basic structure validation (defensive read-only check)
      const structureValid = await this.validateBasicStructure(countryCode, portalUrl);
      status.metadata.expectedElements = structureValid;

      if (!structureValid) {
        status.issues.push({
          type: 'structure_changed',
          severity: 'warning',
          message: 'Portal structure may have changed',
          detectedAt: new Date().toISOString()
        });
      }

      // Determine overall status
      status.status = this.calculateOverallStatus(status.issues);

    } catch (error) {
      status.issues.push({
        type: 'connection_timeout',
        severity: 'critical',
        message: error instanceof Error ? error.message : 'Unknown error during health check',
        detectedAt: new Date().toISOString()
      });
      status.status = 'error';
    }

    // Store in history
    this.addToHistory(countryCode, status);

    return status;
  }

  /**
   * Checks basic connectivity and SSL validity
   */
  private async checkConnectivity(url: string): Promise<{
    canConnect: boolean;
    sslValid: boolean;
    httpStatus?: number;
  }> {
    try {
      // In React Native environment, we use fetch for basic connectivity
      // This is a read-only HEAD request that doesn't submit any data
      const response = await Promise.race([
        fetch(url, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Mobile; rv:109.0) Gecko/111.0 Firefox/111.0'
          }
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), this.config.timeoutMs)
        )
      ]);

      return {
        canConnect: true,
        sslValid: url.startsWith('https://'), // Basic SSL check
        httpStatus: response.status
      };
    } catch {
      return {
        canConnect: false,
        sslValid: false,
      };
    }
  }

  /**
   * Validates basic portal structure without submitting data
   */
  private async validateBasicStructure(_countryCode: string, url: string): Promise<boolean> {
    try {
      // This is a defensive read-only check
      // We only check if the portal responds and has basic HTML structure
      const response = await Promise.race([
        fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Mobile; rv:109.0) Gecko/111.0 Firefox/111.0'
          }
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), this.config.timeoutMs)
        )
      ]);

      if (!response.ok) {
        return false;
      }

      // Basic HTML structure check - just verify we get HTML content
      const contentType = response.headers.get('content-type');
      return contentType?.includes('text/html') || false;

    } catch {
      return false;
    }
  }

  /**
   * Calculates overall status based on detected issues
   */
  private calculateOverallStatus(issues: PortalHealthIssue[]): 'healthy' | 'degraded' | 'offline' | 'error' {
    if (issues.length === 0) {
      return 'healthy';
    }

    const hasCritical = issues.some(issue => issue.severity === 'critical');
    const hasError = issues.some(issue => issue.severity === 'error');

    if (hasCritical) {
      return 'offline';
    }

    if (hasError) {
      return 'error';
    }

    return 'degraded';
  }

  /**
   * Adds health status to history for trending analysis
   */
  private addToHistory(countryCode: string, status: PortalHealthStatus): void {
    if (!this.healthHistory.has(countryCode)) {
      this.healthHistory.set(countryCode, []);
    }

    const history = this.healthHistory.get(countryCode)!;
    history.push(status);

    // Keep only last 100 entries
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Gets health history for a specific country
   */
  getHealthHistory(countryCode: string): PortalHealthStatus[] {
    return this.healthHistory.get(countryCode) || [];
  }

  /**
   * Gets the latest health status for a country
   */
  getLatestHealthStatus(countryCode: string): PortalHealthStatus | null {
    const history = this.getHealthHistory(countryCode);
    return history.length > 0 ? history[history.length - 1] : null;
  }

  /**
   * Checks if a portal has been consistently healthy
   */
  isPortalConsistentlyHealthy(countryCode: string, lookbackHours: number = 24): boolean {
    const history = this.getHealthHistory(countryCode);
    const cutoff = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

    const recentChecks = history.filter(status => 
      new Date(status.lastChecked) > cutoff
    );

    if (recentChecks.length === 0) {
      return false; // No recent data
    }

    return recentChecks.every(status => status.status === 'healthy');
  }

  /**
   * Gets portal health summary across all monitored countries
   */
  getHealthSummary(): {
    totalPortals: number;
    healthy: number;
    degraded: number;
    offline: number;
    error: number;
  } {
    const allCountries = Array.from(this.healthHistory.keys());
    const latestStatuses = allCountries
      .map(code => this.getLatestHealthStatus(code))
      .filter(status => status !== null) as PortalHealthStatus[];

    return {
      totalPortals: latestStatuses.length,
      healthy: latestStatuses.filter(s => s.status === 'healthy').length,
      degraded: latestStatuses.filter(s => s.status === 'degraded').length,
      offline: latestStatuses.filter(s => s.status === 'offline').length,
      error: latestStatuses.filter(s => s.status === 'error').length,
    };
  }

  /**
   * Clears health history for testing purposes
   */
  clearHistory(): void {
    this.healthHistory.clear();
  }
}

/**
 * Default instance for app-wide use
 */
export const portalHealthChecker = new PortalHealthChecker();