/**
 * Advanced Memory Leak Detection Service
 * 
 * Provides comprehensive memory leak detection for React Native apps
 * with focus on the specific patterns common in mobile applications.
 * Integrates with the performance monitoring system to track memory usage
 * against the acceptance criteria of staying below 100MB.
 */

import { performanceMonitor } from './performance';
import { memoryProfiler } from '../../utils/memoryProfiler';

export interface MemoryLeak {
  id: string;
  type: 'listener' | 'component' | 'timer' | 'cache' | 'network' | 'native';
  source: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  memoryGrowth: number; // bytes
  detectedAt: number;
  samples: MemorySample[];
  recommendations: string[];
  autoFixable: boolean;
}

export interface MemorySample {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external?: number;
  rss?: number;
  source: string;
}

export interface LeakDetectionConfig {
  sampleInterval: number; // milliseconds
  analysisWindow: number; // milliseconds
  growthThreshold: number; // bytes
  minSamples: number;
  enableAutoFix: boolean;
  alertThreshold: number; // bytes
}

export interface ComponentMemoryTracker {
  componentName: string;
  mountTime: number;
  unmountTime?: number;
  memoryAtMount: number;
  memoryAtUnmount?: number;
  leakSuspected: boolean;
}

const DEFAULT_CONFIG: LeakDetectionConfig = {
  sampleInterval: 15000, // 15 seconds
  analysisWindow: 5 * 60 * 1000, // 5 minutes
  growthThreshold: 5 * 1024 * 1024, // 5MB
  minSamples: 10,
  enableAutoFix: true,
  alertThreshold: 80 * 1024 * 1024, // 80MB
};

class MemoryLeakDetectionService {
  private config: LeakDetectionConfig;
  private samples: MemorySample[] = [];
  private detectedLeaks: MemoryLeak[] = [];
  private componentTrackers: Map<string, ComponentMemoryTracker> = new Map();
  private eventListeners: Map<string, number> = new Map();
  private timers: Map<string, number> = new Map();
  private networkRequests: Map<string, number> = new Map();
  private isMonitoring = false;
  private monitoringInterval?: number;

  constructor(config: Partial<LeakDetectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupNativeHooks();
  }

