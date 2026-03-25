/**
 * DOM Interaction — Utilities for detecting, interacting with, and manipulating DOM elements
 *
 * Provides safe and reliable methods for element detection, clicking, typing,
 * and complex interactions within government portal WebViews.
 */

import { AutomationStepResult } from '@/types/submission';
import type {
  DOMInteractionConfig,
  ElementInteractionOptions,
  ElementDetectionResult,
  ClickResult,
  TypeResult,
} from './interactionTypes';
import {
  generateClickScript,
  generateTypeScript,
  generateStabilityScript,
  generateSelectScript,
  generateToggleScript,
  generateWaitScript,
  generateExtractScript,
  generateScrollScript,
} from './interactionScripts';

/**
 * Main DOM interaction class
 */
export class DOMInteraction {
  private config: DOMInteractionConfig;

  constructor(config?: Partial<DOMInteractionConfig>) {
    this.config = {
      defaultTimeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000,
      scrollBehavior: 'smooth',
      clickDelay: 100,
      typeDelay: 50,
      validateInteractions: true,
      ...config
    };
  }

  /**
   * Detect and analyze a DOM element
   */
  async detectElement(
    selector: string,
    executeScript: (code: string) => Promise<any>,
    options: ElementInteractionOptions = {}
  ): Promise<ElementDetectionResult> {
    const timeout = options.timeout || this.config.defaultTimeout;

    const detectionScript = `
      (function() {
        const startTime = Date.now();
        const timeout = ${timeout};

        function checkElement() {
          const element = document.querySelector(${JSON.stringify(selector)});

          if (!element) {
            return { found: false, visible: false, enabled: false };
          }

          const rect = element.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(element);
          const isVisible = (
            rect.width > 0 &&
            rect.height > 0 &&
            computedStyle.visibility !== 'hidden' &&
            computedStyle.display !== 'none' &&
            computedStyle.opacity !== '0'
          );

          const isEnabled = !element.disabled && !element.hasAttribute('aria-disabled');

          const attributes = {};
          for (let i = 0; i < element.attributes.length; i++) {
            const attr = element.attributes[i];
            attributes[attr.name] = attr.value;
          }

          return {
            found: true,
            visible: isVisible,
            enabled: isEnabled,
            coordinates: {
              x: rect.left,
              y: rect.top,
              width: rect.width,
              height: rect.height
            },
            attributes: attributes,
            textContent: element.textContent || '',
            value: element.value || element.textContent || ''
          };
        }

        ${options.waitForVisible ? `
          return new Promise((resolve) => {
            function poll() {
              const result = checkElement();
              if (result.found && result.visible) {
                resolve(result);
              } else if (Date.now() - startTime > timeout) {
                resolve(result);
              } else {
                setTimeout(poll, 200);
              }
            }
            poll();
          });
        ` : `
          return checkElement();
        `}
      })();
    `;

    try {
      const result = await executeScript(detectionScript);
      return result as ElementDetectionResult;
    } catch {
      return {
        found: false,
        visible: false,
        enabled: false
      };
    }
  }

