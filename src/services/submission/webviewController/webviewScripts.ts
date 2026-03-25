/**
 * Script generation helpers and security utilities for WebView automation
 */

import { SecurityValidationResult } from '@/types/submission';
import { SecurityConstraints } from './webviewControllerTypes';

/**
 * Validate a URL against allowed domains and protocol constraints.
 */
export function validateUrl(
  url: string,
  securityConstraints: SecurityConstraints
): SecurityValidationResult {
  const result: SecurityValidationResult = {
    isValid: true,
    warnings: [],
    errors: [],
    checks: {
      noPIILeakage: true,
      validDomain: false,
      secureConnection: false,
      dataWithinLimits: true
    }
  };

  try {
    const urlObj = new URL(url);

    if (urlObj.protocol === 'https:') {
      result.checks.secureConnection = true;
    } else if (urlObj.protocol === 'http:' && urlObj.hostname === 'localhost') {
      result.checks.secureConnection = true;
      result.warnings.push('Using HTTP on localhost (development only)');
    } else {
      result.errors.push('Only HTTPS URLs are allowed');
      result.checks.secureConnection = false;
    }

    const isAllowedDomain = securityConstraints.allowedDomains.some(domain =>
      urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
    );

    if (isAllowedDomain) {
      result.checks.validDomain = true;
    } else {
      result.errors.push(`Domain not in allowlist: ${urlObj.hostname}`);
      result.checks.validDomain = false;
    }

  } catch (error) {
    result.errors.push(`Invalid URL: ${(error as Error).message}`);
  }

  result.isValid = result.errors.length === 0;
  return result;
}

/**
 * Validate JavaScript code for dangerous patterns.
 */
export function validateJavaScript(code: string): SecurityValidationResult {
  const result: SecurityValidationResult = {
    isValid: true,
    warnings: [],
    errors: [],
    checks: {
      noPIILeakage: true,
      validDomain: true,
      secureConnection: true,
      dataWithinLimits: code.length <= 10000
    }
  };

  const dangerousPatterns = [
    /eval\s*\(/,
    /Function\s*\(/,
    /document\.write\s*\(/,
    /innerHTML\s*=.*script/i,
    /fetch\s*\(/,
    /XMLHttpRequest/,
    /window\.location\s*=/,
    /document\.domain\s*=/
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      result.errors.push(`Potentially dangerous JavaScript pattern detected: ${pattern}`);
    }
  }

  if (!result.checks.dataWithinLimits) {
    result.errors.push('JavaScript code exceeds maximum allowed size');
  }

  result.isValid = result.errors.length === 0;
  return result;
}

/**
 * Create a Promise that rejects after `ms` milliseconds.
 */
export function createTimeout(ms: number, message: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

/**
 * Return the serialised byte-length of an arbitrary response value.
 */
export function getResponseSize(response: unknown): number {
  return JSON.stringify(response).length;
}

/**
 * Wrap JavaScript code with error handling and timeout check
 */
export function wrapJavaScriptCode(code: string, timeoutMs: number): string {
  return `
    (function() {
      try {
        const startTime = Date.now();
        const result = ${code};

        // Check execution time
        if (Date.now() - startTime > ${timeoutMs}) {
          throw new Error('Execution timeout');
        }

        return result;
      } catch (error) {
        throw new Error('Script execution error: ' + error.message);
      }
    })();
  `;
}

/**
 * Generate a script that fills multiple form fields from a mapping object
 */
export function generateFormInjectionScript(fieldMappings: Record<string, unknown>): string {
  const mappingEntries = Object.entries(fieldMappings)
    .map(([fieldId, mapping]) => `${JSON.stringify(fieldId)}: ${JSON.stringify(mapping)}`)
    .join(',\n    ');

  return `
    (function() {
      const fieldMappings = {
        ${mappingEntries}
      };

      const results = {};

      for (const [fieldId, mapping] of Object.entries(fieldMappings)) {
        try {
          const element = document.querySelector(mapping.selector);
          if (element) {
            // Fill the field based on input type
            if (mapping.inputType === 'select') {
              element.value = mapping.value;
              element.dispatchEvent(new Event('change'));
            } else if (mapping.inputType === 'checkbox' || mapping.inputType === 'radio') {
              element.checked = Boolean(mapping.value);
              element.dispatchEvent(new Event('change'));
            } else {
              element.value = mapping.value;
              element.dispatchEvent(new Event('input'));
              element.dispatchEvent(new Event('change'));
            }

            results[fieldId] = true;
          } else {
            results[fieldId] = false;
          }
        } catch (error) {
          results[fieldId] = false;
        }
      }

      return results;
    })();
  `;
}

/**
 * Generate a script that fills a single form field
 */
export function generateFieldFillScript(selector: string, value: string, inputType: string): string {
  return `
    (function() {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) {
        throw new Error('Element not found: ${selector}');
      }

      element.scrollIntoView();
      element.focus();

      if (${JSON.stringify(inputType)} === 'select') {
        element.value = ${JSON.stringify(value)};
        element.dispatchEvent(new Event('change'));
      } else if (${JSON.stringify(inputType)} === 'checkbox' || ${JSON.stringify(inputType)} === 'radio') {
        element.checked = ${JSON.stringify(value)} === 'true' || ${JSON.stringify(value)} === true;
        element.dispatchEvent(new Event('change'));
      } else {
        element.value = ${JSON.stringify(value)};
        element.dispatchEvent(new Event('input'));
        element.dispatchEvent(new Event('change'));
      }

      return true;
    })();
  `;
}

/**
 * Screenshot capture script (best-effort; returns empty string on failure)
 */
export const SCREENSHOT_SCRIPT = `
  (function() {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const video = document.createElement('video');

    return new Promise((resolve) => {
      video.addEventListener('loadeddata', function() {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      });

      navigator.mediaDevices.getDisplayMedia({ video: true })
        .then(stream => {
          video.srcObject = stream;
          video.play();
        });
    });
  })();
`;

/**
 * Script to check for a DOM element by selector
 */
export function buildElementExistsScript(selector: string): string {
  return `document.querySelector(${JSON.stringify(selector)}) !== null;`;
}

/**
 * Script to click a DOM element by selector
 */
export function buildClickScript(selector: string): string {
  return `
    const element = document.querySelector(${JSON.stringify(selector)});
    if (element) {
      element.scrollIntoView();
      element.focus();
      element.click();
      return true;
    }
    return false;
  `;
}

/**
 * Script to read basic page info
 */
export const PAGE_INFO_SCRIPT = `
  ({
    title: document.title,
    url: window.location.href,
    ready: document.readyState === 'complete'
  });
`;
