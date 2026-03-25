/**
 * Navigation Controller Types — Type definitions for multi-page navigation and state management
 */

import { AutomationStepResult } from '@/types/submission';

/**
 * Navigation state tracking
 */
export interface NavigationState {
  currentUrl: string;
  previousUrl?: string;
  pageTitle: string;
  sessionId: string;
  startTime: number;
  steps: NavigationStep[];
  isLoading: boolean;
  error?: string;
}

/**
 * Individual navigation step record
 */
export interface NavigationStep {
  id: string;
  timestamp: number;
  url: string;
  title: string;
  action: 'navigate' | 'click' | 'form_submit' | 'redirect' | 'back' | 'forward';
  success: boolean;
  duration?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Navigation flow definition for multi-step processes
 */
export interface NavigationFlow {
  id: string;
  name: string;
  description: string;
  steps: FlowStep[];
  fallbackUrl?: string;
  maxDuration: number;
  sessionPersistence: boolean;
}

/**
 * Individual step in a navigation flow
 */
export interface FlowStep {
  id: string;
  name: string;
  expectedUrl: string | RegExp;
  urlPatterns: string[];
  actions: FlowStepAction[];
  validations: FlowStepValidation[];
  timeout: number;
  retryable: boolean;
  optional: boolean;
}

/**
 * Action to perform in a flow step
 */
export interface FlowStepAction {
  type: 'click' | 'fill' | 'wait' | 'validate' | 'extract' | 'custom';
  target?: string;
  value?: any;
  timeout?: number;
  script?: string;
}

/**
 * Validation for flow step completion
 */
export interface FlowStepValidation {
  type: 'url' | 'element' | 'text' | 'custom';
  target: string;
  expectedValue?: string;
  script?: string;
}

/**
 * Browser history management
 */
export interface BrowserHistory {
  canGoBack: boolean;
  canGoForward: boolean;
  currentIndex: number;
  entries: HistoryEntry[];
}

/**
 * Individual history entry
 */
export interface HistoryEntry {
  url: string;
  title: string;
  timestamp: number;
  state?: any;
}

/**
 * Navigation controller configuration
 */
export interface NavigationConfig {
  maxHistorySize: number;
  defaultTimeout: number;
  retryAttempts: number;
  navigationDelay: number;
  enableStateTracking: boolean;
  enableScreenshots: boolean;
}

/** Re-export for convenience */
export type { AutomationStepResult };