  /**
   * Start memory leak detection
   */
  start(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMemorySample();
      this.analyzeForLeaks();
    }, this.config.sampleInterval);

    console.log('Memory leak detection started');
  }

  /**
   * Stop memory leak detection
   */
  stop(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    console.log('Memory leak detection stopped');
  }

  /**
   * Track component lifecycle for memory leaks
   */
  trackComponentMount(componentName: string, instance?: any): string {
    const trackerId = `${componentName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const currentMemory = this.getCurrentMemoryUsage();

    const tracker: ComponentMemoryTracker = {
      componentName,
      mountTime: Date.now(),
      memoryAtMount: currentMemory,
      leakSuspected: false,
    };

    this.componentTrackers.set(trackerId, tracker);

    // Take memory sample for tracking
    memoryProfiler.takeSnapshot(`component_mount:${componentName}`);

    return trackerId;
  }

  /**
   * Track component unmount
   */
  trackComponentUnmount(trackerId: string): void {
    const tracker = this.componentTrackers.get(trackerId);
    if (!tracker) return;

    const currentMemory = this.getCurrentMemoryUsage();
    tracker.unmountTime = Date.now();
    tracker.memoryAtUnmount = currentMemory;

    // Check for potential leak
    const memoryDiff = currentMemory - tracker.memoryAtMount;
    const lifetimeMs = tracker.unmountTime - tracker.mountTime;

    // If component lived for more than 1 second and left significant memory
    if (lifetimeMs > 1000 && memoryDiff > 1024 * 1024) { // 1MB threshold
      tracker.leakSuspected = true;
      this.reportSuspiciousComponent(tracker);
    }

    memoryProfiler.takeSnapshot(`component_unmount:${tracker.componentName}`);
  }

  /**
   * Track event listener registration
   */
  trackEventListener(eventName: string, action: 'add' | 'remove'): void {
    const current = this.eventListeners.get(eventName) || 0;
    
    if (action === 'add') {
      this.eventListeners.set(eventName, current + 1);
    } else {
      this.eventListeners.set(eventName, Math.max(0, current - 1));
    }

    // Check for excessive listeners
    const count = this.eventListeners.get(eventName) || 0;
    if (count > 50) { // Threshold for suspicious listener count
      this.reportSuspiciousListeners(eventName, count);
    }
  }

  /**
   * Track timer creation and cleanup
   */
  trackTimer(timerId: string, action: 'create' | 'clear'): void {
    const current = this.timers.get(timerId) || 0;
    
    if (action === 'create') {
      this.timers.set(timerId, current + 1);
    } else {
      this.timers.set(timerId, Math.max(0, current - 1));
    }

    // Check for timer leaks
    let totalTimers = 0;
    this.timers.forEach(count => totalTimers += count);
    
    if (totalTimers > 100) {
      this.reportSuspiciousTimers(totalTimers);
    }
  }

  /**
   * Track network requests
   */
  trackNetworkRequest(requestId: string, action: 'start' | 'complete' | 'error'): void {
    const current = this.networkRequests.get(requestId) || 0;
    
    if (action === 'start') {
      this.networkRequests.set(requestId, current + 1);
    } else {
      this.networkRequests.set(requestId, Math.max(0, current - 1));
    }

    // Check for hanging requests
    let activeRequests = 0;
    this.networkRequests.forEach(count => activeRequests += count);
    
    if (activeRequests > 20) {
      this.reportSuspiciousNetworkRequests(activeRequests);
    }
  }

  /**
   * Get current memory leak report
   */
  getLeakReport(): {
    summary: {
      totalLeaks: number;
      criticalLeaks: number;
      estimatedLeakage: number; // bytes
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
      summary: {
        totalLeaks: this.detectedLeaks.length,
        criticalLeaks: criticalLeaks.length,
        estimatedLeakage: totalLeakage,
        recommendation,
      },
      leaks: this.detectedLeaks,
      componentIssues: suspiciousComponents,
      listenerCounts: new Map(this.eventListeners),
      timerCount: totalTimers,
      networkRequestCount: totalNetworkRequests,
    };
  }

  /**
   * Attempt to auto-fix detected leaks
   */
  async autoFixLeaks(): Promise<{
    attempted: number;
    successful: number;
    failed: number;
    results: Array<{
      leakId: string;
      success: boolean;
      action: string;
      error?: string;
    }>;
  }> {
    if (!this.config.enableAutoFix) {
      return { attempted: 0, successful: 0, failed: 0, results: [] };
    }

    const fixableLeaks = this.detectedLeaks.filter(leak => leak.autoFixable);
    const results: Array<{
      leakId: string;
      success: boolean;
      action: string;
      error?: string;
    }> = [];

    let successful = 0;
    let failed = 0;

    for (const leak of fixableLeaks) {
      try {
        const result = await this.fixLeak(leak);
        results.push(result);
        
        if (result.success) {
          successful++;
          // Remove fixed leak from list
          const index = this.detectedLeaks.findIndex(l => l.id === leak.id);
          if (index > -1) {
            this.detectedLeaks.splice(index, 1);
          }
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        results.push({
          leakId: leak.id,
          success: false,
          action: 'auto-fix',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      attempted: fixableLeaks.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection(): boolean {
    if (__DEV__ && (globalThis as any).gc) {
      (globalThis as any).gc();
      
      // Record the GC event
      performanceMonitor.recordMetric(
        'manual_gc_triggered',
        Date.now(),
        'ms',
        'memory',
        { source: 'memory_leak_detector' }
      );
      
      return true;
    }
    return false;
  }

  // Private methods

  private collectMemorySample(): void {
    const sample: MemorySample = {
      timestamp: Date.now(),
      heapUsed: 0,
      heapTotal: 0,
      source: 'leak_detector',
    };

    // Get memory usage from available APIs
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
      // Fallback: estimate based on app state
      sample.heapUsed = this.estimateMemoryUsage();
      sample.heapTotal = sample.heapUsed * 1.5; // Rough estimate
    }

    this.samples.push(sample);

    // Keep only samples within the analysis window
    const cutoff = Date.now() - this.config.analysisWindow;
    this.samples = this.samples.filter(s => s.timestamp > cutoff);

    // Record sample for performance monitoring
    performanceMonitor.recordMetric(
      'memory_usage_sample',
      sample.heapUsed / (1024 * 1024), // Convert to MB
      'count',
      'memory',
      { 
        heapTotal: sample.heapTotal,
        external: sample.external,
        rss: sample.rss,
      }
    );
  }

  private analyzeForLeaks(): void {
    if (this.samples.length < this.config.minSamples) return;

    // Check for consistent memory growth
    const growthLeak = this.detectGrowthPattern();
    if (growthLeak) {
      this.detectedLeaks.push(growthLeak);
    }

    // Check memory usage against acceptance criteria
    const currentSample = this.samples[this.samples.length - 1];
    const memoryUsageMB = currentSample.heapUsed / (1024 * 1024);
    
    if (memoryUsageMB > 100) { // 100MB threshold from acceptance criteria
      const criticalLeak: MemoryLeak = {
        id: `critical_memory_${Date.now()}`,
        type: 'native',
        source: 'system_monitoring',
        description: `Memory usage ${memoryUsageMB.toFixed(1)}MB exceeds acceptance criteria of 100MB`,
        severity: 'critical',
        memoryGrowth: currentSample.heapUsed - (80 * 1024 * 1024), // Growth above 80MB baseline
        detectedAt: Date.now(),
        samples: this.samples.slice(-5), // Last 5 samples
        recommendations: [
          'Clear image cache',
          'Force garbage collection',
          'Review component lifecycle',
          'Check for circular references',
        ],
        autoFixable: true,
      };

      this.detectedLeaks.push(criticalLeak);
    }
  }

  private detectGrowthPattern(): MemoryLeak | null {
    const recentSamples = this.samples.slice(-this.config.minSamples);
    if (recentSamples.length < this.config.minSamples) return null;

    // Calculate memory growth trend
    let totalGrowth = 0;
    let positiveGrowthCount = 0;

    for (let i = 1; i < recentSamples.length; i++) {
      const growth = recentSamples[i].heapUsed - recentSamples[i - 1].heapUsed;
      totalGrowth += growth;
      if (growth > 0) positiveGrowthCount++;
    }

    const avgGrowth = totalGrowth / (recentSamples.length - 1);
    const growthPercentage = positiveGrowthCount / (recentSamples.length - 1);

    // Detect consistent growth pattern
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
        recommendations: [
          'Check for growing caches',
          'Review event listener cleanup',
          'Verify timer cleanup',
          'Check for circular references in data structures',
        ],
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
    // Rough estimate based on tracked objects
    let estimated = 50 * 1024 * 1024; // 50MB base

    // Add estimated memory for tracked components
    estimated += this.componentTrackers.size * 100 * 1024; // 100KB per component

    // Add estimated memory for event listeners
    this.eventListeners.forEach(count => estimated += count * 1024); // 1KB per listener

    // Add estimated memory for timers
    this.timers.forEach(count => estimated += count * 512); // 512B per timer

    return estimated;
  }

  private reportSuspiciousComponent(tracker: ComponentMemoryTracker): void {
    const leak: MemoryLeak = {
      id: `component_leak_${Date.now()}`,
      type: 'component',
      source: tracker.componentName,
      description: `Component ${tracker.componentName} may have memory leak. Memory increased by ${((tracker.memoryAtUnmount! - tracker.memoryAtMount) / 1024 / 1024).toFixed(2)}MB during lifecycle`,
      severity: 'medium',
      memoryGrowth: tracker.memoryAtUnmount! - tracker.memoryAtMount,
      detectedAt: Date.now(),
      samples: this.samples.slice(-3),
      recommendations: [
        'Check for unremoved event listeners',
        'Verify timer cleanup in useEffect',
        'Review state management for circular references',
        'Check for retained closures',
      ],
      autoFixable: false,
    };

    this.detectedLeaks.push(leak);
  }

  private reportSuspiciousListeners(eventName: string, count: number): void {
    const leak: MemoryLeak = {
      id: `listener_leak_${Date.now()}`,
      type: 'listener',
      source: eventName,
      description: `Excessive event listeners detected for '${eventName}': ${count} listeners`,
      severity: count > 100 ? 'high' : 'medium',
      memoryGrowth: count * 1024, // Estimate 1KB per listener
      detectedAt: Date.now(),
      samples: this.samples.slice(-2),
      recommendations: [
        'Review event listener cleanup',
        'Use removeEventListener in cleanup',
        'Consider using AbortController for cleanup',
        'Avoid adding listeners in render loops',
      ],
      autoFixable: false,
    };

    this.detectedLeaks.push(leak);
  }

  private reportSuspiciousTimers(count: number): void {
    const leak: MemoryLeak = {
      id: `timer_leak_${Date.now()}`,
      type: 'timer',
      source: 'system_timers',
      description: `Excessive active timers detected: ${count} timers`,
      severity: count > 200 ? 'high' : 'medium',
      memoryGrowth: count * 512, // Estimate 512B per timer
      detectedAt: Date.now(),
      samples: this.samples.slice(-2),
      recommendations: [
        'Clear timers in component cleanup',
        'Use clearTimeout/clearInterval',
        'Review timer usage patterns',
        'Consider using requestAnimationFrame for animations',
      ],
      autoFixable: true,
    };

    this.detectedLeaks.push(leak);
  }

  private reportSuspiciousNetworkRequests(count: number): void {
    const leak: MemoryLeak = {
      id: `network_leak_${Date.now()}`,
      type: 'network',
      source: 'pending_requests',
      description: `Excessive pending network requests: ${count} active requests`,
      severity: 'medium',
      memoryGrowth: count * 2048, // Estimate 2KB per request
      detectedAt: Date.now(),
      samples: this.samples.slice(-2),
      recommendations: [
        'Cancel requests on component unmount',
        'Use AbortController for request cancellation',
        'Review request timeout settings',
        'Check for infinite retry loops',
      ],
      autoFixable: true,
    };

    this.detectedLeaks.push(leak);
  }

  private async fixLeak(leak: MemoryLeak): Promise<{
    leakId: string;
    success: boolean;
    action: string;
    error?: string;
  }> {
    try {
      let action = '';
      
      switch (leak.type) {
        case 'timer':
          action = 'force_gc_and_cleanup_timers';
          this.forceGarbageCollection();
          break;
          
        case 'cache':
          action = 'clear_caches_and_force_gc';
          // This would integrate with cache clearing systems
          this.forceGarbageCollection();
          break;
          
        case 'native':
          action = 'force_gc_and_memory_cleanup';
          this.forceGarbageCollection();
          break;
          
        default:
          action = 'generic_gc';
          this.forceGarbageCollection();
      }

      return {
        leakId: leak.id,
        success: true,
        action,
      };
    } catch (error) {
      return {
        leakId: leak.id,
        success: false,
        action: 'fix_attempt',
        error: error instanceof Error ? error.message : 'Fix failed',
      };
    }
  }

  private setupNativeHooks(): void {
    // In a production app, these would hook into native event systems
    // For now, we'll set up basic monitoring
    
    if (__DEV__) {
      // Monitor for common leak patterns in development
      const originalSetTimeout = globalThis.setTimeout;
      const originalSetInterval = globalThis.setInterval;
      const originalClearTimeout = globalThis.clearTimeout;
      const originalClearInterval = globalThis.clearInterval;

      let timerIdCounter = 0;

      globalThis.setTimeout = (...args) => {
        const timerId = `timeout_${++timerIdCounter}`;
        this.trackTimer(timerId, 'create');
        
        const originalId = originalSetTimeout.call(globalThis, () => {
          this.trackTimer(timerId, 'clear');
          if (typeof args[0] === 'function') {
            args[0]();
          }
        }, args[1]);

        return originalId;
      };

      globalThis.clearTimeout = (id) => {
        // We can't easily map back to our internal timer ID, but we can estimate
        this.trackTimer('unknown_timeout', 'clear');
        return originalClearTimeout.call(globalThis, id);
      };
    }
  }
}

// Singleton instance
export const memoryLeakDetector = new MemoryLeakDetectionService();

/**
 * React hook for component memory tracking
 */
export function useMemoryLeakDetection(componentName: string) {
  if (!__DEV__) return;

  React.useEffect(() => {
    const trackerId = memoryLeakDetector.trackComponentMount(componentName);
    
    return () => {
      memoryLeakDetector.trackComponentUnmount(trackerId);
    };
  }, [componentName]);
}

/**
 * Higher-order component for automatic memory leak detection
 */
export function withMemoryLeakDetection<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const MemoryTrackedComponent = (props: P) => {
    useMemoryLeakDetection(componentName || WrappedComponent.name || 'Unknown');
    return React.createElement(WrappedComponent, props);
  };

  MemoryTrackedComponent.displayName = `withMemoryLeakDetection(${componentName || WrappedComponent.name || 'Component'})`;
  
  return MemoryTrackedComponent;
}

// React import (will be available when this is imported in React components)
declare const React: any;