import {
  evaluateStrategy,
  executeStrategyImplementation,
  captureMetrics,
  calculateImprovement,
  updateBudgetStatus,
  sanitizeError,
} from '../../../src/services/performanceOptimization/strategyExecutor';
import type { OptimizationStrategy, OptimizationResult, PerformanceBudget } from '../../../src/services/performanceOptimization/types';
import type { PerformanceMetrics } from '../../../src/services/performance/productionProfiler';
import type { RegressionAlert } from '../../../src/services/performance/regressionDetection';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeStrategy(overrides?: Partial<OptimizationStrategy>): OptimizationStrategy {
  return {
    id: 'memory-cleanup',
    name: 'Memory Cleanup',
    description: 'Clean up memory',
    category: 'memory',
    priority: 'high',
    impact: 'high',
    effort: 'low',
    targetMetrics: ['memoryUsage'],
    implementation: ['Step 1'],
    automated: true,
    enabled: true,
    ...overrides,
  };
}

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

function makeResult(overrides?: Partial<OptimizationResult>): OptimizationResult {
  return {
    strategyId: 'memory-cleanup',
    timestamp: Date.now(),
    success: true,
    metricsImpact: { before: {}, after: {}, improvement: {} },
    executionTime: 100,
    ...overrides,
  };
}