  /**
   * Click on an element with advanced interaction handling
   */
  async clickElement(
    selector: string,
    executeScript: (code: string) => Promise<any>,
    options: ElementInteractionOptions = {}
  ): Promise<ClickResult> {
    try {
      const detection = await this.detectElement(selector, executeScript, {
        ...options,
        waitForVisible: true
      });

      if (!detection.found) {
        return { success: false, error: 'Element not found' };
      }

      if (!detection.visible) {
        return { success: false, error: 'Element not visible' };
      }

      if (!detection.enabled && !options.forceClick) {
        return { success: false, error: 'Element not enabled' };
      }

      const initialUrl = await this.getCurrentUrl(executeScript);

      const clickScript = generateClickScript(selector, options, this.config);
      const clickResult = await executeScript(clickScript);

      if (!clickResult.success) {
        return { success: false, error: clickResult.error };
      }

      await this.waitForStability(executeScript);

      const finalUrl = await this.getCurrentUrl(executeScript);
      const pageChanged = initialUrl !== finalUrl;

      return {
        success: true,
        elementChanged: clickResult.elementChanged,
        pageChanged: pageChanged,
        ...(pageChanged && { newUrl: finalUrl })
      };

    } catch (error) {
      return {
        success: false,
        error: `Click interaction failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Type text into an input element
   */
  async typeIntoElement(
    selector: string,
    text: string,
    executeScript: (code: string) => Promise<any>,
    options: ElementInteractionOptions = {}
  ): Promise<TypeResult> {
    try {
      const detection = await this.detectElement(selector, executeScript, {
        ...options,
        waitForVisible: true
      });

      if (!detection.found) {
        return { success: false, error: 'Element not found' };
      }

      if (!detection.visible) {
        return { success: false, error: 'Element not visible' };
      }

      const typeScript = generateTypeScript(selector, text, options, this.config);
      const typeResult = await executeScript(typeScript);

      if (!typeResult.success) {
        return { success: false, error: typeResult.error };
      }

      return {
        success: true,
        finalValue: typeResult.finalValue,
        charactersTyped: text.length
      };

    } catch (error) {
      return {
        success: false,
        error: `Type interaction failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Select an option from a dropdown
   */
  async selectOption(
    selector: string,
    optionValue: string,
    executeScript: (code: string) => Promise<any>,
    options: ElementInteractionOptions = {}
  ): Promise<AutomationStepResult> {
    const selectScript = generateSelectScript(
      selector, optionValue, options.scrollIntoView !== false, this.config.scrollBehavior
    );

    try {
      const result = await executeScript(selectScript);
      return {
        success: result.success,
        error: result.error,
        data: result.success ? {
          selectedValue: result.selectedValue,
          selectedText: result.selectedText
        } : { availableOptions: result.availableOptions }
      };
    } catch (error) {
      return {
        success: false,
        error: `Select interaction failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Check or uncheck a checkbox/radio button
   */
  async toggleCheckbox(
    selector: string,
    checked: boolean,
    executeScript: (code: string) => Promise<any>,
    options: ElementInteractionOptions = {}
  ): Promise<AutomationStepResult> {
    const toggleScript = generateToggleScript(
      selector, checked, options.scrollIntoView !== false, this.config.scrollBehavior
    );

    try {
      const result = await executeScript(toggleScript);
      return {
        success: result.success,
        error: result.error,
        data: result.success ? {
          checked: result.checked,
          value: result.value
        } : ({} as Record<string, unknown>)
      };
    } catch (error) {
      return {
        success: false,
        error: `Checkbox toggle failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Wait for an element to appear or disappear
   */
  async waitForElement(
    selector: string,
    condition: 'appear' | 'disappear' | 'visible' | 'hidden',
    executeScript: (code: string) => Promise<any>,
    timeout: number = this.config.defaultTimeout
  ): Promise<AutomationStepResult> {
    const waitScript = generateWaitScript(selector, condition, timeout);

    try {
      const result = await executeScript(waitScript);
      return {
        success: result.success,
        error: result.error,
        data: result.success ? { conditionMet: result.conditionMet } : ({} as Record<string, unknown>)
      };
    } catch (error) {
      return {
        success: false,
        error: `Wait for element failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Extract text or value from an element
   */
  async extractElementData(
    selector: string,
    dataType: 'text' | 'value' | 'html' | 'attribute',
    executeScript: (code: string) => Promise<any>,
    attributeName?: string
  ): Promise<AutomationStepResult> {
    const extractScript = generateExtractScript(selector, dataType, attributeName);

    try {
      const result = await executeScript(extractScript);
      return {
        success: result.success,
        error: result.error,
        data: result.success ? {
          extractedData: result.data,
          dataType: result.dataType,
          selector: result.selector
        } : ({} as Record<string, unknown>)
      };
    } catch (error) {
      return {
        success: false,
        error: `Data extraction failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Scroll to a specific element or position
   */
  async scrollTo(
    target: string | { x: number; y: number },
    executeScript: (code: string) => Promise<any>,
    behavior: 'smooth' | 'instant' | 'auto' = this.config.scrollBehavior
  ): Promise<AutomationStepResult> {
    const scrollScript = generateScrollScript(target, behavior);

    try {
      const result = await executeScript(scrollScript);
      return {
        success: result.success,
        error: result.error,
        ...(result.success && {
          data: {
            scrolledTo: result.scrolledTo,
            x: result.x,
            y: result.y
          }
        })
      };
    } catch (error) {
      return {
        success: false,
        error: `Scroll operation failed: ${(error as Error).message}`
      };
    }
  }

  private async getCurrentUrl(executeScript: (code: string) => Promise<any>): Promise<string> {
    try {
      const result = await executeScript('window.location.href');
      return result || '';
    } catch {
      return '';
    }
  }

  private async waitForStability(
    executeScript: (code: string) => Promise<any>,
    timeout: number = 3000
  ): Promise<void> {
    const stabilityScript = generateStabilityScript(timeout);

    try {
      await executeScript(stabilityScript);
    } catch {
      await new Promise(resolve => setTimeout(() => resolve(undefined), 1000));
    }
  }
}
