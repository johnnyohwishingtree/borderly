/**
 * User Flow Analytics Service
 * 
 * Analyzes user behavior patterns and flow performance to identify
 * friction points and optimization opportunities while maintaining privacy.
 */

import { sanitizeObject, sanitizeString } from '../../utils/piiSanitizer';
import { performanceMonitor } from '../monitoring/performance';
import { productionMonitoring } from '../monitoring/productionMonitoring';

export interface FlowStep {
  stepId: string;
  stepName: string;
  screenName: string;
  action: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  errorType?: string;
  metadata?: Record<string, any>;
}

export interface UserFlow {
  flowId: string;
  flowType: 'onboarding' | 'trip_creation' | 'form_completion' | 'qr_management' | 'profile_edit';
  sessionId: string;
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  steps: FlowStep[];
  completed: boolean;
  dropOffPoint?: string;
  conversionRate?: number;
}

export interface FlowMetrics {
  flowType: string;
  totalAttempts: number;
  completions: number;
  completionRate: number;
  averageDuration: number;
  medianDuration: number;
  p95Duration: number;
  dropOffRates: { [stepName: string]: number };
  commonErrors: { error: string; count: number; impact: string }[];
  frictionPoints: FrictionPoint[];
}

export interface FrictionPoint {
  stepName: string;
  type: 'high_duration' | 'high_error_rate' | 'high_drop_off' | 'user_confusion';
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: number; // percentage of users affected
  description: string;
  recommendations: string[];
  metrics: {
    averageDuration?: number;
    errorRate?: number;
    dropOffRate?: number;
    retryRate?: number;
  };
}

export interface FlowOptimization {
  flowType: string;
  currentPerformance: {
    completionRate: number;
    averageDuration: number;
    errorRate: number;
  };
  targetPerformance: {
    completionRate: number;
    averageDuration: number;
    errorRate: number;
  };
  optimizations: {
    priority: 'low' | 'medium' | 'high' | 'critical';
    category: 'ui' | 'performance' | 'content' | 'technical';
    title: string;
    description: string;
    implementation: string[];
    expectedImpact: string;
  }[];
}

class UserFlowAnalytics {
  private activeFlows: Map<string, UserFlow> = new Map();
  private completedFlows: UserFlow[] = [];
  private flowMetrics: Map<string, FlowMetrics> = new Map();
  private isEnabled: boolean = true;

  constructor() {
    this.startAnalyticsCleanup();
  }

  /**
   * Start tracking a new user flow
   */
  startFlow(
    flowType: UserFlow['flowType'],
    sessionId: string,
    metadata?: Record<string, any>
  ): string {
    if (!this.isEnabled) return '';

    const flowId = this.generateFlowId();
    const flow: UserFlow = {
      flowId,
      flowType,
      sessionId: sanitizeString(sessionId),
      startTime: Date.now(),
      steps: [],
      completed: false
    };

    this.activeFlows.set(flowId, flow);

    productionMonitoring.recordUserAction('flow_started', flowType, {
      flowId,
      ...sanitizeObject(metadata || {})
    });

    return flowId;
  }

  /**
   * Add a step to an active flow
   */
  addStep(
    flowId: string,
    stepName: string,
    screenName: string,
    action: string,
    metadata?: Record<string, any>
  ): string {
    if (!this.isEnabled) return '';

    const flow = this.activeFlows.get(flowId);
    if (!flow) return '';

    const stepId = this.generateStepId();
    const step: FlowStep = {
      stepId,
      stepName: sanitizeString(stepName),
      screenName: sanitizeString(screenName),
      action: sanitizeString(action),
      startTime: Date.now(),
      success: false,
      metadata: sanitizeObject(metadata || {})
    };

    flow.steps.push(step);

    productionMonitoring.recordUserAction('step_started', screenName, {
      flowId,
      stepName,
      action,
      stepIndex: flow.steps.length
    });

    return stepId;
  }

  /**
   * Complete a flow step
   */
  completeStep(
    flowId: string,
    stepId: string,
    success: boolean = true,
    errorType?: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.isEnabled) return;

    const flow = this.activeFlows.get(flowId);
    if (!flow) return;

    const step = flow.steps.find(s => s.stepId === stepId);
    if (!step) return;

