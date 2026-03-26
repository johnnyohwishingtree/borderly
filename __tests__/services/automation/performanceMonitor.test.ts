import { PerformanceMonitor } from '../../../src/services/automation/performanceMonitor';

// ---------------------------------------------------------------------------
// Setup — clear metrics between tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  PerformanceMonitor.clearMetrics();
});

// ---------------------------------------------------------------------------
// startTiming / endTiming
// ---------------------------------------------------------------------------
describe('startTiming', () => {
  it('returns a unique timing ID containing the operation name', () => {
    const id = PerformanceMonitor.startTiming('loadForm');
    expect(id).toContain('loadForm');
  });
});

describe('endTiming', () => {
  it('records duration and returns non-negative value', () => {
    const id = PerformanceMonitor.startTiming('loadForm');
    const duration = PerformanceMonitor.endTiming(id, true);
    expect(duration).toBeGreaterThanOrEqual(0);
  });

  it('returns -1 for unknown timing ID', () => {
    const duration = PerformanceMonitor.endTiming('nonexistent_id');
    expect(duration).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// getStats
// ---------------------------------------------------------------------------
describe('getStats', () => {
  it('returns stats for a specific operation', () => {
    const id1 = PerformanceMonitor.startTiming('fillField');
    PerformanceMonitor.endTiming(id1, true);
    const id2 = PerformanceMonitor.startTiming('fillField');
    PerformanceMonitor.endTiming(id2, false);

    const stats = PerformanceMonitor.getStats('fillField');
    expect(stats['fillField']).toBeDefined();
    expect(stats['fillField'].totalOperations).toBe(2);
    expect(stats['fillField'].successfulOperations).toBe(1);
    expect(stats['fillField'].successRate).toBe(0.5);
  });

  it('returns stats for all operations when no name given', () => {
    const id1 = PerformanceMonitor.startTiming('opA');
    PerformanceMonitor.endTiming(id1, true);
    const id2 = PerformanceMonitor.startTiming('opB');
    PerformanceMonitor.endTiming(id2, true);

    const stats = PerformanceMonitor.getStats();
    expect(stats['opA']).toBeDefined();
    expect(stats['opB']).toBeDefined();
  });

  it('returns empty object for unknown operation', () => {
    const stats = PerformanceMonitor.getStats('unknown');
    expect(stats).toEqual({});
  });

  it('computes min, max, median, average, and p95', () => {
    for (let i = 0; i < 5; i++) {
      const id = PerformanceMonitor.startTiming('bulk');
      PerformanceMonitor.endTiming(id, true);
    }

    const stats = PerformanceMonitor.getStats('bulk');
    const s = stats['bulk'];
    expect(s.minDuration).toBeGreaterThanOrEqual(0);
    expect(s.maxDuration).toBeGreaterThanOrEqual(s.minDuration);
    expect(s.medianDuration).toBeGreaterThanOrEqual(s.minDuration);
    expect(s.averageDuration).toBeGreaterThanOrEqual(0);
    expect(s.p95Duration).toBeGreaterThanOrEqual(s.minDuration);
  });
});

// ---------------------------------------------------------------------------
// clearMetrics
// ---------------------------------------------------------------------------
describe('clearMetrics', () => {
  it('clears metrics for a specific operation', () => {
    const id = PerformanceMonitor.startTiming('opA');
    PerformanceMonitor.endTiming(id, true);
    PerformanceMonitor.clearMetrics('opA');

    const stats = PerformanceMonitor.getStats('opA');
    expect(stats).toEqual({});
  });

  it('clears all metrics when no name given', () => {
    const id1 = PerformanceMonitor.startTiming('opA');
    PerformanceMonitor.endTiming(id1, true);
    const id2 = PerformanceMonitor.startTiming('opB');
    PerformanceMonitor.endTiming(id2, true);

    PerformanceMonitor.clearMetrics();
    expect(PerformanceMonitor.getStats()).toEqual({});
  });
});
