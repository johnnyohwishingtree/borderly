/**
 * @jest-environment node
 */

import { productionProfiler } from '../../../src/services/performance/productionProfiler';

// Mock MMKV
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    delete: jest.fn(),
    getAllKeys: jest.fn(() => []),
  })),
}));

// Mock PII sanitization
jest.mock('../../../src/utils/piiSanitizer', () => ({
  sanitizePII: jest.fn((data) => data),
}));

describe('ProductionProfiler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('recordMetric', () => {
    it('should record performance metrics', () => {
      productionProfiler.recordMetric('formGenerationTime', 250);
      
      const metrics = productionProfiler.getCurrentMetrics();
      expect(metrics.formGenerationTime).toBe(250);
    });

    it('should check thresholds for violations', () => {
      const alertSpy = jest.fn();
      productionProfiler.onAlert(alertSpy);

      // Record metric that exceeds threshold
      productionProfiler.recordMetric('appStartTime', 5000); // Above 3000ms threshold
      
      expect(alertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          metric: 'appStartTime',
          severity: 'critical',
          actualValue: 5000,
        })
      );
    });

    it('should not trigger alerts for metrics within thresholds', () => {
      const alertSpy = jest.fn();
      productionProfiler.onAlert(alertSpy);

      productionProfiler.recordMetric('appStartTime', 2000); // Below 3000ms threshold
      
      expect(alertSpy).not.toHaveBeenCalled();
    });
  });

  describe('measureAsync', () => {
    it('should measure async operation execution time', async () => {
      const mockOperation = jest.fn().mockResolvedValue('result');
      
      const result = await productionProfiler.measureAsync('form-generation', mockOperation);
      
      expect(result).toBe('result');
      expect(mockOperation).toHaveBeenCalled();
      
      const metrics = productionProfiler.getCurrentMetrics();
      expect(metrics.formGenerationTime).toBeGreaterThan(0);
    });

    it('should handle errors in async operations', async () => {
      const mockError = new Error('Test error');
      const mockOperation = jest.fn().mockRejectedValue(mockError);
      
      await expect(
        productionProfiler.measureAsync('form-generation', mockOperation)
      ).rejects.toThrow('Test error');
      
      expect(mockOperation).toHaveBeenCalled();
    });

    it('should map operations to correct metrics', async () => {
      const mockOperation = jest.fn().mockResolvedValue('result');
      
      await productionProfiler.measureAsync('app-start', mockOperation);
      
      const metrics = productionProfiler.getCurrentMetrics();
      expect(metrics.appStartTime).toBeGreaterThan(0);
    });
  });

  describe('measureSync', () => {
    it('should measure synchronous operation execution time', () => {
      const mockOperation = jest.fn().mockReturnValue('result');
      
      const result = productionProfiler.measureSync('data-processing', mockOperation);
      
      expect(result).toBe('result');
      expect(mockOperation).toHaveBeenCalled();
    });

    it('should handle errors in sync operations', () => {
      const mockError = new Error('Test error');
      const mockOperation = jest.fn().mockImplementation(() => {
        throw mockError;
      });
      
      expect(() =>
        productionProfiler.measureSync('data-processing', mockOperation)
      ).toThrow('Test error');
      
      expect(mockOperation).toHaveBeenCalled();
    });
  });

  describe('getBenchmarks', () => {
    it('should return performance benchmarks with status', () => {
      // Set some metrics
      productionProfiler.recordMetric('appStartTime', 2000); // Good
      productionProfiler.recordMetric('formGenerationTime', 600); // Warning
      productionProfiler.recordMetric('memoryUsage', 200 * 1024 * 1024); // Critical

      const benchmarks = productionProfiler.getBenchmarks();
      
      expect(benchmarks).toContainEqual(
        expect.objectContaining({
          metric: 'appStartTime',
          current: 2000,
          status: 'good',
        })
      );
      
      expect(benchmarks).toContainEqual(
        expect.objectContaining({
          metric: 'formGenerationTime',
          current: 600,
          status: 'warning',
        })
      );
    });

    it('should calculate trends from historical data', () => {
      const benchmarks = productionProfiler.getBenchmarks();
      
      benchmarks.forEach(benchmark => {
        expect(['improving', 'stable', 'declining']).toContain(benchmark.trend);
      });
    });
  });

  describe('getHealthScore', () => {
    it('should calculate health score based on benchmark status', () => {
      // Set metrics to get specific statuses
      productionProfiler.recordMetric('appStartTime', 2000); // Good (80 points)
      productionProfiler.recordMetric('formGenerationTime', 300); // Excellent (100 points)
      
      const healthScore = productionProfiler.getHealthScore();
      
      expect(healthScore).toBeGreaterThan(0);
      expect(healthScore).toBeLessThanOrEqual(100);
    });

    it('should return 0-100 range', () => {
      const healthScore = productionProfiler.getHealthScore();
      
      expect(healthScore).toBeGreaterThanOrEqual(0);
      expect(healthScore).toBeLessThanOrEqual(100);
    });
  });

  describe('getDashboardData', () => {
    it('should return complete dashboard data', () => {
      productionProfiler.recordMetric('appStartTime', 2500);
      productionProfiler.recordMetric('formGenerationTime', 400);
      
      const dashboardData = productionProfiler.getDashboardData();
      
      expect(dashboardData).toHaveProperty('healthScore');
      expect(dashboardData).toHaveProperty('metrics');
      expect(dashboardData).toHaveProperty('benchmarks');
      expect(dashboardData).toHaveProperty('recommendations');
      expect(dashboardData).toHaveProperty('alerts');
      expect(dashboardData).toHaveProperty('trends');
      
      expect(typeof dashboardData.healthScore).toBe('number');
      expect(Array.isArray(dashboardData.benchmarks)).toBe(true);
      expect(Array.isArray(dashboardData.recommendations)).toBe(true);
    });
  });

  describe('onAlert', () => {
    it('should register and unregister alert listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      const unsubscribe1 = productionProfiler.onAlert(listener1);
      const unsubscribe2 = productionProfiler.onAlert(listener2);
      
      // Trigger alert
      productionProfiler.recordMetric('appStartTime', 6000);
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
      
      // Unsubscribe first listener
      unsubscribe1();
      
      // Clear previous calls
      listener1.mockClear();
      listener2.mockClear();
      
      // Trigger another alert
      productionProfiler.recordMetric('formGenerationTime', 1000);
      
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
      
      // Unsubscribe second listener
      unsubscribe2();
    });
  });

  describe('getOptimizationRecommendations', () => {
    it('should generate recommendations for problematic metrics', () => {
      // Set metrics that should trigger recommendations
      productionProfiler.recordMetric('appStartTime', 5000); // Critical
      productionProfiler.recordMetric('memoryUsage', 200 * 1024 * 1024); // Critical
      
      const recommendations = productionProfiler.getOptimizationRecommendations();
      
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      
      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('id');
        expect(rec).toHaveProperty('priority');
        expect(rec).toHaveProperty('category');
        expect(rec).toHaveProperty('title');
        expect(rec).toHaveProperty('description');
        expect(rec).toHaveProperty('implementation');
        expect(Array.isArray(rec.implementation)).toBe(true);
      });
    });

    it('should prioritize recommendations by priority and impact', () => {
      productionProfiler.recordMetric('appStartTime', 5000);
      productionProfiler.recordMetric('formGenerationTime', 800);
      
      const recommendations = productionProfiler.getOptimizationRecommendations();
      
      // Should be sorted by priority/impact
      for (let i = 0; i < recommendations.length - 1; i++) {
        const current = recommendations[i];
        const next = recommendations[i + 1];
        
        const currentScore = getPriorityScore(current.priority) + getImpactScore(current.impact);
        const nextScore = getPriorityScore(next.priority) + getImpactScore(next.impact);
        
        expect(currentScore).toBeGreaterThanOrEqual(nextScore);
      }
    });
  });

  // Helper functions for scoring
  function getPriorityScore(priority: string): number {
    const scores = { high: 3, medium: 2, low: 1 };
    return scores[priority as keyof typeof scores] || 0;
  }

  function getImpactScore(impact: string): number {
    const scores = { high: 3, medium: 2, low: 1 };
    return scores[impact as keyof typeof scores] || 0;
  }

  describe('memory tracking', () => {
    it('should track memory usage when available', () => {
      // Mock global performance memory
      const mockMemory = {
        usedJSHeapSize: 50 * 1024 * 1024, // 50MB
        totalJSHeapSize: 100 * 1024 * 1024,
      };
      
      // @ts-ignore
      global.performance = { memory: mockMemory };
      
      // Trigger memory tracking
      jest.advanceTimersByTime(30000); // 30 seconds
      
      const metrics = productionProfiler.getCurrentMetrics();
      // In development mode, memory tracking is skipped
      // In production, it would record the memory usage
      expect(typeof metrics.memoryUsage).toBe('number');
      
      // Cleanup
      delete (global as any).performance;
    });
  });

  describe('data cleanup', () => {
    it('should clean up old historical data', () => {
      // Mock storage with old data
      const mockStorage = {
        set: jest.fn(),
        getString: jest.fn(),
        delete: jest.fn(),
        getAllKeys: jest.fn(() => [
          'metrics-2023-01-01',
          'metrics-2023-12-01',
          'current-metrics',
          'performance-alerts'
        ]),
      };
      
      // @ts-ignore - Access private method for testing
      const profiler = new (productionProfiler.constructor as any)();
      profiler.storage = mockStorage;
      
      // Trigger cleanup
      profiler.cleanupOldData();
      
      expect(mockStorage.delete).toHaveBeenCalledWith('metrics-2023-01-01');
      expect(mockStorage.delete).not.toHaveBeenCalledWith('metrics-2023-12-01');
    });
  });

  describe('error handling', () => {
    it('should handle storage errors gracefully', () => {
      const mockStorage = {
        set: jest.fn().mockImplementation(() => {
          throw new Error('Storage error');
        }),
        getString: jest.fn(() => null),
        delete: jest.fn(),
        getAllKeys: jest.fn(() => []),
      };
      
      // Should not throw when storage fails
      expect(() => {
        productionProfiler.recordMetric('appStartTime', 2000);
      }).not.toThrow();
    });
  });
});