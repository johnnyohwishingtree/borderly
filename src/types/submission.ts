/**
 * Types for automated government portal submission system
 * 
 * This module defines the core types for WebView-based automation
 * while maintaining the local-first principle.
 */

export type SubmissionStatus = 
  | 'not_started' 
  | 'initializing' 
  | 'in_progress' 
  | 'completed' 
  | 'failed' 
  | 'manual_fallback';

export type SubmissionMethod = 'automated' | 'manual' | 'hybrid';

/**
 * Result of an automation step execution
 */
export interface AutomationStepResult {
  success: boolean;
  error?: string;
  screenshot?: string; // Base64 encoded screenshot for debugging
  nextStep?: string;
  data?: Record<string, unknown>;
}

/**
 * Individual automation step definition
 */
export interface AutomationStep {
  id: string;
  name: string;
  description: string;
  
  // JavaScript code to execute in WebView context
  script: string;
  
  // Expected result validation
  validation?: {
    expectedUrl?: string;
    expectedText?: string;
    expectedElement?: string;
  };
  
  // Timing configuration
  timing: {
    timeout: number; // milliseconds
    waitAfter?: number; // milliseconds to wait after execution
  };
  
  // Retry configuration
  retry?: {
    attempts: number;
    delayMs: number;
  };
  
  // Fallback to manual submission if this step fails
  critical: boolean;
}

/**
 * Country-specific automation script configuration
 */
export interface AutomationScript {
  countryCode: string;
  portalUrl: string;
  version: string;
  lastUpdated: string;
  
  // Prerequisites before automation can start
  prerequisites: {
    cookiesEnabled: boolean;
    javascriptEnabled: boolean;
    userAgent?: string;
    viewport?: { width: number; height: number };
  };
  
  // Ordered steps for form automation
  steps: AutomationStep[];
  
  // Field mappings from form schema to portal selectors
  fieldMappings: Record<string, PortalFieldMapping>;
  
  // Session management configuration
  session: {
    maxDurationMs: number;
    keepAlive: boolean;
    clearCookiesOnStart: boolean;
  };
}

/**
 * Mapping between form field and portal element selector
 */
export interface PortalFieldMapping {
  fieldId: string;
  selector: string;
  inputType: 'text' | 'select' | 'radio' | 'checkbox' | 'date' | 'file';
  
  // Special handling for complex fields
  transform?: {
    type: 'date_format' | 'country_code' | 'boolean_to_yesno' | 'custom';
    config?: Record<string, unknown>;
  };
  
  // Validation after input
  validation?: {
    selector?: string;
    expectedValue?: string;
  };
}

/**
 * Current state of a submission session
 */
export interface SubmissionSession {
  id: string;
  legId: string;
  countryCode: string;
  status: SubmissionStatus;
  method: SubmissionMethod;
  
  // Timestamps
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  
  // Progress tracking
  progress: {
    currentStep: number;
    totalSteps: number;
    completedSteps: string[];
    failedSteps: string[];
  };
  
  // Session data
  sessionData: {
    cookies?: string;
    formData: Record<string, unknown>;
    screenshots: string[]; // Base64 encoded screenshots for debugging
  };
  
  // Error tracking
  errors: SubmissionError[];
  
  // Fallback information
  fallback?: {
    reason: string;
    manualSteps: string[];
    prefillData: Record<string, unknown>;
  };
}

/**
 * Error that occurred during submission
 */
export interface SubmissionError {
  stepId: string;
  error: string;
  timestamp: string;
  screenshot?: string;
  retryable: boolean;
}

/**
 * Configuration for submission engine
 */
export interface SubmissionEngineConfig {
  // Global timeouts
  timeouts: {
    sessionMaxMs: number;
    stepMaxMs: number;
    pageLoadMaxMs: number;
  };
  
  // Retry configuration
  retries: {
    maxAttempts: number;
    delayMs: number;
    backoffMultiplier: number;
  };
  
  // Security settings
  security: {
    validateSSL: boolean;
    allowedDomains: string[];
    maxDataSize: number; // bytes
  };
  
  // Debugging
  debug: {
    captureScreenshots: boolean;
    logJavaScript: boolean;
    saveSessionData: boolean;
  };
}

/**
 * Result of a complete submission attempt
 */
export interface SubmissionResult {
  sessionId: string;
  status: SubmissionStatus;
  method: SubmissionMethod;
  
  // Success data
  confirmationNumber?: string;
  qrCode?: string; // Base64 encoded QR code image
  receiptUrl?: string;
  
  // Timing information
  duration: number; // milliseconds
  stepsCompleted: number;
  
  // Error information
  errors: SubmissionError[];
  fallbackReason?: string;
  
  // Next steps for user
  nextSteps: {
    type: 'completed' | 'manual_completion' | 'retry' | 'contact_support';
    description: string;
    actions?: string[];
  };
}

/**
 * WebView controller state
 */
export interface WebViewState {
  url: string;
  loading: boolean;
  error?: string;
  canGoBack: boolean;
  canGoForward: boolean;
  title?: string;
}

/**
 * JavaScript injection payload
 */
export interface JavaScriptPayload {
  code: string;
  timeout: number;
  expectsResult: boolean;
}

/**
 * WebView navigation event
 */
export interface WebViewNavigationEvent {
  url: string;
  title?: string;
  canGoBack: boolean;
  canGoForward: boolean;
  loading: boolean;
}

/**
 * Performance metrics for submission monitoring
 */
export interface SubmissionMetrics {
  countryCode: string;
  submissionMethod: SubmissionMethod;
  duration: number;
  stepsAttempted: number;
  stepsCompleted: number;
  errorsEncountered: number;
  fallbackTriggered: boolean;
  timestamp: string;
  
  // Success/failure categorization
  outcome: 'success' | 'partial_success' | 'failure' | 'user_abandoned';
}

/**
 * Validation result for security checks
 */
export interface SecurityValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  
  // Specific checks
  checks: {
    noPIILeakage: boolean;
    validDomain: boolean;
    secureConnection: boolean;
    dataWithinLimits: boolean;
  };
}