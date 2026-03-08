/**
 * Comprehensive Monitoring and Analytics Service Index
 * 
 * Exports all monitoring services including performance optimization,
 * memory management, and leak detection that supports the
 * acceptance criteria requirements.
 */

export { performanceMonitor, recordMetric, startFlow, completeFlow } from './performance';
export { productionMonitoring } from './productionMonitoring';
export { 
  memoryLeakDetector, 
  useMemoryLeakDetection,
  withMemoryLeakDetection,
  type MemoryLeak,
  type LeakDetectionConfig
} from './memoryLeakDetector';

export {
  SubmissionAnalytics,
  submissionAnalytics,
  type SubmissionMetric,
  type AnalyticsReport,
  type CountryAnalytics,
  type PerformanceTrend,
  type ErrorAnalysis,
  type UXInsights
} from './submissionAnalytics';

export {
  PortalMonitor,
  portalMonitor,
  type MonitoringConfig,
  type PortalAlert,
  type MonitoringStatus,
  type AutoResponse
} from './portalMonitor';

// Comprehensive monitoring manager that orchestrates all monitoring services
export class MonitoringManager {
  private static instance: MonitoringManager;
  private isInitialized = false;

  static getInstance(): MonitoringManager {
    if (!MonitoringManager.instance) {
      MonitoringManager.instance = new MonitoringManager();
    }
    return MonitoringManager.instance;
  }

  /**
   * Initialize all monitoring services with performance optimization focus
   */
  async initialize(options: {
    enablePerformanceMonitoring?: boolean;
    enableMemoryLeakDetection?: boolean;
    enableRegressionDetection?: boolean;
    performanceTargets?: {
      maxStartupTime?: number; // ms
      maxMemoryUsage?: number; // bytes  
      maxFormRenderTime?: number; // ms
    };
  } = {}): Promise<void> {
    if (this.isInitialized) return;

    const {
      enablePerformanceMonitoring = true,
      enableMemoryLeakDetection = true,
      enableRegressionDetection = true,
      performanceTargets = {
        maxStartupTime: 2000, // 2s from acceptance criteria
        maxMemoryUsage: 100 * 1024 * 1024, // 100MB from acceptance criteria
        maxFormRenderTime: 200, // 200ms from acceptance criteria
      }
    } = options;

    if (enablePerformanceMonitoring) {
      const { performanceMonitor } = await import('./performance');
      performanceMonitor.setEnabled(true);
    }

    if (enableMemoryLeakDetection) {
      memoryLeakDetector.start();
    }

    this.isInitialized = true;
    console.log('Monitoring system initialized with performance optimization focus');
  }

  /**
   * Get comprehensive system health report
   */
  async getSystemHealthReport(): Promise<{
    performance: ReturnType<typeof performanceMonitor.checkPerformanceTargets>;
    memoryHealth: ReturnType<typeof memoryLeakDetector.getLeakReport>;
    memoryThreshold: ReturnType<typeof performanceMonitor.checkMemoryThreshold>;
    overallHealth: 'excellent' | 'good' | 'warning' | 'critical';
    recommendations: string[];
  }> {
    const { performanceMonitor } = await import('./performance');
    const performance = performanceMonitor.checkPerformanceTargets();
    const memoryHealth = memoryLeakDetector.getLeakReport();
    const memoryThreshold = performanceMonitor.checkMemoryThreshold();

    // Determine overall health
    let overallHealth: 'excellent' | 'good' | 'warning' | 'critical' = 'excellent';
    const recommendations: string[] = [];

    // Check performance targets
    if (!performance.startupTime.meets) {
      overallHealth = 'warning';
      recommendations.push(`Startup time ${performance.startupTime.current}ms exceeds target of ${performance.startupTime.target}ms`);
    }

    if (!performance.memoryUsage.meets) {
      overallHealth = 'critical';
      recommendations.push(`Memory usage ${performance.memoryUsage.current}MB exceeds target of ${performance.memoryUsage.target}MB`);
    }

    if (!performance.formRendering.meets) {
      overallHealth = 'warning';
      recommendations.push(`Form rendering ${performance.formRendering.current}ms exceeds target of ${performance.formRendering.target}ms`);
    }

    // Check memory health
    if (memoryHealth.summary.recommendation === 'critical') {
      overallHealth = 'critical';
      recommendations.push(`Critical memory leaks detected: ${memoryHealth.summary.criticalLeaks} leaks`);
    } else if (memoryHealth.summary.recommendation === 'warning') {
      if (overallHealth === 'excellent') overallHealth = 'warning';
      recommendations.push(`Memory leak warning: ${memoryHealth.summary.totalLeaks} potential leaks`);
    }

    // Memory threshold check
    if (!memoryThreshold.withinThreshold) {
      overallHealth = 'critical';
      recommendations.push(`Memory usage exceeds acceptance criteria threshold`);
    }

    // If no issues found, provide positive feedback
    if (recommendations.length === 0) {
      recommendations.push('All performance targets are being met');
      recommendations.push('Memory usage is within acceptable limits');
      recommendations.push('No memory leaks detected');
    }

    return {
      performance,
      memoryHealth,
      memoryThreshold,
      overallHealth,
      recommendations,
    };
  }

  /**
   * Perform automated optimization based on current performance
   */
  async performAutomatedOptimization(): Promise<{
    performed: string[];
    results: any[];
    overallImprovement: boolean;
  }> {
    const performed: string[] = [];
    const results: any[] = [];

    // Auto-fix memory leaks
    const leakFixResults = await memoryLeakDetector.autoFixLeaks();
    if (leakFixResults.attempted > 0) {
      performed.push('memory_leak_fixes');
      results.push(leakFixResults);
    }

    // Force garbage collection if memory is high
    const { performanceMonitor } = await import('./performance');
    const memoryCheck = performanceMonitor.checkMemoryThreshold();
    if (!memoryCheck.withinThreshold) {
      const gcResult = memoryLeakDetector.forceGarbageCollection();
      performed.push('garbage_collection');
      results.push({ success: gcResult });
    }

    const overallImprovement = performed.length > 0;

    return {
      performed,
      results,
      overallImprovement,
    };
  }

  /**
   * Monitor app startup performance against acceptance criteria
   */
  monitorAppStartup(): {
    startTime: number;
    monitor: (phase: string) => void;
    complete: () => { totalTime: number; meetsTarget: boolean };
  } {
    const startTime = Date.now();
    const phases: { [key: string]: number } = {};

    return {
      startTime,
      monitor: (phase: string) => {
        phases[phase] = Date.now() - startTime;
      },
      complete: () => {
        const totalTime = Date.now() - startTime;
        const meetsTarget = totalTime <= 2000; // 2s acceptance criteria

        // Record detailed startup metrics
        import('./performance').then(({ performanceMonitor }) => {
          performanceMonitor.recordDetailedStartupMetrics({
            appInitTime: phases.init || 0,
            bundleLoadTime: phases.bundle || 0,
            nativeModulesTime: phases.native || 0,
            firstScreenRenderTime: phases.firstRender || 0,
            totalStartupTime: totalTime,
          });
        });

        return { totalTime, meetsTarget };
      }
    };
  }

  /**
   * Shutdown all monitoring services
   */
  shutdown(): void {
    if (!this.isInitialized) return;

    memoryLeakDetector.stop();
    import('./performance').then(({ performanceMonitor }) => {
      performanceMonitor.setEnabled(false);
    });

    this.isInitialized = false;
    console.log('Monitoring system shut down');
  }
}

// Export singleton instance
export const monitoringManager = MonitoringManager.getInstance();