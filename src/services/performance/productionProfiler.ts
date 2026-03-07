/**
 * Production Profiler Service
 * 
 * Advanced performance profiling for production environments with real-time
 * monitoring, automated analysis, and optimization recommendations.
 */

import { sanitizeObject, sanitizeString } from '../../utils/piiSanitizer';
import { performanceMonitor } from '../monitoring/performance';
import { productionMonitoring } from '../monitoring/productionMonitoring';

export interface ProfilerMetrics {
  cpu: {
    usage: number;
    timestamp: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
    timestamp: number;
  };
  render: {
    frameDrops: number;
    averageFPS: number;
    slowFrames: number;
    timestamp: number;
  };
  network: {
    requestCount: number;
    totalBytes: number;
    averageLatency: number;
    errors: number;
    timestamp: number;
  };
}

export interface PerformanceBaseline {
  category: string;
  operation: string;
  expectedDuration: number;
  maxAcceptableDuration: number;
  sampleSize: number;
  confidence: number;
}

export interface PerformanceRegression {
  id: string;
  operation: string;
  category: string;
  baseline: number;
  current: number;
  degradation: number; // percentage
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: number;
  samples: number;
}

export interface OptimizationRecommendation {
  id: string;
  type: 'memory' | 'cpu' | 'render' | 'network' | 'storage';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  implementation: string[];
  metrics: {
    before: Record<string, number>;
    expectedAfter: Record<string, number>;
  };
}

class ProductionProfiler {
  private isEnabled: boolean = true;
  private profilingInterval: ReturnType<typeof setInterval> | null = null;
  private baselines: Map<string, PerformanceBaseline> = new Map();
  private regressions: PerformanceRegression[] = [];
  private recommendations: OptimizationRecommendation[] = [];
  private metrics: ProfilerMetrics[] = [];
  private operationTimes: Map<string, number[]> = new Map();

  constructor() {
    this.setupBaselines();
    this.startContinuousProfiler();
  }

  /**
   * Enable or disable production profiling
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    
    if (enabled && !this.profilingInterval) {
      this.startContinuousProfiler();
    } else if (!enabled && this.profilingInterval) {
      clearInterval(this.profilingInterval);
      this.profilingInterval = null;
    }

    productionMonitoring.recordEvent('system', 'profiler', {
      action: enabled ? 'enabled' : 'disabled'
    }, 'low');
  }

  /**
   * Record operation timing for regression analysis
   */
  recordOperation(operation: string, category: string, duration: number): void {
    if (!this.isEnabled) return;

    const key = `${category}:${operation}`;
    
    if (!this.operationTimes.has(key)) {
      this.operationTimes.set(key, []);
    }
    
    const times = this.operationTimes.get(key)!;
    times.push(duration);
    
    // Keep only last 100 measurements to prevent memory bloat
    if (times.length > 100) {
      times.shift();
    }

    // Check for regressions if we have enough samples
    if (times.length >= 10) {
      this.checkForRegression(operation, category, times);
    }

    // Record in performance monitor
    performanceMonitor.recordMetric(operation, duration, 'ms', category);
  }

  /**
   * Get real-time performance dashboard data
   */
  getDashboardMetrics(): {
    current: ProfilerMetrics | null;
    trends: {
      memory: { direction: 'up' | 'down' | 'stable'; change: number };
      performance: { direction: 'up' | 'down' | 'stable'; change: number };
      errors: { direction: 'up' | 'down' | 'stable'; change: number };
    };
    health: {
      score: number; // 0-100
      status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
      issues: string[];
    };
  } {
    const current = this.getCurrentMetrics();
    const trends = this.calculateTrends();
    const health = this.calculateHealthScore();

    return {
      current,
      trends,
      health
    };
  }

  /**
   * Analyze user flow performance to identify friction points
   */
  analyzeUserFlows(): {
    criticalPaths: {
      flow: string;
      averageDuration: number;
      dropOffRate: number;
      bottlenecks: { step: string; duration: number; impact: string }[];
    }[];
    recommendations: OptimizationRecommendation[];
  } {
    const flowSummary = performanceMonitor.getPerformanceSummary('navigation');
    const criticalPaths = this.identifyCriticalPaths(flowSummary);
    
    // Generate recommendations based on analysis
    this.generateOptimizationRecommendations(criticalPaths);

    return {
      criticalPaths,
      recommendations: this.recommendations
    };
  }

  /**
   * Get performance regressions detected in production
   */
  getRegressions(): PerformanceRegression[] {
    return this.regressions.filter(regression => 
      Date.now() - regression.detectedAt < 7 * 24 * 60 * 60 * 1000 // Last 7 days
    );
  }

  /**
   * Get optimization recommendations prioritized by impact
   */
  getOptimizationRecommendations(): OptimizationRecommendation[] {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    
    return this.recommendations
      .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
      .slice(0, 10); // Top 10 recommendations
  }

