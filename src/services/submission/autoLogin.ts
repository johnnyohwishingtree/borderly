/**
 * Auto-login service for PortalSubmissionScreen.
 *
 * Builds a JavaScript snippet that fills and submits a portal login form
 * using stored credentials. Designed to be injected into a WebView.
 *
 * Design goals:
 * - Tries multiple common selectors for username/email and password fields.
 * - Reports outcome via window.ReactNativeWebView.postMessage so the
 *   React Native layer can update its UI.
 * - The screen enforces a max-1-attempt-per-page-load rule to prevent
 *   infinite retry loops.
 */

/**
 * Message posted back to React Native after the injected login script runs.
 * Received via the WebView `onMessage` handler.
 */
export interface AutoLoginResult {
  type: 'AUTO_LOGIN_RESULT';
  success: boolean;
  /** Human-readable error message when success is false. */
  error?: string;
}

/**
 * Builds a JavaScript snippet that fills and submits a portal login form.
 *
 * The snippet:
 * 1. Finds the username/email and password fields using common selectors.
 * 2. Fills them using a native React-aware value setter to trigger
 *    controlled-input change events.
 * 3. Clicks the submit button, or calls form.submit() as a fallback.
 * 4. Posts an AUTO_LOGIN_RESULT message back to React Native.
 *
 * @param username - The username or email to fill.
 * @param password - The password to fill.
 * @returns A JavaScript string safe to pass to WebView.injectJavaScript.
 */
export function buildLoginScript(username: string, password: string): string {
  // JSON.stringify ensures values are safely embedded in the script
  // (handles quotes, backslashes, special chars, etc.)
  const escapedUsername = JSON.stringify(username);
  const escapedPassword = JSON.stringify(password);

  // Selector lists serialised at call-time to avoid any inline quoting issues
  const userSelectorsJson = JSON.stringify([
    'input[type="email"]',
    'input[name="email"]',
    'input[name="username"]',
    'input[name="login"]',
    'input[id*="email"]',
    'input[id*="user"]',
    'input[autocomplete="email"]',
    'input[autocomplete="username"]',
  ]);

  const passSelectorsJson = JSON.stringify([
    'input[type="password"]',
    'input[name="password"]',
    'input[id*="password"]',
    'input[autocomplete="current-password"]',
  ]);

  const submitSelectorsJson = JSON.stringify([
    'button[type="submit"]',
    'input[type="submit"]',
  ]);

  return (
    '(function(){' +
    'var userSelectors=' + userSelectorsJson + ';' +
    'var passSelectors=' + passSelectorsJson + ';' +
    'var submitSelectors=' + submitSelectorsJson + ';' +

    // Find the first element matching any selector in the list
    'function findField(selectors){' +
      'for(var i=0;i<selectors.length;i++){' +
        'var el=document.querySelector(selectors[i]);' +
        'if(el)return el;' +
      '}' +
      'return null;' +
    '}' +

    // Find a submit button within a form, or on the page
    'function findSubmitBtn(container){' +
      'for(var i=0;i<submitSelectors.length;i++){' +
        'var el=container.querySelector(submitSelectors[i]);' +
        'if(el)return el;' +
      '}' +
      'return null;' +
    '}' +

    // Fill an input using the native React value setter so controlled
    // inputs (React state) pick up the change
    'function fillInput(el,val){' +
      'var desc=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value");' +
      'if(desc&&desc.set){desc.set.call(el,val);}else{el.value=val;}' +
      'el.dispatchEvent(new Event("input",{bubbles:true}));' +
      'el.dispatchEvent(new Event("change",{bubbles:true}));' +
    '}' +

    'var userEl=findField(userSelectors);' +
    'var passEl=findField(passSelectors);' +

    // If either field is not found, report failure and exit
    'if(!userEl||!passEl){' +
      'window.ReactNativeWebView.postMessage(JSON.stringify({' +
        'type:"AUTO_LOGIN_RESULT",' +
        'success:false,' +
        'error:"Login fields not found"' +
      '}));' +
    '}else{' +
      'fillInput(userEl,' + escapedUsername + ');' +
      'fillInput(passEl,' + escapedPassword + ');' +

      // Submit: prefer a submit button inside the form, then page-level button,
      // finally fall back to form.submit()
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
