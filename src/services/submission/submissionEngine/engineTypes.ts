/**
 * Types and default configuration for the Submission Engine
 */

import {
  SubmissionEngineConfig,
} from '@/types/submission';

// Re-export submission types for external use
export type {
  SubmissionSession,
  SubmissionResult,
  SubmissionStatus,
  SubmissionMethod,
  SubmissionError,
  SubmissionMetrics,
  AutomationStepResult,
} from '@/types/submission';

/**
 * Default configuration for submission engine
 */
export const DEFAULT_CONFIG: SubmissionEngineConfig = {
  timeouts: {
    sessionMaxMs: 10 * 60 * 1000, // 10 minutes
    stepMaxMs: 30 * 1000,          // 30 seconds
    pageLoadMaxMs: 15 * 1000,      // 15 seconds
  },
  retries: {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
  },
  security: {
    validateSSL: true,
    allowedDomains: [],
    maxDataSize: 1024 * 1024, // 1MB
  },
  debug: {
    captureScreenshots: false,
    logJavaScript: false,
    saveSessionData: false,
  },
};
