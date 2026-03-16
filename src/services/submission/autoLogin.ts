/**
 * Auto-login script builder for government portal WebViews.
 *
 * Generates JavaScript strings that are injected into a WebView (via
 * `injectJavaScript`) to:
 *   1. Detect whether the current page has a login form.
 *   2. Fill username + password and submit the form.
 *   3. Check whether login succeeded (optional success-indicator polling).
 *
 * All scripts communicate back to React Native via
 *   `ReactNativeWebView.postMessage(JSON.stringify({ type, ... }))`
 *
 * This follows the same pattern as the auto-fill scripts so that the
 * `WebViewController` message handler can process both flows uniformly.
 *
 * NOTE: This module intentionally contains no React Native imports so that
 * it can be unit-tested with plain Jest (no native modules required).
 */

import type { LoginSelectors } from '@/types/submission';

// ---------------------------------------------------------------------------
// Message types
// ---------------------------------------------------------------------------

export type AutoLoginResultPayload = {
  type: 'AUTO_LOGIN_RESULT';
  success: boolean;
  error?: string;
};

/**
 * Alias for AutoLoginResultPayload — kept for backwards compatibility with
 * code that was written against the initial `AutoLoginResult` name.
 */
export type AutoLoginResult = AutoLoginResultPayload;

export type LoginDetectionResultPayload = {
  type: 'LOGIN_DETECTION_RESULT';
  hasLoginForm: boolean;
  usernameSelector: string | null;
  passwordSelector: string | null;
  submitSelector: string | null;
};

export type LoginSuccessCheckPayload = {
  type: 'LOGIN_SUCCESS_CHECK_RESULT';
  isLoggedIn: boolean;
  /** The indicator selector that was found, or null */
  foundSelector: string | null;
};

// ---------------------------------------------------------------------------
// Native setter helper (shared snippet)
// ---------------------------------------------------------------------------

/**
 * Returns a JavaScript snippet that sets an input's value in a way that is
 * compatible with React-controlled inputs (i.e. React SPAs like VJW).
 *
 * React overrides the native `value` setter on input elements and tracks state
 * internally, so a plain `element.value = "..."` assignment does NOT trigger a
 * React re-render.  The workaround is to obtain the original native setter from
 * `Object.getOwnPropertyDescriptor` and call it directly, then dispatch
 * synthetic `input` and `change` events so that React's event handler fires.
 */
const NATIVE_SETTER_SNIPPET = `
function setNativeValue(el, value) {
  var nativeSetter = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(el), 'value'
  );
  if (nativeSetter && nativeSetter.set) {
    nativeSetter.set.call(el, value);
  } else {
    el.value = value;
  }
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}
`.trim();

// ---------------------------------------------------------------------------
// Default selectors (used when no explicit LoginSelectors are provided)
// ---------------------------------------------------------------------------

const DEFAULT_USERNAME_SELECTORS = [
  'input[type="email"]',
  'input[name="email"]',
  'input[name="username"]',
  'input[name="login"]',
  'input[id*="email"]',
  'input[id*="user"]',
  'input[autocomplete="email"]',
  'input[autocomplete="username"]',
];

const DEFAULT_PASSWORD_SELECTORS = [
  'input[type="password"]',
  'input[name="password"]',
  'input[id*="password"]',
  'input[autocomplete="current-password"]',
];

const DEFAULT_SUBMIT_SELECTORS = [
  'button[type="submit"]',
  'input[type="submit"]',
];

// ---------------------------------------------------------------------------
// Script builders
// ---------------------------------------------------------------------------

/**
 * Builds a JavaScript string that fills and submits a portal login form.
 *
 * When `selectors` are provided (country-specific LoginSelectors), the script
 * uses those CSS selectors directly — enabling precise targeting of portal
 * fields.  When omitted, the script falls back to trying a list of common
 * selectors heuristically, which maintains backwards compatibility with callers
 * that were written before country-specific selectors were added.
 *
 * The script:
 * 1. Locates the username and password fields.
 * 2. Sets their values using the React-compatible native setter.
 * 3. Clicks the submit button.
 * 4. Posts `AUTO_LOGIN_RESULT` back via `ReactNativeWebView.postMessage`.
 *
 * @param username  - The credential username / email to inject.
 * @param password  - The credential password to inject.
 * @param selectors - Optional CSS selectors for username, password, and submit.
 *                    When omitted, common heuristic selectors are tried.
 */
