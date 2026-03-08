import { Platform } from 'react-native';
import { mmkvService } from '@/services/storage';
import { useAppStore } from '@/stores/useAppStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { useTripStore } from '@/stores/useTripStore';

export interface BugReportData {
  id: string;
  title: string;
  description: string;
  stepsToReproduce?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'general' | 'passport-scan' | 'form-generation' | 'country-portals' | 'qr-wallet' | 'data-storage' | 'performance' | 'ui-ux';
  timestamp: string;
  diagnostics?: DiagnosticInfo;
}

export interface DiagnosticInfo {
  timestamp: string;
  platform: string;
  platformVersion: string | number;
  appVersion: string;
  language: string;
  theme: string;
  biometricEnabled: boolean;
  analyticsEnabled: boolean;
  deviceInfo: {
    hasProfile: boolean;
    tripsCount: number;
    lastActivity: string;
  };
  memory: {
    estimated: string;
  };
  features: {
    cameraAvailable: boolean;
    biometricsAvailable: boolean;
    keychainAvailable: boolean;
  };
  errorLogs?: string[];
}

export interface BugReportSubmissionResult {
  success: boolean;
  reportId?: string;
  error?: string;
}

class BugReporter {
  private readonly BUG_REPORTS_STORAGE_KEY = 'stored_bug_reports';
  private readonly ERROR_LOGS_STORAGE_KEY = 'error_logs';
  private readonly MAX_STORED_REPORTS = 25; // Keep last 25 bug reports locally
  private readonly MAX_ERROR_LOGS = 100; // Keep last 100 error log entries

