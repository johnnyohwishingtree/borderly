/**
 * Production Profiler Service Tests
 */

import { productionProfiler, ProductionProfiler } from '../../../src/services/performance/productionProfiler';
import { performanceMonitor } from '../../../src/services/monitoring/performance';

// Mock dependencies
jest.mock('../../../src/services/monitoring/performance');
jest.mock('../../../src/services/monitoring/productionMonitoring');

describe('ProductionProfiler', () => {
  let profiler: ProductionProfiler;

  beforeEach(() => {
    profiler = new ProductionProfiler();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be enabled by default', () => {
      expect(profiler).toBeDefined();
      const status = profiler.getDashboardMetrics();
      expect(status).toBeDefined();
    });

    it('should setup default performance baselines', () => {
      const profiler = new ProductionProfiler();
      expect(profiler).toBeDefined();
      
      // Test that baselines are configured by recording operations
      profiler.recordOperation('app_start_time', 'startup', 2000);
      expect(performanceMonitor.recordMetric).toHaveBeenCalledWith(
        'app_start_time',
        2000,
        'ms',
        'startup'
      );
    });
  });

  describe('enable/disable functionality', () => {
    it('should disable profiling when setEnabled(false) is called', () => {
      profiler.setEnabled(false);
      
      // Should not record metrics when disabled
      profiler.recordOperation('test_operation', 'test', 1000);
      
      // Verify no performance monitoring calls were made
      expect(performanceMonitor.recordMetric).not.toHaveBeenCalled();
    });

    it('should re-enable profiling when setEnabled(true) is called', () => {
      profiler.setEnabled(false);
      profiler.setEnabled(true);
      
      profiler.recordOperation('test_operation', 'test', 1000);
      
      expect(performanceMonitor.recordMetric).toHaveBeenCalledWith(
        'test_operation',
        1000,
        'ms',
        'test'
      );
    });
  });

  describe('operation recording', () => {
    it('should record performance operations', () => {
      profiler.recordOperation('form_generation', 'form', 1200);
      
      expect(performanceMonitor.recordMetric).toHaveBeenCalledWith(
        'form_generation',
        1200,
        'ms',
        'form'
      );
    });

    it('should track operation history for regression analysis', () => {
      // Record multiple measurements
      for (let i = 0; i < 15; i++) {
        profiler.recordOperation('test_operation', 'test', 1000 + i * 10);
      }
      
      // Should have recorded all operations
      expect(performanceMonitor.recordMetric).toHaveBeenCalledTimes(15);
    });

    it('should detect performance regressions', () => {
      const mockOperationTimes = [
        1000, 1020, 1050, 980, 1030, // Baseline: ~1010ms
        1500, 1480, 1520, 1600, 1550  // Regression: ~1530ms (+52%)
      ];
      
      mockOperationTimes.forEach(time => {
        profiler.recordOperation('test_operation', 'test', time);
      });
      
      // Should detect regression after enough samples
      const regressions = profiler.getRegressions();
      expect(regressions.length).toBeGreaterThan(0);
    });
  });

  describe('dashboard metrics', () => {
    it('should return current dashboard metrics', () => {
      const metrics = profiler.getDashboardMetrics();
      
      expect(metrics).toHaveProperty('current');
      expect(metrics).toHaveProperty('trends');
      expect(metrics).toHaveProperty('health');
    });

    it('should calculate health score correctly', () => {
      const metrics = profiler.getDashboardMetrics();
      
      expect(metrics.health).toHaveProperty('score');
      expect(metrics.health).toHaveProperty('status');
      expect(metrics.health).toHaveProperty('issues');
      
      expect(typeof metrics.health.score).toBe('number');
      expect(metrics.health.score).toBeGreaterThanOrEqual(0);
      expect(metrics.health.score).toBeLessThanOrEqual(100);
    });

    it('should provide trend analysis', () => {
      const metrics = profiler.getDashboardMetrics();
      
      expect(metrics.trends).toHaveProperty('memory');
      expect(metrics.trends).toHaveProperty('performance');
      expect(metrics.trends).toHaveProperty('errors');
      
      ['up', 'down', 'stable'].forEach(direction => {
        expect(['up', 'down', 'stable']).toContain(metrics.trends.memory.direction);
      });
    });
  });

  describe('user flow analysis', () => {
    it('should analyze user flows and return critical paths', () => {
      const analysis = profiler.analyzeUserFlows();
      
      expect(analysis).toHaveProperty('criticalPaths');
      expect(analysis).toHaveProperty('recommendations');
      expect(Array.isArray(analysis.criticalPaths)).toBe(true);
      expect(Array.isArray(analysis.recommendations)).toBe(true);
    });

    it('should identify bottlenecks in user flows', () => {
      const analysis = profiler.analyzeUserFlows();
      
      if (analysis.criticalPaths.length > 0) {
        const firstPath = analysis.criticalPaths[0];
        expect(firstPath).toHaveProperty('flow');
        expect(firstPath).toHaveProperty('averageDuration');
        expect(firstPath).toHaveProperty('dropOffRate');
        expect(firstPath).toHaveProperty('bottlenecks');
        expect(Array.isArray(firstPath.bottlenecks)).toBe(true);
      }
    });
  });

  describe('regression detection', () => {
    it('should return active regressions', () => {
      const regressions = profiler.getRegressions();
      expect(Array.isArray(regressions)).toBe(true);
    });

    it('should filter regressions by time period', () => {
      // Add some test regressions
      for (let i = 0; i < 20; i++) {
        profiler.recordOperation('slow_operation', 'test', 2000 + i * 100);
      }
      
      const allRegressions = profiler.getRegressions();
      
      // All returned regressions should be within the last 7 days
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      allRegressions.forEach(regression => {
        expect(regression.detectedAt).toBeGreaterThan(sevenDaysAgo);
      });
    });
  });

  describe('optimization recommendations', () => {
    it('should provide optimization recommendations', () => {
      const recommendations = profiler.getOptimizationRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should prioritize recommendations by impact', () => {
      const recommendations = profiler.getOptimizationRecommendations();
      
      if (recommendations.length > 1) {
        // Verify recommendations are sorted by priority
        const priorities = ['critical', 'high', 'medium', 'low'];
        const priorityScores = recommendations.map(r => priorities.indexOf(r.priority));
        
        for (let i = 1; i < priorityScores.length; i++) {
          expect(priorityScores[i]).toBeGreaterThanOrEqual(priorityScores[i - 1]);
        }
      }
    });

    it('should limit recommendations to top 10', () => {
      const recommendations = profiler.getOptimizationRecommendations();
      expect(recommendations.length).toBeLessThanOrEqual(10);
    });
  });

  describe('performance report generation', () => {
    it('should generate comprehensive performance report', () => {
      const report = profiler.generatePerformanceReport();
      
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('keyMetrics');
      expect(report).toHaveProperty('regressions');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('trends');
    });

    it('should calculate report summary correctly', () => {
      const report = profiler.generatePerformanceReport();
      
      expect(report.summary).toHaveProperty('period');
      expect(report.summary).toHaveProperty('totalSessions');
      expect(report.summary).toHaveProperty('averagePerformance');
      expect(report.summary).toHaveProperty('criticalIssues');
      
      expect(typeof report.summary.totalSessions).toBe('number');
      expect(typeof report.summary.averagePerformance).toBe('number');
      expect(typeof report.summary.criticalIssues).toBe('number');
    });

    it('should include key metrics in report', () => {
      const report = profiler.generatePerformanceReport();
      
      expect(report.keyMetrics).toHaveProperty('appStartTime');
      expect(report.keyMetrics).toHaveProperty('formGeneration');
      expect(report.keyMetrics).toHaveProperty('cameraOperations');
      expect(report.keyMetrics).toHaveProperty('memoryUsage');
      
      expect(report.keyMetrics.appStartTime).toHaveProperty('average');
      expect(report.keyMetrics.appStartTime).toHaveProperty('p95');
    });
  });

  describe('error handling', () => {
    it('should handle invalid operation names gracefully', () => {
      expect(() => {
        profiler.recordOperation('', 'test', 1000);
      }).not.toThrow();
      
      expect(() => {
        profiler.recordOperation(null as any, 'test', 1000);
      }).not.toThrow();
    });

    it('should handle invalid duration values gracefully', () => {
      expect(() => {
        profiler.recordOperation('test', 'test', -1000);
      }).not.toThrow();
      
      expect(() => {
        profiler.recordOperation('test', 'test', NaN);
      }).not.toThrow();
    });

    it('should handle memory constraints gracefully', () => {
      // Record many operations to test memory management
      for (let i = 0; i < 1000; i++) {
        profiler.recordOperation(`operation_${i}`, 'test', 1000);
      }
      
      // Should not throw or cause memory issues
      const metrics = profiler.getDashboardMetrics();
      expect(metrics).toBeDefined();
    });
  });

  describe('integration with performance monitor', () => {
    it('should integrate with performance monitoring service', () => {
      profiler.recordOperation('integration_test', 'test', 500);
      
      expect(performanceMonitor.recordMetric).toHaveBeenCalledWith(
        'integration_test',
        500,
        'ms',
        'test'
      );
    });

    it('should handle performance monitor errors gracefully', () => {
      // Mock performance monitor to throw error
      (performanceMonitor.recordMetric as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Monitor error');
      });
      
      expect(() => {
        profiler.recordOperation('test_operation', 'test', 1000);
      }).not.toThrow();
    });
  });
});

