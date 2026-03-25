/**
 * DOM Interaction Types — Type definitions for DOM element interactions
 */

/**
 * Configuration for DOM interaction operations
 */
export interface DOMInteractionConfig {
  defaultTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  scrollBehavior: 'smooth' | 'instant' | 'auto';
  clickDelay: number;
  typeDelay: number;
  validateInteractions: boolean;
}

/**
 * Element interaction options
 */
export interface ElementInteractionOptions {
  timeout?: number;
  scrollIntoView?: boolean;
  waitForVisible?: boolean;
  forceClick?: boolean;
  validateAfter?: boolean;
  screenshot?: boolean;
}

/**
 * Element detection result
 */
export interface ElementDetectionResult {
  found: boolean;
  visible: boolean;
  enabled: boolean;
  coordinates?: { x: number; y: number; width: number; height: number };
  attributes?: Record<string, string>;
  textContent?: string;
  value?: string;
}

/**
 * Click interaction result
 */
export interface ClickResult {
  success: boolean;
  error?: string;
  elementChanged?: boolean;
  pageChanged?: boolean;
  newUrl?: string;
}

/**
 * Type interaction result
 */
export interface TypeResult {
  success: boolean;
  error?: string;
  finalValue?: string;
  charactersTyped?: number;
}