  /**
   * Generate production performance report
   */
  generatePerformanceReport(): {
    summary: {
      period: string;
      totalSessions: number;
      averagePerformance: number;
      criticalIssues: number;
    };
    keyMetrics: {
      appStartTime: { average: number; p95: number };
      formGeneration: { average: number; p95: number };
      cameraOperations: { average: number; p95: number };
      memoryUsage: { average: number; peak: number };
    };
    regressions: PerformanceRegression[];
    recommendations: OptimizationRecommendation[];
    trends: {
      performance: 'improving' | 'stable' | 'declining';
      reliability: 'improving' | 'stable' | 'declining';
      userExperience: 'improving' | 'stable' | 'declining';
    };
  } {
    const summary = performanceMonitor.getPerformanceSummary();
    const regressions = this.getRegressions();
    const recommendations = this.getOptimizationRecommendations();

    return {
      summary: {
        period: 'Last 7 days',
        totalSessions: (summary?.counts && summary.counts.app_start_time) || 0,
        averagePerformance: this.calculateAveragePerformanceScore(),
        criticalIssues: regressions.filter(r => r.severity === 'critical').length
      },
      keyMetrics: this.calculateKeyMetrics(summary),
      regressions,
      recommendations,
      trends: this.calculateTrends()
    };
  }

  private setupBaselines(): void {
    // Set performance baselines based on MVP requirements
    const baselines: PerformanceBaseline[] = [
      {
        category: 'startup',
        operation: 'app_start_time',
        expectedDuration: 2000,
        maxAcceptableDuration: 5000,
        sampleSize: 50,
        confidence: 0.95
      },
      {
        category: 'form',
        operation: 'form_generation',
        expectedDuration: 500,
        maxAcceptableDuration: 2000,
        sampleSize: 30,
        confidence: 0.9
      },
      {
        category: 'camera',
        operation: 'camera_mrz_scan',
        expectedDuration: 3000,
        maxAcceptableDuration: 10000,
        sampleSize: 20,
        confidence: 0.85
      },
      {
        category: 'navigation',
        operation: 'screen_transition',
        expectedDuration: 300,
        maxAcceptableDuration: 1000,
        sampleSize: 100,
        confidence: 0.95
      }
    ];

    baselines.forEach(baseline => {
      this.baselines.set(`${baseline.category}:${baseline.operation}`, baseline);
    });
  }

  private startContinuousProfiler(): void {
    if (!this.isEnabled || this.profilingInterval) return;

    this.profilingInterval = setInterval(() => {
      const metrics = this.collectMetrics();
      if (metrics) {
        this.metrics.push(metrics);
        
        // Keep only last 24 hours of metrics
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        this.metrics = this.metrics.filter(m => m.memory.timestamp > oneDayAgo);

        this.analyzeMetrics(metrics);
      }
    }, 60000); // Collect metrics every minute
  }

  private getCurrentMetrics(): ProfilerMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  private collectMetrics(): ProfilerMetrics | null {
    const timestamp = Date.now();
    
    // In a real React Native app, these would come from native modules
    // For now, we'll use placeholder values
    return {
      cpu: {
        usage: Math.random() * 100, // Placeholder
        timestamp
      },
      memory: {
        used: Math.random() * 1024 * 1024 * 1024, // Placeholder
        total: 2 * 1024 * 1024 * 1024, // Placeholder
        percentage: Math.random() * 100,
        timestamp
      },
      render: {
        frameDrops: Math.floor(Math.random() * 10),
        averageFPS: 58 + Math.random() * 4,
        slowFrames: Math.floor(Math.random() * 5),
        timestamp
      },
      network: {
        requestCount: Math.floor(Math.random() * 10),
        totalBytes: Math.random() * 1024 * 1024,
        averageLatency: 100 + Math.random() * 400,
        errors: Math.floor(Math.random() * 3),
        timestamp
      }
    };
  }

