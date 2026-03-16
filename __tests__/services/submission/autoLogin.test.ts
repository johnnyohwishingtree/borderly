/**
 * Tests for autoLogin.ts
 *
 * Covers:
 *  - buildLoginScript(): generates valid JS, uses native setter, handles edge cases
 *  - buildLoginDetectionScript(): generates valid detection JS
 *  - buildLoginSuccessCheckScript(): generates valid polling JS
 */

import {
  buildLoginScript,
  buildLoginDetectionScript,
  buildLoginSuccessCheckScript,
} from '../../../src/services/submission/autoLogin';
import type { LoginSelectors } from '../../../src/types/submission';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_SELECTORS: LoginSelectors = {
  username: 'input[type="email"]',
  password: 'input[type="password"]',
  submit: 'button[type="submit"]',
  successIndicator: '.dashboard',
};

const VJW_SELECTORS: LoginSelectors = {
  username: 'input[type="email"], input[name="email"], input[id="email"]',
  password: 'input[type="password"], input[name="password"], input[id="password"]',
  submit: 'button[type="submit"], input[type="submit"], button[id*="login"]',
  successIndicator: '.user-info, .logged-in, [data-user]',
};

const CBP_SELECTORS: LoginSelectors = {
  username: 'input[name="username"], input[id="username"]',
  password: 'input[type="password"], input[name="password"]',
  submit: 'button[type="submit"], button[id*="sign-in"]',
};

// ---------------------------------------------------------------------------
// buildLoginScript()
// ---------------------------------------------------------------------------

describe('buildLoginScript', () => {
  it('returns a non-empty string', () => {
    const script = buildLoginScript('user@example.com', 'secret', BASE_SELECTORS);
    expect(typeof script).toBe('string');
    expect(script.length).toBeGreaterThan(0);
  });

  it('wraps in an IIFE', () => {
    const script = buildLoginScript('user@example.com', 'secret', BASE_SELECTORS);
    expect(script).toMatch(/^\(function\(\)/);
    expect(script).toMatch(/\}\)\(\);?$/);
  });

  it('uses the native setter pattern for React SPA compatibility', () => {
    const script = buildLoginScript('user@example.com', 'secret', BASE_SELECTORS);
    expect(script).toContain('Object.getOwnPropertyDescriptor');
    expect(script).toContain('nativeSetter.set.call');
  });

  it('dispatches input and change events', () => {
    const script = buildLoginScript('user@example.com', 'secret', BASE_SELECTORS);
    expect(script).toContain("new Event('input'");
    expect(script).toContain("new Event('change'");
  });

  it('posts AUTO_LOGIN_RESULT on success', () => {
    const script = buildLoginScript('user@example.com', 'secret', BASE_SELECTORS);
    expect(script).toContain('AUTO_LOGIN_RESULT');
    expect(script).toContain('ReactNativeWebView.postMessage');
  });

  it('posts AUTO_LOGIN_RESULT with success:false when username field not found', () => {
    const script = buildLoginScript('user@example.com', 'secret', BASE_SELECTORS);
    expect(script).toContain("'AUTO_LOGIN_RESULT'");
    expect(script).toContain('success: false');
    expect(script).toContain('Username field not found');
  });

  it('posts AUTO_LOGIN_RESULT with success:false when password field not found', () => {
    const script = buildLoginScript('user@example.com', 'secret', BASE_SELECTORS);
    expect(script).toContain('Password field not found');
  });

  it('posts AUTO_LOGIN_RESULT with success:false when submit button not found', () => {
    const script = buildLoginScript('user@example.com', 'secret', BASE_SELECTORS);
    expect(script).toContain('Submit button not found');
  });

  it('includes the username selector from LoginSelectors', () => {
    const script = buildLoginScript('user@example.com', 'secret', BASE_SELECTORS);
    expect(script).toContain('input[type="email"]');
  });

  it('includes the password selector from LoginSelectors', () => {
    const script = buildLoginScript('user@example.com', 'secret', BASE_SELECTORS);
    expect(script).toContain('input[type="password"]');
  });

  it('includes the submit selector from LoginSelectors', () => {
    const script = buildLoginScript('user@example.com', 'secret', BASE_SELECTORS);
    expect(script).toContain('button[type="submit"]');
  });

  it('calls submitEl.click()', () => {
    const script = buildLoginScript('user@example.com', 'secret', BASE_SELECTORS);
    expect(script).toContain('submitEl.click()');
  });

  it('works with VJW compound selectors', () => {
    const script = buildLoginScript('traveler@example.com', 'p@ssword', VJW_SELECTORS);
    expect(script).toContain('AUTO_LOGIN_RESULT');
    expect(script).not.toContain('undefined');
  });

  it('works with CBP One selectors (no successIndicator)', () => {
    const script = buildLoginScript('john.doe', 'cbpSecret', CBP_SELECTORS);
    expect(script).toContain('AUTO_LOGIN_RESULT');
  });

  describe('credential escaping', () => {
    it('escapes single quotes in username', () => {
      const script = buildLoginScript("o'brien@example.com", 'secret', BASE_SELECTORS);
      // Should not break the JS string literal
      expect(script).toContain("\\'");
      expect(script).not.toMatch(/setNativeValue\(usernameEl, 'o'brien/);
    });

    it('escapes single quotes in password', () => {
      const script = buildLoginScript('user@example.com', "it's a secret", BASE_SELECTORS);
      expect(script).toContain("\\'");
    });

    it('escapes backslashes in credentials', () => {
      const script = buildLoginScript('user@example.com', 'pass\\word', BASE_SELECTORS);
      expect(script).toContain('\\\\');
    });
  });
});

