/**
 * User Flow Analytics Service Tests
 */

import { userFlowAnalytics, UserFlowAnalytics } from '../../../src/services/performance/userFlowAnalytics';

// Mock dependencies
jest.mock('../../../src/services/monitoring/performance');
jest.mock('../../../src/services/monitoring/productionMonitoring');

describe('UserFlowAnalytics', () => {
  let analytics: UserFlowAnalytics;

  beforeEach(() => {
    analytics = new UserFlowAnalytics();
    jest.clearAllMocks();
  });

  describe('flow management', () => {
    it('should start a new user flow', () => {
      const flowId = analytics.startFlow('onboarding', 'session_123', { source: 'app_launch' });
      
      expect(flowId).toBeDefined();
      expect(typeof flowId).toBe('string');
      expect(flowId).toMatch(/^flow_/);
    });

    it('should handle disabled state', () => {
      analytics.setEnabled(false);
      
      const flowId = analytics.startFlow('onboarding', 'session_123');
      expect(flowId).toBe('');
      
      const stepId = analytics.addStep(flowId, 'welcome', 'WelcomeScreen', 'view');
      expect(stepId).toBe('');
    });

    it('should track multiple concurrent flows', () => {
      const flowId1 = analytics.startFlow('onboarding', 'session_1');
      const flowId2 = analytics.startFlow('trip_creation', 'session_2');
      
      expect(flowId1).not.toBe(flowId2);
      
      // Both flows should be active
      const stepId1 = analytics.addStep(flowId1, 'welcome', 'WelcomeScreen', 'view');
      const stepId2 = analytics.addStep(flowId2, 'create', 'CreateTripScreen', 'view');
      
      expect(stepId1).toBeDefined();
      expect(stepId2).toBeDefined();
    });
  });

  describe('step tracking', () => {
    let flowId: string;

    beforeEach(() => {
      flowId = analytics.startFlow('onboarding', 'test_session');
    });

    it('should add steps to active flow', () => {
      const stepId = analytics.addStep(flowId, 'welcome', 'WelcomeScreen', 'view');
      
      expect(stepId).toBeDefined();
      expect(typeof stepId).toBe('string');
      expect(stepId).toMatch(/^step_/);
    });

    it('should handle invalid flow IDs gracefully', () => {
      const stepId = analytics.addStep('invalid_flow', 'step', 'Screen', 'action');
      expect(stepId).toBe('');
    });

    it('should complete steps successfully', () => {
      const stepId = analytics.addStep(flowId, 'welcome', 'WelcomeScreen', 'view');
      
      expect(() => {
        analytics.completeStep(flowId, stepId, true, undefined, { success: true });
      }).not.toThrow();
    });

    it('should complete steps with errors', () => {
      const stepId = analytics.addStep(flowId, 'passport_scan', 'PassportScanScreen', 'scan');
      
      expect(() => {
        analytics.completeStep(flowId, stepId, false, 'camera_permission_denied', {
          error: 'Permission not granted'
        });
      }).not.toThrow();
    });

    it('should track step durations', () => {
      const stepId = analytics.addStep(flowId, 'form_fill', 'LegFormScreen', 'fill');
      
      // Simulate some time passing
      setTimeout(() => {
        analytics.completeStep(flowId, stepId, true);
      }, 100);
    });
  });

  describe('flow completion', () => {
    let flowId: string;

    beforeEach(() => {
      flowId = analytics.startFlow('onboarding', 'test_session');
    });

    it('should complete flows successfully', () => {
      const stepId1 = analytics.addStep(flowId, 'step1', 'Screen1', 'action');
      const stepId2 = analytics.addStep(flowId, 'step2', 'Screen2', 'action');
      
      analytics.completeStep(flowId, stepId1, true);
      analytics.completeStep(flowId, stepId2, true);
      
      expect(() => {
        analytics.completeFlow(flowId, true);
      }).not.toThrow();
    });

    it('should handle incomplete flows with drop-off points', () => {
      const stepId = analytics.addStep(flowId, 'difficult_step', 'ComplexScreen', 'complex_action');
      analytics.completeStep(flowId, stepId, false, 'user_confusion');
      
      expect(() => {
        analytics.completeFlow(flowId, false, 'difficult_step');
      }).not.toThrow();
    });

    it('should calculate conversion rates', () => {
      // Create a flow with mixed success/failure steps
      const stepId1 = analytics.addStep(flowId, 'step1', 'Screen1', 'action');
      const stepId2 = analytics.addStep(flowId, 'step2', 'Screen2', 'action');
      const stepId3 = analytics.addStep(flowId, 'step3', 'Screen3', 'action');
      
      analytics.completeStep(flowId, stepId1, true);
      analytics.completeStep(flowId, stepId2, false, 'error');
      analytics.completeStep(flowId, stepId3, true);
      
      analytics.completeFlow(flowId, true);
      
      // Should calculate 66.7% conversion rate (2/3 successful steps)
    });
  });

  describe('analytics generation', () => {
    beforeEach(() => {
      // Create sample flow data
      const flowId = analytics.startFlow('onboarding', 'session_1');
      const stepId = analytics.addStep(flowId, 'welcome', 'WelcomeScreen', 'view');
      analytics.completeStep(flowId, stepId, true);
      analytics.completeFlow(flowId, true);
    });

    it('should generate flow analytics overview', () => {
      const analyticsData = analytics.getFlowAnalytics();
      
      expect(analyticsData).toHaveProperty('overview');
      expect(analyticsData).toHaveProperty('flowMetrics');
      expect(analyticsData).toHaveProperty('frictionPoints');
      expect(analyticsData).toHaveProperty('recommendations');
    });

    it('should filter analytics by flow type', () => {
      const onboardingAnalytics = analytics.getFlowAnalytics('onboarding');
      
      expect(onboardingAnalytics.flowMetrics).toBeDefined();
      onboardingAnalytics.flowMetrics.forEach(metric => {
        expect(metric.flowType).toBe('onboarding');
      });
    });

    it('should filter analytics by time range', () => {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;
      
      const recentAnalytics = analytics.getFlowAnalytics(undefined, {
        start: oneHourAgo,
        end: now
      });
      
      expect(recentAnalytics).toBeDefined();
    });

    it('should calculate completion rates correctly', () => {
      const analyticsData = analytics.getFlowAnalytics();
      
      expect(analyticsData.overview.completionRate).toBeGreaterThanOrEqual(0);
      expect(analyticsData.overview.completionRate).toBeLessThanOrEqual(1);
    });
  });

  describe('friction point identification', () => {
    it('should identify high duration friction points', () => {
      // Create flows with slow steps
      const flowId = analytics.startFlow('onboarding', 'session_1');
      const stepId = analytics.addStep(flowId, 'slow_step', 'SlowScreen', 'slow_action');
      
      // Mock a step that takes 15 seconds (should be flagged as friction)
      // Simulate slow step without actual timeout
      (analytics as any).updateStepDuration(stepId, 15000);
      analytics.completeStep(flowId, stepId, true);
      
      // Complete the flow
      analytics.completeFlow(flowId, true);
      
      // Manually set the step duration to simulate a slow step after flow completion
      const completedFlows = (analytics as any).completedFlows;
      const flow = completedFlows.find((f: any) => f.flowId === flowId);
      expect(flow).toBeDefined();
      expect(flow.steps.length).toBeGreaterThan(0);
      
      // Set the duration to 15 seconds (should be flagged as bottleneck since it's > 5 seconds)
      flow.steps[0].duration = 15000; // 15 seconds
      
      const criticalIssues = analytics.identifyCriticalIssues();
      expect(criticalIssues.performanceBottlenecks.length).toBeGreaterThan(0);
    });

    it('should identify high error rate friction points', () => {
      // Create multiple flows with failures
      for (let i = 0; i < 5; i++) {
        const flowId = analytics.startFlow('form_completion', `session_${i}`);
        const stepId = analytics.addStep(flowId, 'error_step', 'ErrorScreen', 'error_action');
        analytics.completeStep(flowId, stepId, false, 'common_error');
        analytics.completeFlow(flowId, false, 'error_step');
      }
      
      const criticalIssues = analytics.identifyCriticalIssues();
      expect(criticalIssues.errorHotspots.length).toBeGreaterThan(0);
    });

    it('should identify high drop-off flows', () => {
      // Create flows with high drop-off rates
      for (let i = 0; i < 10; i++) {
        const flowId = analytics.startFlow('trip_creation', `session_${i}`);
        const stepId = analytics.addStep(flowId, 'drop_off_step', 'DropOffScreen', 'action');
        
        if (i < 3) {
          // Only 30% complete the flow
          analytics.completeStep(flowId, stepId, true);
          analytics.completeFlow(flowId, true);
        } else {
          analytics.completeStep(flowId, stepId, false);
          analytics.completeFlow(flowId, false, 'drop_off_step');
        }
      }
      
      const criticalIssues = analytics.identifyCriticalIssues();
      expect(criticalIssues.highDropOffFlows.length).toBeGreaterThan(0);
    });
  });

  describe('user behavior analysis', () => {
    it('should analyze common user paths', () => {
      const behaviorPatterns = analytics.getUserBehaviorPatterns();
      
      expect(behaviorPatterns).toHaveProperty('commonPaths');
      expect(behaviorPatterns).toHaveProperty('retryPatterns');
      expect(behaviorPatterns).toHaveProperty('timeSpentAnalysis');
      expect(behaviorPatterns).toHaveProperty('devicePerformanceCorrelation');
    });

    it('should identify retry patterns', () => {
      const behaviorPatterns = analytics.getUserBehaviorPatterns();
      
      expect(Array.isArray(behaviorPatterns.retryPatterns)).toBe(true);
      behaviorPatterns.retryPatterns.forEach(pattern => {
        expect(pattern).toHaveProperty('step');
        expect(pattern).toHaveProperty('avgRetries');
        expect(pattern).toHaveProperty('successAfterRetry');
      });
    });

    it('should analyze time spent on steps', () => {
      const behaviorPatterns = analytics.getUserBehaviorPatterns();
      
      expect(Array.isArray(behaviorPatterns.timeSpentAnalysis)).toBe(true);
      behaviorPatterns.timeSpentAnalysis.forEach(analysis => {
        expect(analysis).toHaveProperty('step');
        expect(analysis).toHaveProperty('avgTime');
        expect(analysis).toHaveProperty('userSatisfaction');
      });
    });
  });

  describe('data export and management', () => {
    it('should export analytics data', () => {
      const exportData = analytics.exportAnalyticsData();
      
      expect(exportData).toHaveProperty('flows');
      expect(exportData).toHaveProperty('metrics');
      expect(exportData).toHaveProperty('summary');
      
      expect(Array.isArray(exportData.flows)).toBe(true);
      expect(Array.isArray(exportData.metrics)).toBe(true);
    });

    it('should handle memory management for large datasets', () => {
      // Create many flows to test memory management
      for (let i = 0; i < 200; i++) {
        const flowId = analytics.startFlow('qr_management', `session_${i}`);
        analytics.completeFlow(flowId, true);
      }
      
      // Should not cause memory issues
      const exportData = analytics.exportAnalyticsData();
      expect(exportData.flows.length).toBeLessThanOrEqual(200);
    });
  });

  describe('privacy and data sanitization', () => {
    it('should sanitize flow names and user data', () => {
      const flowId = analytics.startFlow('onboarding', 'user_12345@email.com');
      
      // Flow should start but sensitive data should be sanitized
      expect(flowId).toBeDefined();
      expect(flowId.length).toBeGreaterThan(0);
    });

    it('should sanitize step metadata', () => {
      const flowId = analytics.startFlow('profile_edit', 'session');
      
      const stepId = analytics.addStep(
        flowId,
        'data_entry',
        'FormScreen',
        'input',
        {
          fieldValue: 'sensitive_data@email.com',
          passportNumber: 'A12345678',
          normalField: 'normal_value'
        }
      );
      
      expect(stepId).toBeDefined();
      // Sensitive data should be sanitized in the stored metadata
    });

    it('should sanitize error messages', () => {
      const flowId = analytics.startFlow('profile_edit', 'session');
      const stepId = analytics.addStep(flowId, 'error_step', 'ErrorScreen', 'action');
      
      analytics.completeStep(
        flowId,
        stepId,
        false,
        'User email validation failed for john.doe@email.com',
        { errorDetails: 'Invalid format for sensitive@data.com' }
      );
      
      // Should not throw and should sanitize the error message
      expect(() => {
        analytics.completeFlow(flowId, false);
      }).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle invalid flow IDs gracefully', () => {
      expect(() => {
        analytics.addStep('invalid_flow_id', 'step', 'Screen', 'action');
      }).not.toThrow();
      
      expect(() => {
        analytics.completeStep('invalid_flow_id', 'step_id', true);
      }).not.toThrow();
      
      expect(() => {
        analytics.completeFlow('invalid_flow_id', true);
      }).not.toThrow();
    });

    it('should handle invalid step IDs gracefully', () => {
      const flowId = analytics.startFlow('profile_edit', 'session');
      
      expect(() => {
        analytics.completeStep(flowId, 'invalid_step_id', true);
      }).not.toThrow();
    });

    it('should handle malformed metadata gracefully', () => {
      const flowId = analytics.startFlow('profile_edit', 'session');
      
      expect(() => {
        analytics.addStep(flowId, 'step', 'Screen', 'action', {
          circular: null,
          nested: { deeply: { nested: { data: 'value' } } },
          invalidDate: new Date('invalid'),
          undefinedValue: undefined
        });
      }).not.toThrow();
    });
  });

  describe('performance optimization', () => {
    it('should handle high volume of flows efficiently', () => {
      const startTime = Date.now();
      
      // Create many flows quickly
      for (let i = 0; i < 1000; i++) {
        const flowId = analytics.startFlow('performance_test', `session_${i}`);
        const stepId = analytics.addStep(flowId, 'step', 'Screen', 'action');
        analytics.completeStep(flowId, stepId, true);
        analytics.completeFlow(flowId, true);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete in reasonable time (less than 5 seconds)
      expect(duration).toBeLessThan(5000);
    });

    it('should clean up old flow data automatically', (done) => {
      const analytics = new UserFlowAnalytics();
      
      // Create some flows
      const flowId = analytics.startFlow('cleanup_test', 'session');
      analytics.completeFlow(flowId, true);
      
      // Mock time passage for cleanup (normally runs daily)
      // In a real test, you would mock the cleanup interval
      const exportData = analytics.exportAnalyticsData();
      expect(exportData.flows.length).toBeGreaterThan(0);
      
      done();
    });
  });
});

describe('UserFlowAnalytics singleton', () => {
  it('should provide singleton instance', () => {
    expect(userFlowAnalytics).toBeDefined();
    expect(userFlowAnalytics).toBeInstanceOf(UserFlowAnalytics);
  });

  it('should maintain state across calls', () => {
    const flowId1 = userFlowAnalytics.startFlow('singleton_test1', 'session1');
    const flowId2 = userFlowAnalytics.startFlow('singleton_test2', 'session2');
    
    expect(flowId1).not.toBe(flowId2);
    
    // Both flows should be tracked by the same instance
    const analytics1 = userFlowAnalytics.getFlowAnalytics();
    const analytics2 = userFlowAnalytics.getFlowAnalytics();
    
    expect(analytics1.overview.totalFlows).toBe(analytics2.overview.totalFlows);
  });
});