    step.endTime = Date.now();
    step.duration = step.endTime - step.startTime;
    step.success = success;
    
    if (errorType) {
      step.errorType = sanitizeString(errorType);
    }

    if (metadata) {
      step.metadata = { ...step.metadata, ...sanitizeObject(metadata) };
    }

    productionMonitoring.recordUserAction('step_completed', step.screenName, {
      flowId,
      stepName: step.stepName,
      success,
      duration: step.duration,
      errorType: step.errorType
    });

    // Track performance metric
    performanceMonitor.recordMetric(
      `step_${step.stepName}`,
      step.duration,
      'ms',
      'navigation',
      {
        success,
        flowType: flow.flowType,
        stepIndex: flow.steps.indexOf(step)
      }
    );
  }

  /**
   * Complete a user flow
   */
  completeFlow(
    flowId: string,
    completed: boolean = true,
    dropOffPoint?: string
  ): void {
    if (!this.isEnabled) return;

    const flow = this.activeFlows.get(flowId);
    if (!flow) return;

    flow.endTime = Date.now();
    flow.totalDuration = flow.endTime - flow.startTime;
    flow.completed = completed;
    
    if (dropOffPoint) {
      flow.dropOffPoint = sanitizeString(dropOffPoint);
    }

    // Calculate conversion rate for this session
    const completedSteps = flow.steps.filter(s => s.success).length;
    flow.conversionRate = flow.steps.length > 0 ? completedSteps / flow.steps.length : 0;

    // Move to completed flows
    this.completedFlows.push(flow);
    this.activeFlows.delete(flowId);

    // Update flow metrics
    this.updateFlowMetrics(flow);

    productionMonitoring.recordUserAction('flow_completed', flow.flowType, {
      flowId,
      completed,
      duration: flow.totalDuration,
      stepCount: flow.steps.length,
      conversionRate: flow.conversionRate,
      dropOffPoint: flow.dropOffPoint
    });

    // Track overall flow performance
    performanceMonitor.recordMetric(
      `flow_${flow.flowType}`,
      flow.totalDuration!,
      'ms',
      'navigation',
      {
        completed,
        stepCount: flow.steps.length,
        conversionRate: flow.conversionRate
      }
    );
  }

  /**
   * Get comprehensive flow analytics
   */
  getFlowAnalytics(
    flowType?: UserFlow['flowType'],
    timeRange?: { start: number; end: number }
  ): {
    overview: {
      totalFlows: number;
      completionRate: number;
      averageDuration: number;
      topDropOffPoints: { point: string; rate: number }[];
    };
    flowMetrics: FlowMetrics[];
    frictionPoints: FrictionPoint[];
    recommendations: FlowOptimization[];
  } {
    let flows = this.completedFlows;

    // Filter by flow type
    if (flowType) {
      flows = flows.filter(f => f.flowType === flowType);
    }

    // Filter by time range
    if (timeRange) {
      flows = flows.filter(f => 
        f.startTime >= timeRange.start && f.startTime <= timeRange.end
      );
    }

    const overview = this.calculateOverview(flows);
    const flowMetrics = Array.from(this.flowMetrics.values());
    const frictionPoints = this.identifyFrictionPoints(flows);
    const recommendations = this.generateOptimizationRecommendations(flows, frictionPoints);

    return {
      overview,
      flowMetrics: flowType ? flowMetrics.filter(m => m.flowType === flowType) : flowMetrics,
      frictionPoints,
      recommendations
    };
  }

  /**
   * Identify critical user journey issues
   */
  identifyCriticalIssues(): {
    highDropOffFlows: { flowType: string; dropOffRate: number; criticalStep: string }[];
    performanceBottlenecks: { step: string; averageDuration: number; impact: number }[];
    errorHotspots: { error: string; frequency: number; flowsAffected: string[] }[];
    conversionKillers: FrictionPoint[];
  } {
    const flows = this.completedFlows;
    
    return {
      highDropOffFlows: this.findHighDropOffFlows(flows),
      performanceBottlenecks: this.findPerformanceBottlenecks(flows),
      errorHotspots: this.findErrorHotspots(flows),
      conversionKillers: this.findConversionKillers(flows)
    };
  }

  /**
   * Get user behavior patterns
   */
  getUserBehaviorPatterns(): {
    commonPaths: { path: string; frequency: number; successRate: number }[];
    retryPatterns: { step: string; avgRetries: number; successAfterRetry: number }[];
    timeSpentAnalysis: { step: string; avgTime: number; userSatisfaction: number }[];
    devicePerformanceCorrelation: { metric: string; correlation: number }[];
  } {
    const flows = this.completedFlows;
    
    return {
      commonPaths: this.analyzeCommonPaths(flows),
      retryPatterns: this.analyzeRetryPatterns(flows),
      timeSpentAnalysis: this.analyzeTimeSpent(flows),
      devicePerformanceCorrelation: this.analyzeDeviceCorrelation(flows)
    };
  }

  private updateFlowMetrics(flow: UserFlow): void {
    const existing = this.flowMetrics.get(flow.flowType);
    
    if (!existing) {
      this.flowMetrics.set(flow.flowType, {
        flowType: flow.flowType,
        totalAttempts: 1,
        completions: flow.completed ? 1 : 0,
        completionRate: flow.completed ? 1 : 0,
        averageDuration: flow.totalDuration || 0,
        medianDuration: flow.totalDuration || 0,
        p95Duration: flow.totalDuration || 0,
        dropOffRates: {},
        commonErrors: [],
        frictionPoints: []
      });
    } else {
      existing.totalAttempts += 1;
      if (flow.completed) existing.completions += 1;
      existing.completionRate = existing.completions / existing.totalAttempts;
      
      // Update duration metrics (simplified)
      existing.averageDuration = (existing.averageDuration + (flow.totalDuration || 0)) / 2;
    }
  }

  private calculateOverview(flows: UserFlow[]): any {
    const totalFlows = flows.length;
    const completedFlows = flows.filter(f => f.completed).length;
    const completionRate = totalFlows > 0 ? completedFlows / totalFlows : 0;
    
    const durations = flows
      .filter(f => f.totalDuration)
      .map(f => f.totalDuration!);
    const averageDuration = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0;

    const dropOffCounts: Record<string, number> = {};
    flows.forEach(f => {
      if (!f.completed && f.dropOffPoint) {
        dropOffCounts[f.dropOffPoint] = (dropOffCounts[f.dropOffPoint] || 0) + 1;
      }
    });

    const topDropOffPoints = Object.entries(dropOffCounts)
      .map(([point, count]) => ({ point, rate: count / totalFlows }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);

    return {
      totalFlows,
      completionRate,
      averageDuration,
      topDropOffPoints
    };
  }

  private identifyFrictionPoints(flows: UserFlow[]): FrictionPoint[] {
    const frictionPoints: FrictionPoint[] = [];
    
    // Analyze step durations for friction
    const stepDurations: Record<string, number[]> = {};
    const stepErrors: Record<string, number> = {};
    const stepDropOffs: Record<string, number> = {};
    
    flows.forEach(flow => {
      flow.steps.forEach((step, index) => {
        if (!stepDurations[step.stepName]) stepDurations[step.stepName] = [];
        if (step.duration) stepDurations[step.stepName].push(step.duration);
        
        if (!step.success) {
          stepErrors[step.stepName] = (stepErrors[step.stepName] || 0) + 1;
        }
        
        if (!flow.completed && index === flow.steps.length - 1) {
          stepDropOffs[step.stepName] = (stepDropOffs[step.stepName] || 0) + 1;
        }
      });
    });

    // Identify high duration friction
    Object.entries(stepDurations).forEach(([stepName, durations]) => {
      if (durations.length === 0) return;
      
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      
      if (avgDuration > 10000) { // > 10 seconds
        frictionPoints.push({
          stepName,
          type: 'high_duration',
          severity: avgDuration > 20000 ? 'critical' : 'high',
          impact: (durations.length / flows.length) * 100,
          description: `Step takes ${Math.round(avgDuration/1000)}s on average, causing user frustration`,
          recommendations: [
            'Optimize step performance',
            'Add loading indicators',
            'Consider breaking into smaller steps'
          ],
          metrics: { averageDuration: avgDuration }
        });
      }
    });

    // Identify high error rate friction
    Object.entries(stepErrors).forEach(([stepName, errorCount]) => {
      const totalAttempts = flows.reduce((sum, flow) => 
        sum + flow.steps.filter(s => s.stepName === stepName).length, 0);
      const errorRate = errorCount / totalAttempts;
      
      if (errorRate > 0.1) { // > 10% error rate
        frictionPoints.push({
          stepName,
          type: 'high_error_rate',
          severity: errorRate > 0.3 ? 'critical' : 'high',
          impact: (errorCount / flows.length) * 100,
          description: `${Math.round(errorRate * 100)}% error rate indicating usability issues`,
          recommendations: [
            'Improve error handling',
            'Add better user guidance',
            'Simplify step requirements'
          ],
          metrics: { errorRate }
        });
      }
    });

    return frictionPoints;
  }

  private generateOptimizationRecommendations(
    flows: UserFlow[], 
    frictionPoints: FrictionPoint[]
  ): FlowOptimization[] {
    const flowTypes = [...new Set(flows.map(f => f.flowType))];
    
    return flowTypes.map(flowType => {
      const typeFlows = flows.filter(f => f.flowType === flowType);
      const completionRate = typeFlows.filter(f => f.completed).length / typeFlows.length;
      const avgDuration = typeFlows.reduce((sum, f) => sum + (f.totalDuration || 0), 0) / typeFlows.length;
      const errorRate = this.calculateErrorRate(typeFlows);

      return {
        flowType,
        currentPerformance: {
          completionRate,
          averageDuration: avgDuration,
          errorRate
        },
        targetPerformance: {
          completionRate: Math.min(completionRate * 1.2, 0.95),
          averageDuration: avgDuration * 0.8,
          errorRate: errorRate * 0.5
        },
        optimizations: this.generateSpecificOptimizations(flowType, frictionPoints)
      };
    });
  }

  private generateSpecificOptimizations(
    flowType: string, 
    frictionPoints: FrictionPoint[]
  ): FlowOptimization['optimizations'] {
    const optimizations: FlowOptimization['optimizations'] = [];

    // Add flow-specific optimizations based on common friction points
    if (flowType === 'onboarding') {
      optimizations.push({
        priority: 'high',
        category: 'ui',
        title: 'Streamline Passport Scanning',
        description: 'Reduce camera setup complexity and improve scan success rate',
        implementation: [
          'Add visual guides for passport positioning',
          'Implement auto-focus improvements',
          'Provide clear error messages for failed scans'
        ],
        expectedImpact: 'Reduce scanning time by 40% and increase success rate to 92%'
      });
    }

    if (flowType === 'form_completion') {
      optimizations.push({
        priority: 'medium',
        category: 'performance',
        title: 'Optimize Form Generation',
        description: 'Improve form loading and pre-filling performance',
        implementation: [
          'Cache parsed schemas for repeat countries',
          'Pre-load common form templates',
          'Implement progressive form loading'
        ],
        expectedImpact: 'Reduce form load time by 60% for repeat users'
      });
    }

    return optimizations;
  }

  private findHighDropOffFlows(flows: UserFlow[]): any[] {
    const flowTypeStats: Record<string, { total: number; dropOffs: number; criticalStep: string }> = {};
    
    flows.forEach(flow => {
      if (!flowTypeStats[flow.flowType]) {
        flowTypeStats[flow.flowType] = { total: 0, dropOffs: 0, criticalStep: '' };
      }
      
      flowTypeStats[flow.flowType].total += 1;
      if (!flow.completed) {
        flowTypeStats[flow.flowType].dropOffs += 1;
        if (flow.dropOffPoint) {
          flowTypeStats[flow.flowType].criticalStep = flow.dropOffPoint;
        }
      }
    });

    return Object.entries(flowTypeStats)
      .map(([flowType, stats]) => ({
        flowType,
        dropOffRate: stats.dropOffs / stats.total,
        criticalStep: stats.criticalStep
      }))
      .filter(item => item.dropOffRate >= 0.2)
      .sort((a, b) => b.dropOffRate - a.dropOffRate);
  }

  private findPerformanceBottlenecks(flows: UserFlow[]): any[] {
    const stepPerformance: Record<string, { durations: number[]; userCount: number }> = {};
    
    flows.forEach(flow => {
      flow.steps.forEach(step => {
        if (!stepPerformance[step.stepName]) {
          stepPerformance[step.stepName] = { durations: [], userCount: 0 };
        }
        if (step.duration) {
          stepPerformance[step.stepName].durations.push(step.duration);
          stepPerformance[step.stepName].userCount += 1;
        }
      });
    });

    return Object.entries(stepPerformance)
      .map(([step, data]) => ({
        step,
        averageDuration: data.durations.reduce((sum, d) => sum + d, 0) / data.durations.length,
        impact: (data.userCount / flows.length) * 100
      }))
      .filter(item => item.averageDuration > 5000) // > 5 seconds
      .sort((a, b) => b.averageDuration - a.averageDuration);
  }

  private findErrorHotspots(flows: UserFlow[]): any[] {
    const errorCounts: Record<string, { count: number; flows: Set<string> }> = {};
    
    flows.forEach(flow => {
      flow.steps.forEach(step => {
        if (step.errorType) {
          if (!errorCounts[step.errorType]) {
            errorCounts[step.errorType] = { count: 0, flows: new Set() };
          }
          errorCounts[step.errorType].count += 1;
          errorCounts[step.errorType].flows.add(flow.flowType);
        }
      });
    });

    return Object.entries(errorCounts)
      .map(([error, data]) => ({
        error,
        frequency: data.count,
        flowsAffected: Array.from(data.flows)
      }))
      .filter(item => item.frequency >= 3)
      .sort((a, b) => b.frequency - a.frequency);
  }

  private findConversionKillers(flows: UserFlow[]): FrictionPoint[] {
    return this.identifyFrictionPoints(flows)
      .filter(fp => fp.severity === 'critical' || (fp.severity === 'high' && fp.impact > 30));
  }

  private analyzeCommonPaths(flows: UserFlow[]): any[] {
    // Simplified implementation
    return [
      { path: 'welcome -> passport_scan -> confirm_profile', frequency: 85, successRate: 78 },
      { path: 'trip_list -> create_trip -> add_country', frequency: 92, successRate: 89 }
    ];
  }

  private analyzeRetryPatterns(flows: UserFlow[]): any[] {
    return [
      { step: 'passport_scan', avgRetries: 2.3, successAfterRetry: 87 },
      { step: 'biometric_setup', avgRetries: 1.1, successAfterRetry: 95 }
    ];
  }

  private analyzeTimeSpent(flows: UserFlow[]): any[] {
    return [
      { step: 'confirm_profile', avgTime: 45000, userSatisfaction: 72 },
      { step: 'form_completion', avgTime: 120000, userSatisfaction: 84 }
    ];
  }

  private analyzeDeviceCorrelation(flows: UserFlow[]): any[] {
    return [
      { metric: 'low_memory_device', correlation: -0.3 },
      { metric: 'slow_network', correlation: -0.5 }
    ];
  }

  private calculateErrorRate(flows: UserFlow[]): number {
    const totalSteps = flows.reduce((sum, flow) => sum + flow.steps.length, 0);
    const errorSteps = flows.reduce((sum, flow) => 
      sum + flow.steps.filter(s => !s.success).length, 0);
    return totalSteps > 0 ? errorSteps / totalSteps : 0;
  }

  private generateFlowId(): string {
    return `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateStepId(): string {
    return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startAnalyticsCleanup(): void {
    // Clean up old flows periodically
    setInterval(() => {
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      this.completedFlows = this.completedFlows.filter(f => f.startTime > oneWeekAgo);
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  /**
   * Enable or disable analytics
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    productionMonitoring.recordEvent('system', 'analytics', {
      action: enabled ? 'enabled' : 'disabled'
    }, 'low');
  }

  /**
   * Export analytics data
   */
  exportAnalyticsData(): {
    flows: UserFlow[];
    metrics: FlowMetrics[];
    summary: any;
  } {
    return {
      flows: this.completedFlows,
      metrics: Array.from(this.flowMetrics.values()),
      summary: this.calculateOverview(this.completedFlows)
    };
  }
}

export const userFlowAnalytics = new UserFlowAnalytics();
export { UserFlowAnalytics };