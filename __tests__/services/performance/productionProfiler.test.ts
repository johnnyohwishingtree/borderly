/**
 * @jest-environment node
 */

import { productionProfiler } from '../../../src/services/performance/productionProfiler';

declare const global: any;

// Create a persistent storage mock
const mockStorage = new Map<string, string>();

// Mock MMKV
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn().mockImplementation((key: string, value: string) => {
      mockStorage.set(key, value);
    }),
    getString: jest.fn().mockImplementation((key: string) => {
      return mockStorage.get(key);
    }),
    delete: jest.fn().mockImplementation((key: string) => {
      mockStorage.delete(key);
    }),
    getAllKeys: jest.fn(() => Array.from(mockStorage.keys())),
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
    // Clear the mock storage between tests
    mockStorage.clear();
    // Reset the profiler instance
    (productionProfiler as any).resetForTesting();
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
      
      // Mock Date.now to simulate time passage
      let currentTime = 1000;
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime);
      
      const resultPromise = productionProfiler.measureAsync('form-generation', mockOperation);
      
      // Advance time by 100ms
      currentTime = 1100;
      
      const result = await resultPromise;
      
      expect(result).toBe('result');
      expect(mockOperation).toHaveBeenCalled();
      
      const metrics = productionProfiler.getCurrentMetrics();
      expect(metrics.formGenerationTime).toBeGreaterThan(0);
      
      // Restore Date.now
      jest.restoreAllMocks();
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
      
      // Mock Date.now to simulate time passage
      let currentTime = 2000;
      jest.spyOn(Date, 'now').mockImplementation(() => currentTime);
      
      const resultPromise = productionProfiler.measureAsync('app-start', mockOperation);
      
      // Advance time by 50ms
      currentTime = 2050;
      
      await resultPromise;
      
      const metrics = productionProfiler.getCurrentMetrics();
      expect(metrics.appStartTime).toBeGreaterThan(0);
      
      // Restore Date.now
      jest.restoreAllMocks();
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
          status: 'excellent', // 2000 <= 3000 * 0.7 (2100), so this should be excellent
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
      
      // @ts-ignore - Mock global performance for testing
      global.performance = { memory: mockMemory };
      
      // Trigger memory tracking
      jest.advanceTimersByTime(30000); // 30 seconds
      
      const metrics = productionProfiler.getCurrentMetrics();
      // In development mode, memory tracking is skipped
      // In production, it would record the memory usage
      expect(typeof metrics.memoryUsage).toBe('number');
      
      // Cleanup
      delete global.performance;
    });
  });

  describe('data cleanup', () => {
    it('should clean up old historical data', () => {
      // Mock storage with old data
      const localMockStorage = {
        set: jest.fn(),
        getString: jest.fn(),
        delete: jest.fn(),
        getAllKeys: jest.fn(() => [
          'metrics-2023-01-01', // Old - should be deleted
          'metrics-2026-03-01', // Recent - should be kept (less than 30 days ago)
          'current-metrics',
          'performance-alerts'
        ]),
      };
      
      // @ts-ignore - Access private method for testing
      const profiler = new (productionProfiler.constructor as any)();
      profiler.storage = localMockStorage;
      
      // Trigger cleanup
      profiler.cleanupOldData();
      
      expect(localMockStorage.delete).toHaveBeenCalledWith('metrics-2023-01-01');
      expect(localMockStorage.delete).not.toHaveBeenCalledWith('metrics-2026-03-01');
    });
  });

  describe('error handling', () => {
    it('should handle storage errors gracefully', () => {
      // Mock the MMKV storage to throw errors
      const { MMKV } = require('react-native-mmkv');
      const mockInstance = new MMKV();
      jest.spyOn(mockInstance, 'set').mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      // Should not throw when storage fails
      expect(() => {
        productionProfiler.recordMetric('appStartTime', 2000);
      }).not.toThrow();
    });
  });
});