// ---------------------------------------------------------------------------
// buildLoginDetectionScript()
// ---------------------------------------------------------------------------

describe('buildLoginDetectionScript', () => {
  it('returns a non-empty string', () => {
    const script = buildLoginDetectionScript();
    expect(typeof script).toBe('string');
    expect(script.length).toBeGreaterThan(0);
  });

  it('wraps in an IIFE', () => {
    const script = buildLoginDetectionScript();
    expect(script).toMatch(/^\(function\(\)/);
    expect(script).toMatch(/\}\)\(\);?$/);
  });

  it('posts LOGIN_DETECTION_RESULT', () => {
    const script = buildLoginDetectionScript();
    expect(script).toContain('LOGIN_DETECTION_RESULT');
    expect(script).toContain('ReactNativeWebView.postMessage');
  });

  it('includes hasLoginForm field in the message', () => {
    const script = buildLoginDetectionScript();
    expect(script).toContain('hasLoginForm');
  });

  it('includes usernameSelector field in the message', () => {
    const script = buildLoginDetectionScript();
    expect(script).toContain('usernameSelector');
  });

  it('includes passwordSelector field in the message', () => {
    const script = buildLoginDetectionScript();
    expect(script).toContain('passwordSelector');
  });

  it('includes submitSelector field in the message', () => {
    const script = buildLoginDetectionScript();
    expect(script).toContain('submitSelector');
  });

  it('checks for password field candidates', () => {
    const script = buildLoginDetectionScript();
    expect(script).toContain('input[type="password"]');
  });

  it('checks for email-type username fields', () => {
    const script = buildLoginDetectionScript();
    expect(script).toContain('input[type="email"]');
  });

  it('uses document.querySelector for DOM-level detection', () => {
    const script = buildLoginDetectionScript();
    expect(script).toContain('document.querySelector');
  });

  it('handles try/catch around querySelector calls (invalid selectors)', () => {
    const script = buildLoginDetectionScript();
    expect(script).toContain('try {');
    expect(script).toContain('} catch (e)');
  });
});

// ---------------------------------------------------------------------------
// buildLoginSuccessCheckScript()
// ---------------------------------------------------------------------------

