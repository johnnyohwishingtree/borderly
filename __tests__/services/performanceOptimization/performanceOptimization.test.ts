jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn().mockReturnValue(undefined),
    setString: jest.fn(),
    getBoolean: jest.fn().mockReturnValue(false),
    set: jest.fn(),
    delete: jest.fn(),
    contains: jest.fn().mockReturnValue(false),
  })),
}));

import { performanceOptimization } from '../../../src/services/performanceOptimization/performanceOptimization';
import type { PerformanceMetrics } from '../../../src/services/performance/productionProfiler';
import type { RegressionAlert } from '../../../src/services/performance/regressionDetection';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeMetrics(overrides?: Partial<PerformanceMetrics>): PerformanceMetrics {
  return {
    appStartTime: 2000,
    firstScreenRenderTime: 500,
    formGenerationTime: 300,
    autoFillSuccessRate: 0.9,
    mrzScanTime: 1500,
    mrzAccuracy: 0.95,
    keychainAccessTime: 50,
    databaseQueryTime: 100,
    memoryUsage: 150,
    memoryPressure: 'moderate',
    screenTransitionTime: 200,
    userFlowCompletionRate: 0.85,
    portalResponseTime: 3000,
    portalSuccessRate: 0.8,
    errorRate: 0.02,
    crashRate: 0.001,
    ...overrides,
  } as PerformanceMetrics;
}

function makeAlert(overrides?: Partial<RegressionAlert>): RegressionAlert {
  return {
    id: 'alert-1',
    timestamp: Date.now(),
    metric: 'memoryUsage',
    severity: 'warning',
    message: 'Memory usage increased',
    currentValue: 200,
    expectedValue: 100,
    deviation: 2,
    confidence: 0.9,
    trend: 'declining',
    ...overrides,
  } as RegressionAlert;
}

// ---------------------------------------------------------------------------
// performanceOptimization singleton
// ---------------------------------------------------------------------------
describe('performanceOptimization singleton', () => {
  beforeEach(() => {
    performanceOptimization.resetForTesting();
  });

  it('exposes getRecommendations method', () => {
    expect(typeof performanceOptimization.getRecommendations).toBe('function');
  });

  it('exposes executeStrategy method', () => {
    expect(typeof performanceOptimization.executeStrategy).toBe('function');
  });

  it('exposes getPerformanceBudgets method', () => {
    expect(typeof performanceOptimization.getPerformanceBudgets).toBe('function');
  });

  it('exposes updatePerformanceBudgets method', () => {
    expect(typeof performanceOptimization.updatePerformanceBudgets).toBe('function');
  });

  it('exposes getOptimizationReport method', () => {
    expect(typeof performanceOptimization.getOptimizationReport).toBe('function');
  });

  it('exposes measureAsync method', () => {
    expect(typeof performanceOptimization.measureAsync).toBe('function');
  });

  it('exposes measureSync method', () => {
    expect(typeof performanceOptimization.measureSync).toBe('function');
  });

  describe('getRecommendations', () => {
    it('returns recommendations for metrics with alerts', () => {
      const metrics = makeMetrics();
      const alerts = [makeAlert({ metric: 'memoryUsage' })];
      const recs = performanceOptimization.getRecommendations(metrics, alerts);
      expect(recs.length).toBeGreaterThan(0);
      // Should be sorted by impact * confidence descending
      for (let i = 1; i < recs.length; i++) {
        const prevScore = recs[i - 1].potentialImpact * recs[i - 1].confidence;
        const currScore = recs[i].potentialImpact * recs[i].confidence;
        expect(prevScore).toBeGreaterThanOrEqual(currScore);
      }
    });

    it('returns empty array when no alerts match any strategy', () => {
      const metrics = makeMetrics();
      const alerts = [makeAlert({ metric: 'keychainAccessTime' })];
      const recs = performanceOptimization.getRecommendations(metrics, alerts);
      expect(recs.length).toBe(0);
    });
  });

  describe('executeStrategy', () => {
    it('returns success result for valid strategy', async () => {
      const result = await performanceOptimization.executeStrategy('memory-cleanup');
      expect(result.success).toBe(true);
      expect(result.strategyId).toBe('memory-cleanup');
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('returns failure result for unknown strategy', async () => {
      const result = await performanceOptimization.executeStrategy('nonexistent');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Strategy nonexistent not found');
    });
  });

  describe('getOptimizationReport', () => {
    it('returns empty report initially', () => {
      const report = performanceOptimization.getOptimizationReport();
      expect(report.totalOptimizations).toBe(0);
      expect(report.successRate).toBe(0);
      expect(report.averageImprovement).toBe(0);
      expect(report.topStrategies).toEqual([]);
    });

    it('returns report with data after executing a strategy', async () => {
      await performanceOptimization.executeStrategy('memory-cleanup');
      const report = performanceOptimization.getOptimizationReport();
      expect(report.totalOptimizations).toBe(1);
      expect(report.successRate).toBe(1);
      expect(report.topStrategies.length).toBe(1);
      expect(report.topStrategies[0].strategyId).toBe('memory-cleanup');
    });
  });

  describe('getPerformanceBudgets', () => {
    it('returns default budgets on initialization', () => {
      const budgets = performanceOptimization.getPerformanceBudgets();
      expect(budgets.length).toBeGreaterThan(0);
      const metrics = budgets.map(b => b.metric);
      expect(metrics).toContain('appStartTime');
      expect(metrics).toContain('memoryUsage');
    });
  });

  describe('updatePerformanceBudgets', () => {
    it('updates budget statuses based on current metrics', () => {
      const metrics = makeMetrics({ appStartTime: 5000, memoryUsage: 500 * 1024 * 1024 });
      performanceOptimization.updatePerformanceBudgets(metrics);
      const budgets = performanceOptimization.getPerformanceBudgets();
      const appStartBudget = budgets.find(b => b.metric === 'appStartTime');
      expect(appStartBudget!.current).toBe(5000);
      expect(appStartBudget!.status).toBe('over_budget');
    });
  });

  describe('measureAsync', () => {
    it('returns the result of the measured function', async () => {
      const result = await performanceOptimization.measureAsync('test-op', async () => 42);
      expect(result).toBe(42);
    });

    it('rethrows errors from the measured function', async () => {
      await expect(
        performanceOptimization.measureAsync('test-op', async () => {
          throw new Error('test error');
        })
      ).rejects.toThrow('test error');
    });
  });

  describe('measureSync', () => {
    it('returns the result of the measured function', () => {
      const result = performanceOptimization.measureSync('test-op', () => 'hello');
      expect(result).toBe('hello');
    });

    it('rethrows errors from the measured function', () => {
      expect(() =>
        performanceOptimization.measureSync('test-op', () => {
          throw new Error('sync error');
        })
      ).toThrow('sync error');
    });
  });
});