describe('ProductionProfiler singleton', () => {
  it('should provide singleton instance', () => {
    expect(productionProfiler).toBeDefined();
    expect(productionProfiler).toBeInstanceOf(ProductionProfiler);
  });

  it('should maintain state across calls', () => {
    productionProfiler.recordOperation('singleton_test', 'test', 1000);
    
    const metrics1 = productionProfiler.getDashboardMetrics();
    const metrics2 = productionProfiler.getDashboardMetrics();
    
    // Should return consistent results
    expect(metrics1.current).toEqual(metrics2.current);
  });
});

describe('Performance regression scenarios', () => {
  it('should detect gradual performance degradation', () => {
    const profiler = new ProductionProfiler();
    
    // Simulate gradual degradation
    const baselineTime = 1000;
    const degradationRate = 1.1; // 10% increase per measurement
    
    for (let i = 0; i < 20; i++) {
      const time = baselineTime * Math.pow(degradationRate, i / 5);
      profiler.recordOperation('degrading_operation', 'test', time);
    }
    
    // Should eventually detect regression
    const regressions = profiler.getRegressions();
    expect(regressions.length).toBeGreaterThan(0);
  });

  it('should handle sudden performance spikes', () => {
    const profiler = new ProductionProfiler();
    
    // Normal performance for baseline
    for (let i = 0; i < 15; i++) {
      profiler.recordOperation('spike_test', 'test', 1000);
    }
    
    // Sudden spike
    for (let i = 0; i < 5; i++) {
      profiler.recordOperation('spike_test', 'test', 5000);
    }
    
    const regressions = profiler.getRegressions();
    const spikeRegression = regressions.find(r => 
      r.operation === 'spike_test' && r.severity === 'critical'
    );
    
    expect(spikeRegression).toBeDefined();
  });

  it('should ignore temporary anomalies', () => {
    const profiler = new ProductionProfiler();
    
    // Stable baseline
    for (let i = 0; i < 15; i++) {
      profiler.recordOperation('stable_operation', 'test', 1000);
    }
    
    // Single anomaly
    profiler.recordOperation('stable_operation', 'test', 10000);
    
    // Return to normal
    for (let i = 0; i < 10; i++) {
      profiler.recordOperation('stable_operation', 'test', 1000);
    }
    
    const regressions = profiler.getRegressions();
    const stableRegressions = regressions.filter(r => r.metricName === 'stable_operation');
    
    // Should not detect regression for temporary anomaly
    expect(stableRegressions.length).toBe(0);
  });
});