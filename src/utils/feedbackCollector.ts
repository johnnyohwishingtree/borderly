import { Platform } from 'react-native';

export interface FeedbackEvent {
  eventName: string;
  timestamp: number;
  appVersion: string;
  buildNumber: string;
  platform: string;
  deviceModel: string;
  osVersion: string;
  properties?: Record<string, any> | undefined;
}

export interface BugReport {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'ui_ux' | 'performance' | 'data' | 'security' | 'other';
  title: string;
  description: string;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  deviceInfo: DeviceContext;
  timestamp: number;
  screenshot?: string; // Base64 encoded image
  lastActions?: string[]; // Last 10 user actions
}

export interface FeatureFeedback {
  id: string;
  feature: string;
  easeOfUse: number; // 1-5
  usefulness: number; // 1-5
  suggestions?: string;
  missingFunctionality?: string;
  timestamp: number;
}

export interface UserSatisfactionSurvey {
  id: string;
  overallSatisfaction: number; // 1-10
  easeOfUse: number; // 1-5
  featureDiscovery: number; // 1-5
  trustAndSecurity: number; // 1-5
  netPromoterScore: number; // 1-10
  additionalComments?: string;
  timestamp: number;
}

export interface DeviceContext {
  deviceModel: string;
  osVersion: string;
  appVersion: string;
  buildNumber: string;
  platform: string;
  availableMemory?: number;
  totalMemory?: number;
  batteryLevel?: number;
  networkType?: 'wifi' | 'cellular' | 'none';
}

export interface PerformanceMetrics {
  eventName: string;
  duration: number; // milliseconds
  success: boolean;
  errorCode?: string | undefined;
  context?: Record<string, any> | undefined;
  timestamp: number;
}

class FeedbackCollectorService {
  private isEnabled: boolean = true;
  private lastActions: string[] = [];
  private maxActionsHistory: number = 10;

  constructor() {
    this.initializeSession();
  }

  private initializeSession(): void {
    // Session initialization if needed
  }

  /**
   * Enable or disable feedback collection
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Track user actions for context in bug reports
   */
  trackUserAction(action: string): void {
    if (!this.isEnabled) return;

    this.lastActions.push(`${new Date().toISOString()}: ${action}`);
    
    if (this.lastActions.length > this.maxActionsHistory) {
      this.lastActions.shift();
    }
  }

  /**
   * Get current device context
   */
  private async getDeviceContext(): Promise<DeviceContext> {
    // Mock implementation for now - would use react-native-device-info in real app
    return {
      deviceModel: 'Unknown',
      osVersion: Platform.Version.toString(),
      appVersion: '1.0.0',
      buildNumber: '1',
      platform: Platform.OS,
      availableMemory: 0,
      totalMemory: 0,
      batteryLevel: 100
    };
  }

  /**
   * Track analytics events (privacy-safe)
   */
  async trackEvent(eventName: string, properties?: Record<string, any>): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const deviceContext = await this.getDeviceContext();
      
      const event: FeedbackEvent = {
        eventName,
        timestamp: Date.now(),
        appVersion: deviceContext.appVersion,
        buildNumber: deviceContext.buildNumber,
        platform: deviceContext.platform,
        deviceModel: deviceContext.deviceModel,
        osVersion: deviceContext.osVersion,
        properties: this.sanitizeProperties(properties) || undefined
      };

