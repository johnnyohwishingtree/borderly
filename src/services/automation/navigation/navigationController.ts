/**
 * Navigation Controller — Multi-page navigation and state management for form automation
 *
 * Handles navigation, page transitions, session state persistence,
 * and browser history in government portals.
 */

import type {
  AutomationStepResult,
  NavigationState,
  NavigationStep,
  NavigationFlow,
  NavigationConfig,
  BrowserHistory,
  HistoryEntry,
} from './navigationTypes';
import { FlowExecutor } from './flowExecutor';
import {
  generateNavigationScript,
  generateHistoryScript,
  generatePageLoadScript,
} from './navigationScripts';

/**
 * Main navigation controller class
 */
export class NavigationController {
  private config: NavigationConfig;
  private state: NavigationState;
  private history: BrowserHistory;
  private flows: Map<string, NavigationFlow>;
  private eventListeners: Map<string, Function[]>;
  private flowExecutor: FlowExecutor;

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
    this.flowExecutor = new FlowExecutor(this.config);

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

      const stepId = this.generateStepId();
      const step: NavigationStep = {
        id: stepId,
        timestamp: startTime,
        url: url,
        title: '',
        action: 'navigate',
        success: false
      };

      const result = await executeScript(generateNavigationScript(url, timeout));

      if (result.success) {
        this.state.currentUrl = result.currentUrl;
        this.state.pageTitle = result.currentTitle;
        this.state.isLoading = false;

        step.success = true;
        step.duration = result.duration;
        step.title = result.currentTitle;

        this.addToHistory(result.currentUrl, result.currentTitle);

        if (options.waitForLoad) {
          await this.waitForPageLoad(executeScript);
        }

        if (options.validateUrl && !this.isExpectedUrl(url, result.currentUrl)) {
          step.success = false;
          step.error = `URL validation failed: expected ${url}, got ${result.currentUrl}`;
        }

        this.state.steps.push(step);
        this.emitEvent('navigation:success', { step, state: this.state });

        return {
          success: step.success,
          ...(step.error && { error: step.error }),
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

    return this.flowExecutor.executeFlow(
      flow,
      executeScript,
      initialData,
      (event, data) => this.emitEvent(event, data)
    );
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

    try {
      const result = await executeScript(generateHistoryScript('back'));

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
        ...(result.error && { error: result.error }),
        ...(result.success && { data: { url: result.currentUrl } })
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

    try {
      const result = await executeScript(generateHistoryScript('forward'));

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
        ...(result.error && { error: result.error }),
        ...(result.success && { data: { url: result.currentUrl } })
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
    try {
      const result = await executeScript(generatePageLoadScript(timeout));
      const stepResult: AutomationStepResult = {
        success: result.success,
      };
      if (result.error) {
        stepResult.error = result.error;
      }
      if (result.success) {
        stepResult.data = {
          loadTime: result.loadTime,
          readyState: result.readyState
        };
      }
      return stepResult;
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

    this.history.entries = this.history.entries.slice(0, this.history.currentIndex + 1);
    this.history.entries.push(entry);
    this.history.currentIndex = this.history.entries.length - 1;

    if (this.history.entries.length > this.config.maxHistorySize) {
      this.history.entries = this.history.entries.slice(-this.config.maxHistorySize);
      this.history.currentIndex = this.history.entries.length - 1;
    }

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

  private generateSessionId(): string {
    return `nav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateStepId(): string {
    return `step_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }
}
