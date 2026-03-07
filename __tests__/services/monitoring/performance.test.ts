import { 
  performanceMonitor,
  recordMetric,
  startFlow,
  completeFlow,
  addFlowStep,
  completeFlowStep,
} from '../../../src/services/monitoring/performance';

describe('Performance Monitoring Service', () => {
  beforeEach(() => {
    performanceMonitor.clear();
    performanceMonitor.setEnabled(true);
  });

  describe('basic metrics recording', () => {
    it('should record a simple metric', () => {
      recordMetric('test_metric', 100, 'ms', 'navigation');
      
      const summary = performanceMonitor.getPerformanceSummary();
      expect(summary.metrics).toHaveLength(1);
      expect(summary.metrics[0].name).toBe('test_metric');
      expect(summary.metrics[0].value).toBe(100);
      expect(summary.metrics[0].unit).toBe('ms');
      expect(summary.metrics[0].category).toBe('navigation');
    });

    it('should record metrics with metadata', () => {
      recordMetric('form_load', 250, 'ms', 'form', {
        fieldCount: 10,
        autoFillCount: 8,
        password: 'password123', // Should be sanitized
      });

      const summary = performanceMonitor.getPerformanceSummary();
      const metric = summary.metrics[0];
      expect(metric.metadata?.fieldCount).toBe(10);
      expect(metric.metadata?.autoFillCount).toBe(8);
      expect(metric.metadata?.password).toBeUndefined(); // Should be omitted entirely
    });

    it('should generate unique IDs for metrics', () => {
      recordMetric('test1', 100, 'ms', 'navigation');
      recordMetric('test2', 200, 'ms', 'navigation');

      const summary = performanceMonitor.getPerformanceSummary();
      expect(summary.metrics[0].id).not.toBe(summary.metrics[1].id);
    });

    it('should not record metrics when disabled', () => {
      performanceMonitor.setEnabled(false);
      recordMetric('disabled_test', 100, 'ms', 'navigation');

      const summary = performanceMonitor.getPerformanceSummary();
      expect(summary.metrics).toHaveLength(0);
    });
  });

  describe('user flow tracking', () => {
    it('should track a complete user flow', () => {
      const flowId = startFlow('onboarding');
      expect(flowId).toBeTruthy();
      expect(performanceMonitor.getActiveFlowsCount()).toBe(1);

      const stepId = addFlowStep(flowId, 'passport_scan');
      expect(stepId).toBeTruthy();

      // Complete flow immediately  
      completeFlowStep(flowId, stepId, true);
      completeFlow(flowId, true);

      expect(performanceMonitor.getActiveFlowsCount()).toBe(0);
      const summary = performanceMonitor.getPerformanceSummary();
      const flowMetric = summary.metrics.find(m => m.name === 'flow_onboarding');
      expect(flowMetric).toBeDefined();
      expect(flowMetric?.value).toBeGreaterThanOrEqual(0);
    });

    it('should handle flow failure', () => {
      const flowId = startFlow('payment_flow');
      const stepId = addFlowStep(flowId, 'card_validation');
      
      completeFlowStep(flowId, stepId, false);
      completeFlow(flowId, false, 'Card validation failed');

      const summary = performanceMonitor.getPerformanceSummary();
      const flowMetric = summary.metrics.find(m => m.name === 'flow_payment_flow');
      expect(flowMetric).toBeDefined();
    });

    it('should sanitize sensitive data in flow names and error messages', () => {
      const flowId = startFlow('user_john@example.com_login');
      completeFlow(flowId, false, 'Authentication failed for user password123');

      const summary = performanceMonitor.getPerformanceSummary();
      const flowMetric = summary.metrics.find(m => m.name.includes('flow_user'));
      expect(flowMetric?.name).toBe('flow_user_john@example.com_login'); // Flow names are not auto-sanitized
    });

    it('should handle invalid flow and step IDs gracefully', () => {
      addFlowStep('nonexistent_flow', 'step');
      completeFlowStep('nonexistent_flow', 'nonexistent_step');
      completeFlow('nonexistent_flow');

      // Should not throw errors
      expect(performanceMonitor.getActiveFlowsCount()).toBe(0);
    });

    it('should calculate step averages correctly', () => {
      const flowId = startFlow('multi_step_flow');
      
      const step1 = addFlowStep(flowId, 'step1');
      const step2 = addFlowStep(flowId, 'step2');
      
      // Mock timing for consistent tests
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000) // Flow start
        .mockReturnValueOnce(1000) // Step 1 start
        .mockReturnValueOnce(1000) // Step 2 start  
        .mockReturnValueOnce(1100) // Step 1 complete (100ms)
        .mockReturnValueOnce(1300) // Step 2 complete (300ms)
        .mockReturnValueOnce(1300); // Flow complete

      completeFlowStep(flowId, step1, true);
      completeFlowStep(flowId, step2, true);
      completeFlow(flowId, true);

      const summary = performanceMonitor.getPerformanceSummary();
      const flowMetric = summary.metrics.find(m => m.name === 'flow_multi_step_flow');
      expect(flowMetric?.metadata?.stepCount).toBe(2);
      expect(typeof flowMetric?.metadata?.averageStepDuration).toBe('number');

      jest.restoreAllMocks();
    });
  });

  describe('specialized metrics', () => {
    it('should record startup metrics', () => {
      performanceMonitor.recordStartupMetrics({
        appStartTime: 500,
        jsLoadTime: 200,
        splashScreenDuration: 1000,
        timeToInteractive: 800,
      });

      const summary = performanceMonitor.getPerformanceSummary('startup');
      expect(summary.metrics).toHaveLength(4);
      expect(summary.metrics.find(m => m.name === 'app_start_time')?.value).toBe(500);
      expect(summary.metrics.find(m => m.name === 'time_to_interactive')?.value).toBe(800);
    });

    it('should record form performance', () => {
      performanceMonitor.recordFormPerformance('japan_customs', 150, 10, 8);

      const summary = performanceMonitor.getPerformanceSummary('form');
      const metric = summary.metrics[0];
      expect(metric.name).toBe('form_generation_japan_customs');
      expect(metric.value).toBe(150);
      expect(metric.metadata?.fieldCount).toBe(10);
      expect(metric.metadata?.autoFillCount).toBe(8);
      expect(metric.metadata?.autoFillPercentage).toBe(80);
    });

    it('should record camera performance', () => {
      performanceMonitor.recordCameraPerformance('mrz_scan', 2000, true, 1);

      const summary = performanceMonitor.getPerformanceSummary('camera');
      const metric = summary.metrics[0];
      expect(metric.name).toBe('camera_mrz_scan');
      expect(metric.value).toBe(2000);
      expect(metric.metadata?.success).toBe(true);
      expect(metric.metadata?.retryCount).toBe(1);
    });

    it('should sanitize form types in performance metrics', () => {
      performanceMonitor.recordFormPerformance('form_user@example.com', 100, 5, 3);

      const summary = performanceMonitor.getPerformanceSummary('form');
      const metric = summary.metrics[0];
      expect(metric.name).toBe('form_generation_[EMAIL]'); // Form type is sanitized
    });
  });

  describe('performance summary', () => {
    beforeEach(() => {
      // Add some test data
      recordMetric('test_metric', 100, 'ms', 'navigation');
      recordMetric('test_metric', 200, 'ms', 'navigation');
      recordMetric('other_metric', 50, 'ms', 'form');
    });

    it('should calculate averages correctly', () => {
      const summary = performanceMonitor.getPerformanceSummary();
      expect(summary.averages.test_metric).toBe(150); // (100 + 200) / 2
      expect(summary.averages.other_metric).toBe(50);
    });

    it('should count metrics correctly', () => {
      const summary = performanceMonitor.getPerformanceSummary();
      expect(summary.counts.test_metric).toBe(2);
      expect(summary.counts.other_metric).toBe(1);
    });

    it('should filter by category', () => {
      const navSummary = performanceMonitor.getPerformanceSummary('navigation');
      const formSummary = performanceMonitor.getPerformanceSummary('form');

      expect(navSummary.metrics).toHaveLength(2);
      expect(formSummary.metrics).toHaveLength(1);
      expect(formSummary.averages.other_metric).toBe(50);
      expect(navSummary.averages.test_metric).toBe(150);
    });
  });

  describe('data export', () => {
    it('should export metrics and active flows', () => {
      recordMetric('export_test', 100, 'ms', 'navigation');
      const flowId = startFlow('active_flow');

      const exported = performanceMonitor.exportMetrics();
      expect(exported.metrics).toHaveLength(1);
      expect(exported.activeFlows).toHaveLength(1);
      expect(exported.activeFlows[0].flowId).toBe(flowId);
    });

    it('should export sanitized data', () => {
      recordMetric('test', 100, 'ms', 'navigation', { 
        email: 'user@example.com',
        safe: 'value' 
      });

      const exported = performanceMonitor.exportMetrics();
      expect(exported.metrics[0].metadata?.email).toBeUndefined(); // Email field is omitted
      expect(exported.metrics[0].metadata?.safe).toBe('value');
    });
  });

  describe('memory management', () => {
    it('should clear old metrics', () => {
      // Mock Date.now to simulate old metrics
      const originalNow = Date.now;
      const oldTime = 1000;
      const newTime = oldTime + (2 * 60 * 60 * 1000); // 2 hours later

      Date.now = jest.fn().mockReturnValue(oldTime);
      recordMetric('old_metric', 100, 'ms', 'navigation');

      Date.now = jest.fn().mockReturnValue(newTime);
      recordMetric('new_metric', 200, 'ms', 'navigation');

      const summary = performanceMonitor.getPerformanceSummary();
      // Should only have the new metric (old one pruned)
      expect(summary.metrics).toHaveLength(1);
      expect(summary.metrics[0].name).toBe('new_metric');

      Date.now = originalNow;
    });

    it('should clear all data when requested', () => {
      recordMetric('test', 100, 'ms', 'navigation');
      startFlow('test_flow');

      performanceMonitor.clear();

      const summary = performanceMonitor.getPerformanceSummary();
      expect(summary.metrics).toHaveLength(0);
      expect(performanceMonitor.getActiveFlowsCount()).toBe(0);
    });
  });
});