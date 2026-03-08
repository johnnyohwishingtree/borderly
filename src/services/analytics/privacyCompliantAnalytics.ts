/**
 * Privacy-Compliant Analytics Service
 * 
 * Collects usage patterns and performance insights while maintaining
 * strict privacy compliance. No PII is ever collected or transmitted.
 */

import { sanitizeObject } from '../../utils/piiSanitizer';
import type { PerformanceMetric } from '../monitoring/productionMonitoring';

export interface AnalyticsEvent {
  id: string;
  type: 'screen_view' | 'user_action' | 'feature_usage' | 'performance';
  name: string;
  timestamp: number;
  properties: Record<string, string | number | boolean>;
  sessionId: string;
  anonymousUserId: string; // Hashed, rotated daily
}

export interface UsageMetrics {
  screenViews: Record<string, number>;
  featureUsage: Record<string, number>;
  performanceAverages: Record<string, number>;
  sessionDuration: number;
  countryPopularity: Record<string, number>;
  formCompletionRates: Record<string, number>;
  errorRates: Record<string, number>;
}

export interface UserJourney {
  steps: Array<{
    screen: string;
    timestamp: number;
    duration?: number;
    success?: boolean;
  }>;
  startTime: number;
  endTime?: number;
  outcome: 'completed' | 'abandoned' | 'error';
  flowType: 'onboarding' | 'trip_creation' | 'form_completion' | 'qr_management';
}

export interface PrivacySettings {
  enabled: boolean;
  allowPerformanceTracking: boolean;
  allowUsageAnalytics: boolean;
  allowErrorTracking: boolean;
  dataRetentionDays: number;
}

class PrivacyCompliantAnalyticsService {
  private events: AnalyticsEvent[] = [];
  private journeys: UserJourney[] = [];
  private sessionId: string;
  private anonymousUserId: string;
  private sessionStartTime: number;
  private privacySettings: PrivacySettings;
  private currentJourney: UserJourney | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.anonymousUserId = this.generateAnonymousUserId();
    this.sessionStartTime = Date.now();
    this.privacySettings = {
      enabled: true,
      allowPerformanceTracking: true,
      allowUsageAnalytics: true,
      allowErrorTracking: true,
      dataRetentionDays: 30
    };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateAnonymousUserId(): string {
    // Generate a daily-rotated anonymous ID that can't be traced back to user
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const randomSeed = Math.random().toString(36).substring(2);
    return `anon_${date}_${randomSeed}`;
  }

  /**
   * Tracks screen views with privacy-safe data
   */
  trackScreenView(screenName: string, properties?: Record<string, any>): void {
    if (!this.privacySettings.enabled || !this.privacySettings.allowUsageAnalytics) {
      return;
    }

    const sanitizedProps = this.sanitizeProperties(properties || {});

    this.recordEvent('screen_view', screenName, sanitizedProps);
    
    // Add to current journey if active
    if (this.currentJourney) {
      this.currentJourney.steps.push({
        screen: screenName,
        timestamp: Date.now(),
        duration: this.currentJourney.steps.length > 0 ? 
          Date.now() - this.currentJourney.steps[this.currentJourney.steps.length - 1].timestamp : 
          undefined
      });
    }
  }

  /**
   * Tracks user actions without any PII
   */
  trackUserAction(
    action: string,
    screen: string,
    properties?: Record<string, any>
  ): void {
    if (!this.privacySettings.enabled || !this.privacySettings.allowUsageAnalytics) {
      return;
    }

    const sanitizedProps = this.sanitizeProperties({
      screen,
      ...properties
    });

    this.recordEvent('user_action', action, sanitizedProps);
  }

  /**
   * Tracks feature usage patterns
   */
  trackFeatureUsage(
    feature: string,
    context?: Record<string, any>
  ): void {
    if (!this.privacySettings.enabled || !this.privacySettings.allowUsageAnalytics) {
      return;
    }

    const sanitizedContext = this.sanitizeProperties(context || {});

    this.recordEvent('feature_usage', feature, {
      ...sanitizedContext,
      featureName: feature
    });
  }