function makeBudget(overrides?: Partial<PerformanceBudget>): PerformanceBudget {
  return {
    metric: 'memoryUsage',
    target: 100,
    current: 80,
    status: 'within_budget',
    trend: 'stable',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// evaluateStrategy
// ---------------------------------------------------------------------------
describe('evaluateStrategy', () => {
  it('returns recommendation when strategy targets problematic metrics', () => {
    const strategy = makeStrategy({ targetMetrics: ['memoryUsage'] });
    const metrics = makeMetrics();
    const alerts = [makeAlert({ metric: 'memoryUsage' })];

    const result = evaluateStrategy(strategy, metrics, alerts, []);
    expect(result).not.toBeNull();
    expect(result!.potentialImpact).toBeGreaterThan(0);
    expect(result!.confidence).toBe(0.5); // No history
    expect(result!.reasoning).toContain('No historical data available');
    expect(result!.reasoning).toContain('memoryUsage is underperforming');
  });

  it('returns null when no targeted metrics have alerts', () => {
    const strategy = makeStrategy({ targetMetrics: ['memoryUsage'] });
    const metrics = makeMetrics();
    const alerts = [makeAlert({ metric: 'errorRate' })]; // Different metric

    const result = evaluateStrategy(strategy, metrics, alerts, []);
    expect(result).toBeNull();
  });

  it('increases confidence with successful historical results', () => {
    const strategy = makeStrategy({ id: 'test-strat', targetMetrics: ['memoryUsage'] });
    const metrics = makeMetrics();
    const alerts = [makeAlert({ metric: 'memoryUsage' })];
    const history = [
      makeResult({ strategyId: 'test-strat', success: true }),
      makeResult({ strategyId: 'test-strat', success: true }),
    ];

    const result = evaluateStrategy(strategy, metrics, alerts, history);
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe(1 * 0.8 + 0.2); // 100% success rate
    expect(result!.reasoning).toContain('High historical success rate');
  });

  it('adds prerequisites for high-effort strategies', () => {
    const strategy = makeStrategy({ effort: 'high', automated: false, targetMetrics: ['memoryUsage'] });
    const metrics = makeMetrics();
    const alerts = [makeAlert({ metric: 'memoryUsage' })];

    const result = evaluateStrategy(strategy, metrics, alerts, []);
    expect(result!.prerequisites).toContain('Significant development time required');
    expect(result!.prerequisites).toContain('Manual implementation required');
    expect(result!.risks).toContain('High implementation complexity');
  });

  it('adds memory risk for memory category strategies', () => {
    const strategy = makeStrategy({ category: 'memory', targetMetrics: ['memoryUsage'] });
    const metrics = makeMetrics();
    const alerts = [makeAlert({ metric: 'memoryUsage' })];

    const result = evaluateStrategy(strategy, metrics, alerts, []);
    expect(result!.risks).toContain('May temporarily increase memory usage during cleanup');
  });

  it('caps potential impact at 100', () => {
    const strategy = makeStrategy({
      impact: 'high',
      targetMetrics: ['memoryUsage', 'errorRate', 'crashRate', 'portalResponseTime'],
    });
    const metrics = makeMetrics();
    const alerts = [
      makeAlert({ metric: 'memoryUsage' }),
      makeAlert({ metric: 'errorRate' }),
      makeAlert({ metric: 'crashRate' }),
      makeAlert({ metric: 'portalResponseTime' }),
    ];

    const result = evaluateStrategy(strategy, metrics, alerts, []);
    expect(result!.potentialImpact).toBeLessThanOrEqual(100);
  });
});

// ---------------------------------------------------------------------------
// executeStrategyImplementation
// ---------------------------------------------------------------------------
describe('executeStrategyImplementation', () => {
  it('executes memory-cleanup strategy without throwing', async () => {
    const strategy = makeStrategy({ id: 'memory-cleanup' });
    await expect(executeStrategyImplementation(strategy)).resolves.toBeUndefined();
  });

  it('executes lazy-loading strategy without throwing', async () => {
    const strategy = makeStrategy({ id: 'lazy-loading' });
    await expect(executeStrategyImplementation(strategy)).resolves.toBeUndefined();
  });

  it('executes form-caching strategy without throwing', async () => {
    const strategy = makeStrategy({ id: 'form-caching' });
    await expect(executeStrategyImplementation(strategy)).resolves.toBeUndefined();
  });

  it('executes image-optimization strategy without throwing', async () => {
    const strategy = makeStrategy({ id: 'image-optimization' });
    await expect(executeStrategyImplementation(strategy)).resolves.toBeUndefined();
  });

  it('executes network-optimization strategy without throwing', async () => {
    const strategy = makeStrategy({ id: 'network-optimization' });
    await expect(executeStrategyImplementation(strategy)).resolves.toBeUndefined();
  });

  it('executes error-reduction strategy without throwing', async () => {
    const strategy = makeStrategy({ id: 'error-reduction' });
    await expect(executeStrategyImplementation(strategy)).resolves.toBeUndefined();
  });

  it('throws for unknown strategy id', async () => {
    const strategy = makeStrategy({ id: 'unknown-strategy' });
    await expect(executeStrategyImplementation(strategy)).rejects.toThrow(
      'Implementation for strategy unknown-strategy not found'
    );
  });
});

// ---------------------------------------------------------------------------
// captureMetrics
// ---------------------------------------------------------------------------
describe('captureMetrics', () => {
  it('captures memoryUsage from provided function', async () => {
    const getMemory = () => 256;
    const result = await captureMetrics(['memoryUsage'], getMemory);
    expect(result.memoryUsage).toBe(256);
  });

  it('captures appStartTime as a number', async () => {
    const getMemory = () => 100;
    const result = await captureMetrics(['appStartTime'], getMemory);
    expect(typeof result.appStartTime).toBe('number');
    expect(result.appStartTime).toBeGreaterThan(0);
  });

  it('captures multiple metrics at once', async () => {
    const getMemory = () => 128;
    const result = await captureMetrics(['memoryUsage', 'appStartTime'], getMemory);
    expect(result).toHaveProperty('memoryUsage');
    expect(result).toHaveProperty('appStartTime');
  });

  it('returns empty object for empty target metrics', async () => {
    const result = await captureMetrics([], () => 0);
    expect(Object.keys(result).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculateImprovement
// ---------------------------------------------------------------------------
describe('calculateImprovement', () => {
  it('calculates positive improvement when value decreases (non-rate metric)', () => {
    const before = { memoryUsage: 200 } as Partial<PerformanceMetrics>;
    const after = { memoryUsage: 100 } as Partial<PerformanceMetrics>;
    const result = calculateImprovement(before, after);
    expect(result.memoryUsage).toBe(50); // 50% improvement
  });

  it('calculates negative improvement when value increases (non-rate metric)', () => {
    const before = { memoryUsage: 100 } as Partial<PerformanceMetrics>;
    const after = { memoryUsage: 150 } as Partial<PerformanceMetrics>;
    const result = calculateImprovement(before, after);
    expect(result.memoryUsage).toBe(-50); // 50% worse
  });

  it('calculates positive improvement for rate metrics when value increases', () => {
    const before = { autoFillSuccessRate: 0.5 } as Partial<PerformanceMetrics>;
    const after = { autoFillSuccessRate: 1.0 } as Partial<PerformanceMetrics>;
    const result = calculateImprovement(before, after);
    expect(result.autoFillSuccessRate).toBe(100); // 100% improvement
  });

  it('calculates positive improvement for accuracy metrics when value increases', () => {
    const before = { mrzAccuracy: 0.8 } as Partial<PerformanceMetrics>;
    const after = { mrzAccuracy: 0.96 } as Partial<PerformanceMetrics>;
    const result = calculateImprovement(before, after);
    expect(result.mrzAccuracy).toBeCloseTo(20, 1); // 20% improvement
  });

  it('returns empty object when before values are zero', () => {
    const before = { memoryUsage: 0 } as Partial<PerformanceMetrics>;
    const after = { memoryUsage: 100 } as Partial<PerformanceMetrics>;
    const result = calculateImprovement(before, after);
    expect(result).not.toHaveProperty('memoryUsage');
  });

  it('returns empty object for empty inputs', () => {
    const result = calculateImprovement({}, {});
    expect(Object.keys(result).length).toBe(0);
  });

  it('returns 0% when before equals after', () => {
    const before = { memoryUsage: 100 } as Partial<PerformanceMetrics>;
    const after = { memoryUsage: 100 } as Partial<PerformanceMetrics>;
    const result = calculateImprovement(before, after);
    expect(result.memoryUsage).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// updateBudgetStatus
// ---------------------------------------------------------------------------
describe('updateBudgetStatus', () => {
  it('sets within_budget when current <= target for non-rate metric', () => {
    const budget = makeBudget({ metric: 'memoryUsage', target: 100 });
    updateBudgetStatus(budget, 80);
    expect(budget.current).toBe(80);
    expect(budget.status).toBe('within_budget');
  });

  it('sets at_risk when current slightly exceeds target for non-rate metric', () => {
    const budget = makeBudget({ metric: 'memoryUsage', target: 100 });
    updateBudgetStatus(budget, 115); // within 120% of target
    expect(budget.status).toBe('at_risk');
  });

  it('sets over_budget when current greatly exceeds target for non-rate metric', () => {
    const budget = makeBudget({ metric: 'memoryUsage', target: 100 });
    updateBudgetStatus(budget, 150); // > 120% of target
    expect(budget.status).toBe('over_budget');
  });

  it('sets within_budget when current >= target for rate metric', () => {
    const budget = makeBudget({ metric: 'autoFillSuccessRate' as any, target: 0.9 });
    updateBudgetStatus(budget, 0.95);
    expect(budget.status).toBe('within_budget');
  });

  it('sets at_risk when rate metric is close to target', () => {
    const budget = makeBudget({ metric: 'autoFillSuccessRate' as any, target: 1.0 });
    updateBudgetStatus(budget, 0.92); // >= 0.9 (90% of target)
    expect(budget.status).toBe('at_risk');
  });

  it('sets over_budget when rate metric is far below target', () => {
    const budget = makeBudget({ metric: 'autoFillSuccessRate' as any, target: 1.0 });
    updateBudgetStatus(budget, 0.5); // < 0.9 (90% of target)
    expect(budget.status).toBe('over_budget');
  });

  it('handles accuracy metrics same as rate metrics', () => {
    const budget = makeBudget({ metric: 'mrzAccuracy' as any, target: 0.95 });
    updateBudgetStatus(budget, 0.96);
    expect(budget.status).toBe('within_budget');
  });
});

// ---------------------------------------------------------------------------
// sanitizeError
// ---------------------------------------------------------------------------
describe('sanitizeError', () => {
  it('converts Error objects to sanitized strings', () => {
    const result = sanitizeError(new Error('Something went wrong'));
    expect(typeof result).toBe('string');
    expect(result).toContain('Something went wrong');
  });

  it('returns "Unknown error" for non-Error values', () => {
    const result = sanitizeError('just a string');
    expect(result).toContain('Unknown error');
  });

  it('returns "Unknown error" for undefined', () => {
    const result = sanitizeError(undefined);
    expect(result).toContain('Unknown error');
  });

  it('returns "Unknown error" for null', () => {
    const result = sanitizeError(null);
    expect(result).toContain('Unknown error');
  });
});
