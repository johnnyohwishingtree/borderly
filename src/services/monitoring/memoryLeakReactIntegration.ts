/**
 * React integration for the Memory Leak Detection Service
 *
 * Provides a hook and HOC for automatic component-level memory tracking.
 */

import { memoryLeakDetector } from './memoryLeakDetector';

// React import (will be available when this is imported in React components)
let React: any;
try {
  React = require('react');
} catch {
  // Mock React for testing environments
  React = {
    useEffect: () => {},
    ComponentType: {} as any,
    createElement: () => null,
  };
}

/**
 * React hook for component memory tracking
 */
export function useMemoryLeakDetection(componentName: string) {
  React.useEffect(() => {
    if (!__DEV__) return;

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