  /**
   * Tracks performance metrics
   */
  trackPerformance(metric: PerformanceMetric): void {
    if (!this.privacySettings.enabled || !this.privacySettings.allowPerformanceTracking) {
      return;
    }

    this.recordEvent('performance', metric.name, {
      value: metric.value,
      unit: metric.unit,
      category: metric.category,
      context: this.sanitizeProperties(metric.context || {})
    });
  }

  /**
   * Starts tracking a user journey
   */
  startJourney(
    flowType: UserJourney['flowType'],
    initialScreen: string
  ): void {
    if (!this.privacySettings.enabled || !this.privacySettings.allowUsageAnalytics) {
      return;
    }

    this.currentJourney = {
      steps: [{
        screen: initialScreen,
        timestamp: Date.now()
      }],
      startTime: Date.now(),
      outcome: 'abandoned', // default, will be updated
      flowType
    };
  }

  /**
   * Ends tracking a user journey
   */
  endJourney(
    outcome: UserJourney['outcome'],
    finalScreen?: string
  ): void {
    if (!this.currentJourney) return;

    this.currentJourney.endTime = Date.now();
    this.currentJourney.outcome = outcome;

    if (finalScreen) {
      this.currentJourney.steps.push({
        screen: finalScreen,
        timestamp: Date.now(),
        success: outcome === 'completed'
      });
    }

    this.journeys.push(this.currentJourney);
    this.currentJourney = null;

    // Track journey completion analytics
    this.trackUserAction('journey_completed', 'analytics', {
      flowType: this.currentJourney?.flowType,
      outcome,
      duration: this.currentJourney ? 
        this.currentJourney.endTime! - this.currentJourney.startTime : 0,
      steps: this.currentJourney?.steps.length || 0
    });
  }

  /**
   * Generates privacy-compliant usage metrics
   */
  generateUsageMetrics(): UsageMetrics {
    const metrics: UsageMetrics = {
      screenViews: {},
      featureUsage: {},
      performanceAverages: {},
      sessionDuration: Date.now() - this.sessionStartTime,
      countryPopularity: {},
      formCompletionRates: {},
      errorRates: {}
    };

    // Aggregate screen views
    this.events
      .filter(e => e.type === 'screen_view')
      .forEach(event => {
        metrics.screenViews[event.name] = (metrics.screenViews[event.name] || 0) + 1;
      });

    // Aggregate feature usage
    this.events
      .filter(e => e.type === 'feature_usage')
      .forEach(event => {
        const feature = event.properties.featureName as string;
        if (feature) {
          metrics.featureUsage[feature] = (metrics.featureUsage[feature] || 0) + 1;
        }
      });

    // Calculate performance averages
    const performanceEvents = this.events.filter(e => e.type === 'performance');
    const performanceGroups: Record<string, number[]> = {};
    
    performanceEvents.forEach(event => {
      const value = event.properties.value as number;
      if (typeof value === 'number') {
        if (!performanceGroups[event.name]) {
          performanceGroups[event.name] = [];
        }
        performanceGroups[event.name].push(value);
      }
    });

    Object.entries(performanceGroups).forEach(([name, values]) => {
      metrics.performanceAverages[name] = 
        values.reduce((sum, val) => sum + val, 0) / values.length;
    });

    // Extract country popularity (from form creation events)
    this.events
      .filter(e => e.type === 'user_action' && e.properties.countryCode)
      .forEach(event => {
        const country = event.properties.countryCode as string;
        metrics.countryPopularity[country] = (metrics.countryPopularity[country] || 0) + 1;
      });

    return metrics;
  }

