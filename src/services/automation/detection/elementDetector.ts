/**
 * Element Detector — Dynamic content waiting and element polling for robust automation
 *
 * Provides intelligent element detection, polling strategies, and dynamic content
 * handling for government portal forms that load content asynchronously.
 */

import { AutomationStepResult } from '@/types/submission';
import type {
  DetectionConfig,
  DetectionCriteria,
  PollingStrategy,
  ElementDetectionResult,
  CacheEntry,
  ChangeObserver,
} from './detectionTypes';
import {
  meetsCondition,
  calculateNextDelay,
  generateCacheKey,
  buildDetectionScript,
  buildStabilityScript,
  buildFormReadinessScript,
  captureFailureScreenshot,
} from './detectionHelpers';

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
    const cacheKey = generateCacheKey(criteria);

    if (this.config.enableCaching) {
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        if (this.config.debugLogging) {
          console.log(`Using cached result for ${criteria.selector}`);
        }
        return cached;
      }
    }

    if (this.activePolling.has(cacheKey)) {
      return await this.waitForExistingPoll(cacheKey, timeout);
    }

    this.activePolling.set(cacheKey, true);

    try {
      const result = await this.performDetection(criteria, executeScript, strategy, startTime, timeout);

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
      } catch {
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
    const stabilityScript = buildStabilityScript(selector, stabilityDuration, maxWaitTime);

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
    const readinessScript = buildFormReadinessScript(
      formSelector,
      requiredFields || [],
      'smooth'
    );

    try {
      const result = await executeScript(readinessScript);

      return {
        success: result.success,
        error: result.error,
        ...(!result.success ? {} : {
          data: {
            formReady: result.formReady,
            formVisible: result.formVisible,
            formEnabled: result.formEnabled,
            hasLoadingIndicator: result.hasLoadingIndicator,
            requiredFieldsReady: result.requiredFieldsReady,
            fieldResults: result.fieldResults,
            formAttributes: result.formAttributes
          }
        })
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
    let oldestTimestamp = now;

    this.cache.forEach(entry => {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
    });

    return {
      size: this.cache.size,
      hitRate: 0,
      ...(oldestTimestamp !== now ? { oldestEntry: now - oldestTimestamp } : {})
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
        const script = buildDetectionScript(criteria);
        const checkResult = await executeScript(script);

        if (checkResult.success && meetsCondition(checkResult, criteria)) {
          result.found = true;
          result.element = checkResult.element;
          result.stability = checkResult.stability;
          break;
        }

        result.error = checkResult.error;

      } catch (error) {
        result.error = (error as Error).message;
      }

      delay = calculateNextDelay(strategy, delay, attempts);

      if (Date.now() - startTime + delay < timeout) {
        await new Promise<void>(resolve => setTimeout(() => resolve(), delay));
      }
    }

    result.waitTime = Date.now() - startTime;
    result.attempts = attempts;

    if (!result.found && this.config.screenshotOnFailure) {
      result.screenshot = await captureFailureScreenshot(executeScript);
    }

    return result;
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

      await new Promise<void>(resolve => setTimeout(() => resolve(), 100));
    }

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
   * Get cached detection result
   */
  private getCachedResult(cacheKey: string): ElementDetectionResult | null {
    const entry = this.cache.get(cacheKey);
    if (!entry) return null;

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
      expiresAt: Date.now() + 10000
    };

    this.cache.set(cacheKey, entry);

    if (this.cache.size > 100) {
      const now = Date.now();
      for (const [key, innerEntry] of this.cache.entries()) {
        if (innerEntry.expiresAt < now) {
          this.cache.delete(key);
        }
      }
    }
  }
}
