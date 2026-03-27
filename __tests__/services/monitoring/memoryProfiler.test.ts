// Helper to get a fresh module with new instances
async function loadFreshModule() {
  jest.resetModules();
  (globalThis as any).__DEV__ = true;
  const mod = await import('../../../src/services/monitoring/memoryProfiler');
  return {
    MemoryProfiler: mod.MemoryProfiler,
    memoryProfiler: mod.memoryProfiler,
    profileOperation: mod.profileOperation,
    MemoryMonitor: mod.MemoryMonitor,
  };
}

describe('MemoryProfiler', () => {
  let MemoryProfiler: Awaited<ReturnType<typeof loadFreshModule>>['MemoryProfiler'];
  let profiler: InstanceType<Awaited<ReturnType<typeof loadFreshModule>>['MemoryProfiler']>;

  beforeEach(async () => {
    (globalThis as any).__DEV__ = true;
    const mod = await loadFreshModule();
    MemoryProfiler = mod.MemoryProfiler;
    profiler = new MemoryProfiler();
  });

  afterEach(() => {
    profiler.dispose();
  });

  describe('takeSnapshot', () => {
    it('records a snapshot with the given source', () => {
      const snapshot = profiler.takeSnapshot('test-source');
      expect(snapshot).not.toBeNull();
      expect(snapshot!.source).toBe('test-source');
      expect(snapshot!.timestamp).toBeGreaterThan(0);
      expect(typeof snapshot!.heapUsed).toBe('number');
      expect(typeof snapshot!.heapTotal).toBe('number');
    });

    it('stores snapshots that can be reported on', () => {
      profiler.takeSnapshot('snap-1');
      profiler.takeSnapshot('snap-2');
      const report = profiler.generateReport();
      expect(report).toContain('Snapshots taken: 2');
    });

    it('returns null when profiling is disabled', () => {
      (globalThis as any).__DEV__ = false;
      const disabledProfiler = new MemoryProfiler();
      const snapshot = disabledProfiler.takeSnapshot('disabled');
      expect(snapshot).toBeNull();
      disabledProfiler.dispose();
    });
  });

  describe('getCurrentMemoryUsage', () => {
    it('returns memory data with heapUsed and heapTotal', () => {
      const usage = profiler.getCurrentMemoryUsage();
      expect(usage).not.toBeNull();
      expect(typeof usage!.heapUsed).toBe('number');
      expect(typeof usage!.heapTotal).toBe('number');
      expect(usage!.timestamp).toBeGreaterThan(0);
    });

    it('returns null when profiling is disabled', () => {
      (globalThis as any).__DEV__ = false;
      const disabledProfiler = new MemoryProfiler();
      expect(disabledProfiler.getCurrentMemoryUsage()).toBeNull();
      disabledProfiler.dispose();
    });
  });

  describe('detectMemoryLeaks', () => {
    it('returns empty array when fewer than 5 snapshots exist', () => {
      profiler.takeSnapshot('a');
      profiler.takeSnapshot('b');
      profiler.takeSnapshot('c');
      const leaks = profiler.detectMemoryLeaks();
      expect(leaks).toEqual([]);
    });

    it('returns leak candidates array when enough snapshots exist', () => {
      // Take 5+ snapshots from the same source to allow detection
      for (let i = 0; i < 6; i++) {
        profiler.takeSnapshot('leak-source');
      }
      // detectMemoryLeaks will analyze the snapshots; since Node memory
      // doesn't grow 10MB between calls, expect no leaks flagged
      const leaks = profiler.detectMemoryLeaks();
      expect(Array.isArray(leaks)).toBe(true);
    });
  });

  describe('getMemoryTrend', () => {
    it('returns null when fewer than 3 snapshots exist', () => {
      profiler.takeSnapshot('a');
      profiler.takeSnapshot('b');
      expect(profiler.getMemoryTrend()).toBeNull();
    });

    it('returns trend data when 3+ snapshots exist', () => {
      profiler.takeSnapshot('t1');
      profiler.takeSnapshot('t2');
      profiler.takeSnapshot('t3');
      const trend = profiler.getMemoryTrend();
      expect(trend).not.toBeNull();
      expect(['increasing', 'decreasing', 'stable']).toContain(trend!.trend);
      expect(typeof trend!.avgGrowth).toBe('number');
      expect(typeof trend!.totalGrowth).toBe('number');
    });
  });

  describe('generateReport', () => {
    it('returns a string report with header', () => {
      profiler.takeSnapshot('report-test');
      const report = profiler.generateReport();
      expect(report).toContain('=== Memory Profiler Report ===');
      expect(report).toContain('Snapshots taken: 1');
    });

    it('returns disabled message when profiling is off', () => {
      (globalThis as any).__DEV__ = false;
      const disabledProfiler = new MemoryProfiler();
      const report = disabledProfiler.generateReport();
      expect(report).toBe('Memory profiling is disabled');
      disabledProfiler.dispose();
    });

    it('includes current memory usage in report', () => {
      profiler.takeSnapshot('r1');
      const report = profiler.generateReport();
      expect(report).toContain('Current Memory Usage:');
      expect(report).toContain('Heap Used:');
      expect(report).toContain('Heap Total:');
    });
  });

  describe('clearSnapshots', () => {
    it('empties the snapshots array', () => {
      profiler.takeSnapshot('to-clear-1');
      profiler.takeSnapshot('to-clear-2');
      profiler.clearSnapshots();
      const report = profiler.generateReport();
      expect(report).toContain('Snapshots taken: 0');
    });
  });

  describe('forceGC', () => {
    it('returns a boolean indicating whether GC was triggered', () => {
      const result = profiler.forceGC();
      expect(typeof result).toBe('boolean');
    });

    it('returns false when globalThis.gc is not available', () => {
      const originalGc = (globalThis as any).gc;
      delete (globalThis as any).gc;
      expect(profiler.forceGC()).toBe(false);
      if (originalGc) {
        (globalThis as any).gc = originalGc;
      }
    });
  });

  describe('stopMonitoring', () => {
    it('cleans up the monitoring interval', () => {
      profiler.stopMonitoring();
      const report = profiler.generateReport();
      expect(report).toContain('Monitoring: Inactive');
    });
  });

  describe('dispose', () => {
    it('stops monitoring and clears snapshots', () => {
      profiler.takeSnapshot('before-dispose');
      profiler.dispose();
      // After dispose, generating a report should show 0 snapshots
      const report = profiler.generateReport();
      expect(report).toContain('Snapshots taken: 0');
      expect(report).toContain('Monitoring: Inactive');
    });
  });
});

