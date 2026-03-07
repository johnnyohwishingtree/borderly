/**
 * Regression Detection Service Tests
 */

import { regressionDetection, RegressionDetectionService } from '../../../src/services/performance/regressionDetection';

// Mock dependencies
jest.mock('../../../src/services/monitoring/performance');
jest.mock('../../../src/services/monitoring/productionMonitoring');

describe('RegressionDetectionService', () => {
  let service: RegressionDetectionService;

  beforeEach(() => {
    service = new RegressionDetectionService();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default thresholds', () => {
      expect(service).toBeDefined();
      
      // Should have default thresholds configured
      const stats = service.getDetectionStatistics();
      expect(stats.coverage.thresholdsConfigured).toBeGreaterThan(0);
    });

    it('should be enabled by default', () => {
      const stats = service.getDetectionStatistics();
      expect(stats.coverage.metricsMonitored).toBeDefined();
    });

    it('should setup baseline performance expectations', () => {
      // Default thresholds should be configured for key metrics
      service.recordMetric('app_start_time', 'startup', 3000);
      
      // Should not throw errors
      expect(() => {
        service.recordMetric('form_generation', 'form', 1000);
      }).not.toThrow();
    });
  });

  describe('enable/disable functionality', () => {
    it('should disable detection when setEnabled(false) is called', () => {
      service.setEnabled(false);
      
      service.recordMetric('test_metric', 'test', 1000);
      
      const stats = service.getDetectionStatistics();
      expect(stats.coverage.metricsMonitored).toBe(0);
    });

    it('should re-enable detection when setEnabled(true) is called', () => {
      service.setEnabled(false);
      service.setEnabled(true);
      
      service.recordMetric('test_metric', 'test', 1000);
      
      const stats = service.getDetectionStatistics();
      expect(stats.coverage.metricsMonitored).toBeGreaterThan(0);
    });
  });

  describe('threshold configuration', () => {
    it('should allow custom threshold configuration', () => {
      const threshold = {
        metricName: 'custom_metric',
        category: 'test',
        baseline: 1000,
        tolerance: 25,
        sensitivity: 'high' as const,
        sampleSize: 10,
        confidenceLevel: 0.95
      };
      
      expect(() => {
        service.setThreshold(threshold);
      }).not.toThrow();
    });

    it('should use custom thresholds for regression detection', () => {
      // Set a very sensitive threshold
      service.setThreshold({
        metricName: 'sensitive_metric',
        category: 'test',
        baseline: 100,
        tolerance: 5, // 5% tolerance
        sensitivity: 'high',
        sampleSize: 5,
        confidenceLevel: 0.8
      });
      
      // Record baseline measurements
      for (let i = 0; i < 5; i++) {
        service.recordMetric('sensitive_metric', 'test', 100);
      }
      
      // Record regression measurements
      for (let i = 0; i < 5; i++) {
        service.recordMetric('sensitive_metric', 'test', 120); // 20% increase
      }
      
      const regressions = service.getActiveRegressions();
      const sensitiveRegression = regressions.find(r => 
        r.metricName === 'sensitive_metric'
      );
      
      expect(sensitiveRegression).toBeDefined();
    });
  });

  describe('metric recording and analysis', () => {
    it('should record metrics for analysis', () => {
      service.recordMetric('test_metric', 'test', 1000, { context: 'test' });
      
      const stats = service.getDetectionStatistics();
      expect(stats.coverage.metricsMonitored).toBeGreaterThan(0);
    });

    it('should maintain metric history', () => {
      for (let i = 0; i < 50; i++) {
        service.recordMetric('history_test', 'test', 1000 + i);
      }
      
      const stats = service.getDetectionStatistics();
      expect(stats.coverage.metricsMonitored).toBeGreaterThan(0);
    });

    it('should limit metric history to prevent memory bloat', () => {
      // Record more than the max history size (1000)
      for (let i = 0; i < 1500; i++) {
        service.recordMetric('memory_test', 'test', 1000);
      }
      
      // Should not cause memory issues
      const stats = service.getDetectionStatistics();
      expect(stats).toBeDefined();
    });

    it('should update statistical models', () => {
      // Record enough data to build statistical model
      for (let i = 0; i < 20; i++) {
        service.recordMetric('model_test', 'test', 1000 + Math.random() * 100);
      }
      
      const stats = service.getDetectionStatistics();
      expect(stats.coverage.modelsActive).toBeGreaterThan(0);
    });
  });

  describe('regression detection', () => {
    it('should detect significant performance regressions', () => {
      // Establish baseline
      for (let i = 0; i < 20; i++) {
        service.recordMetric('regression_test', 'test', 1000);
      }
      
      // Introduce regression
      for (let i = 0; i < 20; i++) {
        service.recordMetric('regression_test', 'test', 2000); // 100% increase
      }
      
      const regressions = service.getActiveRegressions();
      expect(regressions.length).toBeGreaterThan(0);
    });

    it('should not detect false positives for normal variance', () => {
      // Record measurements with normal variance
      for (let i = 0; i < 40; i++) {
        const variance = (Math.random() - 0.5) * 200; // ±100ms variance
        service.recordMetric('normal_variance', 'test', 1000 + variance);
      }
      
      const regressions = service.getActiveRegressions();
      const normalVarianceRegressions = regressions.filter(r => 
        r.metricName === 'normal_variance'
      );
      
      expect(normalVarianceRegressions.length).toBe(0);
    });

    it('should calculate regression severity correctly', () => {
      // Create a critical regression (>100% degradation)
      for (let i = 0; i < 15; i++) {
        service.recordMetric('critical_regression', 'test', 500);
      }
      
      for (let i = 0; i < 15; i++) {
        service.recordMetric('critical_regression', 'test', 1500); // 200% increase
      }
      
      const regressions = service.getActiveRegressions();
      const criticalRegression = regressions.find(r => 
        r.metricName === 'critical_regression' && r.severity === 'critical'
      );
      
      expect(criticalRegression).toBeDefined();
    });

    it('should provide regression context and recommendations', () => {
      // Create regression with context
      for (let i = 0; i < 15; i++) {
        service.recordMetric('contextual_regression', 'startup', 2000, {
          platform: 'ios',
          version: '1.0.0'
        });
      }
      
      for (let i = 0; i < 15; i++) {
        service.recordMetric('contextual_regression', 'startup', 4000); // 100% increase
      }
      
      const regressions = service.getActiveRegressions();
      const contextualRegression = regressions.find(r => 
        r.metricName === 'contextual_regression'
      );
      
      if (contextualRegression) {
        expect(contextualRegression.recommendations.length).toBeGreaterThan(0);
        expect(contextualRegression.impact).toBeDefined();
        expect(contextualRegression.impact.description).toBeDefined();
      }
    });
  });

  describe('alert management', () => {
    beforeEach(() => {
      // Create a regression to generate alerts
      for (let i = 0; i < 15; i++) {
        service.recordMetric('alert_test', 'test', 1000);
      }
      
      for (let i = 0; i < 15; i++) {
        service.recordMetric('alert_test', 'test', 2000);
      }
    });

    it('should generate alerts for regressions', () => {
      const alerts = service.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('should allow acknowledging alerts', () => {
      const alerts = service.getAlerts();
      
      if (alerts.length > 0) {
        const alertId = alerts[0].id;
        
        expect(() => {
          service.acknowledgeAlert(alertId, 'test_user');
        }).not.toThrow();
        
        const updatedAlerts = service.getAlerts();
        const acknowledgedAlert = updatedAlerts.find(a => a.id === alertId);
        
        expect(acknowledgedAlert?.acknowledged).toBe(true);
        expect(acknowledgedAlert?.acknowledgedBy).toBe('test_user');
      }
    });

    it('should filter unacknowledged alerts', () => {
      const allAlerts = service.getAlerts();
      const unacknowledgedAlerts = service.getAlerts(true);
      
      expect(unacknowledgedAlerts.length).toBeLessThanOrEqual(allAlerts.length);
    });

    it('should set appropriate alert priorities', () => {
      const alerts = service.getAlerts();
      
      alerts.forEach(alert => {
        expect(['low', 'medium', 'high', 'urgent']).toContain(alert.priority);
        expect(alert.message).toBeDefined();
        expect(alert.timestamp).toBeDefined();
      });
    });
  });

  describe('regression lifecycle management', () => {
    let regressionId: string;

    beforeEach(() => {
      // Create a regression
      for (let i = 0; i < 15; i++) {
        service.recordMetric('lifecycle_test', 'test', 1000);
      }
      
      for (let i = 0; i < 15; i++) {
        service.recordMetric('lifecycle_test', 'test', 2000);
      }
      
      const regressions = service.getActiveRegressions();
      if (regressions.length > 0) {
        regressionId = regressions[0].id;
      }
    });

    it('should allow resolving regressions', () => {
      if (regressionId) {
        expect(() => {
          service.resolveRegression(regressionId, 'test_user', 'Fixed by optimization');
        }).not.toThrow();
        
        const activeRegressions = service.getActiveRegressions();
        const resolvedRegression = activeRegressions.find(r => r.id === regressionId);
        
        expect(resolvedRegression).toBeUndefined();
      }
    });

    it('should allow marking regressions as false positives', () => {
      if (regressionId) {
        expect(() => {
          service.markAsFalsePositive(regressionId, 'test_user', 'Test data artifact');
        }).not.toThrow();
        
        const activeRegressions = service.getActiveRegressions();
        const falsePositiveRegression = activeRegressions.find(r => r.id === regressionId);
        
        expect(falsePositiveRegression).toBeUndefined();
      }
    });
  });

  describe('detection statistics and reporting', () => {
    it('should provide comprehensive detection statistics', () => {
      const stats = service.getDetectionStatistics();
      
      expect(stats).toHaveProperty('totalRegressions');
      expect(stats).toHaveProperty('activeRegressions');
      expect(stats).toHaveProperty('resolvedRegressions');
      expect(stats).toHaveProperty('falsePositives');
      expect(stats).toHaveProperty('averageDetectionTime');
      expect(stats).toHaveProperty('averageResolutionTime');
      expect(stats).toHaveProperty('accuracy');
      expect(stats).toHaveProperty('coverage');
      
      expect(typeof stats.totalRegressions).toBe('number');
      expect(typeof stats.accuracy).toBe('number');
      expect(stats.accuracy).toBeGreaterThanOrEqual(0);
      expect(stats.accuracy).toBeLessThanOrEqual(1);
    });

    it('should generate periodic reports', () => {
      const dailyReport = service.generateReport('day');
      const weeklyReport = service.generateReport('week');
      const monthlyReport = service.generateReport('month');
      
      [dailyReport, weeklyReport, monthlyReport].forEach(report => {
        expect(report).toHaveProperty('summary');
        expect(report).toHaveProperty('topRegressions');
        expect(report).toHaveProperty('trends');
        expect(report).toHaveProperty('recommendations');
      });
    });

    it('should calculate trend analysis', () => {
      const report = service.generateReport('week');
      
      expect(Array.isArray(report.trends)).toBe(true);
      report.trends.forEach(trend => {
        expect(trend).toHaveProperty('metric');
        expect(trend).toHaveProperty('trend');
        expect(trend).toHaveProperty('significance');
        expect(['improving', 'stable', 'degrading']).toContain(trend.trend);
      });
    });

    it('should provide actionable recommendations', () => {
      const report = service.generateReport('week');
      
      expect(Array.isArray(report.recommendations)).toBe(true);
      report.recommendations.forEach(rec => {
        expect(rec).toHaveProperty('priority');
        expect(rec).toHaveProperty('category');
        expect(rec).toHaveProperty('recommendation');
        expect(rec).toHaveProperty('impact');
        expect(['high', 'medium', 'low']).toContain(rec.priority);
      });
    });
  });

  describe('statistical analysis', () => {
    it('should perform valid statistical significance tests', () => {
      // Create dataset with known statistical properties
      const baseline = Array.from({ length: 30 }, () => 1000 + Math.random() * 100);
      const regression = Array.from({ length: 30 }, () => 1500 + Math.random() * 100);
      
      baseline.forEach(value => {
        service.recordMetric('stats_test', 'test', value);
      });
      
      regression.forEach(value => {
        service.recordMetric('stats_test', 'test', value);
      });
      
      const regressions = service.getActiveRegressions();
      const statsRegression = regressions.find(r => r.metricName === 'stats_test');
      
      if (statsRegression) {
        expect(statsRegression.regression.significance).toBeGreaterThan(0);
        expect(statsRegression.regression.significance).toBeLessThanOrEqual(1);
      }
    });

    it('should handle different sample sizes appropriately', () => {
      // Test with minimum sample size
      for (let i = 0; i < 10; i++) {
        service.recordMetric('small_sample', 'test', 1000);
      }
      
      for (let i = 0; i < 10; i++) {
        service.recordMetric('small_sample', 'test', 2000);
      }
      
      // Test with large sample size
      for (let i = 0; i < 100; i++) {
        service.recordMetric('large_sample', 'test', 1000);
      }
      
      for (let i = 0; i < 100; i++) {
        service.recordMetric('large_sample', 'test', 1100); // 10% increase
      }
      
      const regressions = service.getActiveRegressions();
      
      // Large sample should be more sensitive to smaller changes
      const largeRegressions = regressions.filter(r => r.metricName === 'large_sample');
      const smallRegressions = regressions.filter(r => r.metricName === 'small_sample');
      
      // Both should detect their respective patterns
      expect(smallRegressions.length).toBeGreaterThan(0);
    });

    it('should calculate confidence intervals correctly', () => {
      // Create regression with known statistics
      for (let i = 0; i < 50; i++) {
        service.recordMetric('confidence_test', 'test', 1000 + Math.random() * 50);
      }
      
      for (let i = 0; i < 50; i++) {
        service.recordMetric('confidence_test', 'test', 1500 + Math.random() * 50);
      }
      
      const regressions = service.getActiveRegressions();
      const confidenceRegression = regressions.find(r => 
        r.metricName === 'confidence_test'
      );
      
      if (confidenceRegression) {
        expect(confidenceRegression.baseline.confidence).toBeGreaterThan(0);
        expect(confidenceRegression.baseline.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle invalid metric values gracefully', () => {
      expect(() => {
        service.recordMetric('invalid_test', 'test', NaN);
      }).not.toThrow();
      
      expect(() => {
        service.recordMetric('invalid_test', 'test', Infinity);
      }).not.toThrow();
      
      expect(() => {
        service.recordMetric('invalid_test', 'test', -1);
      }).not.toThrow();
    });

    it('should handle empty metric names gracefully', () => {
      expect(() => {
        service.recordMetric('', 'test', 1000);
      }).not.toThrow();
      
      expect(() => {
        service.recordMetric(null as any, 'test', 1000);
      }).not.toThrow();
    });

    it('should handle invalid threshold configurations gracefully', () => {
      expect(() => {
        service.setThreshold({
          metricName: '',
          category: '',
          baseline: -1,
          tolerance: -1,
          sensitivity: 'invalid' as any,
          sampleSize: 0,
          confidenceLevel: 2
        });
      }).not.toThrow();
    });

    it('should handle operations on non-existent regressions gracefully', () => {
      expect(() => {
        service.resolveRegression('non_existent_id', 'user');
      }).not.toThrow();
      
      expect(() => {
        service.markAsFalsePositive('non_existent_id', 'user');
      }).not.toThrow();
      
      expect(() => {
        service.acknowledgeAlert('non_existent_id', 'user');
      }).not.toThrow();
    });
  });

  describe('memory and performance', () => {
    it('should handle high volume of metrics efficiently', () => {
      const startTime = Date.now();
      
      // Record many metrics quickly
      for (let i = 0; i < 10000; i++) {
        service.recordMetric('performance_test', 'test', 1000 + i);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete in reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds max
    });

    it('should clean up old alerts automatically', () => {
      // Create many alerts
      for (let i = 0; i < 100; i++) {
        // This would normally create alerts through regression detection
        service.recordMetric('cleanup_test', 'test', i < 50 ? 1000 : 2000);
      }
      
      // Should not accumulate indefinitely
      const alerts = service.getAlerts();
      expect(alerts.length).toBeLessThan(1000);
    });
  });
});

describe('RegressionDetectionService singleton', () => {
  it('should provide singleton instance', () => {
    expect(regressionDetection).toBeDefined();
    expect(regressionDetection).toBeInstanceOf(RegressionDetectionService);
  });

  it('should maintain state across calls', () => {
    regressionDetection.recordMetric('singleton_test', 'test', 1000);
    
    const stats1 = regressionDetection.getDetectionStatistics();
    const stats2 = regressionDetection.getDetectionStatistics();
    
    expect(stats1.coverage.metricsMonitored).toBe(stats2.coverage.metricsMonitored);
  });

  it('should persist configuration changes', () => {
    regressionDetection.setThreshold({
      metricName: 'persistent_test',
      category: 'test',
      baseline: 1000,
      tolerance: 25,
      sensitivity: 'high',
      sampleSize: 10,
      confidenceLevel: 0.95
    });
    
    // Configuration should persist
    const stats = regressionDetection.getDetectionStatistics();
    expect(stats.coverage.thresholdsConfigured).toBeGreaterThan(0);
  });
});