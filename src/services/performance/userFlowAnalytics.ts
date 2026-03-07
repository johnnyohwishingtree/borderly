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
    if (flows.length === 0) return [];

    // Extract paths from flows and count frequency
    const pathCounts = new Map<string, { count: number; successful: number }>();
    
    flows.forEach(flow => {
      if (flow.steps.length > 0) {
        const path = flow.steps.map(s => s.name).join(' -> ');
        const current = pathCounts.get(path) || { count: 0, successful: 0 };
        current.count++;
        if (flow.success) {
          current.successful++;
        }
        pathCounts.set(path, current);
      }
    });

    // Convert to results and sort by frequency
    const results = Array.from(pathCounts.entries()).map(([path, stats]) => ({
      path,
      frequency: stats.count,
      successRate: Math.round((stats.successful / stats.count) * 100),
      absoluteCount: stats.count,
      relativeFrequency: Math.round((stats.count / flows.length) * 100)
    }));

    return results
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10); // Top 10 most common paths
  }

  private analyzeRetryPatterns(flows: UserFlow[]): any[] {
    if (flows.length === 0) return [];

    const stepRetries = new Map<string, { attempts: number[]; successes: number }>();
    
    flows.forEach(flow => {
      // Track retry patterns by looking for repeated step names in sequence
      const stepCounts = new Map<string, number>();
      
      flow.steps.forEach((step, index) => {
        stepCounts.set(step.name, (stepCounts.get(step.name) || 0) + 1);
        
        // If this step name appeared before, it's likely a retry
        if (stepCounts.get(step.name)! > 1) {
          const current = stepRetries.get(step.name) || { attempts: [], successes: 0 };
          current.attempts.push(stepCounts.get(step.name)!);
          if (step.success) {
            current.successes++;
          }
          stepRetries.set(step.name, current);
        }
      });
    });

    const results = Array.from(stepRetries.entries()).map(([stepName, data]) => {
      const avgRetries = data.attempts.length > 0 ? 
        data.attempts.reduce((sum, count) => sum + count, 0) / data.attempts.length : 0;
      const successAfterRetry = data.attempts.length > 0 ? 
        Math.round((data.successes / data.attempts.length) * 100) : 0;
      
      return {
        step: stepName,
        avgRetries: Math.round(avgRetries * 10) / 10,
        successAfterRetry,
        totalRetryInstances: data.attempts.length,
        maxRetries: data.attempts.length > 0 ? Math.max(...data.attempts) : 0
      };
    });

    return results
      .filter(r => r.avgRetries > 1) // Only include steps with actual retries
      .sort((a, b) => b.avgRetries - a.avgRetries);
  }

  private analyzeTimeSpent(flows: UserFlow[]): any[] {
    if (flows.length === 0) return [];

    const stepTimes = new Map<string, number[]>();
    
    flows.forEach(flow => {
      flow.steps.forEach(step => {
        if (!stepTimes.has(step.name)) {
          stepTimes.set(step.name, []);
        }
        stepTimes.get(step.name)!.push(step.duration);
      });
    });

    const results = Array.from(stepTimes.entries()).map(([stepName, durations]) => {
      durations.sort((a, b) => a - b);
      const avgTime = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const medianTime = durations[Math.floor(durations.length / 2)];
      const p95Time = durations[Math.floor(durations.length * 0.95)];
      
      // Estimate user satisfaction based on time thresholds
      // Lower times generally correlate with higher satisfaction
      let userSatisfaction = 100;
      if (avgTime > 60000) userSatisfaction -= 30; // > 1 minute
      if (avgTime > 30000) userSatisfaction -= 20; // > 30 seconds
      if (avgTime > 10000) userSatisfaction -= 15; // > 10 seconds
      if (avgTime > 5000) userSatisfaction -= 10;  // > 5 seconds
      
      return {
        step: stepName,
        avgTime: Math.round(avgTime),
        medianTime: Math.round(medianTime),
        p95Time: Math.round(p95Time),
        userSatisfaction: Math.max(0, Math.min(100, userSatisfaction)),
        sampleSize: durations.length,
        timeVariance: this.calculateVariance(durations)
      };
    });

    return results.sort((a, b) => b.avgTime - a.avgTime);
  }

  private analyzeDeviceCorrelation(flows: UserFlow[]): any[] {
    if (flows.length === 0) return [];

    // Analyze correlation between device characteristics and performance
    const deviceMetrics = new Map<string, { performances: number[]; deviceTypes: string[] }>();
    
    flows.forEach(flow => {
      const avgStepDuration = flow.steps.length > 0 ? 
        flow.steps.reduce((sum, s) => sum + s.duration, 0) / flow.steps.length : 0;
      
      // Simulate device correlation analysis
      // In a real implementation, this would come from actual device info
      const deviceInfo = this.inferDeviceCharacteristics(avgStepDuration, flow);
      
      Object.entries(deviceInfo).forEach(([metric, value]) => {
        if (!deviceMetrics.has(metric)) {
          deviceMetrics.set(metric, { performances: [], deviceTypes: [] });
        }
        const data = deviceMetrics.get(metric)!;
        data.performances.push(avgStepDuration);
        data.deviceTypes.push(String(value));
      });
    });

    const correlations = Array.from(deviceMetrics.entries()).map(([metric, data]) => {
      const correlation = this.calculateCorrelation(
        data.performances,
        data.deviceTypes.map(t => t === 'true' || t === 'slow' ? 1 : 0)
      );
      
      return {
        metric,
        correlation: Math.round(correlation * 100) / 100,
        sampleSize: data.performances.length,
        averagePerformanceImpact: Math.round(
          data.performances.reduce((sum, p) => sum + p, 0) / data.performances.length
        )
      };
    });

    return correlations
      .filter(c => Math.abs(c.correlation) > 0.1) // Only significant correlations
      .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((sum, d) => sum + d, 0) / numbers.length;
  }

  private inferDeviceCharacteristics(avgDuration: number, flow: any): Record<string, any> {
    // Simulate device characteristic inference based on performance patterns
    return {
      low_memory_device: avgDuration > 8000,
      slow_network: flow.steps.some((s: any) => s.name.includes('network') && s.duration > 5000),
      old_device: avgDuration > 12000,
      poor_camera_performance: flow.steps.some((s: any) => s.name.includes('camera') && s.duration > 10000)
    };
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
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
   * Update step duration for testing purposes
   * @private - For testing only
   */
  private updateStepDuration(stepId: string, duration: number): void {
    // Find step in active flows
    for (const flow of this.activeFlows.values()) {
      const step = flow.steps.find(s => s.id === stepId);
      if (step) {
        step.duration = duration;
        step.endTime = step.startTime + duration;
        break;
      }
    }
    
    // Also check completed flows
    for (const flow of this.completedFlows) {
      const step = flow.steps.find(s => s.id === stepId);
      if (step) {
        step.duration = duration;
        step.endTime = step.startTime + duration;
        break;
      }
    }
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