describe('profileOperation', () => {
  let profileOperation: Awaited<ReturnType<typeof loadFreshModule>>['profileOperation'];
  let memoryProfiler: Awaited<ReturnType<typeof loadFreshModule>>['memoryProfiler'];

  beforeEach(async () => {
    (globalThis as any).__DEV__ = true;
    const mod = await loadFreshModule();
    profileOperation = mod.profileOperation;
    memoryProfiler = mod.memoryProfiler;
  });

  afterEach(() => {
    memoryProfiler.dispose();
  });

  it('wraps an operation and returns its result', () => {
    const result = profileOperation('add', () => 2 + 3);
    expect(result).toBe(5);
  });

  it('takes before and after snapshots', () => {
    const spy = jest.spyOn(memoryProfiler, 'takeSnapshot');
    profileOperation('test-op', () => 'done');
    const calls = spy.mock.calls.map(c => c[0]);
    expect(calls).toContain('test-op:start');
    expect(calls).toContain('test-op:success');
    spy.mockRestore();
  });

  it('takes an error snapshot and re-throws on failure', () => {
    const spy = jest.spyOn(memoryProfiler, 'takeSnapshot');
    const err = new Error('boom');
    expect(() => profileOperation('fail-op', () => { throw err; })).toThrow('boom');
    const calls = spy.mock.calls.map(c => c[0]);
    expect(calls).toContain('fail-op:start');
    expect(calls).toContain('fail-op:error');
    spy.mockRestore();
  });
});

describe('MemoryMonitor', () => {
  let MemoryMonitor: Awaited<ReturnType<typeof loadFreshModule>>['MemoryMonitor'];
  let memoryProfiler: Awaited<ReturnType<typeof loadFreshModule>>['memoryProfiler'];

  beforeEach(async () => {
    (globalThis as any).__DEV__ = true;
    const mod = await loadFreshModule();
    MemoryMonitor = mod.MemoryMonitor;
    memoryProfiler = mod.memoryProfiler;
  });

  afterEach(() => {
    memoryProfiler.dispose();
  });

  it('start takes a snapshot with monitor:start source', () => {
    const spy = jest.spyOn(memoryProfiler, 'takeSnapshot');
    MemoryMonitor.start();
    expect(spy).toHaveBeenCalledWith('monitor:start');
    spy.mockRestore();
  });

  it('checkpoint takes a snapshot with prefixed name', () => {
    const spy = jest.spyOn(memoryProfiler, 'takeSnapshot');
    MemoryMonitor.checkpoint('after-form-load');
    expect(spy).toHaveBeenCalledWith('checkpoint:after-form-load');
    spy.mockRestore();
  });

  it('report returns a string report', () => {
    const report = MemoryMonitor.report();
    expect(typeof report).toBe('string');
    expect(report).toContain('=== Memory Profiler Report ===');
  });

  it('forceGC returns a boolean', () => {
    const result = MemoryMonitor.forceGC();
    expect(typeof result).toBe('boolean');
  });

  it('detectLeaks returns an array', () => {
    const leaks = MemoryMonitor.detectLeaks();
    expect(Array.isArray(leaks)).toBe(true);
  });
});
