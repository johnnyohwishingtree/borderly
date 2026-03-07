/**
 * Memory Profiler Utility
 * 
 * Provides memory monitoring and leak detection for the Borderly app.
 * Tracks memory usage patterns and identifies potential memory leaks.
 */

interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  source: string;
}

interface MemoryLeakCandidate {
  source: string;
  growth: number;
  snapshots: MemorySnapshot[];
  isLeak: boolean;
}

export class MemoryProfiler {
  private snapshots: MemorySnapshot[] = [];
  private maxSnapshots = 50;
  private isEnabled: boolean = __DEV__;
  private leakThreshold = 1024 * 1024 * 10; // 10MB growth threshold
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Only enable in development or when explicitly enabled
    if (this.isEnabled && global.performance?.memory) {
      this.startPeriodicMonitoring();
    }
  }

  /**
   * Take a memory snapshot
   */
  takeSnapshot(source: string): MemorySnapshot | null {
    if (!this.isEnabled) return null;

    let snapshot: MemorySnapshot;

    if (global.performance?.memory) {
      // Web/development environment
      const memory = global.performance.memory;
      snapshot = {
        timestamp: Date.now(),
        heapUsed: memory.usedJSHeapSize,
        heapTotal: memory.totalJSHeapSize,
        external: 0,
        rss: 0,
        source,
      };
    } else if (process?.memoryUsage) {
      // Node.js environment (testing)
      const memory = process.memoryUsage();
      snapshot = {
        timestamp: Date.now(),
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        external: memory.external,
        rss: memory.rss,
        source,
      };
    } else {
      // No memory API available
      return null;
    }

    this.snapshots.push(snapshot);

    // Keep only recent snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage(): Partial<MemorySnapshot> | null {
    if (!this.isEnabled) return null;

    if (global.performance?.memory) {
      const memory = global.performance.memory;
      return {
        timestamp: Date.now(),
        heapUsed: memory.usedJSHeapSize,
        heapTotal: memory.totalJSHeapSize,
      };
    }

    if (process?.memoryUsage) {
      const memory = process.memoryUsage();
      return {
        timestamp: Date.now(),
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        external: memory.external,
        rss: memory.rss,
      };
    }

    return null;
  }

  /**
   * Detect potential memory leaks
   */
  detectMemoryLeaks(): MemoryLeakCandidate[] {
    if (!this.isEnabled || this.snapshots.length < 5) {
      return [];
    }

    const leakCandidates: MemoryLeakCandidate[] = [];
    const sourceGroups = this.groupSnapshotsBySource();

    Object.entries(sourceGroups).forEach(([source, snapshots]) => {
      if (snapshots.length < 3) return;

      // Calculate memory growth over time
      const firstSnapshot = snapshots[0];
      const lastSnapshot = snapshots[snapshots.length - 1];
      const growth = lastSnapshot.heapUsed - firstSnapshot.heapUsed;

      const candidate: MemoryLeakCandidate = {
        source,
        growth,
        snapshots,
        isLeak: growth > this.leakThreshold,
      };

      if (candidate.isLeak) {
        leakCandidates.push(candidate);
      }
    });

    return leakCandidates;
  }

  /**
   * Get memory usage trend
   */
  getMemoryTrend(): {
    trend: 'increasing' | 'decreasing' | 'stable';
    avgGrowth: number;
    totalGrowth: number;
  } | null {
    if (!this.isEnabled || this.snapshots.length < 3) {
      return null;
    }

    const recent = this.snapshots.slice(-10);
    let totalGrowth = 0;
    let measurements = 0;

    for (let i = 1; i < recent.length; i++) {
      const growth = recent[i].heapUsed - recent[i - 1].heapUsed;
      totalGrowth += growth;
      measurements++;
    }

    const avgGrowth = totalGrowth / measurements;

    let trend: 'increasing' | 'decreasing' | 'stable';
    if (avgGrowth > 1024 * 100) { // 100KB average growth
      trend = 'increasing';
    } else if (avgGrowth < -1024 * 100) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }

    return {
      trend,
      avgGrowth,
      totalGrowth,
    };
  }

  /**
   * Generate memory report
   */
  generateReport(): string {
    if (!this.isEnabled) {
      return 'Memory profiling is disabled';
    }

    const current = this.getCurrentMemoryUsage();
    const leaks = this.detectMemoryLeaks();
    const trend = this.getMemoryTrend();

    let report = '=== Memory Profiler Report ===\n\n';

    // Current usage
    if (current) {
      report += 'Current Memory Usage:\n';
      report += `  Heap Used: ${this.formatBytes(current.heapUsed || 0)}\n`;
      report += `  Heap Total: ${this.formatBytes(current.heapTotal || 0)}\n`;
      if (current.rss) {
        report += `  RSS: ${this.formatBytes(current.rss)}\n`;
      }
      report += '\n';
    }

    // Memory trend
    if (trend) {
      report += 'Memory Trend:\n';
      report += `  Trend: ${trend.trend.toUpperCase()}\n`;
      report += `  Average Growth: ${this.formatBytes(trend.avgGrowth)}\n`;
      report += `  Total Growth: ${this.formatBytes(trend.totalGrowth)}\n`;
      report += '\n';
    }

    // Memory leaks
    if (leaks.length > 0) {
      report += 'Potential Memory Leaks:\n';
      leaks.forEach(leak => {
        report += `  ⚠️  ${leak.source}: ${this.formatBytes(leak.growth)} growth\n`;
      });
    } else {
      report += 'No memory leaks detected ✅\n';
    }

    report += '\n';
    report += `Snapshots taken: ${this.snapshots.length}\n`;
    report += `Monitoring: ${this.monitoringInterval ? 'Active' : 'Inactive'}\n`;

    return report;
  }

  /**
   * Clear all snapshots
   */
  clearSnapshots(): void {
    this.snapshots = [];
  }

  /**
   * Force garbage collection (if available)
   */
  forceGC(): boolean {
    if (global.gc) {
      global.gc();
      return true;
    }
    return false;
  }

  /**
   * Start periodic memory monitoring
   */
  private startPeriodicMonitoring(): void {
    if (this.monitoringInterval) return;

    this.monitoringInterval = setInterval(() => {
      this.takeSnapshot('periodic');
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop periodic memory monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Group snapshots by source
   */
  private groupSnapshotsBySource(): Record<string, MemorySnapshot[]> {
    const groups: Record<string, MemorySnapshot[]> = {};

    this.snapshots.forEach(snapshot => {
      if (!groups[snapshot.source]) {
        groups[snapshot.source] = [];
      }
      groups[snapshot.source].push(snapshot);
    });

    return groups;
  }

  /**
   * Format bytes in human-readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Dispose of the profiler
   */
  dispose(): void {
    this.stopMonitoring();
    this.clearSnapshots();
  }
}

// Singleton instance
export const memoryProfiler = new MemoryProfiler();

// Hook for component memory profiling
export function useMemoryProfiler(componentName: string) {
  if (!__DEV__) return;

  // Take snapshot on mount
  React.useEffect(() => {
    memoryProfiler.takeSnapshot(`${componentName}:mount`);
    
    return () => {
      // Take snapshot on unmount
      memoryProfiler.takeSnapshot(`${componentName}:unmount`);
    };
  }, [componentName]);
}

// Utility for manual profiling
export function profileOperation<T>(
  operationName: string,
  operation: () => T
): T {
  if (!__DEV__) {
    return operation();
  }

  memoryProfiler.takeSnapshot(`${operationName}:start`);
  
  try {
    const result = operation();
    memoryProfiler.takeSnapshot(`${operationName}:success`);
    return result;
  } catch (error) {
    memoryProfiler.takeSnapshot(`${operationName}:error`);
    throw error;
  }
}

// Global memory monitoring functions
export const MemoryMonitor = {
  start: () => memoryProfiler.takeSnapshot('monitor:start'),
  checkpoint: (name: string) => memoryProfiler.takeSnapshot(`checkpoint:${name}`),
  report: () => {
    console.log(memoryProfiler.generateReport());
    return memoryProfiler.generateReport();
  },
  forceGC: () => memoryProfiler.forceGC(),
  detectLeaks: () => memoryProfiler.detectMemoryLeaks(),
};

// React import (will be available when this is imported in React components)
declare const React: any;