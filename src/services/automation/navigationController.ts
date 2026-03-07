/**
 * Navigation Controller - Multi-page navigation and state management for form automation
 * 
 * Handles complex navigation flows, page transitions, session state persistence,
 * and cross-page form continuation in government portals.
 */

import { AutomationStepResult, WebViewNavigationEvent } from '@/types/submission';

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

/**
 * Main navigation controller class
 */
export class NavigationController {
  private config: NavigationConfig;
  private state: NavigationState;
  private history: BrowserHistory;
  private flows: Map<string, NavigationFlow>;
  private activeFlow?: NavigationFlow;
  private eventListeners: Map<string, Function[]>;

  constructor(config?: Partial<NavigationConfig>) {
    this.config = {
      maxHistorySize: 50,
      defaultTimeout: 30000,
      retryAttempts: 3,
      navigationDelay: 1000,
      enableStateTracking: true,
      enableScreenshots: false,
      ...config
    };

    this.state = {
      currentUrl: '',
      pageTitle: '',
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      steps: [],
      isLoading: false
    };

    this.history = {
      canGoBack: false,
      canGoForward: false,
      currentIndex: -1,
      entries: []
    };

    this.flows = new Map();
    this.eventListeners = new Map();

    this.initializeEventListeners();
  }

  /**
   * Navigate to a specific URL with state tracking
   */
  async navigateTo(
    url: string,
    executeScript: (code: string) => Promise<any>,
    options: { timeout?: number; waitForLoad?: boolean; validateUrl?: boolean } = {}
  ): Promise<AutomationStepResult> {
    const startTime = Date.now();
    const timeout = options.timeout || this.config.defaultTimeout;

    try {
      this.state.isLoading = true;
      this.state.previousUrl = this.state.currentUrl;

      // Record navigation step
      const stepId = this.generateStepId();
      const step: NavigationStep = {
        id: stepId,
        timestamp: startTime,
        url: url,
        title: '',
        action: 'navigate',
        success: false
      };

      // Perform navigation
      const navigationScript = `
        (function() {
          const startTime = Date.now();
          
          // Store current state for comparison
          const previousUrl = window.location.href;
          const previousTitle = document.title;
          
          try {
            window.location.href = ${JSON.stringify(url)};
            
            // Wait for navigation to complete
            return new Promise((resolve) => {
              const checkInterval = 100;
              const maxWait = ${timeout};
              let elapsed = 0;
              
              function checkNavigation() {
                const currentUrl = window.location.href;
                const currentTitle = document.title;
                
                if (currentUrl !== previousUrl || elapsed >= maxWait) {
                  resolve({
                    success: true,
                    previousUrl: previousUrl,
                    currentUrl: currentUrl,
                    currentTitle: currentTitle,
                    duration: Date.now() - startTime
                  });
                } else {
                  elapsed += checkInterval;
                  setTimeout(checkNavigation, checkInterval);
                }
              }
              
              setTimeout(checkNavigation, checkInterval);
            });
            
          } catch (error) {
            return { success: false, error: error.message };
          }
        })();
      `;

      const result = await executeScript(navigationScript);

      if (result.success) {
        // Update state
        this.state.currentUrl = result.currentUrl;
        this.state.pageTitle = result.currentTitle;
        this.state.isLoading = false;
        
        step.success = true;
        step.duration = result.duration;
        step.title = result.currentTitle;

        // Update history
        this.addToHistory(result.currentUrl, result.currentTitle);

        // Wait for page to fully load if requested
        if (options.waitForLoad) {
          await this.waitForPageLoad(executeScript);
        }

        // Validate URL if requested
        if (options.validateUrl && !this.isExpectedUrl(url, result.currentUrl)) {
          step.success = false;
          step.error = `URL validation failed: expected ${url}, got ${result.currentUrl}`;
        }

        this.state.steps.push(step);
        this.emitEvent('navigation:success', { step, state: this.state });

        return {
          success: step.success,
          error: step.error,
          data: {
            url: result.currentUrl,
            title: result.currentTitle,
            duration: result.duration
          }
        };

      } else {
        step.error = result.error;
        this.state.steps.push(step);
        this.state.isLoading = false;
        this.state.error = result.error;

        this.emitEvent('navigation:error', { step, error: result.error });

        return {
          success: false,
          error: result.error
        };
      }

    } catch (error) {
      this.state.isLoading = false;
      this.state.error = (error as Error).message;

      return {
        success: false,
        error: `Navigation failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Execute a complete navigation flow
   */
  async executeFlow(
    flowId: string,
    executeScript: (code: string) => Promise<any>,
    initialData?: Record<string, unknown>
  ): Promise<AutomationStepResult> {
    const flow = this.flows.get(flowId);
    if (!flow) {
      return {
        success: false,
        error: `Navigation flow not found: ${flowId}`
      };
    }

    this.activeFlow = flow;
    const flowStartTime = Date.now();

    try {
      this.emitEvent('flow:start', { flow, initialData });

      for (let i = 0; i < flow.steps.length; i++) {
        const step = flow.steps[i];
        
        // Execute step
        const stepResult = await this.executeFlowStep(step, executeScript, initialData);
        
        if (!stepResult.success && !step.optional) {
          // Critical step failed
          this.emitEvent('flow:step_failed', { flow, step, error: stepResult.error });
          
          if (step.retryable) {
            // Attempt retry
            const retryResult = await this.retryFlowStep(step, executeScript, initialData);
            if (!retryResult.success) {
              return {
                success: false,
                error: `Flow failed at step ${step.name}: ${retryResult.error}`
              };
            }
          } else {
            return {
              success: false,
              error: `Flow failed at step ${step.name}: ${stepResult.error}`
            };
          }
        }

        // Check if flow is taking too long
        if (Date.now() - flowStartTime > flow.maxDuration) {
          return {
            success: false,
            error: 'Flow execution timeout'
          };
        }

        this.emitEvent('flow:step_complete', { flow, step, result: stepResult });
      }

      this.emitEvent('flow:complete', { flow, duration: Date.now() - flowStartTime });

      return {
        success: true,
        data: {
          flowId: flow.id,
          stepsCompleted: flow.steps.length,
          duration: Date.now() - flowStartTime
        }
      };

    } catch (error) {
      this.emitEvent('flow:error', { flow, error: (error as Error).message });
      
      return {
        success: false,
        error: `Flow execution error: ${(error as Error).message}`
      };
    } finally {
      this.activeFlow = undefined;
    }
  }

  /**
   * Go back in browser history
   */
  async goBack(executeScript: (code: string) => Promise<any>): Promise<AutomationStepResult> {
    if (!this.history.canGoBack) {
      return {
        success: false,
        error: 'Cannot go back - no previous page in history'
      };
    }

    const backScript = `
      (function() {
        try {
          const previousUrl = window.location.href;
          window.history.back();
          
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                success: true,
                previousUrl: previousUrl,
                currentUrl: window.location.href
              });
            }, 1000);
          });
        } catch (error) {
          return { success: false, error: error.message };
        }
      })();
    `;

    try {
      const result = await executeScript(backScript);
      
      if (result.success) {
        this.updateHistoryIndex(-1);
        this.state.currentUrl = result.currentUrl;
        
        const step: NavigationStep = {
          id: this.generateStepId(),
          timestamp: Date.now(),
          url: result.currentUrl,
          title: '',
          action: 'back',
          success: true
        };
        
        this.state.steps.push(step);
      }

      return {
        success: result.success,
        error: result.error,
        data: result.success ? { url: result.currentUrl } : undefined
      };

    } catch (error) {
      return {
        success: false,
        error: `Back navigation failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Go forward in browser history
   */
  async goForward(executeScript: (code: string) => Promise<any>): Promise<AutomationStepResult> {
    if (!this.history.canGoForward) {
      return {
        success: false,
        error: 'Cannot go forward - no next page in history'
      };
    }

    const forwardScript = `
      (function() {
        try {
          const previousUrl = window.location.href;
          window.history.forward();
          
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                success: true,
                previousUrl: previousUrl,
                currentUrl: window.location.href
              });
            }, 1000);
          });
        } catch (error) {
          return { success: false, error: error.message };
        }
      })();
    `;

    try {
      const result = await executeScript(forwardScript);
      
      if (result.success) {
        this.updateHistoryIndex(1);
        this.state.currentUrl = result.currentUrl;
        
        const step: NavigationStep = {
          id: this.generateStepId(),
          timestamp: Date.now(),
          url: result.currentUrl,
          title: '',
          action: 'forward',
          success: true
        };
        
        this.state.steps.push(step);
      }

      return {
        success: result.success,
        error: result.error,
        data: result.success ? { url: result.currentUrl } : undefined
      };

    } catch (error) {
      return {
        success: false,
        error: `Forward navigation failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Wait for page to fully load
   */
  async waitForPageLoad(
    executeScript: (code: string) => Promise<any>,
    timeout: number = this.config.defaultTimeout
  ): Promise<AutomationStepResult> {
    const waitScript = `
      (function() {
        return new Promise((resolve) => {
          const startTime = Date.now();
          const maxWait = ${timeout};
          
          function checkLoaded() {
            const isLoaded = document.readyState === 'complete';
            const noActiveRequests = !window.performance || 
              window.performance.getEntriesByType('navigation')[0]?.loadEventEnd > 0;
            
            if (isLoaded && noActiveRequests) {
              resolve({
                success: true,
                loadTime: Date.now() - startTime,
                readyState: document.readyState
              });
            } else if (Date.now() - startTime > maxWait) {
              resolve({
                success: false,
                error: 'Page load timeout',
                readyState: document.readyState
              });
            } else {
              setTimeout(checkLoaded, 100);
            }
          }
          
          checkLoaded();
        });
      })();
    `;

    try {
      const result = await executeScript(waitScript);
      return {
        success: result.success,
        error: result.error,
        data: result.success ? {
          loadTime: result.loadTime,
          readyState: result.readyState
        } : undefined
      };
    } catch (error) {
      return {
        success: false,
        error: `Page load wait failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Register a navigation flow
   */
  registerFlow(flow: NavigationFlow): void {
    this.flows.set(flow.id, flow);
  }

  /**
   * Get current navigation state
   */
  getState(): NavigationState {
    return { ...this.state };
  }

  /**
   * Get browser history
   */
  getHistory(): BrowserHistory {
    return { ...this.history };
  }

  /**
   * Add event listener
   */
  addEventListener(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Reset navigation state
   */
  reset(): void {
    this.state = {
      currentUrl: '',
      pageTitle: '',
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      steps: [],
      isLoading: false
    };

    this.history = {
      canGoBack: false,
      canGoForward: false,
      currentIndex: -1,
      entries: []
    };

    this.activeFlow = undefined;
  }

  /**
   * Execute a single flow step
   */
  private async executeFlowStep(
    step: FlowStep,
    executeScript: (code: string) => Promise<any>,
    data?: Record<string, unknown>
  ): Promise<AutomationStepResult> {
    const startTime = Date.now();

    try {
      // Check if we're on the expected URL
      const urlValid = await this.validateStepUrl(step, executeScript);
      if (!urlValid && !step.optional) {
        return {
          success: false,
          error: `URL validation failed for step ${step.name}`
        };
      }

      // Execute step actions
      for (const action of step.actions) {
        const actionResult = await this.executeStepAction(action, executeScript, data);
        if (!actionResult.success && !step.optional) {
          return {
            success: false,
            error: `Action failed in step ${step.name}: ${actionResult.error}`
          };
        }
      }

      // Validate step completion
      const validationResult = await this.validateStepCompletion(step, executeScript);
      if (!validationResult.success && !step.optional) {
        return {
          success: false,
          error: `Validation failed for step ${step.name}: ${validationResult.error}`
        };
      }

      return {
        success: true,
        data: {
          stepId: step.id,
          stepName: step.name,
          duration: Date.now() - startTime
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Step execution error: ${(error as Error).message}`
      };
    }
  }

  /**
   * Retry a failed flow step
   */
  private async retryFlowStep(
    step: FlowStep,
    executeScript: (code: string) => Promise<any>,
    data?: Record<string, unknown>
  ): Promise<AutomationStepResult> {
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      await new Promise<void>(resolve => setTimeout(() => resolve(), this.config.navigationDelay * attempt));
      
      const result = await this.executeFlowStep(step, executeScript, data);
      if (result.success) {
        return result;
      }
      
      if (attempt === this.config.retryAttempts) {
        return result; // Return the last failed result
      }
    }

    return { success: false, error: 'All retry attempts failed' };
  }

  /**
   * Execute a step action
   */
  private async executeStepAction(
    action: FlowStepAction,
    executeScript: (code: string) => Promise<any>,
    data?: Record<string, unknown>
  ): Promise<AutomationStepResult> {
    const timeout = action.timeout || this.config.defaultTimeout;

    switch (action.type) {
      case 'click':
        if (!action.target) {
          return { success: false, error: 'Click action missing target' };
        }
        // This would integrate with DOMInteraction.clickElement
        return { success: true }; // Placeholder

      case 'fill':
        if (!action.target || action.value === undefined) {
          return { success: false, error: 'Fill action missing target or value' };
        }
        // This would integrate with FormFiller.fillSingleField
        return { success: true }; // Placeholder

      case 'wait':
        await new Promise<void>(resolve => setTimeout(() => resolve(), action.value || 1000));
        return { success: true };

      case 'custom':
        if (!action.script) {
          return { success: false, error: 'Custom action missing script' };
        }
        try {
          const result = await executeScript(action.script);
          return { success: true, data: result };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }

      default:
        return { success: false, error: `Unknown action type: ${action.type}` };
    }
  }

  /**
   * Validate step URL
   */
  private async validateStepUrl(
    step: FlowStep,
    executeScript: (code: string) => Promise<any>
  ): Promise<boolean> {
    try {
      const currentUrl = await executeScript('window.location.href');
      
      if (typeof step.expectedUrl === 'string') {
        return currentUrl === step.expectedUrl;
      } else if (step.expectedUrl instanceof RegExp) {
        return step.expectedUrl.test(currentUrl);
      }

      // Check URL patterns
      return step.urlPatterns.some(pattern => 
        currentUrl.includes(pattern) || new RegExp(pattern).test(currentUrl)
      );

    } catch {
      return false;
    }
  }

  /**
   * Validate step completion
   */
  private async validateStepCompletion(
    step: FlowStep,
    executeScript: (code: string) => Promise<any>
  ): Promise<AutomationStepResult> {
    for (const validation of step.validations) {
      const result = await this.executeValidation(validation, executeScript);
      if (!result.success) {
        return result;
      }
    }

    return { success: true };
  }

  /**
   * Execute a validation
   */
  private async executeValidation(
    validation: FlowStepValidation,
    executeScript: (code: string) => Promise<any>
  ): Promise<AutomationStepResult> {
    try {
      switch (validation.type) {
        case 'url':
          const currentUrl = await executeScript('window.location.href');
          return {
            success: currentUrl.includes(validation.target),
            error: currentUrl.includes(validation.target) 
              ? undefined 
              : `URL validation failed: ${currentUrl} does not contain ${validation.target}`
          };

        case 'element':
          const elementExists = await executeScript(
            `document.querySelector('${validation.target}') !== null`
          );
          return {
            success: elementExists,
            error: elementExists ? undefined : `Element not found: ${validation.target}`
          };

        case 'text':
          const pageText = await executeScript('document.body.textContent || document.body.innerText');
          const hasText = pageText.includes(validation.expectedValue || validation.target);
          return {
            success: hasText,
            error: hasText ? undefined : `Text not found: ${validation.expectedValue || validation.target}`
          };

        case 'custom':
          if (!validation.script) {
            return { success: false, error: 'Custom validation missing script' };
          }
          const customResult = await executeScript(validation.script);
          return {
            success: Boolean(customResult),
            data: customResult
          };

        default:
          return { success: false, error: `Unknown validation type: ${validation.type}` };
      }
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Add entry to navigation history
   */
  private addToHistory(url: string, title: string): void {
    const entry: HistoryEntry = {
      url,
      title,
      timestamp: Date.now()
    };

    // Remove any entries after current index (when navigating after going back)
    this.history.entries = this.history.entries.slice(0, this.history.currentIndex + 1);
    
    // Add new entry
    this.history.entries.push(entry);
    this.history.currentIndex = this.history.entries.length - 1;

    // Trim history if too large
    if (this.history.entries.length > this.config.maxHistorySize) {
      this.history.entries = this.history.entries.slice(-this.config.maxHistorySize);
      this.history.currentIndex = this.history.entries.length - 1;
    }

    // Update navigation capabilities
    this.history.canGoBack = this.history.currentIndex > 0;
    this.history.canGoForward = this.history.currentIndex < this.history.entries.length - 1;
  }

  /**
   * Update history index for back/forward navigation
   */
  private updateHistoryIndex(delta: number): void {
    const newIndex = this.history.currentIndex + delta;
    
    if (newIndex >= 0 && newIndex < this.history.entries.length) {
      this.history.currentIndex = newIndex;
      this.history.canGoBack = newIndex > 0;
      this.history.canGoForward = newIndex < this.history.entries.length - 1;
    }
  }

  /**
   * Check if URL matches expected URL
   */
  private isExpectedUrl(expected: string, actual: string): boolean {
    try {
      const expectedUrl = new URL(expected);
      const actualUrl = new URL(actual);
      return expectedUrl.pathname === actualUrl.pathname && expectedUrl.hostname === actualUrl.hostname;
    } catch {
      return expected === actual;
    }
  }

  /**
   * Initialize event listeners
   */
  private initializeEventListeners(): void {
    // Initialize event listener maps
    this.eventListeners.set('navigation:success', []);
    this.eventListeners.set('navigation:error', []);
    this.eventListeners.set('flow:start', []);
    this.eventListeners.set('flow:step_complete', []);
    this.eventListeners.set('flow:step_failed', []);
    this.eventListeners.set('flow:complete', []);
    this.eventListeners.set('flow:error', []);
  }

  /**
   * Emit an event to registered listeners
   */
  private emitEvent(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.warn(`Event listener error for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `nav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique step ID
   */
  private generateStepId(): string {
    return `step_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }
}