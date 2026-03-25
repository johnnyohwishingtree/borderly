/**
 * Detection Helpers — Polling strategies, condition checking, and script generation
 */

import type {
  DetectionCriteria,
  PollingStrategy,
} from './detectionTypes';

/**
 * Check if element meets the specified condition
 */
export function meetsCondition(checkResult: any, criteria: DetectionCriteria): boolean {
  if (!checkResult.success || !checkResult.element) {
    return criteria.condition === 'absent';
  }

  const element = checkResult.element;

  switch (criteria.condition) {
    case 'present':
      return true;
    case 'absent':
      return false;
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
export function calculateNextDelay(strategy: PollingStrategy, currentDelay: number, attempt: number): number {
  switch (strategy.type) {
    case 'fixed':
      return strategy.initialDelay;

    case 'exponential': {
      const exponentialDelay = currentDelay * (strategy.multiplier || 2);
      return Math.min(exponentialDelay, strategy.maxDelay);
    }

    case 'fibonacci': {
      const fibDelay = currentDelay * 1.618;
      return Math.min(fibDelay, strategy.maxDelay);
    }

    case 'adaptive': {
      const backoff = strategy.backoffFactor || 1.2;
      const adaptiveDelay = strategy.initialDelay * Math.pow(backoff, attempt - 1);
      return Math.min(adaptiveDelay, strategy.maxDelay);
    }

    default:
      return strategy.initialDelay;
  }
}

/**
 * Generate cache key for detection criteria
 */
export function generateCacheKey(criteria: DetectionCriteria): string {
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
 * Escape CSS selector for safe injection
 */
export function escapeSelector(selector: string): string {
  return selector.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

/**
 * Build the detection script for a given criteria
 */
export function buildDetectionScript(criteria: DetectionCriteria): string {
  return `
    (function() {
      try {
        const selector = '${escapeSelector(criteria.selector)}';
        const element = document.querySelector(selector);

        if (!element) {
          return {
            success: false,
            error: 'Element not found',
            stability: { isStable: false, changeCount: 0 }
          };
        }

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
          isClickable: false,
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

        for (let i = 0; i < element.attributes.length; i++) {
          const attr = element.attributes[i];
          elementInfo.attributes[attr.name] = attr.value;
        }

        elementInfo.isClickable = elementInfo.isVisible &&
                                 elementInfo.isEnabled &&
                                 computedStyle.pointerEvents !== 'none';

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

        ${criteria.textContent ? `
          const textMatch = ${criteria.textContent instanceof RegExp
            ? `/${criteria.textContent.source}/${criteria.textContent.flags}.test(elementInfo.textContent)`
            : `elementInfo.textContent.includes(${JSON.stringify(String(criteria.textContent))})`};
          if (!textMatch) {
            return {
              success: false,
              error: 'Text content does not match',
              element: elementInfo,
              stability: { isStable: true, changeCount: 0 }
            };
          }
        ` : ''}

        ${criteria.valueContent ? `
          const valueMatch = ${criteria.valueContent instanceof RegExp
            ? `/${criteria.valueContent.source}/${criteria.valueContent.flags}.test(elementInfo.value || '')`
            : `(elementInfo.value || '').includes(${JSON.stringify(String(criteria.valueContent))})`};
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
}

/**
 * Build form readiness detection script
 */
export function buildFormReadinessScript(
  formSelector: string,
  requiredFields: string[],
  _scrollBehavior: string
): string {
  return `
    (function() {
      const formSelector = '${escapeSelector(formSelector)}';
      const requiredFields = ${JSON.stringify(requiredFields)};

      const form = document.querySelector(formSelector);
      if (!form) {
        return {
          success: false,
          error: 'Form not found',
          formReady: false
        };
      }

      const formRect = form.getBoundingClientRect();
      const isVisible = formRect.width > 0 && formRect.height > 0;
      const isEnabled = !form.hasAttribute('disabled');

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
}

/**
 * Build a stability detection script
 */
export function buildStabilityScript(
  selector: string,
  stabilityDuration: number,
  maxWaitTime: number
): string {
  return `
    (function() {
      const selector = ${JSON.stringify(selector)};
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
}

/**
 * Capture screenshot on detection failure (placeholder)
 */
export async function captureFailureScreenshot(executeScript: (code: string) => Promise<any>): Promise<string> {
  try {
    const screenshot = await executeScript(`
      (function() {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
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
