/**
 * Element Detector Types — Type definitions for element detection and polling
 */

/**
 * Element detection configuration
 */
export interface DetectionConfig {
  pollingInterval: number;
  maxWaitTime: number;
  retryAttempts: number;
  stabilityDelay: number;
  screenshotOnFailure: boolean;
  enableCaching: boolean;
  debugLogging: boolean;
}

/**
 * Element detection criteria
 */
export interface DetectionCriteria {
  selector: string;
  condition: 'present' | 'absent' | 'visible' | 'hidden' | 'enabled' | 'disabled' | 'clickable' | 'stable';
  timeout?: number;
  attributes?: Record<string, string>;
  textContent?: string | RegExp;
  valueContent?: string | RegExp;
  customValidator?: string;
}

/**
 * Element polling strategy
 */
export interface PollingStrategy {
  type: 'fixed' | 'exponential' | 'fibonacci' | 'adaptive';
  initialDelay: number;
  maxDelay: number;
  multiplier?: number;
  backoffFactor?: number;
}

/**
 * Detection result with detailed information
 */
export interface ElementDetectionResult {
  found: boolean;
  condition: string;
  selector: string;
  element?: ElementInfo;
  waitTime: number;
  attempts: number;
  error?: string;
  screenshot?: string;
  stability: {
    isStable: boolean;
    changeCount: number;
    lastChangeTime?: number;
  };
}

/**
 * Detailed element information
 */
export interface ElementInfo {
  tagName: string;
  id?: string;
  className?: string;
  attributes: Record<string, string>;
  textContent: string;
  value?: string;
  coordinates: { x: number; y: number; width: number; height: number };
  isVisible: boolean;
  isEnabled: boolean;
  isClickable: boolean;
  computedStyle: Record<string, string>;
  parentInfo?: {
    tagName: string;
    id?: string;
    className?: string;
  };
}

/**
 * Cache entry for element detection optimization
 */
export interface CacheEntry {
  selector: string;
  timestamp: number;
  result: ElementDetectionResult;
  expiresAt: number;
}

/**
 * Dynamic content change observer
 */
export interface ChangeObserver {
  selector: string;
  mutations: number;
  lastChange: number;
  isStable: boolean;
}