export function buildLoginScript(
  username: string,
  password: string,
  selectors?: LoginSelectors,
): string {
  if (selectors) {
    // Country-specific path: use explicit selectors with React-native setter
    const safeUsername = username.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const safePassword = password.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const safeUsernameSelector = selectors.username.replace(/'/g, "\\'");
    const safePasswordSelector = selectors.password.replace(/'/g, "\\'");
    const safeSubmitSelector = selectors.submit.replace(/'/g, "\\'");

    return `
(function() {
  ${NATIVE_SETTER_SNIPPET}

  try {
    var usernameEl = document.querySelector('${safeUsernameSelector}');
    if (!usernameEl) {
      ReactNativeWebView.postMessage(JSON.stringify({
        type: 'AUTO_LOGIN_RESULT',
        success: false,
        error: 'Username field not found: ${safeUsernameSelector}'
      }));
      return;
    }

    var passwordEl = document.querySelector('${safePasswordSelector}');
    if (!passwordEl) {
      ReactNativeWebView.postMessage(JSON.stringify({
        type: 'AUTO_LOGIN_RESULT',
        success: false,
        error: 'Password field not found: ${safePasswordSelector}'
      }));
      return;
    }

    var submitEl = document.querySelector('${safeSubmitSelector}');
    if (!submitEl) {
      ReactNativeWebView.postMessage(JSON.stringify({
        type: 'AUTO_LOGIN_RESULT',
        success: false,
        error: 'Submit button not found: ${safeSubmitSelector}'
      }));
      return;
    }

    // Fill credentials using the React-compatible native setter.
    setNativeValue(usernameEl, '${safeUsername}');
    setNativeValue(passwordEl, '${safePassword}');

    // Small delay to allow React state to stabilise before submitting.
    setTimeout(function() {
      submitEl.click();
      ReactNativeWebView.postMessage(JSON.stringify({
        type: 'AUTO_LOGIN_RESULT',
        success: true
      }));
    }, 300);
  } catch (err) {
    ReactNativeWebView.postMessage(JSON.stringify({
      type: 'AUTO_LOGIN_RESULT',
      success: false,
      error: String(err)
    }));
  }
})();
`.trim();
  }

  // Heuristic path (no explicit selectors): try common selector lists.
  // JSON.stringify ensures values are safely embedded in the script
  // (handles quotes, backslashes, special chars, etc.)
  const escapedUsername = JSON.stringify(username);
  const escapedPassword = JSON.stringify(password);

  const userSelectorsJson = JSON.stringify(DEFAULT_USERNAME_SELECTORS);
  const passSelectorsJson = JSON.stringify(DEFAULT_PASSWORD_SELECTORS);
  const submitSelectorsJson = JSON.stringify(DEFAULT_SUBMIT_SELECTORS);

  return (
    '(function(){' +
    'var userSelectors=' + userSelectorsJson + ';' +
    'var passSelectors=' + passSelectorsJson + ';' +
    'var submitSelectors=' + submitSelectorsJson + ';' +

    'function findField(selectors){' +
      'for(var i=0;i<selectors.length;i++){' +
        'var el=document.querySelector(selectors[i]);' +
        'if(el)return el;' +
      '}' +
      'return null;' +
    '}' +

    'function findSubmitBtn(container){' +
      'for(var i=0;i<submitSelectors.length;i++){' +
        'var el=container.querySelector(submitSelectors[i]);' +
        'if(el)return el;' +
      '}' +
      'return null;' +
    '}' +

    'function fillInput(el,val){' +
      'var desc=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value");' +
      'if(desc&&desc.set){desc.set.call(el,val);}else{el.value=val;}' +
      'el.dispatchEvent(new Event("input",{bubbles:true}));' +
      'el.dispatchEvent(new Event("change",{bubbles:true}));' +
    '}' +

    'var userEl=findField(userSelectors);' +
    'var passEl=findField(passSelectors);' +

    'if(!userEl||!passEl){' +
      'window.ReactNativeWebView.postMessage(JSON.stringify({' +
        'type:"AUTO_LOGIN_RESULT",' +
        'success:false,' +
        'error:"Login fields not found"' +
      '}));' +
    '}else{' +
      'fillInput(userEl,' + escapedUsername + ');' +
      'fillInput(passEl,' + escapedPassword + ');' +

      'var loginForm=passEl.closest("form");' +
      'if(loginForm){' +
        'var formBtn=findSubmitBtn(loginForm);' +
        'if(formBtn){formBtn.click();}else{loginForm.submit();}' +
      '}else{' +
        'var pageBtn=findSubmitBtn(document);' +
        'if(pageBtn){pageBtn.click();}' +
      '}' +

      'window.ReactNativeWebView.postMessage(JSON.stringify({' +
        'type:"AUTO_LOGIN_RESULT",' +
        'success:true' +
      '}));' +
    '}' +
    'true;' +
    '})();'
  );
}

/**
 * Builds a JavaScript string that inspects the current page for a login form
 * and posts a `LOGIN_DETECTION_RESULT` message with the best-guess selectors.
 *
 * This script runs the same heuristic detection logic as `loginDetector.ts`
 * but inside the WebView context, so it can use `document.querySelector`
 * for accurate DOM-level detection rather than string scanning.
 */
export function buildLoginDetectionScript(): string {
  return `
(function() {
  var usernameCandidates = [
    'input[type="email"]',
    'input[name*="email"]',
    'input[name*="username"]',
    'input[name*="user"]',
    'input[id*="email"]',
    'input[id*="username"]',
    'input[id*="user"]',
    'input[autocomplete="email"]',
    'input[autocomplete="username"]',
    'input[name="email"]',
    'input[type="text"]'
  ];

  var passwordCandidates = [
    'input[type="password"]',
    'input[name*="password"]',
    'input[id*="password"]',
    'input[autocomplete="current-password"]',
    'input[autocomplete="new-password"]'
  ];

  var submitCandidates = [
    'button[type="submit"]',
    'input[type="submit"]',
    'button[id*="login"]',
    'button[id*="signin"]',
    'button[id*="submit"]',
    'button[name*="login"]',
    'button[name*="signin"]',
    'a[id*="login"]',
    'form button',
    'button'
  ];

  function firstMatch(candidates) {
    for (var i = 0; i < candidates.length; i++) {
      try {
        var el = document.querySelector(candidates[i]);
        if (el) return candidates[i];
      } catch (e) { /* skip invalid selector */ }
    }
    return null;
  }

  var passwordSelector = firstMatch(passwordCandidates);
  var usernameSelector = passwordSelector !== null ? firstMatch(usernameCandidates) : null;
  // Mirror loginDetector.ts: hasLoginForm requires BOTH a password field AND a username field.
  var hasLoginForm = passwordSelector !== null && usernameSelector !== null;
  var submitSelector = hasLoginForm ? firstMatch(submitCandidates) : null;

  ReactNativeWebView.postMessage(JSON.stringify({
    type: 'LOGIN_DETECTION_RESULT',
    hasLoginForm: hasLoginForm,
    usernameSelector: usernameSelector,
    passwordSelector: passwordSelector,
    submitSelector: submitSelector
  }));
})();
`.trim();
}

/**
 * Builds a JavaScript string that polls for a DOM element that only appears
 * after a successful login (e.g. a user-menu, dashboard heading, or session
 * token).
 *
 * Posts a `LOGIN_SUCCESS_CHECK_RESULT` message once the indicator is found OR
 * the timeout is reached.
 *
 * @param successIndicator - CSS selector to watch for.
 * @param timeoutMs        - How long to poll before giving up (default 10 s).
 * @param intervalMs       - Polling interval in ms (default 500 ms).
 */
export function buildLoginSuccessCheckScript(
  successIndicator: string,
  timeoutMs = 10_000,
  intervalMs = 500,
): string {
  const safeSelector = successIndicator.replace(/'/g, "\\'");

  return `
(function() {
  var selector = '${safeSelector}';
  var deadline = Date.now() + ${timeoutMs};
  var interval = ${intervalMs};

  var timer = setInterval(function() {
    try {
      var el = document.querySelector(selector);
      if (el) {
        clearInterval(timer);
        ReactNativeWebView.postMessage(JSON.stringify({
          type: 'LOGIN_SUCCESS_CHECK_RESULT',
          isLoggedIn: true,
          foundSelector: selector
        }));
        return;
      }
    } catch (e) { /* ignore invalid selector */ }

    if (Date.now() >= deadline) {
      clearInterval(timer);
      ReactNativeWebView.postMessage(JSON.stringify({
        type: 'LOGIN_SUCCESS_CHECK_RESULT',
        isLoggedIn: false,
        foundSelector: null
      }));
    }
  }, interval);
})();
`.trim();
}
