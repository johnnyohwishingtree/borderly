/**
 * Element Detector - Dynamic content waiting and element polling for robust automation
 * 
 * Provides intelligent element detection, polling strategies, and dynamic content
 * handling for government portal forms that load content asynchronously.
 */

import { AutomationStepResult } from '@/types/submission';

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
  customValidator?: string; // JavaScript code
}

/**
 * Element polling strategy
 */
export interface PollingStrategy {
  type: 'fixed' | 'exponential' | 'fibonacci' | 'adaptive';
  initialDelay: number;
  maxDelay: number;
  multiplier?: number; // for exponential strategy
  backoffFactor?: number; // for adaptive strategy
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
  computedStyle: Partial<CSSStyleDeclaration>;
  parentInfo?: {
    tagName: string;
    id?: string;
    className?: string;
  };
}

/**
 * Cache entry for element detection optimization
 */
interface CacheEntry {
  selector: string;
  timestamp: number;
  result: ElementDetectionResult;
  expiresAt: number;
}

/**
 * Dynamic content change observer
 */
interface ChangeObserver {
  selector: string;
  mutations: number;
  lastChange: number;
  isStable: boolean;
}

/**
 * Main element detector class
 */
export class ElementDetector {
  private config: DetectionConfig;
  private cache: Map<string, CacheEntry>;
  private changeObservers: Map<string, ChangeObserver>;
  private activePolling: Map<string, boolean>;

  constructor(config?: Partial<DetectionConfig>) {
    this.config = {
      pollingInterval: 200,
      maxWaitTime: 30000,
      retryAttempts: 3,
      stabilityDelay: 1000,
      screenshotOnFailure: false,
      enableCaching: true,
      debugLogging: false,
      ...config
    };

    this.cache = new Map();
    this.changeObservers = new Map();
    this.activePolling = new Map();
  }

  /**
   * Detect an element based on criteria with intelligent polling
   */
  async detectElement(
    criteria: DetectionCriteria,
    executeScript: (code: string) => Promise<any>,
    strategy: PollingStrategy = { type: 'exponential', initialDelay: 200, maxDelay: 2000, multiplier: 1.5 }
  ): Promise<ElementDetectionResult> {
    const startTime = Date.now();
    const timeout = criteria.timeout || this.config.maxWaitTime;
    const cacheKey = this.generateCacheKey(criteria);

    // Check cache first
    if (this.config.enableCaching) {
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        if (this.config.debugLogging) {
          console.log(`Using cached result for ${criteria.selector}`);
        }
        return cached;
      }
    }

    // Mark as actively polling to prevent duplicates
    if (this.activePolling.has(cacheKey)) {
      // Wait for existing polling to complete
      return await this.waitForExistingPoll(cacheKey, timeout);
    }

    this.activePolling.set(cacheKey, true);

