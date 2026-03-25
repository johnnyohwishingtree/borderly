/**
 * User Flow Analytics
 *
 * Privacy-compliant analytics system for tracking user behavior patterns,
 * identifying friction points, and optimizing user experience.
 */

import { MMKV } from 'react-native-mmkv';
import { sanitizePII } from '../../utils/piiSanitizer';
import { PREDEFINED_FLOWS } from './userFlowAnalyticsTypes';
import type {
  UserAction,
  UserSession,
  UserFlow,
  FlowAnalytics,
  UserBehaviorPattern,
  OptimizationInsight,
} from './userFlowAnalyticsTypes';
import {
  calculateDropoffPoints,
  calculateFrictionPoints,
  calculateConversionFunnel,
} from './flowCalculations';

// Re-export all types and constants so existing imports don't break
export type {
  UserAction,
  UserSession,
  FlowStep,
  UserFlow,
  FlowAnalytics,
  UserBehaviorPattern,
  OptimizationInsight,
} from './userFlowAnalyticsTypes';
export { PREDEFINED_FLOWS } from './userFlowAnalyticsTypes';

class UserFlowAnalytics {
  private storage: MMKV;
  private currentSession: UserSession | null = null;
  private flows: UserFlow[] = PREDEFINED_FLOWS;
  private actionBuffer: UserAction[] = [];

  constructor() {
    this.storage = new MMKV({
      id: 'user-flow-analytics',
    });

    this.startNewSession();
    this.startPeriodicFlush();
  }

