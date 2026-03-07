/**
 * Automation Helpers - Utility functions for WebView automation and form filling
 * 
 * Provides common utilities, data transformations, and helper functions used across
 * the automation engine for government portal interactions.
 */

import type { PortalFieldMapping } from '@/types/submission';

// Type declaration for CSS.escape
declare global {
  interface Window {
    CSS?: {
      escape(value: string): string;
    };
  }
}

// For non-browser environments
interface CSS {
  escape(value: string): string;
}

declare const CSS: CSS | undefined;

// Fallback for CSS.escape when not available
const cssEscape = (value: string): string => {
  if (typeof CSS !== 'undefined' && CSS?.escape) {
    return CSS.escape(value);
  }
  // Simple CSS escape fallback for server/test environments
  return value.replace(/[!"#$%&'()*+,.\/:;<=>?@\[\\\]^`{|}~]/g, '\\$&');
};

/**
 * Selector building utilities
 */
export class SelectorBuilder {
  /**
   * Build a CSS selector with fallbacks
   */
  static buildSelector(options: {
    id?: string;
    className?: string;
    tagName?: string;
    attributes?: Record<string, string>;
    text?: string;
    parent?: string;
    index?: number;
  }): string {
    const selectors = [];

    // ID selector (highest priority)
    if (options.id) {
      selectors.push(`#${this.escape(options.id)}`);
    }

    // Class selector
    if (options.className) {
      const classes = options.className.split(/\s+/).filter(c => c.trim());
      if (classes.length > 0) {
        selectors.push(`.${classes.map(c => this.escape(c)).join('.')}`);
      }
    }

    // Tag with attributes
    if (options.tagName) {
      let tagSelector = options.tagName.toLowerCase();
      
      if (options.attributes) {
        Object.entries(options.attributes).forEach(([key, value]) => {
          tagSelector += `[${this.escape(key)}="${this.escape(value)}"]`;
        });
      }
      
      selectors.push(tagSelector);
    }

    // Text content selector
    if (options.text) {
      selectors.push(`*:contains("${this.escape(options.text)}")`);
    }

    // Parent context
    if (options.parent) {
      return selectors.map(s => `${options.parent} ${s}`).join(', ');
    }

    // Add index if specified
    if (options.index !== undefined) {
      return selectors.map(s => `${s}:nth-child(${options.index})`).join(', ');
    }

    return selectors.join(', ');
  }

  /**
   * Build form field selector with common patterns
   */
  static buildFormFieldSelector(fieldInfo: {
    name?: string;
    id?: string;
    label?: string;
    type?: string;
    placeholder?: string;
  }): string {
    const selectors = [];

    // By name attribute
    if (fieldInfo.name) {
      selectors.push(`input[name="${cssEscape(fieldInfo.name)}"]`);
      selectors.push(`select[name="${cssEscape(fieldInfo.name)}"]`);
      selectors.push(`textarea[name="${cssEscape(fieldInfo.name)}"]`);
    }

    // By ID
    if (fieldInfo.id) {
      selectors.push(`#${cssEscape(fieldInfo.id)}`);
    }

    // By associated label
    if (fieldInfo.label) {
      selectors.push(`label:contains("${cssEscape(fieldInfo.label)}") input`);
      selectors.push(`label:contains("${cssEscape(fieldInfo.label)}") select`);
      selectors.push(`label:contains("${cssEscape(fieldInfo.label)}") textarea`);
    }

    // By type and placeholder
    if (fieldInfo.type && fieldInfo.placeholder) {
      selectors.push(`input[type="${fieldInfo.type}"][placeholder*="${cssEscape(fieldInfo.placeholder)}"]`);
    }

    return selectors.join(', ');
  }

  /**
   * Escape CSS selector for safe injection
   */
  static escape(value: string): string {
    // Polyfill for CSS.escape if not available
    if (typeof CSS !== 'undefined' && CSS.escape) {
      return CSS.escape(value);
    }
    
    // Manual escaping for special characters
    return value.replace(/[!"#$%&'()*+,.\/:;<=>?@\[\\\]^`{|}~]/g, '\\$&');
  }
}

/**
 * Data transformation utilities
 */
export class DataTransformer {
  /**
   * Transform date formats for different portals
   */
  static transformDate(
    date: string,
    fromFormat: string,
    toFormat: string,
    locale?: string
  ): string {
    try {
      // Parse the input date based on format
      let parsedDate: Date;
      
      if (fromFormat === 'YYYY-MM-DD') {
        parsedDate = new Date(date);
      } else if (fromFormat === 'DD/MM/YYYY') {
        const [day, month, year] = date.split('/');
        parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else if (fromFormat === 'MM/DD/YYYY') {
        const [month, day, year] = date.split('/');
        parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        parsedDate = new Date(date);
      }

      if (isNaN(parsedDate.getTime())) {
        return date; // Return original if parsing failed
      }

      // Format according to target format
      switch (toFormat) {
        case 'YYYY-MM-DD':
          return parsedDate.toISOString().split('T')[0];
        
        case 'DD/MM/YYYY':
          return `${parsedDate.getDate().toString().padStart(2, '0')}/${(parsedDate.getMonth() + 1).toString().padStart(2, '0')}/${parsedDate.getFullYear()}`;
        
        case 'MM/DD/YYYY':
          return `${(parsedDate.getMonth() + 1).toString().padStart(2, '0')}/${parsedDate.getDate().toString().padStart(2, '0')}/${parsedDate.getFullYear()}`;
        
        case 'DD-MM-YYYY':
          return `${parsedDate.getDate().toString().padStart(2, '0')}-${(parsedDate.getMonth() + 1).toString().padStart(2, '0')}-${parsedDate.getFullYear()}`;
        
        case 'YYYY/MM/DD':
          return `${parsedDate.getFullYear()}/${(parsedDate.getMonth() + 1).toString().padStart(2, '0')}/${parsedDate.getDate().toString().padStart(2, '0')}`;
        
        default:
          return date;
      }
    } catch (error) {
      console.warn('Date transformation failed:', error);
      return date;
    }
  }

  /**
   * Transform country codes between different formats
   */
  static transformCountryCode(
    countryCode: string,
    fromFormat: 'ISO2' | 'ISO3' | 'NAME',
    toFormat: 'ISO2' | 'ISO3' | 'NAME'
  ): string {
    const countryMappings = {
      'US': { ISO2: 'US', ISO3: 'USA', NAME: 'United States' },
      'GB': { ISO2: 'GB', ISO3: 'GBR', NAME: 'United Kingdom' },
      'CA': { ISO2: 'CA', ISO3: 'CAN', NAME: 'Canada' },
      'AU': { ISO2: 'AU', ISO3: 'AUS', NAME: 'Australia' },
      'DE': { ISO2: 'DE', ISO3: 'DEU', NAME: 'Germany' },
      'FR': { ISO2: 'FR', ISO3: 'FRA', NAME: 'France' },
      'JP': { ISO2: 'JP', ISO3: 'JPN', NAME: 'Japan' },
      'KR': { ISO2: 'KR', ISO3: 'KOR', NAME: 'South Korea' },
      'CN': { ISO2: 'CN', ISO3: 'CHN', NAME: 'China' },
      'IN': { ISO2: 'IN', ISO3: 'IND', NAME: 'India' },
      'MY': { ISO2: 'MY', ISO3: 'MYS', NAME: 'Malaysia' },
      'SG': { ISO2: 'SG', ISO3: 'SGP', NAME: 'Singapore' },
      'TH': { ISO2: 'TH', ISO3: 'THA', NAME: 'Thailand' },
      'VN': { ISO2: 'VN', ISO3: 'VNM', NAME: 'Vietnam' }
    };

    // Find the mapping entry
    let mappingEntry: any = null;
    
    for (const [key, mapping] of Object.entries(countryMappings)) {
      if (mapping[fromFormat] === countryCode || 
          (fromFormat === 'NAME' && mapping.NAME.toLowerCase() === countryCode.toLowerCase())) {
        mappingEntry = mapping;
        break;
      }
    }

    return mappingEntry ? mappingEntry[toFormat] : countryCode;
  }

  /**
   * Transform phone numbers to international format
   */
  static transformPhoneNumber(phone: string, countryCode: string): string {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // If it already has country code, return as is
    if (cleaned.startsWith('+')) {
      return cleaned;
    }

    // Add country code based on mapping
    const countryPhoneCodes: Record<string, string> = {
      'US': '+1',
      'GB': '+44',
      'CA': '+1',
      'AU': '+61',
      'DE': '+49',
      'FR': '+33',
      'JP': '+81',
      'KR': '+82',
      'CN': '+86',
      'IN': '+91',
      'MY': '+60',
      'SG': '+65',
      'TH': '+66',
      'VN': '+84'
    };

    const prefix = countryPhoneCodes[countryCode];
    if (prefix) {
      // Remove leading 0 if present (common in many countries)
      if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
      }
      return prefix + cleaned;
    }

    return phone; // Return original if no mapping found
  }

  /**
   * Transform boolean values to various string representations
   */
  static transformBoolean(
    value: boolean,
    format: 'yes_no' | 'true_false' | 'on_off' | '1_0' | 'checked_unchecked'
  ): string {
    const mappings = {
      'yes_no': { true: 'Yes', false: 'No' },
      'true_false': { true: 'true', false: 'false' },
      'on_off': { true: 'On', false: 'Off' },
      '1_0': { true: '1', false: '0' },
      'checked_unchecked': { true: 'checked', false: 'unchecked' }
    };

    const mapping = mappings[format];
    return mapping[value ? 'true' : 'false'];
  }

  /**
   * Clean and normalize text input
   */
  static normalizeText(text: string, options: {
    removeExtraSpaces?: boolean;
    removeSpecialChars?: boolean;
    toUpperCase?: boolean;
    toLowerCase?: boolean;
    maxLength?: number;
  } = {}): string {
    let normalized = text;

    // Remove extra spaces
    if (options.removeExtraSpaces !== false) {
      normalized = normalized.replace(/\s+/g, ' ').trim();
    }

    // Remove special characters
    if (options.removeSpecialChars) {
      normalized = normalized.replace(/[^\w\s]/g, '');
    }

    // Case transformation
    if (options.toUpperCase) {
      normalized = normalized.toUpperCase();
    } else if (options.toLowerCase) {
      normalized = normalized.toLowerCase();
    }

    // Truncate if needed
    if (options.maxLength && normalized.length > options.maxLength) {
      normalized = normalized.substring(0, options.maxLength);
    }

    return normalized;
  }
}

/**
 * Element interaction utilities
 */
export class ElementUtils {
  /**
   * Generate JavaScript to check element readiness
   */
  static generateReadinessCheck(selector: string): string {
    return `
      (function() {
        const element = document.querySelector(${JSON.stringify(selector)});
        if (!element) return { ready: false, reason: 'Element not found' };
        
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        
        const isVisible = rect.width > 0 && rect.height > 0 && 
                         style.visibility !== 'hidden' && 
                         style.display !== 'none';
        
        const isEnabled = !element.disabled && !element.hasAttribute('aria-disabled');
        const isInteractable = style.pointerEvents !== 'none';
        
        return {
          ready: isVisible && isEnabled && isInteractable,
          visible: isVisible,
          enabled: isEnabled,
          interactable: isInteractable,
          coordinates: { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
        };
      })()
    `;
  }

  /**
   * Generate JavaScript to simulate realistic human interaction
   */
  static generateHumanLikeInteraction(
    action: 'click' | 'focus' | 'hover',
    selector: string
  ): string {
    const baseScript = `
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) throw new Error('Element not found');
      
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    `;

    switch (action) {
      case 'click':
        return `
          ${baseScript}
          
          // Simulate mouse movement and hover first
          element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
          element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
          
          setTimeout(() => {
            const rect = element.getBoundingClientRect();
            const x = rect.left + rect.width / 2 + (Math.random() - 0.5) * 4;
            const y = rect.top + rect.height / 2 + (Math.random() - 0.5) * 4;
            
            // Mouse down
            element.dispatchEvent(new MouseEvent('mousedown', {
              bubbles: true,
              cancelable: true,
              clientX: x,
              clientY: y
            }));
            
            // Small delay for realistic interaction
            setTimeout(() => {
              // Mouse up and click
              element.dispatchEvent(new MouseEvent('mouseup', {
                bubbles: true,
                cancelable: true,
                clientX: x,
                clientY: y
              }));
              
              element.dispatchEvent(new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                clientX: x,
                clientY: y
              }));
            }, 50 + Math.random() * 100);
          }, 100 + Math.random() * 200);
        `;

      case 'focus':
        return `
          ${baseScript}
          
          // Simulate focus sequence
          element.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
          element.focus();
          element.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
        `;

      case 'hover':
        return `
          ${baseScript}
          
          // Simulate hover
          element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
          element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        `;

      default:
        return baseScript;
    }
  }

  /**
   * Generate JavaScript for smart form field detection
   */
  static generateFieldDetection(criteria: {
    fieldType?: string;
    labelText?: string;
    placeholder?: string;
    name?: string;
    nearbyText?: string;
  }): string {
    return `
      (function() {
        const results = [];
        
        // Strategy 1: Direct attribute matching
        ${criteria.name ? `
          document.querySelectorAll('input[name*="${criteria.name}"], select[name*="${criteria.name}"], textarea[name*="${criteria.name}"]')
            .forEach(el => results.push({ element: el, confidence: 0.9, strategy: 'name_match' }));
        ` : ''}
        
        ${criteria.placeholder ? `
          document.querySelectorAll('input[placeholder*="${criteria.placeholder}"]')
            .forEach(el => results.push({ element: el, confidence: 0.8, strategy: 'placeholder_match' }));
        ` : ''}
        
        // Strategy 2: Label association
        ${criteria.labelText ? `
          document.querySelectorAll('label')
            .filter(label => label.textContent.toLowerCase().includes('${criteria.labelText.toLowerCase()}'))
            .forEach(label => {
              // Try to find associated input
              const forId = label.getAttribute('for');
              if (forId) {
                const input = document.getElementById(forId);
                if (input) results.push({ element: input, confidence: 0.85, strategy: 'label_for' });
              }
              
              // Try to find input within label
              const inputInLabel = label.querySelector('input, select, textarea');
              if (inputInLabel) results.push({ element: inputInLabel, confidence: 0.8, strategy: 'label_nested' });
              
              // Try to find nearby input
              const nextInput = label.nextElementSibling;
              if (nextInput && ['INPUT', 'SELECT', 'TEXTAREA'].includes(nextInput.tagName)) {
                results.push({ element: nextInput, confidence: 0.7, strategy: 'label_sibling' });
              }
            });
        ` : ''}
        
        // Strategy 3: Nearby text matching
        ${criteria.nearbyText ? `
          document.querySelectorAll('input, select, textarea').forEach(field => {
            const parent = field.closest('div, td, li, section');
            if (parent && parent.textContent.toLowerCase().includes('${criteria.nearbyText.toLowerCase()}')) {
              results.push({ element: field, confidence: 0.6, strategy: 'nearby_text' });
            }
          });
        ` : ''}
        
        // Remove duplicates and sort by confidence
        const unique = [];
        const seen = new Set();
        
        results.forEach(result => {
          if (!seen.has(result.element)) {
            seen.add(result.element);
            unique.push(result);
          }
        });
        
        unique.sort((a, b) => b.confidence - a.confidence);
        
        return unique.map(result => ({
          selector: result.element.id ? '#' + result.element.id : 
                   result.element.name ? '[name="' + result.element.name + '"]' :
                   result.element.tagName.toLowerCase() + ':nth-child(' + Array.from(result.element.parentNode.children).indexOf(result.element) + ')',
          confidence: result.confidence,
          strategy: result.strategy,
          elementInfo: {
            tagName: result.element.tagName,
            type: result.element.type,
            name: result.element.name,
            id: result.element.id,
            placeholder: result.element.placeholder
          }
        }));
      })();
    `;
  }
}

/**
 * Error handling and retry utilities
 */
export class ErrorHandling {
  /**
   * Create retry configuration with exponential backoff
   */
  static createRetryConfig(
    maxAttempts: number = 3,
    baseDelay: number = 1000,
    maxDelay: number = 10000,
    backoffFactor: number = 2
  ) {
    return {
      maxAttempts,
      baseDelay,
      maxDelay,
      backoffFactor,
      shouldRetry: (error: Error, attempt: number): boolean => {
        // Don't retry certain types of errors
        if (error.message.includes('Element not found') || 
            error.message.includes('Timeout') ||
            error.message.includes('Security validation failed')) {
          return false;
        }
        
        return attempt < maxAttempts;
      },
      getDelay: (attempt: number): number => {
        const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt - 1), maxDelay);
        // Add jitter to prevent thundering herd
        return delay + Math.random() * 1000;
      }
    };
  }

  /**
   * Wrap function with retry logic
   */
  static withRetry<T>(
    fn: () => Promise<T>,
    config = ErrorHandling.createRetryConfig()
  ): () => Promise<T> {
    return async (): Promise<T> => {
      let lastError: Error;
      
      for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
        try {
          return await fn();
        } catch (error) {
          lastError = error as Error;
          
          if (!config.shouldRetry(lastError, attempt) || attempt === config.maxAttempts) {
            throw lastError;
          }
          
          const delay = config.getDelay(attempt);
          await new Promise<void>(resolve => setTimeout(() => resolve(), delay));
        }
      }
      
      throw lastError!;
    };
  }

  /**
   * Categorize errors for better handling
   */
  static categorizeError(error: Error): {
    category: 'network' | 'element' | 'validation' | 'timeout' | 'security' | 'unknown';
    severity: 'low' | 'medium' | 'high';
    retryable: boolean;
    userMessage: string;
  } {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return {
        category: 'network',
        severity: 'medium',
        retryable: true,
        userMessage: 'Network connection issue. Please check your internet connection.'
      };
    }
    
    if (message.includes('element not found') || message.includes('selector')) {
      return {
        category: 'element',
        severity: 'high',
        retryable: false,
        userMessage: 'Form element not found. The page may have changed.'
      };
    }
    
    if (message.includes('validation') || message.includes('invalid')) {
      return {
        category: 'validation',
        severity: 'medium',
        retryable: false,
        userMessage: 'Data validation failed. Please check your information.'
      };
    }
    
    if (message.includes('timeout')) {
      return {
        category: 'timeout',
        severity: 'medium',
        retryable: true,
        userMessage: 'Operation timed out. The page may be loading slowly.'
      };
    }
    
    if (message.includes('security') || message.includes('permission')) {
      return {
        category: 'security',
        severity: 'high',
        retryable: false,
        userMessage: 'Security check failed. Please try manual submission.'
      };
    }
    
    return {
      category: 'unknown',
      severity: 'medium',
      retryable: true,
      userMessage: 'An unexpected error occurred. Please try again.'
    };
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static metrics: Map<string, any[]> = new Map();

  /**
   * Start timing an operation
   */
  static startTiming(operationName: string): string {
    const timingId = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startTime = performance.now();
    
    if (!this.metrics.has(operationName)) {
      this.metrics.set(operationName, []);
    }
    
    this.metrics.get(operationName)!.push({
      id: timingId,
      startTime,
      endTime: null,
      duration: null,
      success: null
    });
    
    return timingId;
  }

  /**
   * End timing an operation
   */
  static endTiming(timingId: string, success: boolean = true): number {
    const endTime = performance.now();
    
    for (const [operationName, timings] of this.metrics.entries()) {
      const timing = timings.find(t => t.id === timingId);
      if (timing) {
        timing.endTime = endTime;
        timing.duration = endTime - timing.startTime;
        timing.success = success;
        return timing.duration;
      }
    }
    
    return -1;
  }

  /**
   * Get performance statistics
   */
  static getStats(operationName?: string): Record<string, any> {
    const stats: Record<string, any> = {};
    
    const operations = operationName 
      ? [[operationName, this.metrics.get(operationName) || []]]
      : Array.from(this.metrics.entries());
    
    operations.forEach(([name, timings]: [string, any[]]) => {
      const completedTimings = timings.filter((t: any) => t.duration !== null);
      const successfulTimings = completedTimings.filter((t: any) => t.success);
      
      if (completedTimings.length > 0) {
        const durations = completedTimings.map((t: any) => t.duration as number);
        durations.sort((a: number, b: number) => a - b);
        
        stats[name] = {
          totalOperations: completedTimings.length,
          successfulOperations: successfulTimings.length,
          successRate: successfulTimings.length / completedTimings.length,
          averageDuration: durations.reduce((sum: number, d: number) => sum + d, 0) / durations.length,
          medianDuration: durations[Math.floor(durations.length / 2)],
          minDuration: Math.min(...durations),
          maxDuration: Math.max(...durations),
          p95Duration: durations[Math.floor(durations.length * 0.95)]
        };
      }
    });
    
    return stats;
  }

  /**
   * Clear metrics
   */
  static clearMetrics(operationName?: string): void {
    if (operationName) {
      this.metrics.delete(operationName);
    } else {
      this.metrics.clear();
    }
  }
}

/**
 * Common automation patterns
 */
export class AutomationPatterns {
  /**
   * Wait for multiple conditions to be met
   */
  static async waitForConditions(
    conditions: Array<() => Promise<boolean>>,
    mode: 'all' | 'any' = 'all',
    timeout: number = 30000,
    pollInterval: number = 500
  ): Promise<{ success: boolean; metConditions: boolean[]; error?: string }> {
    const startTime = Date.now();
    const results: boolean[] = new Array(conditions.length).fill(false);
    
    while (Date.now() - startTime < timeout) {
      // Check all conditions
      for (let i = 0; i < conditions.length; i++) {
        try {
          results[i] = await conditions[i]();
        } catch (error) {
          // Condition check failed, keep as false
        }
      }
      
      // Check if we meet the criteria
      const success = mode === 'all' 
        ? results.every(r => r)
        : results.some(r => r);
      
      if (success) {
        return { success: true, metConditions: results };
      }
      
      // Wait before next check
      await new Promise<void>(resolve => setTimeout(() => resolve(), pollInterval));
    }
    
    return {
      success: false,
      metConditions: results,
      error: `Timeout waiting for conditions (mode: ${mode})`
    };
  }

  /**
   * Perform operation with circuit breaker pattern
   */
  static createCircuitBreaker<T>(
    operation: () => Promise<T>,
    options: {
      failureThreshold: number;
      resetTimeout: number;
      monitoringWindow: number;
    } = {
      failureThreshold: 5,
      resetTimeout: 60000,
      monitoringWindow: 300000
    }
  ) {
    let failures = 0;
    let lastFailureTime = 0;
    let state: 'closed' | 'open' | 'half-open' = 'closed';
    
    return async (): Promise<T> => {
      const now = Date.now();
      
      // Reset if monitoring window has passed
      if (now - lastFailureTime > options.monitoringWindow) {
        failures = 0;
        state = 'closed';
      }
      
      // Check if circuit breaker is open
      if (state === 'open') {
        if (now - lastFailureTime < options.resetTimeout) {
          throw new Error('Circuit breaker is open - operation blocked');
        } else {
          state = 'half-open';
        }
      }
      
      try {
        const result = await operation();
        
        // Reset on success
        if (state === 'half-open') {
          state = 'closed';
          failures = 0;
        }
        
        return result;
        
      } catch (error) {
        failures++;
        lastFailureTime = now;
        
        if (failures >= options.failureThreshold) {
          state = 'open';
        }
        
        throw error;
      }
    };
  }

  /**
   * Execute operations with rate limiting
   */
  static createRateLimiter(
    maxOperations: number,
    timeWindow: number
  ) {
    const operations: number[] = [];
    
    return async <T>(operation: () => Promise<T>): Promise<T> => {
      const now = Date.now();
      
      // Remove operations outside the time window
      while (operations.length > 0 && now - operations[0] > timeWindow) {
        operations.shift();
      }
      
      // Check if we're at the limit
      if (operations.length >= maxOperations) {
        const waitTime = timeWindow - (now - operations[0]);
        await new Promise<void>(resolve => setTimeout(() => resolve(), waitTime));
      }
      
      operations.push(now);
      return await operation();
    };
  }
}