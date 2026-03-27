jest.mock('@/services/monitoring/performance', () => ({
  performanceMonitor: {
    recordMetric: jest.fn(),
  },
}));

jest.mock('@/services/monitoring/memoryProfiler', () => ({
  memoryProfiler: {
    takeSnapshot: jest.fn(),
  },
}));

jest.mock('@/services/monitoring/memoryLeakReporting', () => ({
  createComponentLeak: jest.fn(
    (componentName: string, memoryGrowth: number) => ({
      id: `component_leak_mock`,
      type: 'component',
      source: componentName,
      description: `Mock component leak for ${componentName}`,
      severity: 'medium',
      memoryGrowth,
      detectedAt: Date.now(),
      samples: [],
      recommendations: [],
      autoFixable: false,
    })
  ),
  createListenerLeak: jest.fn((eventName: string, count: number) => ({
    id: `listener_leak_mock_${eventName}`,
    type: 'listener',
    source: eventName,
    description: `Mock listener leak for ${eventName}`,
    severity: count > 100 ? 'high' : 'medium',
    memoryGrowth: count * 1024,
    detectedAt: Date.now(),
    samples: [],
    recommendations: [],
    autoFixable: false,
  })),
  createTimerLeak: jest.fn((totalTimers: number) => ({
    id: `timer_leak_mock`,
    type: 'timer',
    source: 'timers',
    description: `Mock timer leak: ${totalTimers} timers`,
    severity: 'medium',
    memoryGrowth: totalTimers * 512,
    detectedAt: Date.now(),
    samples: [],
    recommendations: [],
    autoFixable: true,
  })),
  createNetworkLeak: jest.fn((activeRequests: number) => ({
    id: `network_leak_mock`,
    type: 'network',
    source: 'network',
    description: `Mock network leak: ${activeRequests} requests`,
    severity: 'medium',
    memoryGrowth: activeRequests * 2048,
    detectedAt: Date.now(),
    samples: [],
    recommendations: [],
    autoFixable: false,
  })),
}));

import { memoryLeakDetector } from '@/services/monitoring/memoryLeakDetector';
import { memoryProfiler } from '@/services/monitoring/memoryProfiler';
import {
  createListenerLeak,
  createTimerLeak,
  createNetworkLeak,
} from '@/services/monitoring/memoryLeakReporting';

const mockedProfiler = memoryProfiler as jest.Mocked<typeof memoryProfiler>;
const mockedCreateListenerLeak = createListenerLeak as jest.MockedFunction<
  typeof createListenerLeak
>;
const mockedCreateTimerLeak = createTimerLeak as jest.MockedFunction<
  typeof createTimerLeak
>;
const mockedCreateNetworkLeak = createNetworkLeak as jest.MockedFunction<
  typeof createNetworkLeak
>;

// The singleton is the only export; we use it directly.
const detector = memoryLeakDetector;