  /** Start a new user session */
  startNewSession(): void {
    if (this.currentSession) {
      this.endCurrentSession();
    }

    this.currentSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startTime: Date.now(),
      actions: [],
      completed: false,
    };
  }

  /** End the current session */
  endCurrentSession(): void {
    if (!this.currentSession) return;

    this.currentSession.endTime = Date.now();
    this.storeSession(this.currentSession);
    this.currentSession = null;
  }

  /** Track a user action */
  trackAction(
    screen: string,
    action: string,
    duration?: number,
    metadata?: Record<string, any>,
  ): void {
    if (!this.currentSession) {
      this.startNewSession();
    }

    const userAction: UserAction = {
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      screen,
      action,
      ...(duration !== undefined && { duration }),
      ...(metadata !== undefined && { metadata: sanitizePII(metadata) }),
    };

    this.currentSession!.actions.push(userAction);
    this.actionBuffer.push(userAction);

    // Check if this completes any flows
    this.checkFlowCompletion();
  }

  /** Track screen visit */
  trackScreenVisit(screen: string, duration?: number): void {
    this.trackAction(screen, 'visit', duration);
  }

  /** Track screen transition */
  trackScreenTransition(fromScreen: string, toScreen: string, duration?: number): void {
    this.trackAction(fromScreen, 'navigate_to', duration, { destination: toScreen });
  }

  /** Track user abandonment */
  trackAbandonment(screen: string, reason?: string): void {
    if (!this.currentSession) return;

    this.currentSession.abandonedAt = screen;
    this.trackAction(screen, 'abandon', undefined, { reason });
    this.endCurrentSession();
  }

  /** Get analytics for a specific flow */
  getFlowAnalytics(flowId: string): FlowAnalytics | null {
    const flow = this.flows.find(f => f.id === flowId);
    if (!flow) return null;

    const sessions = this.getFlowSessions(flowId);
    if (sessions.length === 0) {
      return {
        flowId,
        totalSessions: 0,
        completionRate: 0,
        averageDuration: 0,
        dropoffPoints: [],
        frictionPoints: [],
        conversionFunnel: [],
      };
    }

    const completedSessions = sessions.filter(s => s.completed);
    const completionRate = completedSessions.length / sessions.length;

    const durations = completedSessions
      .map(s => s.endTime! - s.startTime)
      .filter(d => d > 0);
    const averageDuration =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    return {
      flowId,
      totalSessions: sessions.length,
      completionRate,
      averageDuration,
      dropoffPoints: calculateDropoffPoints(flow, sessions),
      frictionPoints: calculateFrictionPoints(flow, sessions),
      conversionFunnel: calculateConversionFunnel(flow, sessions),
    };
  }

  /** Get all flow analytics */
  getAllFlowAnalytics(): FlowAnalytics[] {
    return this.flows
      .map(flow => this.getFlowAnalytics(flow.id))
      .filter(Boolean) as FlowAnalytics[];
  }

  /** Detect user behavior patterns */
  detectBehaviorPatterns(): UserBehaviorPattern[] {
    const sessions = this.getAllStoredSessions();
    const patterns: UserBehaviorPattern[] = [];

    if (sessions.length === 0 && this.actionBuffer.length === 0) {
      return patterns;
    }

    // Pattern 1: Frequent abandonment at specific screens
    const abandonmentCounts: Record<string, number> = {};
    sessions.forEach(session => {
      if (session.abandonedAt) {
        abandonmentCounts[session.abandonedAt] =
          (abandonmentCounts[session.abandonedAt] || 0) + 1;
      }
    });

    Object.entries(abandonmentCounts).forEach(([screen, count]) => {
      const frequency = sessions.length > 0 ? count / sessions.length : 0;
      if (count > sessions.length * 0.1) {
        patterns.push({
          id: `abandonment-${screen}`,
          pattern: `High abandonment rate at ${screen}`,
          frequency,
          impact: 'negative',
          recommendations: [
            `Investigate UX issues on ${screen} screen`,
            'Consider simplifying the user interface',
            'Add help text or onboarding tooltips',
            'Test alternative flows to this screen',
          ],
        });
      }
    });

    // Pattern 2: Successful completion patterns
    const successfulFlows = sessions.filter(s => s.completed);
    if (successfulFlows.length > 0) {
      patterns.push({
        id: 'successful-completion',
        pattern: 'Users who complete onboarding tend to create trips immediately',
        frequency: sessions.length > 0 ? successfulFlows.length / sessions.length : 0,
        impact: 'positive',
        recommendations: [
          'Promote trip creation after successful onboarding',
          'Consider auto-suggesting popular destinations',
          'Streamline the trip creation flow',
        ],
      });
    }

    // Pattern 3: Device-specific patterns
    const mobileActions = this.actionBuffer.filter(
      a => a.metadata?.platform === 'ios' || a.metadata?.platform === 'android',
    );

    if (this.actionBuffer.length > 0 && mobileActions.length > this.actionBuffer.length * 0.8) {
      patterns.push({
        id: 'mobile-dominant',
        pattern: 'Majority of users access the app on mobile devices',
        frequency: mobileActions.length / this.actionBuffer.length,
        impact: 'neutral',
        recommendations: [
          'Prioritize mobile-first design decisions',
          'Optimize for smaller screen sizes',
          'Consider mobile-specific features like biometric authentication',
        ],
      });
    }

    return patterns;
  }

  /** Generate optimization insights */
  generateOptimizationInsights(): OptimizationInsight[] {
    const analytics = this.getAllFlowAnalytics();
    const patterns = this.detectBehaviorPatterns();
    const insights: OptimizationInsight[] = [];

    analytics.forEach(flowAnalytics => {
      flowAnalytics.frictionPoints.forEach(friction => {
        if (friction.averageTime > 30000 || friction.retryRate > 0.2) {
          insights.push({
            id: `friction-${flowAnalytics.flowId}-${friction.step}`,
            type: 'friction_point',
            priority: friction.averageTime > 60000 ? 'high' : 'medium',
            title: `High friction at ${friction.step}`,
            description: `Users are spending ${Math.round(friction.averageTime / 1000)}s on ${friction.step} with ${Math.round(friction.retryRate * 100)}% retry rate`,
            affectedFlow: flowAnalytics.flowId,
            affectedUsers: Math.round(flowAnalytics.totalSessions * friction.retryRate),
            potentialImpact: 'Reducing friction could improve completion rates by 10-20%',
            actionItems: [
              'Analyze user behavior recordings for this step',
              'Simplify the UI/UX for this action',
              'Add progressive disclosure to reduce cognitive load',
              'Provide better error messages and guidance',
            ],
          });
        }
      });

      if (flowAnalytics.completionRate < 0.7) {
        insights.push({
          id: `conversion-${flowAnalytics.flowId}`,
          type: 'conversion_opportunity',
          priority: 'high',
          title: `Low completion rate for ${flowAnalytics.flowId}`,
          description: `Only ${Math.round(flowAnalytics.completionRate * 100)}% of users complete this flow`,
          affectedFlow: flowAnalytics.flowId,
          affectedUsers: Math.round(
            flowAnalytics.totalSessions * (1 - flowAnalytics.completionRate),
          ),
          potentialImpact: 'Improving completion rate could increase user engagement significantly',
          actionItems: [
            'Identify the main dropoff points',
            'A/B test alternative flow designs',
            'Add progress indicators to show completion status',
            'Implement save/resume functionality for longer flows',
          ],
        });
      }
    });

    patterns.forEach(pattern => {
      if (pattern.impact === 'negative') {
        insights.push({
          id: pattern.id,
          type: 'behavior_pattern',
          priority: 'medium',
          title: `Behavioral pattern: ${pattern.pattern}`,
          description: `Pattern detected in ${Math.round(pattern.frequency * 100)}% of sessions`,
          affectedFlow: 'general',
          affectedUsers: 0,
          potentialImpact: 'Addressing this pattern could improve user experience',
          actionItems: pattern.recommendations,
        });
      }
    });

    const performanceIssues = analytics.filter(a => a.averageDuration > 300000);
    performanceIssues.forEach(issue => {
      insights.push({
        id: `performance-${issue.flowId}`,
        type: 'performance_issue',
        priority: 'medium',
        title: `Slow completion time for ${issue.flowId}`,
        description: `Users take an average of ${Math.round(issue.averageDuration / 60000)} minutes to complete this flow`,
        affectedFlow: issue.flowId,
        affectedUsers: issue.totalSessions,
        potentialImpact: 'Faster flows lead to better user satisfaction and retention',
        actionItems: [
          'Optimize form rendering performance',
          'Implement smart auto-fill to reduce manual input',
          'Add keyboard shortcuts and quick actions',
          'Pre-load data and cache frequently accessed information',
        ],
      });
    });

    return insights.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    });
  }

  /** Get conversion funnel data */
  getConversionFunnel(
    flowId: string,
  ): Array<{ step: string; users: number; conversionRate: number; dropoff: number }> | null {
    const analytics = this.getFlowAnalytics(flowId);
    if (!analytics) return null;

    return analytics.conversionFunnel.map((step, index) => {
      const nextStep = analytics.conversionFunnel[index + 1];
      const dropoff = nextStep ? step.userCount - nextStep.userCount : 0;
      return {
        step: step.step,
        users: step.userCount,
        conversionRate: step.conversionRate,
        dropoff,
      };
    });
  }

  /** Export analytics data for reporting */
  exportAnalyticsData(): {
    flows: FlowAnalytics[];
    patterns: UserBehaviorPattern[];
    insights: OptimizationInsight[];
    summary: {
      totalSessions: number;
      averageSessionDuration: number;
      overallCompletionRate: number;
    };
  } {
    const flows = this.getAllFlowAnalytics();
    const patterns = this.detectBehaviorPatterns();
    const insights = this.generateOptimizationInsights();

    const allSessions = this.getAllStoredSessions();
    const completedSessions = allSessions.filter(s => s.completed);

    const sessionDurations = allSessions
      .filter(s => s.endTime)
      .map(s => s.endTime! - s.startTime);

    const averageSessionDuration =
      sessionDurations.length > 0
        ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
        : 0;

    return {
      flows,
      patterns,
      insights,
      summary: {
        totalSessions: allSessions.length,
        averageSessionDuration,
        overallCompletionRate:
          allSessions.length > 0 ? completedSessions.length / allSessions.length : 0,
      },
    };
  }

  // Private methods

  private storeSession(session: UserSession): void {
    const sessionsKey = `sessions-${new Date(session.startTime).toISOString().split('T')[0]}`;
    const existingSessions = this.storage.getString(sessionsKey);
    const sessions = existingSessions ? JSON.parse(existingSessions) : [];

    sessions.push(sanitizePII(session));
    this.storage.set(sessionsKey, JSON.stringify(sessions));
  }

  private getAllStoredSessions(): UserSession[] {
    const sessions: UserSession[] = [];
    const allKeys = this.storage.getAllKeys();

    allKeys.forEach(key => {
      if (key.startsWith('sessions-')) {
        const daySessions = this.storage.getString(key);
        if (daySessions) {
          sessions.push(...JSON.parse(daySessions));
        }
      }
    });

    return sessions;
  }

  private getFlowSessions(flowId: string): UserSession[] {
    const allSessions = this.getAllStoredSessions();
    const flow = this.flows.find(f => f.id === flowId);

    if (!flow) return [];

    return allSessions.filter(session => {
      const flowScreens = flow.steps.map(step => step.screen);
      const sessionScreens = session.actions.map(action => action.screen);
      return flowScreens.some(screen => sessionScreens.includes(screen));
    });
  }

  private checkFlowCompletion(): void {
    if (!this.currentSession) return;

    this.flows.forEach(flow => {
      if (this.isFlowCompleted(flow, this.currentSession!)) {
        this.currentSession!.completed = true;
      }
    });
  }

  private isFlowCompleted(flow: UserFlow, session: UserSession): boolean {
    const requiredSteps = flow.steps.filter(step => !step.isOptional);

    return requiredSteps.every(step => {
      return session.actions.some(
        action => action.screen === step.screen && action.action === step.action,
      );
    });
  }

  private startPeriodicFlush(): void {
    setInterval(() => {
      this.flushActionBuffer();
    }, 300000);

    setInterval(() => {
      this.cleanupOldData();
    }, 86400000);
  }

  private flushActionBuffer(): void {
    this.actionBuffer = [];
  }

  private cleanupOldData(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const allKeys = this.storage.getAllKeys();
    allKeys.forEach(key => {
      if (key.startsWith('sessions-')) {
        const dateStr = key.replace('sessions-', '');
        const date = new Date(dateStr);
        if (date < cutoffDate) {
          this.storage.delete(key);
        }
      }
    });
  }
}

export const userFlowAnalytics = new UserFlowAnalytics();