    try {
      const result = await this.performDetection(criteria, executeScript, strategy, startTime, timeout);
      
      // Cache successful results
      if (this.config.enableCaching && result.found) {
        this.cacheResult(cacheKey, result);
      }

      return result;

    } finally {
      this.activePolling.delete(cacheKey);
    }
  }

  /**
   * Wait for multiple elements with different conditions
   */
  async detectMultipleElements(
    criteriaList: DetectionCriteria[],
    executeScript: (code: string) => Promise<any>,
    mode: 'all' | 'any' | 'first' = 'any'
  ): Promise<{ success: boolean; results: ElementDetectionResult[]; matchedCount: number }> {
    const startTime = Date.now();
    const promises = criteriaList.map(criteria => 
      this.detectElement(criteria, executeScript)
    );

    if (mode === 'first') {
      try {
        const firstResult = await Promise.race(promises);
        return {
          success: firstResult.found,
          results: [firstResult],
          matchedCount: firstResult.found ? 1 : 0
        };
      } catch (error) {
        return {
          success: false,
          results: [],
          matchedCount: 0
        };
      }
    }

    const results = await Promise.allSettled(promises);
    const elementResults = results.map((result, index) => 
      result.status === 'fulfilled' 
        ? result.value 
        : {
            found: false,
            condition: criteriaList[index].condition,
            selector: criteriaList[index].selector,
            waitTime: Date.now() - startTime,
            attempts: 0,
            error: result.status === 'rejected' ? String(result.reason) : 'Unknown error',
            stability: { isStable: false, changeCount: 0 }
          } as ElementDetectionResult
    );

    const foundCount = elementResults.filter(r => r.found).length;
    const success = mode === 'all' ? foundCount === criteriaList.length : foundCount > 0;

    return {
      success,
      results: elementResults,
      matchedCount: foundCount
    };
  }

  /**
   * Wait for dynamic content to stabilize
   */
  async waitForStability(
    selector: string,
    executeScript: (code: string) => Promise<any>,
    stabilityDuration: number = this.config.stabilityDelay,
    maxWaitTime: number = this.config.maxWaitTime
  ): Promise<AutomationStepResult> {
    const startTime = Date.now();
    const observerId = `stability_${selector}_${Date.now()}`;

    const stabilityScript = `
      (function() {
        const selector = '${this.escapeSelector(selector)}';
        const stabilityDuration = ${stabilityDuration};
        const maxWait = ${maxWaitTime};
        const startTime = Date.now();
        
        return new Promise((resolve) => {
          let lastChangeTime = Date.now();
          let changeCount = 0;
          let previousContent = '';
          let previousAttributes = '';
          
          function checkStability() {
            try {
              const element = document.querySelector(selector);
              if (!element) {
                if (Date.now() - startTime > maxWait) {
                  resolve({
                    success: false,
                    error: 'Element not found',
                    changeCount: changeCount,
                    waitTime: Date.now() - startTime
                  });
                  return;
                }
                setTimeout(checkStability, 100);
                return;
              }
              
              const currentContent = element.textContent + element.innerHTML + (element.value || '');
              const currentAttributes = Array.from(element.attributes)
                .map(attr => attr.name + '=' + attr.value)
                .join(';');
              
              if (currentContent !== previousContent || currentAttributes !== previousAttributes) {
                lastChangeTime = Date.now();
                changeCount++;
                previousContent = currentContent;
                previousAttributes = currentAttributes;
              }
              
              const timeSinceLastChange = Date.now() - lastChangeTime;
              
              if (timeSinceLastChange >= stabilityDuration) {
                resolve({
                  success: true,
                  changeCount: changeCount,
                  waitTime: Date.now() - startTime,
                  finalContent: currentContent,
                  stabilityTime: timeSinceLastChange
                });
              } else if (Date.now() - startTime > maxWait) {
                resolve({
                  success: false,
                  error: 'Stability timeout',
                  changeCount: changeCount,
                  waitTime: Date.now() - startTime
                });
              } else {
                setTimeout(checkStability, 50);
              }
              
            } catch (error) {
              resolve({
                success: false,
                error: error.message,
                changeCount: changeCount,
                waitTime: Date.now() - startTime
              });
            }
          }
          
          checkStability();
        });
      })();
    `;

    try {
      const result = await executeScript(stabilityScript);
      
      return {
        success: result.success,
        error: result.error,
        data: {
          selector,
          changeCount: result.changeCount,
          waitTime: result.waitTime,
          stabilityTime: result.stabilityTime,
          finalContent: result.finalContent
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Stability check failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Detect form loading states and readiness
   */
  async detectFormReadiness(
    formSelector: string,
    executeScript: (code: string) => Promise<any>,
    requiredFields?: string[]
  ): Promise<AutomationStepResult> {
    const readinessScript = `
      (function() {
        const formSelector = '${this.escapeSelector(formSelector)}';
        const requiredFields = ${JSON.stringify(requiredFields || [])};
        
        const form = document.querySelector(formSelector);
        if (!form) {
          return {
            success: false,
            error: 'Form not found',
            formReady: false
          };
        }
        
        // Check if form is visible and enabled
        const formRect = form.getBoundingClientRect();
        const isVisible = formRect.width > 0 && formRect.height > 0;
        const isEnabled = !form.hasAttribute('disabled');
        
        // Check required fields
        const fieldResults = {};
        let allFieldsReady = true;
        
        if (requiredFields.length > 0) {
          requiredFields.forEach(fieldSelector => {
            const field = form.querySelector(fieldSelector);
            const fieldReady = field && 
              !field.disabled && 
              !field.hasAttribute('aria-busy') &&
              field.offsetParent !== null;
            
            fieldResults[fieldSelector] = {
              found: !!field,
              ready: fieldReady,
              disabled: field ? field.disabled : true,
              visible: field ? field.offsetParent !== null : false
            };
            
            if (!fieldReady) {
              allFieldsReady = false;
            }
          });
        }
        
        // Check for loading indicators
        const loadingIndicators = [
          '.loading', '.spinner', '.busy',
          '[aria-busy="true"]', '[data-loading="true"]'
        ];
        
        let hasLoadingIndicator = false;
        loadingIndicators.forEach(selector => {
          if (form.querySelector(selector)) {
            hasLoadingIndicator = true;
          }
        });
        
        const isReady = isVisible && isEnabled && !hasLoadingIndicator && allFieldsReady;
        
        return {
          success: true,
          formReady: isReady,
          formVisible: isVisible,
          formEnabled: isEnabled,
          hasLoadingIndicator: hasLoadingIndicator,
          requiredFieldsReady: allFieldsReady,
          fieldResults: fieldResults,
          formAttributes: {
            id: form.id,
            className: form.className,
            action: form.action,
            method: form.method
          }
        };
      })();
    `;

    try {
      const result = await executeScript(readinessScript);
      
      return {
        success: result.success,
        error: result.error,
        data: result.success ? {
          formReady: result.formReady,
          formVisible: result.formVisible,
          formEnabled: result.formEnabled,
          hasLoadingIndicator: result.hasLoadingIndicator,
          requiredFieldsReady: result.requiredFieldsReady,
          fieldResults: result.fieldResults,
          formAttributes: result.formAttributes
        } : undefined
      };

    } catch (error) {
      return {
        success: false,
        error: `Form readiness check failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Clear detection cache
   */
  clearCache(): void {
    this.cache.clear();
    this.changeObservers.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number; oldestEntry?: number } {
    const now = Date.now();
    let hits = 0;
    let oldestTimestamp = now;

    this.cache.forEach(entry => {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
    });

    return {
      size: this.cache.size,
      hitRate: 0, // Would track this in a real implementation
      oldestEntry: oldestTimestamp !== now ? now - oldestTimestamp : undefined
    };
  }

  /**
   * Perform the actual element detection with polling
   */
  private async performDetection(
    criteria: DetectionCriteria,
    executeScript: (code: string) => Promise<any>,
    strategy: PollingStrategy,
    startTime: number,
    timeout: number
  ): Promise<ElementDetectionResult> {
    let attempts = 0;
    let delay = strategy.initialDelay;
    
    const result: ElementDetectionResult = {
      found: false,
      condition: criteria.condition,
      selector: criteria.selector,
      waitTime: 0,
      attempts: 0,
      stability: { isStable: false, changeCount: 0 }
    };

    while (Date.now() - startTime < timeout && attempts < this.config.retryAttempts * 5) {
      attempts++;
      
      try {
        const checkResult = await this.executeDetectionScript(criteria, executeScript);
        
        if (checkResult.success && this.meetsCondition(checkResult, criteria)) {
          result.found = true;
          result.element = checkResult.element;
          result.stability = checkResult.stability;
          break;
        }

        // Update error for last attempt
        result.error = checkResult.error;
        
      } catch (error) {
        result.error = (error as Error).message;
      }

      // Calculate next delay based on strategy
      delay = this.calculateNextDelay(strategy, delay, attempts);
      
      // Wait before next attempt
      if (Date.now() - startTime + delay < timeout) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    result.waitTime = Date.now() - startTime;
    result.attempts = attempts;

    // Capture screenshot on failure if configured
    if (!result.found && this.config.screenshotOnFailure) {
      result.screenshot = await this.captureFailureScreenshot(executeScript);
    }

    return result;
  }

  /**
   * Execute the detection script
   */
  private async executeDetectionScript(
    criteria: DetectionCriteria,
    executeScript: (code: string) => Promise<any>
  ): Promise<any> {
    const script = `
      (function() {
        try {
          const selector = '${this.escapeSelector(criteria.selector)}';
          const element = document.querySelector(selector);
          
          if (!element) {
            return {
              success: false,
              error: 'Element not found',
              stability: { isStable: false, changeCount: 0 }
            };
          }
          
          // Get element information
          const rect = element.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(element);
          const parent = element.parentElement;
          
          const elementInfo = {
            tagName: element.tagName.toLowerCase(),
            id: element.id || undefined,
            className: element.className || undefined,
            attributes: {},
            textContent: element.textContent || '',
            value: element.value || undefined,
            coordinates: {
              x: rect.left,
              y: rect.top,
              width: rect.width,
              height: rect.height
            },
            isVisible: rect.width > 0 && rect.height > 0 && 
                      computedStyle.visibility !== 'hidden' &&
                      computedStyle.display !== 'none' &&
                      computedStyle.opacity !== '0',
            isEnabled: !element.disabled && !element.hasAttribute('aria-disabled'),
            isClickable: false, // Will be calculated
            computedStyle: {
              display: computedStyle.display,
              visibility: computedStyle.visibility,
              opacity: computedStyle.opacity,
              pointerEvents: computedStyle.pointerEvents
            },
            parentInfo: parent ? {
              tagName: parent.tagName.toLowerCase(),
              id: parent.id || undefined,
              className: parent.className || undefined
            } : undefined
          };
          
          // Extract attributes
          for (let i = 0; i < element.attributes.length; i++) {
            const attr = element.attributes[i];
            elementInfo.attributes[attr.name] = attr.value;
          }
          
          // Check if element is clickable
          elementInfo.isClickable = elementInfo.isVisible && 
                                   elementInfo.isEnabled && 
                                   computedStyle.pointerEvents !== 'none';
          
          // Custom validation if provided
          ${criteria.customValidator ? `
            const customResult = (function() { ${criteria.customValidator} })();
            if (!customResult) {
              return {
                success: false,
                error: 'Custom validation failed',
                element: elementInfo,
                stability: { isStable: true, changeCount: 0 }
              };
            }
          ` : ''}
          
          // Check text content if specified
          ${criteria.textContent ? `
            const textMatch = ${criteria.textContent instanceof RegExp 
              ? `/${criteria.textContent.source}/${criteria.textContent.flags}.test(elementInfo.textContent)`
              : `elementInfo.textContent.includes('${criteria.textContent}')`};
            if (!textMatch) {
              return {
                success: false,
                error: 'Text content does not match',
                element: elementInfo,
                stability: { isStable: true, changeCount: 0 }
              };
            }
          ` : ''}
          
          // Check value content if specified
          ${criteria.valueContent ? `
            const valueMatch = ${criteria.valueContent instanceof RegExp
              ? `/${criteria.valueContent.source}/${criteria.valueContent.flags}.test(elementInfo.value || '')`
              : `(elementInfo.value || '').includes('${criteria.valueContent}')`};
            if (!valueMatch) {
              return {
                success: false,
                error: 'Value content does not match',
                element: elementInfo,
                stability: { isStable: true, changeCount: 0 }
              };
            }
          ` : ''}
          
          return {
            success: true,
            element: elementInfo,
            stability: { isStable: true, changeCount: 0 }
          };
          
        } catch (error) {
          return {
            success: false,
            error: error.message,
            stability: { isStable: false, changeCount: 0 }
          };
        }
      })();
    `;

    return await executeScript(script);
  }

  /**
   * Check if element meets the specified condition
   */
  private meetsCondition(checkResult: any, criteria: DetectionCriteria): boolean {
    if (!checkResult.success || !checkResult.element) {
      return criteria.condition === 'absent';
    }

    const element = checkResult.element;

    switch (criteria.condition) {
      case 'present':
        return true; // Element exists

      case 'absent':
        return false; // Element exists but we want it absent

      case 'visible':
        return element.isVisible;

      case 'hidden':
        return !element.isVisible;

      case 'enabled':
        return element.isEnabled;

      case 'disabled':
        return !element.isEnabled;

      case 'clickable':
        return element.isClickable;

      case 'stable':
        return checkResult.stability.isStable;

      default:
        return false;
    }
  }

  /**
   * Calculate next polling delay based on strategy
   */
  private calculateNextDelay(strategy: PollingStrategy, currentDelay: number, attempt: number): number {
    switch (strategy.type) {
      case 'fixed':
        return strategy.initialDelay;

      case 'exponential':
        const exponentialDelay = currentDelay * (strategy.multiplier || 2);
        return Math.min(exponentialDelay, strategy.maxDelay);

      case 'fibonacci':
        // Simple fibonacci-like growth
        const fibDelay = currentDelay * 1.618; // golden ratio
        return Math.min(fibDelay, strategy.maxDelay);

      case 'adaptive':
        // Adaptive strategy starts fast and slows down
        const backoff = strategy.backoffFactor || 1.2;
        const adaptiveDelay = strategy.initialDelay * Math.pow(backoff, attempt - 1);
        return Math.min(adaptiveDelay, strategy.maxDelay);

      default:
        return strategy.initialDelay;
    }
  }

  /**
   * Wait for existing polling operation to complete
   */
  private async waitForExistingPoll(cacheKey: string, timeout: number): Promise<ElementDetectionResult> {
    const startTime = Date.now();
    
    while (this.activePolling.has(cacheKey)) {
      if (Date.now() - startTime > timeout) {
        return {
          found: false,
          condition: 'timeout',
          selector: 'unknown',
          waitTime: timeout,
          attempts: 0,
          error: 'Timeout waiting for existing poll',
          stability: { isStable: false, changeCount: 0 }
        };
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Check cache again after polling completed
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    return {
      found: false,
      condition: 'unknown',
      selector: 'unknown',
      waitTime: Date.now() - startTime,
      attempts: 0,
      error: 'Poll completed but no cached result',
      stability: { isStable: false, changeCount: 0 }
    };
  }

  /**
   * Generate cache key for detection criteria
   */
  private generateCacheKey(criteria: DetectionCriteria): string {
    const keyParts = [
      criteria.selector,
      criteria.condition,
      JSON.stringify(criteria.attributes || {}),
      String(criteria.textContent || ''),
      String(criteria.valueContent || ''),
      criteria.customValidator || ''
    ];
    
    return keyParts.join('|');
  }

  /**
   * Get cached detection result
   */
  private getCachedResult(cacheKey: string): ElementDetectionResult | null {
    const entry = this.cache.get(cacheKey);
    if (!entry) return null;

    // Check if cache entry is still valid
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.result;
  }

  /**
   * Cache detection result
   */
  private cacheResult(cacheKey: string, result: ElementDetectionResult): void {
    const entry: CacheEntry = {
      selector: result.selector,
      timestamp: Date.now(),
      result: { ...result },
      expiresAt: Date.now() + 10000 // Cache for 10 seconds
    };

    this.cache.set(cacheKey, entry);

    // Clean up old cache entries
    if (this.cache.size > 100) {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (entry.expiresAt < now) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * Capture screenshot on detection failure
   */
  private async captureFailureScreenshot(executeScript: (code: string) => Promise<any>): Promise<string> {
    try {
      const screenshot = await executeScript(`
        (function() {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            
            // This is a placeholder - in a real implementation,
            // you'd use WebView screenshot capabilities
            return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
          } catch (error) {
            return '';
          }
        })();
      `);
      
      return screenshot || '';
    } catch {
      return '';
    }
  }

  /**
   * Escape CSS selector for safe injection
   */
  private escapeSelector(selector: string): string {
    return selector.replace(/'/g, "\\'").replace(/"/g, '\\"');
  }
}