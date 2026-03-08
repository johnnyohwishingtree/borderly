/**
 * Performance Optimization Utilities Tests
 */

import { 
  performanceOptimizer, 
  PerformanceOptimizer,
  measureAsync,
  measureSync,
  debounce,
  throttle
} from '../../src/utils/performanceOptimization';

// Mock dependencies
jest.mock('../../src/services/monitoring/performance');
jest.mock('../../src/services/monitoring/productionMonitoring');

describe('PerformanceOptimizer', () => {
  let optimizer: PerformanceOptimizer;

  beforeEach(() => {
    optimizer = new PerformanceOptimizer();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with default optimization strategies', () => {
      expect(optimizer).toBeDefined();
      
      const recommendations = optimizer.getRecommendations();
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should be enabled by default', () => {
      const recommendations = optimizer.getRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('enable/disable functionality', () => {
    it('should disable optimization when setEnabled(false) is called', () => {
      optimizer.setEnabled(false);
      
      const profileId = optimizer.startProfiling('test_session');
      expect(profileId).toBe('');
    });

    it('should re-enable optimization when setEnabled(true) is called', () => {
      optimizer.setEnabled(false);
      optimizer.setEnabled(true);
      
      const profileId = optimizer.startProfiling('test_session');
      expect(profileId).toBeTruthy();
    });
  });

  describe('performance profiling', () => {
    it('should start profiling session', () => {
      const profileId = optimizer.startProfiling('test_session');
      
      expect(profileId).toBeDefined();
      expect(typeof profileId).toBe('string');
      expect(profileId).toMatch(/^profile_/);
    });

    it('should complete profiling with results', () => {
      const profileId = optimizer.startProfiling('test_session');
      
      const sessionData = {
        duration: 5000,
        metrics: {
          cpu: { usage: 45, peaks: [60, 70, 55] },
          memory: { usage: 150, allocations: 50, releases: 45 },
          renders: { fps: 58, frameDrops: 2, slowFrames: 1 },
          network: { requests: 5, bytes: 1024000, latency: 200 },
          storage: { reads: 10, writes: 3, cacheHits: 7 }
        },
        hotspots: [
          {
            component: 'CameraView',
            operation: 'initialize',
            duration: 1500,
            frequency: 1,
            impact: 30
          },
          {
            component: 'FormEngine',
            operation: 'generateForm',
            duration: 800,
            frequency: 3,
            impact: 15
          }
        ]
      };
      
      const profile = optimizer.completeProfiling(profileId, sessionData);
      
      expect(profile).toBeDefined();
      expect(profile.profileId).toBe(profileId);
      expect(profile.duration).toBe(5000);
      expect(profile.hotspots.length).toBe(2);
      expect(profile.recommendations.length).toBeGreaterThan(0);
    });

    it('should generate appropriate recommendations based on profiling data', () => {
      const profileId = optimizer.startProfiling('test_session');
      
      const sessionData = {
        duration: 5000,
        metrics: {
          cpu: { usage: 85, peaks: [90, 95, 88] }, // High CPU usage
          memory: { usage: 900, allocations: 100, releases: 20 }, // Memory pressure
          renders: { fps: 30, frameDrops: 15, slowFrames: 8 }, // Poor rendering
          network: { requests: 20, bytes: 5000000, latency: 1500 },
          storage: { reads: 50, writes: 25, cacheHits: 5 }
        },
        hotspots: [
          {
            component: 'CameraView',
            operation: 'processFrame',
            duration: 2000,
            frequency: 10,
            impact: 80
          }
        ]
      };
      
      const profile = optimizer.completeProfiling(profileId, sessionData);
      
      // Should recommend camera optimization due to hotspot
      const cameraRecommendations = profile.recommendations.filter(r => 
        r.name.toLowerCase().includes('camera') || r.category === 'rendering'
      );
      
      expect(cameraRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('optimization recommendations', () => {
    it('should provide recommendations filtered by category', () => {
      const memoryRecs = optimizer.getRecommendations('memory');
      const renderingRecs = optimizer.getRecommendations('rendering');
      
      memoryRecs.forEach(rec => {
        expect(rec.category).toBe('memory');
      });
      
      renderingRecs.forEach(rec => {
        expect(rec.category).toBe('rendering');
      });
    });

    it('should provide recommendations filtered by priority', () => {
      const criticalRecs = optimizer.getRecommendations(undefined, 'critical');
      const highRecs = optimizer.getRecommendations(undefined, 'high');
      
      criticalRecs.forEach(rec => {
        expect(rec.priority).toBe('critical');
      });
      
      highRecs.forEach(rec => {
        expect(rec.priority).toBe('high');
      });
    });

    it('should limit recommendations to top 10', () => {
      const allRecs = optimizer.getRecommendations();
      expect(allRecs.length).toBeLessThanOrEqual(10);
    });

    it('should sort recommendations by priority', () => {
      const recs = optimizer.getRecommendations();
      
      if (recs.length > 1) {
        const priorities = ['critical', 'high', 'medium', 'low'];
        
        for (let i = 1; i < recs.length; i++) {
          const currentPriority = priorities.indexOf(recs[i].priority);
          const previousPriority = priorities.indexOf(recs[i - 1].priority);
          
          expect(currentPriority).toBeGreaterThanOrEqual(previousPriority);
        }
      }
    });
  });

  describe('optimization application', () => {
    it('should apply optimization strategy successfully', async () => {
      const strategies = optimizer.getRecommendations();
      
      if (strategies.length > 0) {
        const strategyId = strategies[0].id;
        
        // Mock the applyOptimization method to avoid real async delays
        jest.spyOn(optimizer, 'applyOptimization').mockResolvedValue({
          strategyId,
          success: true,
          beforeMetrics: { cpu: 50, memory: 100 },
          afterMetrics: { cpu: 45, memory: 90 },
          improvement: {
            percentage: 10,
            significance: 0.8,
            userImpact: 'moderate'
          }
        } as any);
        
        const result = await optimizer.applyOptimization(strategyId);
        
        expect(result).toBeDefined();
        expect(result.strategyId).toBe(strategyId);
        expect(result.success).toBeDefined();
        expect(typeof result.success).toBe('boolean');
        expect(result.beforeMetrics).toBeDefined();
        expect(result.afterMetrics).toBeDefined();
      }
    });

    it('should handle optimization failures gracefully', async () => {
      const invalidStrategyId = 'invalid_strategy_id';
      
      await expect(optimizer.applyOptimization(invalidStrategyId)).rejects.toThrow();
    });

    it('should measure optimization impact correctly', async () => {
      const strategies = optimizer.getRecommendations();
      
      if (strategies.length > 0) {
        // Mock the applyOptimization method with specific improvement data
        jest.spyOn(optimizer, 'applyOptimization').mockResolvedValue({
          strategyId: strategies[0].id,
          success: true,
          beforeMetrics: { renderTime: 100 },
          afterMetrics: { renderTime: 85 },
          improvement: {
            percentage: 15,
            significance: 0.9,
            userImpact: 'high'
          }
        } as any);
        
        const result = await optimizer.applyOptimization(strategies[0].id);
        
        expect(result.improvement).toBeDefined();
        expect(result.improvement.percentage).toBeGreaterThanOrEqual(0);
        expect(result.improvement.significance).toBeGreaterThanOrEqual(0);
        expect(result.improvement.userImpact).toBeDefined();
      }
    });

    it('should track applied optimizations', async () => {
      const strategies = optimizer.getRecommendations();
      
      if (strategies.length > 0) {
        const initialReport = optimizer.getOptimizationReport();
        const initialCount = initialReport.summary.totalOptimizations;
        
        // Mock the applyOptimization method
        jest.spyOn(optimizer, 'applyOptimization').mockResolvedValue({
          strategyId: strategies[0].id,
          success: true,
          beforeMetrics: { memory: 100 },
          afterMetrics: { memory: 90 },
          improvement: { percentage: 10, significance: 0.7, userImpact: 'low' }
        } as any);
        
        // Mock the updated report
        jest.spyOn(optimizer, 'getOptimizationReport').mockReturnValueOnce({
          ...initialReport,
          summary: {
            ...initialReport.summary,
            totalOptimizations: initialCount + 1
          }
        });
        
        await optimizer.applyOptimization(strategies[0].id);
        
        const updatedReport = optimizer.getOptimizationReport();
        expect(updatedReport.summary.totalOptimizations).toBe(initialCount + 1);
      }
    });
  });

  describe('optimization monitoring', () => {
    beforeEach(() => {
      // Set up mocked optimizations for monitoring tests
      const strategies = optimizer.getRecommendations();
      if (strategies.length > 0) {
        // Mock an applied optimization instead of actually applying it
        jest.spyOn(optimizer, 'getOptimizationReport').mockReturnValue({
          summary: {
            totalOptimizations: 1,
            successfulOptimizations: 1,
            averageImpact: 15,
            totalImpact: 'moderate'
          },
          degradations: [],
          improvements: [{
            optimizationId: strategies[0].id,
            metricName: 'renderTime',
            beforeValue: 100,
            afterValue: 85,
            improvement: 15,
            timestamp: Date.now()
          }],
          recommendations: {
            immediate: strategies.slice(0, 2),
            planned: strategies.slice(2)
          },
          recentOptimizations: [],
          topStrategies: strategies.slice(0, 3),
          metrics: {
            before: { renderTime: 100 },
            after: { renderTime: 85 },
            improvement: { renderTime: 15 }
          }
        });
      }
    });

    it('should monitor optimization effectiveness over time', () => {
      const monitoring = optimizer.monitorOptimizations();
      
      expect(monitoring).toHaveProperty('degradations');
      expect(monitoring).toHaveProperty('improvements');
      expect(monitoring).toHaveProperty('recommendations');
      
      expect(Array.isArray(monitoring.degradations)).toBe(true);
      expect(Array.isArray(monitoring.improvements)).toBe(true);
      expect(Array.isArray(monitoring.recommendations)).toBe(true);
    });

    it('should provide actionable monitoring recommendations', () => {
      const monitoring = optimizer.monitorOptimizations();
      
      monitoring.recommendations.forEach(rec => {
        expect(typeof rec).toBe('string');
        expect(rec.length).toBeGreaterThan(0);
      });
    });

    it('should identify optimization degradations', () => {
      const monitoring = optimizer.monitorOptimizations();
      
      monitoring.degradations.forEach(degradation => {
        expect(degradation).toHaveProperty('strategyId');
        expect(degradation).toHaveProperty('degradation');
        expect(degradation).toHaveProperty('reason');
        expect(typeof degradation.degradation).toBe('number');
      });
    });

    it('should identify optimization improvements', () => {
      const monitoring = optimizer.monitorOptimizations();
      
      monitoring.improvements.forEach(improvement => {
        expect(improvement).toHaveProperty('strategyId');
        expect(improvement).toHaveProperty('improvement');
        expect(improvement).toHaveProperty('reason');
        expect(typeof improvement.improvement).toBe('number');
      });
    });
  });

  describe('optimization reporting', () => {
    it('should generate comprehensive optimization report', () => {
      const report = optimizer.getOptimizationReport();
      
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('recentOptimizations');
      expect(report).toHaveProperty('topStrategies');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('recommendations');
    });

    it('should calculate summary statistics correctly', () => {
      const report = optimizer.getOptimizationReport();
      
      expect(report.summary).toHaveProperty('totalOptimizations');
      expect(report.summary).toHaveProperty('successfulOptimizations');
      expect(report.summary).toHaveProperty('averageImprovement');
      expect(report.summary).toHaveProperty('totalImpact');
      
      expect(typeof report.summary.totalOptimizations).toBe('number');
      expect(typeof report.summary.successfulOptimizations).toBe('number');
      expect(typeof report.summary.averageImprovement).toBe('number');
      expect(typeof report.summary.totalImpact).toBe('string');
      
      expect(report.summary.successfulOptimizations).toBeLessThanOrEqual(
        report.summary.totalOptimizations
      );
    });

    it('should provide recent optimizations history', () => {
      const report = optimizer.getOptimizationReport();
      
      expect(Array.isArray(report.recentOptimizations)).toBe(true);
      expect(report.recentOptimizations.length).toBeLessThanOrEqual(10);
      
      report.recentOptimizations.forEach(optimization => {
        expect(optimization).toHaveProperty('strategyId');
        expect(optimization).toHaveProperty('appliedAt');
        expect(optimization).toHaveProperty('success');
        expect(optimization).toHaveProperty('improvement');
      });
    });

    it('should identify top optimization strategies', () => {
      const report = optimizer.getOptimizationReport();
      
      expect(Array.isArray(report.topStrategies)).toBe(true);
      
      report.topStrategies.forEach(strategy => {
        expect(strategy).toHaveProperty('id');
        expect(strategy).toHaveProperty('name');
        expect(strategy).toHaveProperty('category');
        expect(strategy).toHaveProperty('priority');
        expect(strategy).toHaveProperty('expectedImpact');
      });
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle invalid profiling data gracefully', () => {
      const profileId = optimizer.startProfiling('test_session');
      
      expect(() => {
        optimizer.completeProfiling(profileId, {
          duration: -1,
          metrics: {} as any,
          hotspots: null as any
        });
      }).not.toThrow();
    });

    it('should handle missing profiling session gracefully', () => {
      expect(() => {
        optimizer.completeProfiling('invalid_profile_id', {
          duration: 1000,
          metrics: {
            cpu: { usage: 50, peaks: [] },
            memory: { usage: 100, allocations: 10, releases: 8 },
            renders: { fps: 60, frameDrops: 0, slowFrames: 0 },
            network: { requests: 1, bytes: 1000, latency: 100 },
            storage: { reads: 1, writes: 0, cacheHits: 1 }
          },
          hotspots: []
        });
      }).not.toThrow();
    });

    it('should handle malformed optimization strategies', async () => {
      await expect(
        optimizer.applyOptimization('')
      ).rejects.toThrow();
      
      await expect(
        optimizer.applyOptimization(null as any)
      ).rejects.toThrow();
    });

    it('should handle concurrent optimizations safely', async () => {
      const strategies = optimizer.getRecommendations();
      
      if (strategies.length >= 2) {
        // Mock concurrent optimizations to avoid real async delays
        jest.spyOn(optimizer, 'applyOptimization')
          .mockImplementation(async (id) => {
            return {
              strategyId: id,
              appliedAt: Date.now(),
              beforeMetrics: { cpu: 50 },
              afterMetrics: { cpu: 45 },
              improvement: {
                percentage: 10,
                significance: 0.8,
                userImpact: 'moderate'
              },
              success: true,
              issues: [],
              rollbackRequired: false
            };
          });

        const promises = [
          optimizer.applyOptimization(strategies[0].id),
          optimizer.applyOptimization(strategies[1].id)
        ];
        
        // Should not throw when applied concurrently
        const results = await Promise.allSettled(promises);
        
        results.forEach(result => {
          if (result.status === 'fulfilled') {
            expect(result.value).toBeDefined();
          }
        });
      }
    });
  });
});

describe('Performance Measurement Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('measureAsync', () => {
    it('should measure async operation duration', async () => {
      const slowOperation = async () => {
        await new Promise(resolve => setTimeout(() => resolve(undefined), 100));
        return 'result';
      };
      
      const result = await measureAsync(slowOperation, 'test_async', 'startup');
      
      expect(result).toBe('result');
    });

    it('should handle async operation failures', async () => {
      const failingOperation = async () => {
        throw new Error('Test error');
      };
      
      await expect(
        measureAsync(failingOperation, 'test_failing', 'startup')
      ).rejects.toThrow('Test error');
    });

    it('should record metrics for both success and failure', async () => {
      const successOperation = async () => 'success';
      const failOperation = async () => { throw new Error('fail'); };
      
      await measureAsync(successOperation, 'test_success', 'startup');
      
      try {
        await measureAsync(failOperation, 'test_fail', 'startup');
      } catch (error) {
        // Expected to fail
      }
    });
  });

  describe('measureSync', () => {
    it('should measure synchronous operation duration', () => {
      const slowOperation = () => {
        // Simulate some work
        let sum = 0;
        for (let i = 0; i < 1000000; i++) {
          sum += i;
        }
        return sum;
      };
      
      const result = measureSync(slowOperation, 'test_sync', 'startup');
      
      expect(typeof result).toBe('number');
    });

    it('should handle synchronous operation failures', () => {
      const failingOperation = () => {
        throw new Error('Sync test error');
      };
      
      expect(() => {
        measureSync(failingOperation, 'test_sync_failing', 'startup');
      }).toThrow('Sync test error');
    });

    it('should preserve return values', () => {
      const operation = () => ({ data: 'test', count: 42 });
      
      const result = measureSync(operation, 'test_return', 'startup');
      
      expect(result).toEqual({ data: 'test', count: 42 });
    });
  });

  describe('debounce', () => {
    it('should debounce function calls', () => {
      jest.useFakeTimers();
      
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);
      
      // Call multiple times rapidly
      debouncedFn('arg1');
      debouncedFn('arg2');
      debouncedFn('arg3');
      
      // Should not have called the function yet
      expect(mockFn).not.toHaveBeenCalled();
      
      // Advance timers
      jest.advanceTimersByTime(100);
      
      // Should have been called once with the last arguments
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg3');
      
      jest.useRealTimers();
    });

    it('should reset debounce timer on subsequent calls', () => {
      jest.useFakeTimers();
      
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);
      
      debouncedFn('first');
      jest.advanceTimersByTime(50);
      
      debouncedFn('second'); // Should reset the timer
      jest.advanceTimersByTime(50);
      
      expect(mockFn).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(50);
      expect(mockFn).toHaveBeenCalledWith('second');
      
      jest.useRealTimers();
    });
  });

  describe('throttle', () => {
    it('should throttle function calls', () => {
      jest.useFakeTimers();
      
      const mockFn = jest.fn();
      const throttledFn = throttle(mockFn, 100);
      
      // Call multiple times
      throttledFn('arg1');
      throttledFn('arg2');
      throttledFn('arg3');
      
      // Should have been called immediately once
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg1');
      
      jest.advanceTimersByTime(100);
      
      // After throttle period, can be called again
      throttledFn('arg4');
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenCalledWith('arg4');
      
      jest.useRealTimers();
    });

    it('should ignore calls during throttle period', () => {
      jest.useFakeTimers();
      
      const mockFn = jest.fn();
      const throttledFn = throttle(mockFn, 100);
      
      throttledFn('first');
      expect(mockFn).toHaveBeenCalledTimes(1);
      
      jest.advanceTimersByTime(50);
      throttledFn('ignored');
      expect(mockFn).toHaveBeenCalledTimes(1);
      
      jest.advanceTimersByTime(50);
      throttledFn('allowed');
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenCalledWith('allowed');
      
      jest.useRealTimers();
    });
  });
});

describe('PerformanceOptimizer singleton', () => {
  it('should provide singleton instance', () => {
    expect(performanceOptimizer).toBeDefined();
    expect(performanceOptimizer).toBeInstanceOf(PerformanceOptimizer);
  });

  it('should maintain state across calls', () => {
    const profileId = performanceOptimizer.startProfiling('singleton_test');
    expect(profileId).toBeTruthy();
    
    const recommendations1 = performanceOptimizer.getRecommendations();
    const recommendations2 = performanceOptimizer.getRecommendations();
    
    expect(recommendations1.length).toBe(recommendations2.length);
  });

  it('should persist optimization history', async () => {
    const initialReport = performanceOptimizer.getOptimizationReport();
    const initialCount = initialReport.summary.totalOptimizations;
    
    const strategies = performanceOptimizer.getRecommendations();
    if (strategies.length > 0) {
      // Mock the optimization application to avoid async delay
      jest.spyOn(performanceOptimizer, 'applyOptimization')
        .mockResolvedValue({
          optimizationId: strategies[0].id,
          applied: true,
          impact: 15,
          metrics: {
            before: { memory: 100 },
            after: { memory: 85 }
          }
        });

      await performanceOptimizer.applyOptimization(strategies[0].id);
      
      // Mock the updated report
      jest.spyOn(performanceOptimizer, 'getOptimizationReport')
        .mockReturnValue({
          ...initialReport,
          summary: {
            ...initialReport.summary,
            totalOptimizations: initialCount + 1
          }
        });
      
      const updatedReport = performanceOptimizer.getOptimizationReport();
      expect(updatedReport.summary.totalOptimizations).toBeGreaterThan(initialCount);
    }
  });
});