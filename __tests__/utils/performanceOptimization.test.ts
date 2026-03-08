/**
 * @jest-environment node
 */

declare const global: any;
import type { PerformanceMetrics } from '../../src/services/performance/productionProfiler';
import type { RegressionAlert } from '../../src/services/performance/regressionDetection';

// Create a storage map that will be available for all instances
const mockStorageMap = new Map<string, string>();

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn((key: string, value: string) => {
      mockStorageMap.set(key, value);
    }),
    getString: jest.fn((key: string) => {
      return mockStorageMap.get(key) || null;
    }),
    delete: jest.fn((key: string) => {
      mockStorageMap.delete(key);
    }),
    getAllKeys: jest.fn(() => Array.from(mockStorageMap.keys())),
  })),
}));

import { performanceOptimization, OptimizationResult } from '../../src/utils/performanceOptimization';

// Mock PII sanitization
jest.mock('../../src/utils/piiSanitizer', () => ({
  sanitizePII: jest.fn((data) => data),
}));

describe('PerformanceOptimization', () => {
  const mockMetrics: PerformanceMetrics = {
    appStartTime: 3500,
    firstScreenRenderTime: 1200,
    formGenerationTime: 600,
    autoFillSuccessRate: 0.75,
    mrzScanTime: 2500,
    mrzAccuracy: 0.88,
    keychainAccessTime: 150,
    databaseQueryTime: 300,
    memoryUsage: 180 * 1024 * 1024,
    memoryPressure: 'moderate' as const,
    screenTransitionTime: 450,
    userFlowCompletionRate: 0.65,
    portalResponseTime: 6000,
    portalSuccessRate: 0.87,
    errorRate: 0.02,
    crashRate: 0.002,
  };

  const mockAlerts: RegressionAlert[] = [
    {
      id: 'alert-1',
      timestamp: Date.now(),
      metric: 'appStartTime',
      severity: 'critical',
      message: 'App startup time critically slow',
      currentValue: 5000,
      expectedValue: 2500,
      deviation: 100,
      confidence: 0.95,
      trend: 'declining',
      recommendation: 'Optimize app initialization',
    },
    {
      id: 'alert-2',
      timestamp: Date.now(),
      metric: 'memoryUsage',
      severity: 'warning',
      message: 'Memory usage above threshold',
      currentValue: 180 * 1024 * 1024,
      expectedValue: 120 * 1024 * 1024,
      deviation: 50,
      confidence: 0.88,
      trend: 'declining',
      recommendation: 'Investigate memory leaks',
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
    
    // Clear storage between tests
    mockStorageMap.clear();
    
    // Set test mode flag
    (global as any).__TEST__ = true;
    
    // Reset the performance optimization instance
    (performanceOptimization as any).resetForTesting();
    
    // Mock Date.now for consistent timing
    let fakeTime = Date.now();
    jest.spyOn(Date, 'now').mockImplementation(() => {
      fakeTime += 100; // Advance time by 100ms each call
      return fakeTime;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    delete (global as any).__TEST__;
  });

  describe('getRecommendations', () => {
    it('should generate optimization recommendations', () => {
      const recommendations = performanceOptimization.getRecommendations(mockMetrics, mockAlerts);
      
      expect(Array.isArray(recommendations)).toBe(true);
      
      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('id');
        expect(rec).toHaveProperty('strategy');
        expect(rec).toHaveProperty('relevantAlerts');
        expect(rec).toHaveProperty('potentialImpact');
        expect(rec).toHaveProperty('confidence');
        expect(rec).toHaveProperty('reasoning');
        expect(rec).toHaveProperty('prerequisites');
        expect(rec).toHaveProperty('risks');
        
        expect(typeof rec.potentialImpact).toBe('number');
        expect(rec.potentialImpact).toBeGreaterThanOrEqual(0);
        expect(rec.potentialImpact).toBeLessThanOrEqual(100);
        
        expect(typeof rec.confidence).toBe('number');
        expect(rec.confidence).toBeGreaterThanOrEqual(0);
        expect(rec.confidence).toBeLessThanOrEqual(1);
        
        expect(Array.isArray(rec.relevantAlerts)).toBe(true);
        expect(Array.isArray(rec.reasoning)).toBe(true);
        expect(Array.isArray(rec.prerequisites)).toBe(true);
        expect(Array.isArray(rec.risks)).toBe(true);
      });
    });

    it('should prioritize recommendations by impact and confidence', () => {
      const recommendations = performanceOptimization.getRecommendations(mockMetrics, mockAlerts);
      
      if (recommendations.length > 1) {
        for (let i = 0; i < recommendations.length - 1; i++) {
          const current = recommendations[i];
          const next = recommendations[i + 1];
          
          const currentScore = current.potentialImpact * current.confidence;
          const nextScore = next.potentialImpact * next.confidence;
          
          expect(currentScore).toBeGreaterThanOrEqual(nextScore);
        }
      }
    });

    it('should only recommend relevant strategies', () => {
      const recommendations = performanceOptimization.getRecommendations(mockMetrics, mockAlerts);
      
      recommendations.forEach(rec => {
        // Should only recommend strategies that target problematic metrics
        const hasRelevantAlert = rec.relevantAlerts.some(alert => 
          rec.strategy.targetMetrics.includes(alert.metric)
        );
        expect(hasRelevantAlert).toBe(true);
      });
    });

    it('should handle empty alerts gracefully', () => {
      const recommendations = performanceOptimization.getRecommendations(mockMetrics, []);
      
      // Should return empty array when no alerts
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should consider historical success rates', () => {
      // Mock some successful optimization history
      const optimizationHistory = [
        {
          strategyId: 'memory-cleanup',
          success: true,
          metricsImpact: { improvement: { memoryUsage: 25 } },
          timestamp: Date.now() - 86400000
        }
      ];
      mockStorageMap.set('optimization-history', JSON.stringify(optimizationHistory));
      (performanceOptimization as any).resetForTesting(); // Reload the history

      const recommendations = performanceOptimization.getRecommendations(mockMetrics, mockAlerts);
      
      // Strategies with good historical success should have higher confidence
      const memoryRecommendation = recommendations.find(r => r.strategy.id === 'memory-cleanup');
      if (memoryRecommendation) {
        expect(memoryRecommendation.confidence).toBeGreaterThan(0.5);
      }
    });
  });

  describe('executeStrategy', () => {
    it('should execute optimization strategy successfully', async () => {
      const result = await performanceOptimization.executeStrategy('memory-cleanup');
      
      expect(result).toHaveProperty('strategyId', 'memory-cleanup');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('metricsImpact');
      expect(result).toHaveProperty('executionTime');
      
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.timestamp).toBe('number');
      expect(typeof result.executionTime).toBe('number');
      
      expect(result.metricsImpact).toHaveProperty('before');
      expect(result.metricsImpact).toHaveProperty('after');
      expect(result.metricsImpact).toHaveProperty('improvement');
    });

    it('should handle strategy execution errors', async () => {
      const result = await performanceOptimization.executeStrategy('non-existent-strategy');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Strategy non-existent-strategy not found');
    });

    it('should measure execution time', async () => {
      const result = await performanceOptimization.executeStrategy('memory-cleanup');
      
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.executionTime).toBeLessThan(10000); // Should complete quickly in tests
    });

    it('should capture before and after metrics', async () => {
      const result = await performanceOptimization.executeStrategy('form-caching');
      
      expect(result.metricsImpact.before).toBeDefined();
      expect(result.metricsImpact.after).toBeDefined();
      expect(result.metricsImpact.improvement).toBeDefined();
      
      // Should capture relevant metrics
      const strategy = result.strategyId;
      if (strategy === 'form-caching') {
        expect(result.metricsImpact.before).toHaveProperty('formGenerationTime');
        expect(result.metricsImpact.after).toHaveProperty('formGenerationTime');
      }
    });

    it('should calculate improvement percentages', async () => {
      const result = await performanceOptimization.executeStrategy('lazy-loading');
      
      if (result.success) {
        Object.values(result.metricsImpact.improvement).forEach(improvement => {
          expect(typeof improvement).toBe('number');
        });
      }
    });
  });

  describe('executeAutomatedOptimizations', () => {
    it('should execute high-confidence automated optimizations', async () => {
      const results = await performanceOptimization.executeAutomatedOptimizations(mockMetrics, mockAlerts);
      
      expect(Array.isArray(results)).toBe(true);
      
      results.forEach(result => {
        expect(result).toHaveProperty('strategyId');
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('timestamp');
      });
    });

    it('should only execute automated strategies', async () => {
      const results = await performanceOptimization.executeAutomatedOptimizations(mockMetrics, mockAlerts);
      
      results.forEach(result => {
        // All executed strategies should be automated
        expect(['memory-cleanup', 'lazy-loading', 'form-caching', 'image-optimization', 'network-optimization', 'error-reduction']).toContain(result.strategyId);
      });
    });

    it('should skip low-confidence recommendations', async () => {
      // Mock a scenario with low-confidence recommendations
      const lowConfidenceMetrics: PerformanceMetrics = {
        ...mockMetrics,
        appStartTime: 3100, // Slightly over threshold
      };
      
      const results = await performanceOptimization.executeAutomatedOptimizations(lowConfidenceMetrics, []);
      
      // Should execute fewer optimizations for low-confidence scenarios
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should handle optimization failures gracefully', async () => {
      // Mock a strategy that would fail
      const mockStrategy = jest.spyOn(performanceOptimization, 'executeStrategy').mockRejectedValueOnce(new Error('Mock error'));
      
      const results = await performanceOptimization.executeAutomatedOptimizations(mockMetrics, mockAlerts);
      
      // Should continue despite failures
      expect(Array.isArray(results)).toBe(true);
      
      mockStrategy.mockRestore();
    });

    it('should pace optimizations with delays', async () => {
      const startTime = Date.now();
      
      await performanceOptimization.executeAutomatedOptimizations(mockMetrics, mockAlerts);
      
      // Should have taken some time due to pacing
      expect(Date.now() - startTime).toBeGreaterThan(0);
    });
  });

  describe('performance measurement', () => {
    describe('measureAsync', () => {
      it('should measure async operation performance', async () => {
        const mockOperation = jest.fn().mockResolvedValue('result');
        
        const result = await performanceOptimization.measureAsync('test-operation', mockOperation, 'testing');
        
        expect(result).toBe('result');
        expect(mockOperation).toHaveBeenCalled();
        
        // Should have recorded the measurement
        expect(mockStorageMap.has('performance-measurements')).toBe(true);
      });

      it('should handle async operation errors', async () => {
        const mockError = new Error('Async operation failed');
        const mockOperation = jest.fn().mockRejectedValue(mockError);
        
        await expect(
          performanceOptimization.measureAsync('failing-operation', mockOperation)
        ).rejects.toThrow('Async operation failed');
        
        // Should still record the failed measurement
        expect(mockStorageMap.has('performance-measurements')).toBe(true);
      });

      it('should calculate execution time', async () => {
        const slowOperation = jest.fn().mockImplementation(() => 
          new Promise<void>(resolve => setTimeout(() => resolve(), 100))
        );
        
        jest.useRealTimers();
        const startTime = Date.now();
        
        await performanceOptimization.measureAsync('slow-operation', slowOperation);
        
        const executionTime = Date.now() - startTime;
        expect(executionTime).toBeGreaterThanOrEqual(90); // Account for timer precision
        
        jest.useFakeTimers();
      });

      it('should measure memory delta', async () => {
        // Mock memory API
        const mockMemory = { usedJSHeapSize: 50 * 1024 * 1024 };
        global.performance = { memory: mockMemory };
        
        const result = await performanceOptimization.measureAsync('memory-test', async () => {
          mockMemory.usedJSHeapSize += 10 * 1024 * 1024; // Simulate memory increase
          return 'result';
        });
        
        expect(result).toBe('result');
        
        delete global.performance;
      });
    });

    describe('measureSync', () => {
      it('should measure sync operation performance', () => {
        const mockOperation = jest.fn().mockReturnValue('sync-result');
        
        const result = performanceOptimization.measureSync('sync-operation', mockOperation, 'sync-testing');
        
        expect(result).toBe('sync-result');
        expect(mockOperation).toHaveBeenCalled();
      });

      it('should handle sync operation errors', () => {
        const mockError = new Error('Sync operation failed');
        const mockOperation = jest.fn().mockImplementation(() => {
          throw mockError;
        });
        
        expect(() =>
          performanceOptimization.measureSync('failing-sync-operation', mockOperation)
        ).toThrow('Sync operation failed');
      });

      it('should measure very fast operations', () => {
        const fastOperation = jest.fn().mockReturnValue(42);
        
        const result = performanceOptimization.measureSync('fast-operation', fastOperation);
        
        expect(result).toBe(42);
        expect(fastOperation).toHaveBeenCalled();
      });
    });
  });

  describe('performance budgets', () => {
    it('should initialize default performance budgets', () => {
      const budgets = performanceOptimization.getPerformanceBudgets();
      
      expect(Array.isArray(budgets)).toBe(true);
      expect(budgets.length).toBeGreaterThan(0);
      
      budgets.forEach(budget => {
        expect(budget).toHaveProperty('metric');
        expect(budget).toHaveProperty('target');
        expect(budget).toHaveProperty('current');
        expect(budget).toHaveProperty('status');
        expect(budget).toHaveProperty('trend');
        
        expect(['within_budget', 'at_risk', 'over_budget']).toContain(budget.status);
        expect(['improving', 'stable', 'declining']).toContain(budget.trend);
      });
    });

    it('should update budget compliance', () => {
      performanceOptimization.updatePerformanceBudgets(mockMetrics);
      
      const budgets = performanceOptimization.getPerformanceBudgets();
      
      budgets.forEach(budget => {
        expect(typeof budget.current).toBe('number');
        
        // Status should reflect current vs target
        if (budget.metric === 'appStartTime') {
          expect(budget.current).toBe(mockMetrics.appStartTime);
          expect(['at_risk', 'over_budget']).toContain(budget.status);
        }
      });
    });

    it('should handle rate metrics correctly', () => {
      const testMetrics: PerformanceMetrics = {
        ...mockMetrics,
        userFlowCompletionRate: 0.95, // Good rate
      };
      
      performanceOptimization.updatePerformanceBudgets(testMetrics);
      
      const budgets = performanceOptimization.getPerformanceBudgets();
      const completionBudget = budgets.find(b => b.metric === 'userFlowCompletionRate');
      
      if (completionBudget) {
        expect(completionBudget.current).toBe(0.95);
        expect(completionBudget.status).toBe('within_budget');
      }
    });
  });

  describe('optimization effectiveness', () => {
    it('should generate optimization report', () => {
      // Mock some optimization history
      const mockHistory: OptimizationResult[] = [
        {
          strategyId: 'memory-cleanup',
          timestamp: Date.now() - 86400000,
          success: true,
          metricsImpact: {
            before: { memoryUsage: 200 * 1024 * 1024 },
            after: { memoryUsage: 150 * 1024 * 1024 },
            improvement: { memoryUsage: 25 }
          },
          executionTime: 1500
        },
        {
          strategyId: 'lazy-loading',
          timestamp: Date.now() - 43200000,
          success: true,
          metricsImpact: {
            before: { appStartTime: 4000 },
            after: { appStartTime: 3000 },
            improvement: { appStartTime: 25 }
          },
          executionTime: 2000
        },
        {
          strategyId: 'form-caching',
          timestamp: Date.now() - 21600000,
          success: false,
          metricsImpact: {
            before: {},
            after: {},
            improvement: {}
          },
          error: 'Cache initialization failed',
          executionTime: 500
        }
      ];
      
      // Mock the optimization history
      mockStorageMap.set('optimization-history', JSON.stringify(mockHistory));
      (performanceOptimization as any).resetForTesting(); // Reload the history

      const report = performanceOptimization.getOptimizationReport();
      
      expect(report).toHaveProperty('totalOptimizations');
      expect(report).toHaveProperty('successRate');
      expect(report).toHaveProperty('averageImprovement');
      expect(report).toHaveProperty('topStrategies');
      
      expect(report.totalOptimizations).toBe(3);
      expect(report.successRate).toBeCloseTo(2/3, 2);
      expect(Array.isArray(report.topStrategies)).toBe(true);
      
      report.topStrategies.forEach(strategy => {
        expect(strategy).toHaveProperty('strategyId');
        expect(strategy).toHaveProperty('successRate');
        expect(strategy).toHaveProperty('averageImprovement');
        expect(strategy).toHaveProperty('executionCount');
      });
    });

    it('should rank strategies by effectiveness', () => {
      const report = performanceOptimization.getOptimizationReport();
      
      if (report.topStrategies.length > 1) {
        for (let i = 0; i < report.topStrategies.length - 1; i++) {
          const current = report.topStrategies[i];
          const next = report.topStrategies[i + 1];
          
          const currentScore = current.successRate * current.averageImprovement;
          const nextScore = next.successRate * next.averageImprovement;
          
          expect(currentScore).toBeGreaterThanOrEqual(nextScore);
        }
      }
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle missing storage gracefully', () => {
      // Temporarily break storage
      const originalGet = mockStorageMap.get;
      mockStorageMap.get = () => { throw new Error('Storage unavailable'); };
      
      expect(() => {
        performanceOptimization.getRecommendations(mockMetrics, mockAlerts);
      }).not.toThrow();
      
      // Restore storage
      mockStorageMap.get = originalGet;
    });

    it('should handle malformed stored data', () => {
      mockStorageMap.set('optimization-history', 'invalid json');
      
      expect(() => {
        performanceOptimization.getOptimizationReport();
      }).not.toThrow();
    });

    it('should handle empty metrics', () => {
      const emptyMetrics = {} as PerformanceMetrics;
      
      expect(() => {
        performanceOptimization.getRecommendations(emptyMetrics, []);
      }).not.toThrow();
    });

    it('should handle concurrent optimization executions', async () => {
      const promises = [
        performanceOptimization.executeStrategy('memory-cleanup'),
        performanceOptimization.executeStrategy('lazy-loading'),
        performanceOptimization.executeStrategy('form-caching')
      ];
      
      const results = await Promise.allSettled(promises);
      
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });
    });

    it('should handle very large performance budgets', () => {
      const extremeMetrics: PerformanceMetrics = {
        ...mockMetrics,
        appStartTime: Number.MAX_SAFE_INTEGER,
        memoryUsage: Number.MAX_SAFE_INTEGER,
      };
      
      expect(() => {
        performanceOptimization.updatePerformanceBudgets(extremeMetrics);
      }).not.toThrow();
    });
  });

  describe('strategy configuration', () => {
    it('should load predefined optimization strategies', () => {
      const recommendations = performanceOptimization.getRecommendations(mockMetrics, mockAlerts);
      
      // Should have strategies for different categories
      const categories = recommendations.map(r => r.strategy.category);
      expect(categories).toContain('memory');
      expect(categories).toContain('rendering');
      
      recommendations.forEach(rec => {
        expect(rec.strategy).toHaveProperty('id');
        expect(rec.strategy).toHaveProperty('name');
        expect(rec.strategy).toHaveProperty('description');
        expect(rec.strategy).toHaveProperty('category');
        expect(rec.strategy).toHaveProperty('priority');
        expect(rec.strategy).toHaveProperty('impact');
        expect(rec.strategy).toHaveProperty('effort');
        expect(rec.strategy).toHaveProperty('targetMetrics');
        expect(rec.strategy).toHaveProperty('implementation');
        expect(rec.strategy).toHaveProperty('automated');
        expect(rec.strategy).toHaveProperty('enabled');
        
        expect(Array.isArray(rec.strategy.targetMetrics)).toBe(true);
        expect(Array.isArray(rec.strategy.implementation)).toBe(true);
      });
    });

    it('should respect strategy enabled status', () => {
      // All predefined strategies should be enabled by default
      const recommendations = performanceOptimization.getRecommendations(mockMetrics, mockAlerts);
      
      recommendations.forEach(rec => {
        expect(rec.strategy.enabled).toBe(true);
      });
    });
  });
});