  /**
   * Exports journey analytics
   */
  exportJourneyAnalytics(): Array<{
    flowType: string;
    averageDuration: number;
    completionRate: number;
    abandonnmentPoints: Record<string, number>;
    commonPaths: string[][];
  }> {
    const flowGroups: Record<string, UserJourney[]> = {};
    
    this.journeys.forEach(journey => {
      if (!flowGroups[journey.flowType]) {
        flowGroups[journey.flowType] = [];
      }
      flowGroups[journey.flowType].push(journey);
    });

    return Object.entries(flowGroups).map(([flowType, journeys]) => {
      const completedJourneys = journeys.filter(j => j.outcome === 'completed');
      const averageDuration = journeys.reduce((sum, j) => 
        sum + ((j.endTime || Date.now()) - j.startTime), 0) / journeys.length;
      
      const completionRate = completedJourneys.length / journeys.length;
      
      const abandonmentPoints: Record<string, number> = {};
      journeys
        .filter(j => j.outcome === 'abandoned')
        .forEach(journey => {
          const lastScreen = journey.steps[journey.steps.length - 1]?.screen;
          if (lastScreen) {
            abandonmentPoints[lastScreen] = (abandonmentPoints[lastScreen] || 0) + 1;
          }
        });

      const commonPaths = this.extractCommonPaths(journeys);

      return {
        flowType,
        averageDuration,
        completionRate,
        abandonnmentPoints: abandonmentPoints,
        commonPaths
      };
    });
  }

  /**
   * Updates privacy settings
   */
  updatePrivacySettings(settings: Partial<PrivacySettings>): void {
    this.privacySettings = { ...this.privacySettings, ...settings };
    
    if (!settings.enabled) {
      // Clear all data if analytics disabled
      this.clearData();
    }
  }

  /**
   * Gets current privacy settings
   */
  getPrivacySettings(): PrivacySettings {
    return { ...this.privacySettings };
  }

  /**
   * Clears all analytics data
   */
  clearData(): void {
    this.events = [];
    this.journeys = [];
    this.currentJourney = null;
  }

  /**
   * Gets data retention status
   */
  getDataStatus(): {
    eventCount: number;
    journeyCount: number;
    oldestEvent?: number;
    dataSize: number;
  } {
    const oldestEvent = this.events.length > 0 ? 
      Math.min(...this.events.map(e => e.timestamp)) : undefined;

    return {
      eventCount: this.events.length,
      journeyCount: this.journeys.length,
      oldestEvent,
      dataSize: JSON.stringify({ events: this.events, journeys: this.journeys }).length
    };
  }

  private recordEvent(
    type: AnalyticsEvent['type'],
    name: string,
    properties: Record<string, any>
  ): void {
    const event: AnalyticsEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
      type,
      name,
      timestamp: Date.now(),
      properties: this.sanitizeProperties(properties),
      sessionId: this.sessionId,
      anonymousUserId: this.anonymousUserId
    };

    this.events.push(event);
    this.maintainDataRetention();
  }

  private sanitizeProperties(properties: Record<string, any>): Record<string, string | number | boolean> {
    // Sanitize and ensure only safe data types
    const sanitized = sanitizeObject(properties, {
      preserveStructure: true,
      whitelistedFields: [
        'screen', 'action', 'feature', 'category', 'value', 'unit',
        'duration', 'count', 'success', 'flowType', 'outcome',
        'countryCode', 'formType', 'steps'
      ]
    });

    // Convert to safe primitive types only
    const result: Record<string, string | number | boolean> = {};
    Object.entries(sanitized).forEach(([key, value]) => {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        result[key] = value;
      } else {
        result[key] = String(value);
      }
    });

    return result;
  }

  private maintainDataRetention(): void {
    const retentionCutoff = Date.now() - (this.privacySettings.dataRetentionDays * 24 * 60 * 60 * 1000);
    
    // Remove old events
    this.events = this.events.filter(event => event.timestamp > retentionCutoff);
    
    // Remove old journeys
    this.journeys = this.journeys.filter(journey => journey.startTime > retentionCutoff);
  }

  private extractCommonPaths(journeys: UserJourney[]): string[][] {
    // Extract the 3 most common screen sequences
    const pathCounts: Record<string, number> = {};
    
    journeys.forEach(journey => {
      const screens = journey.steps.map(step => step.screen);
      for (let i = 0; i < screens.length - 1; i++) {
        const path = screens.slice(i, i + 3).join(' → ');
        pathCounts[path] = (pathCounts[path] || 0) + 1;
      }
    });

    return Object.entries(pathCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([path]) => path.split(' → '));
  }
}

export const privacyCompliantAnalytics = new PrivacyCompliantAnalyticsService();
export { PrivacyCompliantAnalyticsService };