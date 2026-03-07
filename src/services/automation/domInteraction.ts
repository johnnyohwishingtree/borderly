/**
 * DOM Interaction - Utilities for detecting, interacting with, and manipulating DOM elements
 * 
 * Provides safe and reliable methods for element detection, clicking, typing,
 * and complex interactions within government portal WebViews.
 */

import { AutomationStepResult } from '@/types/submission';

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
          const element = document.querySelector('${this.escapeSelector(selector)}');
          
          if (!element) {
            return { found: false, visible: false, enabled: false };
          }
          
          // Check visibility
          const rect = element.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(element);
          const isVisible = (
            rect.width > 0 && 
            rect.height > 0 &&
            computedStyle.visibility !== 'hidden' &&
            computedStyle.display !== 'none' &&
            computedStyle.opacity !== '0'
          );
          
          // Check if enabled
          const isEnabled = !element.disabled && !element.hasAttribute('aria-disabled');
          
          // Extract attributes
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
          // Wait for element to be visible
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
    } catch (error) {
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
      // First, detect the element
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

      // Capture initial state
      const initialUrl = await this.getCurrentUrl(executeScript);
      
      // Perform the click
      const clickScript = this.generateClickScript(selector, options);
      const clickResult = await executeScript(clickScript);

      if (!clickResult.success) {
        return { success: false, error: clickResult.error };
      }

      // Wait for any changes to settle
      await this.waitForStability(executeScript);

      // Check for page changes
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
      // First, detect the element
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

      // Perform the typing
      const typeScript = this.generateTypeScript(selector, text, options);
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
    const selectScript = `
      (function() {
        try {
          const select = document.querySelector('${this.escapeSelector(selector)}');
          if (!select) {
            return { success: false, error: 'Select element not found' };
          }
          
          if (${options.scrollIntoView !== false}) {
            select.scrollIntoView({ behavior: '${this.config.scrollBehavior}', block: 'center' });
          }
          
          select.focus();
          
          // Try exact value match first
          const exactOption = select.querySelector('option[value="${optionValue}"]');
          if (exactOption) {
            select.value = '${optionValue}';
          } else {
            // Try text content matching
            const options = Array.from(select.options);
            const matchingOption = options.find(opt => 
              opt.text.toLowerCase().includes('${optionValue.toLowerCase()}') ||
              opt.value.toLowerCase().includes('${optionValue.toLowerCase()}')
            );
            
            if (matchingOption) {
              select.value = matchingOption.value;
            } else {
              return { 
                success: false, 
                error: 'No matching option found for: ${optionValue}',
                availableOptions: options.map(opt => ({ text: opt.text, value: opt.value }))
              };
            }
          }
          
          // Trigger change events
          select.dispatchEvent(new Event('change', { bubbles: true }));
          select.dispatchEvent(new Event('input', { bubbles: true }));
          select.blur();
          
          return { 
            success: true, 
            selectedValue: select.value,
            selectedText: select.options[select.selectedIndex]?.text
          };
          
        } catch (error) {
          return { success: false, error: error.message };
        }
      })();
    `;

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
    const toggleScript = `
      (function() {
        try {
          const element = document.querySelector('${this.escapeSelector(selector)}');
          if (!element) {
            return { success: false, error: 'Checkbox/radio element not found' };
          }
          
          if (${options.scrollIntoView !== false}) {
            element.scrollIntoView({ behavior: '${this.config.scrollBehavior}', block: 'center' });
          }
          
          element.focus();
          
          // Set checked state
          element.checked = ${checked};
          
          // Trigger change events
          element.dispatchEvent(new Event('change', { bubbles: true }));
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.blur();
          
          return { 
            success: true, 
            checked: element.checked,
            value: element.value
          };
          
        } catch (error) {
          return { success: false, error: error.message };
        }
      })();
    `;

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
    const waitScript = `
      (function() {
        return new Promise((resolve) => {
          const startTime = Date.now();
          const timeout = ${timeout};
          
          function checkCondition() {
            const element = document.querySelector('${this.escapeSelector(selector)}');
            
            switch ('${condition}') {
              case 'appear':
                return element !== null;
              case 'disappear':
                return element === null;
              case 'visible':
                if (!element) return false;
                const rect = element.getBoundingClientRect();
                const style = window.getComputedStyle(element);
                return rect.width > 0 && rect.height > 0 && 
                       style.visibility !== 'hidden' && 
                       style.display !== 'none';
              case 'hidden':
                if (!element) return true;
                const hiddenRect = element.getBoundingClientRect();
                const hiddenStyle = window.getComputedStyle(element);
                return hiddenRect.width === 0 || hiddenRect.height === 0 || 
                       hiddenStyle.visibility === 'hidden' || 
                       hiddenStyle.display === 'none';
              default:
                return false;
            }
          }
          
          function poll() {
            if (checkCondition()) {
              resolve({ success: true, conditionMet: '${condition}' });
            } else if (Date.now() - startTime > timeout) {
              resolve({ success: false, error: 'Timeout waiting for condition: ${condition}' });
            } else {
              setTimeout(poll, 200);
            }
          }
          
          poll();
        });
      })();
    `;

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
    const extractScript = `
      (function() {
        try {
          const element = document.querySelector('${this.escapeSelector(selector)}');
          if (!element) {
            return { success: false, error: 'Element not found for data extraction' };
          }
          
          let data;
          switch ('${dataType}') {
            case 'text':
              data = element.textContent || element.innerText || '';
              break;
            case 'value':
              data = element.value || '';
              break;
            case 'html':
              data = element.innerHTML || '';
              break;
            case 'attribute':
              data = element.getAttribute('${attributeName || ''}') || '';
              break;
            default:
              return { success: false, error: 'Invalid data type: ${dataType}' };
          }
          
          return { 
            success: true, 
            data: data,
            dataType: '${dataType}',
            selector: '${selector}'
          };
          
        } catch (error) {
          return { success: false, error: error.message };
        }
      })();
    `;

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
    let scrollScript: string;

    if (typeof target === 'string') {
      // Scroll to element
      scrollScript = `
        (function() {
          try {
            const element = document.querySelector('${this.escapeSelector(target)}');
            if (!element) {
              return { success: false, error: 'Element not found for scrolling' };
            }
            
            element.scrollIntoView({ 
              behavior: '${behavior}', 
              block: 'center',
              inline: 'center'
            });
            
            return { success: true, scrolledTo: 'element' };
          } catch (error) {
            return { success: false, error: error.message };
          }
        })();
      `;
    } else {
      // Scroll to coordinates
      scrollScript = `
        (function() {
          try {
            window.scrollTo({ 
              left: ${target.x}, 
              top: ${target.y}, 
              behavior: '${behavior}' 
            });
            
            return { success: true, scrolledTo: 'coordinates', x: ${target.x}, y: ${target.y} };
          } catch (error) {
            return { success: false, error: error.message };
          }
        })();
      `;
    }

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

  /**
   * Generate click script with proper event handling
   */
  private generateClickScript(
    selector: string,
    options: ElementInteractionOptions
  ): string {
    return `
      (function() {
        try {
          const element = document.querySelector('${this.escapeSelector(selector)}');
          if (!element) {
            return { success: false, error: 'Element not found' };
          }
          
          // Record initial state
          const initialValue = element.value || element.textContent;
          const initialChecked = element.checked;
          
          ${options.scrollIntoView !== false ? `
            element.scrollIntoView({ behavior: '${this.config.scrollBehavior}', block: 'center' });
          ` : ''}
          
          // Wait a moment for scroll to complete
          await new Promise(resolve => setTimeout(resolve, ${this.config.clickDelay}));
          
          // Focus and click
          element.focus();
          
          // Create and dispatch click events
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window,
            button: 0,
            buttons: 1,
            clientX: element.getBoundingClientRect().left + element.offsetWidth / 2,
            clientY: element.getBoundingClientRect().top + element.offsetHeight / 2
          });
          
          element.dispatchEvent(clickEvent);
          
          // Check for element state changes
          const finalValue = element.value || element.textContent;
          const finalChecked = element.checked;
          const elementChanged = (initialValue !== finalValue) || (initialChecked !== finalChecked);
          
          return { 
            success: true, 
            elementChanged: elementChanged,
            initialValue: initialValue,
            finalValue: finalValue
          };
          
        } catch (error) {
          return { success: false, error: error.message };
        }
      })();
    `;
  }

  /**
   * Generate typing script with realistic timing
   */
  private generateTypeScript(
    selector: string,
    text: string,
    options: ElementInteractionOptions
  ): string {
    return `
      (function() {
        try {
          const element = document.querySelector('${this.escapeSelector(selector)}');
          if (!element) {
            return { success: false, error: 'Element not found' };
          }
          
          ${options.scrollIntoView !== false ? `
            element.scrollIntoView({ behavior: '${this.config.scrollBehavior}', block: 'center' });
          ` : ''}
          
          element.focus();
          
          // Clear existing content
          element.value = '';
          element.dispatchEvent(new Event('input', { bubbles: true }));
          
          // Type the text character by character for more realistic interaction
          const text = '${text.replace(/'/g, "\\'")}';
          let currentValue = '';
          
          return new Promise((resolve) => {
            let index = 0;
            
            function typeNextCharacter() {
              if (index < text.length) {
                currentValue += text[index];
                element.value = currentValue;
                
                // Dispatch input events
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new KeyboardEvent('keydown', { key: text[index] }));
                element.dispatchEvent(new KeyboardEvent('keyup', { key: text[index] }));
                
                index++;
                setTimeout(typeNextCharacter, ${this.config.typeDelay});
              } else {
                // Final change event
                element.dispatchEvent(new Event('change', { bubbles: true }));
                element.blur();
                
                resolve({
                  success: true,
                  finalValue: element.value,
                  charactersTyped: text.length
                });
              }
            }
            
            typeNextCharacter();
          });
          
        } catch (error) {
          return { success: false, error: error.message };
        }
      })();
    `;
  }

  /**
   * Get current URL from the page
   */
  private async getCurrentUrl(executeScript: (code: string) => Promise<any>): Promise<string> {
    try {
      const result = await executeScript('window.location.href');
      return result || '';
    } catch {
      return '';
    }
  }

  /**
   * Wait for page stability (no ongoing requests or DOM changes)
   */
  private async waitForStability(
    executeScript: (code: string) => Promise<any>,
    timeout: number = 3000
  ): Promise<void> {
    const stabilityScript = `
      (function() {
        return new Promise((resolve) => {
          let stableTime = 0;
          const requiredStableTime = 1000; // 1 second of stability
          const checkInterval = 100;
          
          let lastUrl = window.location.href;
          let lastTitle = document.title;
          
          function checkStability() {
            const currentUrl = window.location.href;
            const currentTitle = document.title;
            
            if (currentUrl === lastUrl && currentTitle === lastTitle) {
              stableTime += checkInterval;
              if (stableTime >= requiredStableTime) {
                resolve(true);
                return;
              }
            } else {
              stableTime = 0;
              lastUrl = currentUrl;
              lastTitle = currentTitle;
            }
            
            setTimeout(checkStability, checkInterval);
          }
          
          // Start checking
          setTimeout(checkStability, checkInterval);
          
          // Timeout fallback
          setTimeout(() => resolve(true), ${timeout});
        });
      })();
    `;

    try {
      await executeScript(stabilityScript);
    } catch {
      // If stability check fails, just wait a bit
      await new Promise(resolve => setTimeout(() => resolve(undefined), 1000));
    }
  }

  /**
   * Escape CSS selectors for safe injection
   */
  private escapeSelector(selector: string): string {
    return selector.replace(/'/g, "\\'").replace(/"/g, '\\"');
  }
}