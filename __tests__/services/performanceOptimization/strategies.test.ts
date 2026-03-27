import { OPTIMIZATION_STRATEGIES } from '../../../src/services/performanceOptimization/strategies';
import type { OptimizationStrategy } from '../../../src/services/performanceOptimization/types';

// ---------------------------------------------------------------------------
// OPTIMIZATION_STRATEGIES
// ---------------------------------------------------------------------------
describe('OPTIMIZATION_STRATEGIES', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(OPTIMIZATION_STRATEGIES)).toBe(true);
    expect(OPTIMIZATION_STRATEGIES.length).toBeGreaterThan(0);
  });

  it('contains 8 strategies', () => {
    expect(OPTIMIZATION_STRATEGIES.length).toBe(8);
  });

  const requiredFields: (keyof OptimizationStrategy)[] = [
    'id',
    'name',
    'description',
    'category',
    'priority',
    'impact',
    'effort',
    'targetMetrics',
    'implementation',
    'automated',
    'enabled',
  ];

  it.each(OPTIMIZATION_STRATEGIES.map(s => [s.id, s] as const))(
    'strategy %s has all required fields',
    (_id, strategy) => {
      for (const field of requiredFields) {
        expect(strategy).toHaveProperty(field);
      }
    }
  );

  it.each(OPTIMIZATION_STRATEGIES.map(s => [s.id, s] as const))(
    'strategy %s has non-empty name and description',
    (_id, strategy) => {
      expect(strategy.name.length).toBeGreaterThan(0);
      expect(strategy.description.length).toBeGreaterThan(0);
    }
  );

  it.each(OPTIMIZATION_STRATEGIES.map(s => [s.id, s] as const))(
    'strategy %s has valid category',
    (_id, strategy) => {
      expect(['memory', 'rendering', 'data', 'network', 'user-experience']).toContain(strategy.category);
    }
  );

  it.each(OPTIMIZATION_STRATEGIES.map(s => [s.id, s] as const))(
    'strategy %s has valid priority/impact/effort',
    (_id, strategy) => {
      expect(['high', 'medium', 'low']).toContain(strategy.priority);
      expect(['high', 'medium', 'low']).toContain(strategy.impact);
      expect(['low', 'medium', 'high']).toContain(strategy.effort);
    }
  );

  it.each(OPTIMIZATION_STRATEGIES.map(s => [s.id, s] as const))(
    'strategy %s has non-empty targetMetrics and implementation',
    (_id, strategy) => {
      expect(strategy.targetMetrics.length).toBeGreaterThan(0);
      expect(strategy.implementation.length).toBeGreaterThan(0);
    }
  );

  it('has unique strategy IDs', () => {
    const ids = OPTIMIZATION_STRATEGIES.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has unique strategy names', () => {
    const names = OPTIMIZATION_STRATEGIES.map(s => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('contains expected strategy IDs', () => {
    const ids = OPTIMIZATION_STRATEGIES.map(s => s.id);
    expect(ids).toContain('memory-cleanup');
    expect(ids).toContain('lazy-loading');
    expect(ids).toContain('form-caching');
    expect(ids).toContain('network-optimization');
    expect(ids).toContain('error-reduction');
  });
});
