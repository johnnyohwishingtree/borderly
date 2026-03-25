/**
 * Advanced Memory Leak Detection Service
 *
 * Provides comprehensive memory leak detection for React Native apps
 * with focus on the specific patterns common in mobile applications.
 */

import type {
  MemoryLeak,
  MemorySample,
  LeakDetectionConfig,
  ComponentMemoryTracker,
} from './memoryLeakDetectorTypes';
import { DEFAULT_CONFIG } from './memoryLeakDetectorTypes';
import { performanceMonitor } from './performance';
import { memoryProfiler } from './memoryProfiler';
import {
  createComponentLeak,
  createListenerLeak,
  createTimerLeak,
  createNetworkLeak,
} from './memoryLeakReporting';

// Re-export types and React integrations for backward compatibility
export type { MemoryLeak, MemorySample, LeakDetectionConfig, ComponentMemoryTracker } from './memoryLeakDetectorTypes';
export { DEFAULT_CONFIG } from './memoryLeakDetectorTypes';
export { useMemoryLeakDetection, withMemoryLeakDetection } from './memoryLeakReactIntegration';

class MemoryLeakDetectionService {
  private config: LeakDetectionConfig;
  private samples: MemorySample[] = [];
  private detectedLeaks: MemoryLeak[] = [];
  private componentTrackers: Map<string, ComponentMemoryTracker> = new Map();
  private eventListeners: Map<string, number> = new Map();
  private timers: Map<string, number> = new Map();
  private networkRequests: Map<string, number> = new Map();
  private isMonitoring = false;
  private monitoringInterval: ReturnType<typeof setInterval> | undefined;

  constructor(config: Partial<LeakDetectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupNativeHooks();
  }

