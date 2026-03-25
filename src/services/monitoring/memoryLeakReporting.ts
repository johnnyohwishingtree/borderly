/**
 * Memory Leak Reporting — Creates MemoryLeak objects for suspicious patterns
 */

import type { MemoryLeak, MemorySample } from './memoryLeakDetectorTypes';

export function createComponentLeak(
  componentName: string,
  memoryGrowth: number,
  samples: MemorySample[]
): MemoryLeak {
  return {
    id: `component_leak_${Date.now()}`,
    type: 'component',
    source: componentName,
    description: `Component ${componentName} may have memory leak. Memory increased by ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB during lifecycle`,
    severity: 'medium',
    memoryGrowth,
    detectedAt: Date.now(),
    samples: samples.slice(-3),
    recommendations: [
      'Check for unremoved event listeners',
      'Verify timer cleanup in useEffect',
      'Review state management for circular references',
      'Check for retained closures',
    ],
    autoFixable: false,
  };
}

export function createListenerLeak(
  eventName: string,
  count: number,
  samples: MemorySample[]
): MemoryLeak {
  return {
    id: `listener_leak_${Date.now()}`,
    type: 'listener',
    source: eventName,
    description: `Excessive event listeners detected for '${eventName}': ${count} listeners`,
    severity: count > 100 ? 'high' : 'medium',
    memoryGrowth: count * 1024,
    detectedAt: Date.now(),
    samples: samples.slice(-2),
    recommendations: [
      'Review event listener cleanup',
      'Use removeEventListener in cleanup',
      'Consider using AbortController for cleanup',
      'Avoid adding listeners in render loops',
    ],
    autoFixable: false,
  };
}

export function createTimerLeak(count: number, samples: MemorySample[]): MemoryLeak {
  return {
    id: `timer_leak_${Date.now()}`,
    type: 'timer',
    source: 'system_timers',
    description: `Excessive active timers detected: ${count} timers`,
    severity: count > 200 ? 'high' : 'medium',
    memoryGrowth: count * 512,
    detectedAt: Date.now(),
    samples: samples.slice(-2),
    recommendations: [
      'Clear timers in component cleanup',
      'Use clearTimeout/clearInterval',
      'Review timer usage patterns',
      'Consider using requestAnimationFrame for animations',
    ],
    autoFixable: true,
  };
}

export function createNetworkLeak(count: number, samples: MemorySample[]): MemoryLeak {
  return {
    id: `network_leak_${Date.now()}`,
    type: 'network',
    source: 'pending_requests',
    description: `Excessive pending network requests: ${count} active requests`,
    severity: 'medium',
    memoryGrowth: count * 2048,
    detectedAt: Date.now(),
    samples: samples.slice(-2),
    recommendations: [
      'Cancel requests on component unmount',
      'Use AbortController for request cancellation',
      'Review request timeout settings',
      'Check for infinite retry loops',
    ],
    autoFixable: true,
  };
}