  /**
   * Submit a bug report
   */
  async submitBugReport(
    reportData: Omit<BugReportData, 'id' | 'timestamp' | 'diagnostics'>,
    includeDiagnostics: boolean = true
  ): Promise<BugReportSubmissionResult> {
    try {
      const diagnostics = includeDiagnostics ? await this.collectDiagnosticInfo() : undefined;
      const bugReport: BugReportData = {
        ...reportData,
        id: this.generateReportId(),
        timestamp: new Date().toISOString(),
        ...(diagnostics !== undefined ? { diagnostics } : {}),
      };

      // Validate bug report data
      if (!this.validateBugReport(bugReport)) {
        return {
          success: false,
          error: 'Invalid bug report data',
        };
      }

      // Store locally
      await this.storeBugReportLocally(bugReport);

      // In a real implementation, you would also send to a remote service here
      // await this.sendToServer(bugReport);

      return {
        success: true,
        reportId: bugReport.id,
      };
    } catch (error) {
      console.error('Failed to submit bug report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Log an error for potential inclusion in bug reports
   */
  async logError(error: Error, context?: string): Promise<void> {
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
        name: error.name,
        context: context || 'unknown',
      };

      const logs = await this.getErrorLogs();
      logs.push(errorLog);

      // Keep only recent logs
      while (logs.length > this.MAX_ERROR_LOGS) {
        logs.shift();
      }

      mmkvService.setString(this.ERROR_LOGS_STORAGE_KEY, JSON.stringify(logs));
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }

  /**
   * Get stored bug reports
   */
  async getStoredBugReports(): Promise<BugReportData[]> {
    try {
      const stored = mmkvService.getString(this.BUG_REPORTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get stored bug reports:', error);
      return [];
    }
  }

  /**
   * Get error logs
   */
  async getErrorLogs(): Promise<any[]> {
    try {
      const stored = mmkvService.getString(this.ERROR_LOGS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get error logs:', error);
      return [];
    }
  }

  /**
   * Get bug report statistics
   */
  async getBugReportStats(): Promise<{
    totalCount: number;
    severityDistribution: Record<string, number>;
    categoryDistribution: Record<string, number>;
    recentReportsCount: number; // Last 30 days
    criticalReportsCount: number;
  }> {
    try {
      const reports = await this.getStoredBugReports();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const stats = {
        totalCount: reports.length,
        severityDistribution: {} as Record<string, number>,
        categoryDistribution: {} as Record<string, number>,
        recentReportsCount: reports.filter(r => r.timestamp >= thirtyDaysAgo).length,
        criticalReportsCount: reports.filter(r => r.severity === 'critical').length,
      };

      // Calculate severity distribution
      reports.forEach(r => {
        stats.severityDistribution[r.severity] = (stats.severityDistribution[r.severity] || 0) + 1;
      });

      // Calculate category distribution
      reports.forEach(r => {
        stats.categoryDistribution[r.category] = (stats.categoryDistribution[r.category] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Failed to get bug report stats:', error);
      return {
        totalCount: 0,
        severityDistribution: {},
        categoryDistribution: {},
        recentReportsCount: 0,
        criticalReportsCount: 0,
      };
    }
  }

  /**
   * Clear old bug reports (privacy compliance)
   */
  async clearOldBugReports(olderThanDays: number = 90): Promise<void> {
    try {
      const reports = await this.getStoredBugReports();
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
      
      const recentReports = reports.filter(r => r.timestamp >= cutoffDate);
      
      if (recentReports.length < reports.length) {
        await this.saveStoredBugReports(recentReports);
        console.log(`Cleared ${reports.length - recentReports.length} old bug reports`);
      }

      // Also clear old error logs
      await this.clearOldErrorLogs(olderThanDays);
    } catch (error) {
      console.error('Failed to clear old bug reports:', error);
    }
  }

  /**
   * Export bug reports for user (privacy compliance)
   */
  async exportBugReports(): Promise<string> {
    try {
      const reports = await this.getStoredBugReports();
      const errorLogs = await this.getErrorLogs();
      
      const exportData = {
        exported_at: new Date().toISOString(),
        total_reports_count: reports.length,
        total_error_logs_count: errorLogs.length,
        bug_reports: reports,
        error_logs: errorLogs.slice(-50), // Only include last 50 error logs
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Failed to export bug reports:', error);
      throw error;
    }
  }

  /**
   * Collect diagnostic information
   */
  private async collectDiagnosticInfo(): Promise<DiagnosticInfo> {
    try {
      // Get state from stores - using getState to avoid hooks outside components
      const appState = useAppStore.getState();
      const profileState = useProfileStore.getState();
      const tripState = useTripStore.getState();
      
      const recentErrorLogs = await this.getErrorLogs();
      
      return {
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
        platformVersion: Platform.Version,
        appVersion: '1.0.0', // This would come from app config
        language: appState.preferences.language,
        theme: appState.preferences.theme,
        biometricEnabled: appState.preferences.biometricEnabled,
        analyticsEnabled: appState.preferences.analyticsEnabled,
        deviceInfo: {
          hasProfile: !!profileState.profile,
          tripsCount: tripState.trips.length,
          lastActivity: new Date().toISOString(),
        },
        memory: {
          estimated: '< 100MB', // In a real app, you'd get actual memory usage
        },
        features: {
          cameraAvailable: true, // Would check actual camera availability
          biometricsAvailable: appState.isBiometricAvailable,
          keychainAvailable: true, // Would check keychain availability
        },
        errorLogs: recentErrorLogs.slice(-10).map(log => `${log.timestamp}: ${log.message}`),
      };
    } catch (error) {
      console.error('Failed to collect diagnostic info:', error);
      return {
        timestamp: new Date().toISOString(),
        platform: 'unknown',
        platformVersion: 'unknown',
        appVersion: '1.0.0',
        language: 'en',
        theme: 'auto',
        biometricEnabled: false,
        analyticsEnabled: false,
        deviceInfo: {
          hasProfile: false,
          tripsCount: 0,
          lastActivity: new Date().toISOString(),
        },
        memory: {
          estimated: 'unknown',
        },
        features: {
          cameraAvailable: false,
          biometricsAvailable: false,
          keychainAvailable: false,
        },
      };
    }
  }

  private generateReportId(): string {
    return `bug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private validateBugReport(report: BugReportData): boolean {
    // Basic validation
    if (!report.title || report.title.trim().length === 0) {
      return false;
    }
    
    if (!report.description || report.description.trim().length === 0) {
      return false;
    }
    
    if (!['low', 'medium', 'high', 'critical'].includes(report.severity)) {
      return false;
    }

    if (!['general', 'passport-scan', 'form-generation', 'country-portals', 'qr-wallet', 'data-storage', 'performance', 'ui-ux'].includes(report.category)) {
      return false;
    }

    if (report.title.length > 100) {
      return false;
    }

    if (report.description.length > 1000) {
      return false;
    }

    if (report.stepsToReproduce && report.stepsToReproduce.length > 500) {
      return false;
    }

    return true;
  }

  private async storeBugReportLocally(report: BugReportData): Promise<void> {
    try {
      const stored = await this.getStoredBugReports();
      stored.push(report);

      // Keep only the most recent reports
      while (stored.length > this.MAX_STORED_REPORTS) {
        stored.shift(); // Remove oldest
      }

      await this.saveStoredBugReports(stored);
    } catch (error) {
      console.error('Failed to store bug report locally:', error);
      throw error;
    }
  }

  private async saveStoredBugReports(reports: BugReportData[]): Promise<void> {
    try {
      mmkvService.setString(this.BUG_REPORTS_STORAGE_KEY, JSON.stringify(reports));
    } catch (error) {
      console.error('Failed to save bug reports:', error);
      throw error;
    }
  }

  private async clearOldErrorLogs(olderThanDays: number): Promise<void> {
    try {
      const logs = await this.getErrorLogs();
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
      
      const recentLogs = logs.filter((log: any) => log.timestamp >= cutoffDate);
      
      if (recentLogs.length < logs.length) {
        mmkvService.setString(this.ERROR_LOGS_STORAGE_KEY, JSON.stringify(recentLogs));
        console.log(`Cleared ${logs.length - recentLogs.length} old error logs`);
      }
    } catch (error) {
      console.error('Failed to clear old error logs:', error);
    }
  }

  // Future: Send bug report to remote service
  // private async sendToServer(report: BugReportData): Promise<void> {
  //   // This would be implemented when a backend service is available
  //   // For MVP, we only store locally
  //   console.log('Would send bug report to server:', {
  //     id: report.id,
  //     severity: report.severity,
  //     category: report.category
  //   });
  // }
}

export const bugReporter = new BugReporter();