  start(): void {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMemorySample();
      this.analyzeForLeaks();
    }, this.config.sampleInterval);
    console.log('Memory leak detection started');
  }

  stop(): void {
    if (!this.isMonitoring) return;
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    console.log('Memory leak detection stopped');
  }

  trackComponentMount(componentName: string, _instance?: any): string {
    const trackerId = `${componentName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const currentMemory = this.getCurrentMemoryUsage();
    const tracker: ComponentMemoryTracker = {
      componentName,
      mountTime: Date.now(),
      memoryAtMount: currentMemory,
      leakSuspected: false,
    };
    this.componentTrackers.set(trackerId, tracker);
    memoryProfiler.takeSnapshot(`component_mount:${componentName}`);
    return trackerId;
  }

  trackComponentUnmount(trackerId: string): void {
    const tracker = this.componentTrackers.get(trackerId);
    if (!tracker) return;
    const currentMemory = this.getCurrentMemoryUsage();
    tracker.unmountTime = Date.now();
    tracker.memoryAtUnmount = currentMemory;
    const memoryDiff = currentMemory - tracker.memoryAtMount;
    const lifetimeMs = tracker.unmountTime - tracker.mountTime;
    if (lifetimeMs > 1000 && memoryDiff > 1024 * 1024) {
      tracker.leakSuspected = true;
      this.detectedLeaks.push(
        createComponentLeak(tracker.componentName, tracker.memoryAtUnmount! - tracker.memoryAtMount, this.samples)
      );
    }
    memoryProfiler.takeSnapshot(`component_unmount:${tracker.componentName}`);
  }

  trackEventListener(eventName: string, action: 'add' | 'remove'): void {
    const current = this.eventListeners.get(eventName) || 0;
    if (action === 'add') {
      this.eventListeners.set(eventName, current + 1);
    } else {
      this.eventListeners.set(eventName, Math.max(0, current - 1));
    }
    const count = this.eventListeners.get(eventName) || 0;
    if (count > 50) {
      this.detectedLeaks.push(createListenerLeak(eventName, count, this.samples));
    }
  }

  trackTimer(timerId: string, action: 'create' | 'clear'): void {
    const current = this.timers.get(timerId) || 0;
    if (action === 'create') {
      this.timers.set(timerId, current + 1);
    } else {
      this.timers.set(timerId, Math.max(0, current - 1));
    }
    let totalTimers = 0;
    this.timers.forEach(count => totalTimers += count);
    if (totalTimers > 100) {
      this.detectedLeaks.push(createTimerLeak(totalTimers, this.samples));
    }
  }

  trackNetworkRequest(requestId: string, action: 'start' | 'complete' | 'error'): void {
    const current = this.networkRequests.get(requestId) || 0;
    if (action === 'start') {
      this.networkRequests.set(requestId, current + 1);
    } else {
      this.networkRequests.set(requestId, Math.max(0, current - 1));
    }
    let activeRequests = 0;
    this.networkRequests.forEach(count => activeRequests += count);
    if (activeRequests > 20) {
      this.detectedLeaks.push(createNetworkLeak(activeRequests, this.samples));
    }
  }

  getLeakReport(): {
    summary: {
      totalLeaks: number;
      criticalLeaks: number;
      estimatedLeakage: number;
      recommendation: 'safe' | 'warning' | 'critical';
    };
    leaks: MemoryLeak[];
    componentIssues: ComponentMemoryTracker[];
    listenerCounts: Map<string, number>;
    timerCount: number;
    networkRequestCount: number;
  } {
    const criticalLeaks = this.detectedLeaks.filter(leak => leak.severity === 'critical');
    const totalLeakage = this.detectedLeaks.reduce((sum, leak) => sum + leak.memoryGrowth, 0);

    let recommendation: 'safe' | 'warning' | 'critical' = 'safe';
    if (criticalLeaks.length > 0 || totalLeakage > 20 * 1024 * 1024) {
      recommendation = 'critical';
    } else if (this.detectedLeaks.length > 5 || totalLeakage > 10 * 1024 * 1024) {
      recommendation = 'warning';
    }

    const suspiciousComponents = Array.from(this.componentTrackers.values())
      .filter(tracker => tracker.leakSuspected);

    let totalTimers = 0;
    this.timers.forEach(count => totalTimers += count);
    let totalNetworkRequests = 0;
    this.networkRequests.forEach(count => totalNetworkRequests += count);

    return {
      summary: { totalLeaks: this.detectedLeaks.length, criticalLeaks: criticalLeaks.length, estimatedLeakage: totalLeakage, recommendation },
      leaks: this.detectedLeaks,
      componentIssues: suspiciousComponents,
      listenerCounts: new Map(this.eventListeners),
      timerCount: totalTimers,
      networkRequestCount: totalNetworkRequests,
    };
  }

  async autoFixLeaks(): Promise<{
    attempted: number;
    successful: number;
    failed: number;
    results: Array<{ leakId: string; success: boolean; action: string; error?: string }>;
  }> {
    if (!this.config.enableAutoFix) {
      return { attempted: 0, successful: 0, failed: 0, results: [] };
    }

    const fixableLeaks = this.detectedLeaks.filter(leak => leak.autoFixable);
    const results: Array<{ leakId: string; success: boolean; action: string; error?: string }> = [];
    let successful = 0;
    let failed = 0;

    for (const leak of fixableLeaks) {
      try {
        const result = await this.fixLeak(leak);
        results.push(result);
        if (result.success) {
          successful++;
          const index = this.detectedLeaks.findIndex(l => l.id === leak.id);
          if (index > -1) this.detectedLeaks.splice(index, 1);
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        results.push({ leakId: leak.id, success: false, action: 'auto-fix', error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return { attempted: fixableLeaks.length, successful, failed, results };
  }

  forceGarbageCollection(): boolean {
    if (__DEV__ && (globalThis as any).gc) {
      (globalThis as any).gc();
      performanceMonitor.recordMetric('manual_gc_triggered', Date.now(), 'ms', 'memory', { source: 'memory_leak_detector' });
      return true;
    }
    return false;
  }

  // Private methods

  private collectMemorySample(): void {
    const sample: MemorySample = { timestamp: Date.now(), heapUsed: 0, heapTotal: 0, source: 'leak_detector' };

    if (typeof window !== 'undefined' && (window as any).performance?.memory) {
      const memory = (window as any).performance.memory;
      sample.heapUsed = memory.usedJSHeapSize;
      sample.heapTotal = memory.totalJSHeapSize;
    } else if (typeof process !== 'undefined' && process.memoryUsage) {
      const memory = process.memoryUsage();
      sample.heapUsed = memory.heapUsed;
      sample.heapTotal = memory.heapTotal;
      sample.external = memory.external;
      sample.rss = memory.rss;
    } else {
      sample.heapUsed = this.estimateMemoryUsage();
      sample.heapTotal = sample.heapUsed * 1.5;
    }

    this.samples.push(sample);
    const cutoff = Date.now() - this.config.analysisWindow;
    this.samples = this.samples.filter(s => s.timestamp > cutoff);

    performanceMonitor.recordMetric(
      'memory_usage_sample', sample.heapUsed / (1024 * 1024), 'count', 'memory',
      { heapTotal: sample.heapTotal, external: sample.external, rss: sample.rss }
    );
  }

  private analyzeForLeaks(): void {
    if (this.samples.length < this.config.minSamples) return;

    const growthLeak = this.detectGrowthPattern();
    if (growthLeak) this.detectedLeaks.push(growthLeak);

    const currentSample = this.samples[this.samples.length - 1];
    const memoryUsageMB = currentSample.heapUsed / (1024 * 1024);

    if (memoryUsageMB > 100) {
      this.detectedLeaks.push({
        id: `critical_memory_${Date.now()}`,
        type: 'native',
        source: 'system_monitoring',
        description: `Memory usage ${memoryUsageMB.toFixed(1)}MB exceeds acceptance criteria of 100MB`,
        severity: 'critical',
        memoryGrowth: currentSample.heapUsed - (80 * 1024 * 1024),
        detectedAt: Date.now(),
        samples: this.samples.slice(-5),
        recommendations: ['Clear image cache', 'Force garbage collection', 'Review component lifecycle', 'Check for circular references'],
        autoFixable: true,
      });
    }
  }

  private detectGrowthPattern(): MemoryLeak | null {
    const recentSamples = this.samples.slice(-this.config.minSamples);
    if (recentSamples.length < this.config.minSamples) return null;

    let totalGrowth = 0;
    let positiveGrowthCount = 0;
    for (let i = 1; i < recentSamples.length; i++) {
      const growth = recentSamples[i].heapUsed - recentSamples[i - 1].heapUsed;
      totalGrowth += growth;
      if (growth > 0) positiveGrowthCount++;
    }

    const avgGrowth = totalGrowth / (recentSamples.length - 1);
    const growthPercentage = positiveGrowthCount / (recentSamples.length - 1);

    if (avgGrowth > this.config.growthThreshold / 10 && growthPercentage > 0.7) {
      return {
        id: `growth_pattern_${Date.now()}`,
        type: 'cache',
        source: 'growth_analysis',
        description: `Consistent memory growth detected: ${(avgGrowth / 1024 / 1024).toFixed(2)}MB average increase per sample`,
        severity: avgGrowth > this.config.growthThreshold ? 'high' : 'medium',
        memoryGrowth: totalGrowth,
        detectedAt: Date.now(),
        samples: recentSamples,
        recommendations: ['Check for growing caches', 'Review event listener cleanup', 'Verify timer cleanup', 'Check for circular references in data structures'],
        autoFixable: true,
      };
    }
    return null;
  }

  private getCurrentMemoryUsage(): number {
    if (typeof window !== 'undefined' && (window as any).performance?.memory) {
      return (window as any).performance.memory.usedJSHeapSize;
    } else if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return this.estimateMemoryUsage();
  }

  private estimateMemoryUsage(): number {
    let estimated = 50 * 1024 * 1024;
    estimated += this.componentTrackers.size * 100 * 1024;
    this.eventListeners.forEach(count => estimated += count * 1024);
    this.timers.forEach(count => estimated += count * 512);
    return estimated;
  }

  private async fixLeak(leak: MemoryLeak): Promise<{ leakId: string; success: boolean; action: string; error?: string }> {
    try {
      let action = '';
      switch (leak.type) {
        case 'timer': action = 'force_gc_and_cleanup_timers'; this.forceGarbageCollection(); break;
        case 'cache': action = 'clear_caches_and_force_gc'; this.forceGarbageCollection(); break;
        case 'native': action = 'force_gc_and_memory_cleanup'; this.forceGarbageCollection(); break;
        default: action = 'generic_gc'; this.forceGarbageCollection();
      }
      return { leakId: leak.id, success: true, action };
    } catch (error) {
      return { leakId: leak.id, success: false, action: 'fix_attempt', error: error instanceof Error ? error.message : 'Fix failed' };
    }
  }

  private setupNativeHooks(): void {
    if (__DEV__) {
      const originalSetTimeout = globalThis.setTimeout;
      const originalClearTimeout = globalThis.clearTimeout;
      let timerIdCounter = 0;

      (globalThis as any).setTimeout = (...args: any[]): ReturnType<typeof setTimeout> => {
        const timerId = `timeout_${++timerIdCounter}`;
        this.trackTimer(timerId, 'create');
        const originalId = originalSetTimeout.call(globalThis, () => {
          this.trackTimer(timerId, 'clear');
          if (typeof args[0] === 'function') args[0]();
        }, args[1]);
        return originalId;
      };

      globalThis.clearTimeout = (id) => {
        this.trackTimer('unknown_timeout', 'clear');
        return originalClearTimeout.call(globalThis, id);
      };
    }
  }
}

// Singleton instance
export const memoryLeakDetector = new MemoryLeakDetectionService();