describe('buildLoginSuccessCheckScript', () => {
  it('returns a non-empty string', () => {
    const script = buildLoginSuccessCheckScript('.dashboard');
    expect(typeof script).toBe('string');
    expect(script.length).toBeGreaterThan(0);
  });

  it('wraps in an IIFE', () => {
    const script = buildLoginSuccessCheckScript('.dashboard');
    expect(script).toMatch(/^\(function\(\)/);
    expect(script).toMatch(/\}\)\(\);?$/);
  });

  it('posts LOGIN_SUCCESS_CHECK_RESULT', () => {
    const script = buildLoginSuccessCheckScript('.dashboard');
    expect(script).toContain('LOGIN_SUCCESS_CHECK_RESULT');
    expect(script).toContain('ReactNativeWebView.postMessage');
  });

  it('includes isLoggedIn:true when indicator is found', () => {
    const script = buildLoginSuccessCheckScript('.dashboard');
    expect(script).toContain('isLoggedIn: true');
  });

  it('includes isLoggedIn:false when timeout expires', () => {
    const script = buildLoginSuccessCheckScript('.dashboard');
    expect(script).toContain('isLoggedIn: false');
  });

  it('includes foundSelector in the result', () => {
    const script = buildLoginSuccessCheckScript('.dashboard');
    expect(script).toContain('foundSelector');
  });

  it('uses setInterval for polling', () => {
    const script = buildLoginSuccessCheckScript('.dashboard');
    expect(script).toContain('setInterval');
    expect(script).toContain('clearInterval');
  });

  it('embeds the successIndicator selector in the script', () => {
    const script = buildLoginSuccessCheckScript('.user-info, .logged-in');
    expect(script).toContain('.user-info, .logged-in');
  });

  it('uses the custom timeout when provided', () => {
    const script = buildLoginSuccessCheckScript('.dashboard', 15000, 1000);
    expect(script).toContain('15000');
    expect(script).toContain('1000');
  });

  it('uses default timeout (10000ms) when not provided', () => {
    const script = buildLoginSuccessCheckScript('.dashboard');
    expect(script).toContain('10000');
  });

  it('uses default interval (500ms) when not provided', () => {
    const script = buildLoginSuccessCheckScript('.dashboard');
    expect(script).toContain('500');
  });

  it('escapes single quotes in successIndicator', () => {
    // This shouldn't happen in practice, but we should handle it gracefully
    const script = buildLoginSuccessCheckScript("[data-value='user']");
    expect(script).toContain("\\'");
  });

  it('uses document.querySelector to check for the indicator', () => {
    const script = buildLoginSuccessCheckScript('.dashboard');
    expect(script).toContain('document.querySelector(selector)');
  });
});

// ---------------------------------------------------------------------------
// Integration: script structure consistency with AUTO_FILL_RESULT pattern
// ---------------------------------------------------------------------------

describe('message type consistency', () => {
  it('AUTO_LOGIN_RESULT follows the same pattern as AUTO_FILL_RESULT', () => {
    const loginScript = buildLoginScript('u', 'p', BASE_SELECTORS);
    // Both should use ReactNativeWebView.postMessage with a JSON.stringify call
    expect(loginScript).toContain('ReactNativeWebView.postMessage(JSON.stringify(');
    expect(loginScript).toContain('type: \'AUTO_LOGIN_RESULT\'');
  });

  it('LOGIN_DETECTION_RESULT uses same messaging pattern', () => {
    const detectionScript = buildLoginDetectionScript();
    expect(detectionScript).toContain('ReactNativeWebView.postMessage(JSON.stringify(');
    expect(detectionScript).toContain('type: \'LOGIN_DETECTION_RESULT\'');
  });

  it('LOGIN_SUCCESS_CHECK_RESULT uses same messaging pattern', () => {
    const checkScript = buildLoginSuccessCheckScript('.dashboard');
    expect(checkScript).toContain('ReactNativeWebView.postMessage(JSON.stringify(');
    expect(checkScript).toContain('type: \'LOGIN_SUCCESS_CHECK_RESULT\'');
  });
});
