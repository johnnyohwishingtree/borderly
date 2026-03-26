/**
 * Performance monitoring utilities for automation operations
 */

interface TimingEntry {
  id: string;
  startTime: number;
  endTime: number | null;
  duration: number | null;
  success: boolean | null;
}

export class PerformanceMonitor {
  private static metrics: Map<string, TimingEntry[]> = new Map();

  /**
   * Start timing an operation
   */
  static startTiming(operationName: string): string {
    const timingId = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startTime = performance.now();

    if (!this.metrics.has(operationName)) {
      this.metrics.set(operationName, []);
    }

    this.metrics.get(operationName)!.push({
      id: timingId,
      startTime,
      endTime: null,
      duration: null,
      success: null
    });

    return timingId;
  }

  /**
   * End timing an operation
   */
  static endTiming(timingId: string, success: boolean = true): number {
    const endTime = performance.now();

    for (const [, timings] of this.metrics.entries()) {
      const timing = timings.find(t => t.id === timingId);
      if (timing) {
        timing.endTime = endTime;
        timing.duration = endTime - timing.startTime;
        timing.success = success;
        return timing.duration;
      }
    }

    return -1;
  }

  /**
   * Get performance statistics
   */
  static getStats(operationName?: string): Record<string, {
    totalOperations: number;
    successfulOperations: number;
    successRate: number;
    averageDuration: number;
    medianDuration: number;
    minDuration: number;
    maxDuration: number;
    p95Duration: number;
  }> {
    const stats: Record<string, any> = {};

    const operations: [string, TimingEntry[]][] = operationName
      ? [[operationName, this.metrics.get(operationName) || []]]
      : Array.from(this.metrics.entries());

    operations.forEach(([name, timings]) => {
      const completedTimings = timings.filter(t => t.duration !== null);
      const successfulTimings = completedTimings.filter(t => t.success);

      if (completedTimings.length > 0) {
        const durations = completedTimings.map(t => t.duration as number);
        durations.sort((a, b) => a - b);

        stats[name] = {
          totalOperations: completedTimings.length,
          successfulOperations: successfulTimings.length,
          successRate: successfulTimings.length / completedTimings.length,
          averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
          medianDuration: durations[Math.floor(durations.length / 2)],
          minDuration: Math.min(...durations),
          maxDuration: Math.max(...durations),
          p95Duration: durations[Math.floor(durations.length * 0.95)]
        };
      }
    });

    return stats;
  }

  /**
   * Clear metrics
   */
  static clearMetrics(operationName?: string): void {
    if (operationName) {
      this.metrics.delete(operationName);
    } else {
      this.metrics.clear();
    }
  }
}