      // Store locally or send to analytics service
      await this.storeEvent(event);
      
    } catch (error) {
      console.warn('Failed to track event:', error);
    }
  }

  /**
   * Submit bug report
   */
  async submitBugReport(report: Omit<BugReport, 'id' | 'deviceInfo' | 'timestamp' | 'lastActions'>): Promise<string> {
    if (!this.isEnabled) {
      throw new Error('Feedback collection is disabled');
    }

    try {
      const deviceInfo = await this.getDeviceContext();
      const bugId = `bug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const fullReport: BugReport = {
        ...report,
        id: bugId,
        deviceInfo,
        timestamp: Date.now(),
        lastActions: [...this.lastActions]
      };

      await this.storeBugReport(fullReport);
      
      // Track bug report submission
      await this.trackEvent('bug_report_submitted', {
        severity: report.severity,
        category: report.category
      });

      return bugId;
    } catch (error) {
      console.error('Failed to submit bug report:', error);
      throw error;
    }
  }

  /**
   * Submit feature feedback
   */
  async submitFeatureFeedback(feedback: Omit<FeatureFeedback, 'id' | 'timestamp'>): Promise<string> {
    if (!this.isEnabled) {
      throw new Error('Feedback collection is disabled');
    }

    try {
      const feedbackId = `feature_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const fullFeedback: FeatureFeedback = {
        ...feedback,
        id: feedbackId,
        timestamp: Date.now()
      };

      await this.storeFeatureFeedback(fullFeedback);

      // Track feature feedback submission
      await this.trackEvent('feature_feedback_submitted', {
        feature: feedback.feature,
        easeOfUse: feedback.easeOfUse,
        usefulness: feedback.usefulness
      });

      return feedbackId;
    } catch (error) {
      console.error('Failed to submit feature feedback:', error);
      throw error;
    }
  }

  /**
   * Submit user satisfaction survey
   */
  async submitSatisfactionSurvey(survey: Omit<UserSatisfactionSurvey, 'id' | 'timestamp'>): Promise<string> {
    if (!this.isEnabled) {
      throw new Error('Feedback collection is disabled');
    }

    try {
      const surveyId = `survey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const fullSurvey: UserSatisfactionSurvey = {
        ...survey,
        id: surveyId,
        timestamp: Date.now()
      };

      await this.storeSatisfactionSurvey(fullSurvey);

      // Track survey submission
      await this.trackEvent('satisfaction_survey_submitted', {
        overallSatisfaction: survey.overallSatisfaction,
        netPromoterScore: survey.netPromoterScore
      });

      return surveyId;
    } catch (error) {
      console.error('Failed to submit satisfaction survey:', error);
      throw error;
    }
  }

  /**
   * Track performance metrics
   */
  async trackPerformance(metrics: Omit<PerformanceMetrics, 'timestamp'>): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const fullMetrics: PerformanceMetrics = {
        ...metrics,
        timestamp: Date.now()
      };

      await this.storePerformanceMetrics(fullMetrics);

      // Also track as analytics event
      await this.trackEvent('performance_metric', {
        eventName: metrics.eventName,
        duration: metrics.duration,
        success: metrics.success,
        errorCode: metrics.errorCode,
        context: metrics.context || undefined
      });
    } catch (error) {
      console.warn('Failed to track performance:', error);
    }
  }

  /**
   * Get stored feedback for export/sync
   */
  async exportFeedbackData(): Promise<{
    events: FeedbackEvent[];
    bugs: BugReport[];
    features: FeatureFeedback[];
    surveys: UserSatisfactionSurvey[];
    performance: PerformanceMetrics[];
  }> {
    // Implementation would load from local storage
    return {
      events: [],
      bugs: [],
      features: [],
      surveys: [],
      performance: []
    };
  }

  /**
   * Clear all stored feedback data
   */
  async clearFeedbackData(): Promise<void> {
    // Implementation would clear local storage
    this.lastActions = [];
    this.initializeSession();
  }

  /**
   * Sanitize properties to remove PII
   */
  private sanitizeProperties(properties?: Record<string, any>): Record<string, any> | undefined {
    if (!properties) return undefined;

    const sanitized: Record<string, any> = {};
    const piiFields = ['passport', 'name', 'email', 'phone', 'address', 'dob', 'ssn'];

    for (const [key, value] of Object.entries(properties)) {
      // Skip if key contains PII indicators
      if (piiFields.some(field => key.toLowerCase().includes(field))) {
        continue;
      }

      // Skip if value looks like PII
      if (typeof value === 'string') {
        // Skip if looks like email, phone, passport number
        if (value.includes('@') || /^\+?\d{10,}$/.test(value) || /^[A-Z0-9]{8,}$/.test(value)) {
          continue;
        }
      }

      sanitized[key] = value;
    }

    return sanitized;
  }

  /**
   * Store event locally (implement based on storage solution)
   */
  private async storeEvent(event: FeedbackEvent): Promise<void> {
    // Implementation would store in MMKV or AsyncStorage
    console.log('Storing event:', event.eventName);
  }

  /**
   * Store bug report locally
   */
  private async storeBugReport(report: BugReport): Promise<void> {
    // Implementation would store in MMKV or AsyncStorage
    console.log('Storing bug report:', report.id);
  }

  /**
   * Store feature feedback locally
   */
  private async storeFeatureFeedback(feedback: FeatureFeedback): Promise<void> {
    // Implementation would store in MMKV or AsyncStorage
    console.log('Storing feature feedback:', feedback.id);
  }

  /**
   * Store satisfaction survey locally
   */
  private async storeSatisfactionSurvey(survey: UserSatisfactionSurvey): Promise<void> {
    // Implementation would store in MMKV or AsyncStorage
    console.log('Storing satisfaction survey:', survey.id);
  }

  /**
   * Store performance metrics locally
   */
  private async storePerformanceMetrics(metrics: PerformanceMetrics): Promise<void> {
    // Implementation would store in MMKV or AsyncStorage
    console.log('Storing performance metrics:', metrics.eventName);
  }
}

// Export singleton instance
export const FeedbackCollector = new FeedbackCollectorService();

// Convenience functions for common tracking scenarios
export const trackAppLaunch = () => FeedbackCollector.trackEvent('app_launched');
export const trackOnboardingCompleted = () => FeedbackCollector.trackEvent('onboarding_completed');
export const trackPassportScanAttempted = () => FeedbackCollector.trackEvent('passport_scan_attempted');
export const trackPassportScanSuccessful = (duration: number) => 
  FeedbackCollector.trackEvent('passport_scan_successful', { duration });
export const trackPassportScanFailed = (errorCode: string) => 
  FeedbackCollector.trackEvent('passport_scan_failed', { errorCode });
export const trackTripCreated = (countryCount: number) => 
  FeedbackCollector.trackEvent('trip_created', { countryCount });
export const trackFormGenerated = (country: string, duration: number) => 
  FeedbackCollector.trackEvent('form_generated', { country, duration });
export const trackSubmissionGuideAccessed = (country: string) => 
  FeedbackCollector.trackEvent('submission_guide_accessed', { country });
export const trackQRCaptured = (source: 'camera' | 'import') => 
  FeedbackCollector.trackEvent('qr_captured', { source });

// Performance tracking helpers
export const trackPerformanceTimer = (eventName: string) => {
  const startTime = Date.now();
  
  return {
    finish: (success: boolean = true, errorCode?: string, context?: Record<string, any>) => {
      const duration = Date.now() - startTime;
      FeedbackCollector.trackPerformance({
        eventName,
        duration,
        success,
        errorCode,
        context: context || undefined
      });
    }
  };
};

// User action tracking for context
export const trackUserAction = (action: string) => FeedbackCollector.trackUserAction(action);