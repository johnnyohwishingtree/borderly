/**
 * Tests for webviewController/webviewScripts
 */

import {
  validateUrl,
  validateJavaScript,
  createTimeout,
  getResponseSize,
  wrapJavaScriptCode,
  generateFormInjectionScript,
  generateFieldFillScript,
  buildElementExistsScript,
  buildClickScript,
  SCREENSHOT_SCRIPT,
  PAGE_INFO_SCRIPT,
} from '@/services/submission/webviewController/webviewScripts';
import { SecurityConstraints } from '@/services/submission/webviewController/webviewControllerTypes';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const defaultConstraints: SecurityConstraints = {
  allowedDomains: ['vjw-lp.digital.go.jp', 'localhost'],
  maxExecutionTime: 5000,
  maxResponseSize: 1024,
  validateSSL: true,
};

// ---------------------------------------------------------------------------
// validateUrl
// ---------------------------------------------------------------------------
describe('validateUrl', () => {
  it('accepts HTTPS URL on an allowed domain', () => {
    const result = validateUrl('https://vjw-lp.digital.go.jp/en/', defaultConstraints);
    expect(result.isValid).toBe(true);
    expect(result.checks.secureConnection).toBe(true);
    expect(result.checks.validDomain).toBe(true);
  });

  it('accepts HTTP on localhost', () => {
    const result = validateUrl('http://localhost:3000/test', defaultConstraints);
    expect(result.isValid).toBe(true);
    expect(result.checks.secureConnection).toBe(true);
    expect(result.warnings.some(w => w.includes('localhost'))).toBe(true);
  });

  it('rejects HTTP on non-localhost domain', () => {
    const result = validateUrl('http://vjw-lp.digital.go.jp', defaultConstraints);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('HTTPS'))).toBe(true);
  });

  it('rejects domain not in allowlist', () => {
    const result = validateUrl('https://evil.example.com', defaultConstraints);
    expect(result.isValid).toBe(false);
    expect(result.checks.validDomain).toBe(false);
  });

  it('accepts subdomain of an allowed domain', () => {
    const result = validateUrl('https://sub.vjw-lp.digital.go.jp/page', defaultConstraints);
    expect(result.isValid).toBe(true);
    expect(result.checks.validDomain).toBe(true);
  });

  it('returns error for invalid URL', () => {
    const result = validateUrl('not-a-url', defaultConstraints);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('Invalid URL'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateJavaScript
// ---------------------------------------------------------------------------
describe('validateJavaScript', () => {
  it('accepts safe JavaScript code', () => {
    const result = validateJavaScript('document.querySelector("#field").value = "test";');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects eval() as dangerous', () => {
    const result = validateJavaScript('eval("alert(1)")');
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('eval'))).toBe(true);
  });

  it('detects fetch() as dangerous', () => {
    const result = validateJavaScript('fetch("https://evil.com")');
    expect(result.isValid).toBe(false);
  });

  it('detects XMLHttpRequest as dangerous', () => {
    const result = validateJavaScript('new XMLHttpRequest()');
    expect(result.isValid).toBe(false);
  });

  it('rejects code exceeding size limit', () => {
    const largeCode = 'x'.repeat(10001);
    const result = validateJavaScript(largeCode);
    expect(result.isValid).toBe(false);
    expect(result.checks.dataWithinLimits).toBe(false);
  });

  it('accepts code within size limit', () => {
    const code = 'x'.repeat(100);
    const result = validateJavaScript(code);
    expect(result.isValid).toBe(true);
    expect(result.checks.dataWithinLimits).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createTimeout
// ---------------------------------------------------------------------------
describe('createTimeout', () => {
  it('rejects with the given message after the specified time', async () => {
    jest.useFakeTimers();
    const { promise, cancel } = createTimeout(100, 'timed out');
    jest.advanceTimersByTime(100);
    await expect(promise).rejects.toThrow('timed out');
    cancel();
    jest.useRealTimers();
  });

  it('can be cancelled to prevent timer leak', () => {
    jest.useFakeTimers();
    const { cancel } = createTimeout(5000, 'should not fire');
    cancel();
    // No unhandled rejection after cancellation
    jest.advanceTimersByTime(5000);
    jest.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// getResponseSize
// ---------------------------------------------------------------------------
describe('getResponseSize', () => {
  it('returns the byte length of JSON-stringified value', () => {
    expect(getResponseSize({ a: 1 })).toBe(JSON.stringify({ a: 1 }).length);
  });

  it('returns 4 for null', () => {
    expect(getResponseSize(null)).toBe(4); // "null"
  });

  it('handles arrays', () => {
    expect(getResponseSize([1, 2, 3])).toBe(JSON.stringify([1, 2, 3]).length);
  });
});

// ---------------------------------------------------------------------------
// wrapJavaScriptCode
// ---------------------------------------------------------------------------
describe('wrapJavaScriptCode', () => {
  it('wraps code in an IIFE with error handling', () => {
    const wrapped = wrapJavaScriptCode('1+1', 5000);
    expect(wrapped).toContain('try');
    expect(wrapped).toContain('catch');
    expect(wrapped).toContain('1+1');
  });

  it('includes timeout check with specified ms', () => {
    const wrapped = wrapJavaScriptCode('x', 3000);
    expect(wrapped).toContain('3000');
  });
});

// ---------------------------------------------------------------------------
// generateFormInjectionScript
// ---------------------------------------------------------------------------
describe('generateFormInjectionScript', () => {
  it('generates script containing field mappings', () => {
    const script = generateFormInjectionScript({
      surname: { selector: '#surname', inputType: 'text', value: 'Tanaka' },
    });
    expect(script).toContain('fieldMappings');
    expect(script).toContain('#surname');
    expect(script).toContain('document.querySelector');
  });

  it('handles empty mappings without error', () => {
    const script = generateFormInjectionScript({});
    expect(script).toContain('fieldMappings');
  });
});

// ---------------------------------------------------------------------------
// generateFieldFillScript
// ---------------------------------------------------------------------------
describe('generateFieldFillScript', () => {
  it('generates script for text input', () => {
    const script = generateFieldFillScript('#name', 'Taro', 'text');
    expect(script).toContain('#name');
    expect(script).toContain('Taro');
    expect(script).toContain('scrollIntoView');
  });

  it('generates script for select input', () => {
    const script = generateFieldFillScript('#country', 'JP', 'select');
    expect(script).toContain('select');
    expect(script).toContain('change');
  });

  it('generates script for checkbox input', () => {
    const script = generateFieldFillScript('#agree', 'true', 'checkbox');
    expect(script).toContain('checkbox');
    expect(script).toContain('checked');
  });
});

// ---------------------------------------------------------------------------
// buildElementExistsScript
// ---------------------------------------------------------------------------
describe('buildElementExistsScript', () => {
  it('returns a selector check expression', () => {
    const script = buildElementExistsScript('#submit-btn');
    expect(script).toContain('#submit-btn');
    expect(script).toContain('!== null');
  });
});

// ---------------------------------------------------------------------------
// buildClickScript
// ---------------------------------------------------------------------------
describe('buildClickScript', () => {
  it('returns script that clicks the selected element', () => {
    const script = buildClickScript('.next-button');
    expect(script).toContain('.next-button');
    expect(script).toContain('.click()');
    expect(script).toContain('scrollIntoView');
  });
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
describe('script constants', () => {
  it('SCREENSHOT_SCRIPT contains canvas and video elements', () => {
    expect(SCREENSHOT_SCRIPT).toContain('canvas');
    expect(SCREENSHOT_SCRIPT).toContain('toDataURL');
  });

  it('PAGE_INFO_SCRIPT returns title, url, and ready state', () => {
    expect(PAGE_INFO_SCRIPT).toContain('document.title');
    expect(PAGE_INFO_SCRIPT).toContain('window.location.href');
    expect(PAGE_INFO_SCRIPT).toContain('readyState');
  });
});