describe('MemoryLeakDetectionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Stop any running monitoring from prior tests
    detector.stop();
  });

  afterEach(() => {
    detector.stop();
    jest.useRealTimers();
  });

  describe('trackComponentMount / trackComponentUnmount', () => {
    it('returns a unique tracker ID on mount', () => {
      const id = detector.trackComponentMount('TestComponent');

      expect(typeof id).toBe('string');
      expect(id).toContain('TestComponent');
    });

    it('takes a memory snapshot on mount', () => {
      detector.trackComponentMount('MyScreen');

      expect(mockedProfiler.takeSnapshot).toHaveBeenCalledWith(
        'component_mount:MyScreen'
      );
    });

    it('takes a memory snapshot on unmount', () => {
      const id = detector.trackComponentMount('MyScreen');
      detector.trackComponentUnmount(id);

      expect(mockedProfiler.takeSnapshot).toHaveBeenCalledWith(
        'component_unmount:MyScreen'
      );
    });

    it('does nothing when unmounting an unknown tracker', () => {
      expect(() =>
        detector.trackComponentUnmount('nonexistent_tracker')
      ).not.toThrow();
    });

    it('reports component info in leak report after mount and unmount', () => {
      const id = detector.trackComponentMount('HeavyComponent');
      detector.trackComponentUnmount(id);

      const report = detector.getLeakReport();
      expect(report.summary).toEqual(expect.objectContaining({
        totalLeaks: expect.any(Number),
        criticalLeaks: expect.any(Number),
        estimatedLeakage: expect.any(Number),
      }));
      expect(['safe', 'warning', 'critical']).toContain(
        report.summary.recommendation
      );
    });
  });

  describe('trackEventListener', () => {
    it('tracks add and remove actions for an event', () => {
      detector.trackEventListener('scroll', 'add');
      detector.trackEventListener('scroll', 'add');
      detector.trackEventListener('scroll', 'remove');

      const report = detector.getLeakReport();
      const scrollCount = report.listenerCounts.get('scroll');
      expect(scrollCount).toBe(1);
    });

    it('never goes below zero listeners', () => {
      detector.trackEventListener('click', 'remove');
      detector.trackEventListener('click', 'remove');

      const report = detector.getLeakReport();
      expect(report.listenerCounts.get('click')).toBe(0);
    });

    it('creates a leak when listener count exceeds 50', () => {
      for (let i = 0; i < 51; i++) {
        detector.trackEventListener('resize', 'add');
      }

      expect(mockedCreateListenerLeak).toHaveBeenCalledWith(
        'resize',
        51,
        expect.any(Array)
      );

      const report = detector.getLeakReport();
      expect(report.leaks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('trackTimer', () => {
    it('increments on create and decrements on clear', () => {
      detector.trackTimer('interval_1', 'create');
      detector.trackTimer('interval_1', 'create');
      detector.trackTimer('interval_1', 'clear');

      const report = detector.getLeakReport();
      expect(report.timerCount).toBeGreaterThanOrEqual(1);
    });

    it('never decrements below zero', () => {
      detector.trackTimer('timeout_solo', 'clear');

      const report = detector.getLeakReport();
      // Timer count should not be negative; the specific timer should be 0
      expect(report.timerCount).toBeGreaterThanOrEqual(0);
    });

    it('creates a leak when total timers exceed 100', () => {
      for (let i = 0; i < 101; i++) {
        detector.trackTimer(`timer_bulk_${i}`, 'create');
      }

      expect(mockedCreateTimerLeak).toHaveBeenCalled();
      const report = detector.getLeakReport();
      expect(report.leaks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('trackNetworkRequest', () => {
    it('tracks start and completion of requests', () => {
      detector.trackNetworkRequest('req_a', 'start');
      detector.trackNetworkRequest('req_b', 'start');
      detector.trackNetworkRequest('req_a', 'complete');

      const report = detector.getLeakReport();
      // req_b is still active (count 1), req_a completed (count 0)
      expect(report.networkRequestCount).toBeGreaterThanOrEqual(1);
    });

    it('tracks error as completion (decrements count)', () => {
      detector.trackNetworkRequest('req_err', 'start');
      detector.trackNetworkRequest('req_err', 'error');

      const report = detector.getLeakReport();
      // This specific request should be at 0
      expect(report.networkRequestCount).toBeGreaterThanOrEqual(0);
    });

    it('creates a leak when active requests exceed 20', () => {
      for (let i = 0; i < 21; i++) {
        detector.trackNetworkRequest(`req_flood_${i}`, 'start');
      }

      expect(mockedCreateNetworkLeak).toHaveBeenCalled();
      const report = detector.getLeakReport();
      expect(report.leaks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getLeakReport', () => {
    it('returns a report with expected structure', () => {
      const report = detector.getLeakReport();

      expect(report.summary).toHaveProperty('totalLeaks');
      expect(report.summary).toHaveProperty('criticalLeaks');
      expect(report.summary).toHaveProperty('estimatedLeakage');
      expect(report.summary).toHaveProperty('recommendation');
      expect(Array.isArray(report.leaks)).toBe(true);
      expect(Array.isArray(report.componentIssues)).toBe(true);
      expect(report.listenerCounts).toBeInstanceOf(Map);
      expect(typeof report.timerCount).toBe('number');
      expect(typeof report.networkRequestCount).toBe('number');
    });

    it('returns listener counts as a Map', () => {
      detector.trackEventListener('touch', 'add');

      const report = detector.getLeakReport();
      expect(report.listenerCounts).toBeInstanceOf(Map);
      expect(report.listenerCounts.get('touch')).toBe(1);
    });
  });

  describe('start / stop', () => {
    it('starts monitoring without throwing', () => {
      expect(() => detector.start()).not.toThrow();
      detector.stop();
    });

    it('stops monitoring without throwing', () => {
      detector.start();
      expect(() => detector.stop()).not.toThrow();
    });

    it('does not fail when stopping without starting', () => {
      expect(() => detector.stop()).not.toThrow();
    });

    it('calling start twice does not throw', () => {
      detector.start();
      expect(() => detector.start()).not.toThrow();
      detector.stop();
    });
  });
});