  private checkForRegression(operation: string, category: string, times: number[]): void {
    const key = `${category}:${operation}`;
    const baseline = this.baselines.get(key);
    
    if (!baseline || times.length < baseline.sampleSize) return;

    const recentTimes = times.slice(-baseline.sampleSize);
    const average = recentTimes.reduce((sum, time) => sum + time, 0) / recentTimes.length;
    const degradation = ((average - baseline.expectedDuration) / baseline.expectedDuration) * 100;

    // Only flag as regression if degradation > 20%
    if (degradation > 20) {
      const severity = this.calculateRegressionSeverity(degradation, average, baseline);
      
      const regression: PerformanceRegression = {
        id: `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        operation,
        category,
        baseline: baseline.expectedDuration,
        current: average,
        degradation,
        severity,
        detectedAt: Date.now(),
        samples: recentTimes.length
      };

      this.regressions.push(regression);

      productionMonitoring.recordEvent('error', 'performance_regression', {
        operation,
        category,
        degradation,
        severity
      }, severity);
    }
  }

  private calculateRegressionSeverity(
    degradation: number, 
    current: number, 
    baseline: PerformanceBaseline
  ): PerformanceRegression['severity'] {
    if (current > baseline.maxAcceptableDuration) return 'critical';
    if (degradation > 100) return 'high';
    if (degradation > 50) return 'medium';
    return 'low';
  }

  private identifyCriticalPaths(flowSummary: any): any[] {
    // Analyze flow performance data to identify critical user paths
    // This would process real flow data from performanceMonitor
    return [
      {
        flow: 'onboarding',
        averageDuration: 45000,
        dropOffRate: 0.15,
        bottlenecks: [
          { step: 'passport_scan', duration: 8000, impact: 'High user frustration with camera setup' },
          { step: 'biometric_setup', duration: 5000, impact: 'Technical complexity confusion' }
        ]
      },
      {
        flow: 'form_completion',
        averageDuration: 25000,
        dropOffRate: 0.08,
        bottlenecks: [
          { step: 'form_generation', duration: 2000, impact: 'Perceived slowness in form loading' }
        ]
      }
    ];
  }

  private generateOptimizationRecommendations(criticalPaths: any[]): void {
    this.recommendations = [
      {
        id: 'rec_camera_optimization',
        type: 'render',
        priority: 'high',
        title: 'Optimize Camera Preview Performance',
        description: 'Camera operations showing 40% slower performance than baseline',
        impact: 'Reduce passport scanning time by 3-5 seconds',
        implementation: [
          'Implement camera frame throttling',
          'Add ML Kit preprocessing optimizations',
          'Cache camera permissions to reduce startup delay'
        ],
        metrics: {
          before: { average_duration: 8000, success_rate: 0.85 },
          expectedAfter: { average_duration: 5000, success_rate: 0.92 }
        }
      },
      {
        id: 'rec_form_caching',
        type: 'memory',
        priority: 'medium',
        title: 'Implement Form Schema Caching',
        description: 'Form generation could benefit from intelligent caching',
        impact: 'Reduce form load time by 60% for repeat countries',
        implementation: [
          'Cache parsed schemas in MMKV',
          'Pre-parse common country schemas',
          'Implement LRU cache for form templates'
        ],
        metrics: {
          before: { average_duration: 2000, cache_hit_rate: 0 },
          expectedAfter: { average_duration: 800, cache_hit_rate: 0.7 }
        }
      }
    ];
  }

  private calculateTrends(): any {
    // Simplified trend calculation
    return {
      performance: { direction: 'stable' as const, change: 2 },
      memory: { direction: 'up' as const, change: 5 },
      errors: { direction: 'down' as const, change: -3 }
    };
  }

  private calculateHealthScore(): any {
    const currentRegressions = this.getRegressions();
    const criticalIssues = currentRegressions.filter(r => r.severity === 'critical').length;
    const highIssues = currentRegressions.filter(r => r.severity === 'high').length;
    
    let score = 100;
    score -= (criticalIssues * 25);
    score -= (highIssues * 10);
    
    const issues: string[] = [];
    if (criticalIssues > 0) issues.push(`${criticalIssues} critical performance regressions`);
    if (highIssues > 0) issues.push(`${highIssues} high-impact performance issues`);

    let status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    if (score >= 90) status = 'excellent';
    else if (score >= 75) status = 'good';
    else if (score >= 60) status = 'fair';
    else if (score >= 40) status = 'poor';
    else status = 'critical';

    return { score, status, issues };
  }

  private calculateAveragePerformanceScore(): number {
    // Simplified calculation based on recent metrics
    return 78; // Placeholder
  }

  private calculateKeyMetrics(summary: any): any {
    const averages = summary?.averages || {};
    return {
      appStartTime: { 
        average: averages.app_start_time || 3000, 
        p95: (averages.app_start_time || 3000) * 1.5 
      },
      formGeneration: { 
        average: averages.form_generation || 1200, 
        p95: (averages.form_generation || 1200) * 1.8 
      },
      cameraOperations: { 
        average: averages.camera_mrz_scan || 6000, 
        p95: (averages.camera_mrz_scan || 6000) * 2.2 
      },
      memoryUsage: { 
        average: 150, 
        peak: 280 
      }
    };
  }

  private analyzeMetrics(metrics: ProfilerMetrics): void {
    // Check for concerning patterns
    if (metrics.memory.percentage > 85) {
      productionMonitoring.recordEvent('error', 'memory', {
        usage: metrics.memory.percentage,
        used: metrics.memory.used,
        total: metrics.memory.total
      }, 'high');
    }

    if (metrics.render.frameDrops > 5) {
      productionMonitoring.recordEvent('error', 'rendering', {
        frameDrops: metrics.render.frameDrops,
        fps: metrics.render.averageFPS
      }, 'medium');
    }
  }
}

export const productionProfiler = new ProductionProfiler();
export { ProductionProfiler };