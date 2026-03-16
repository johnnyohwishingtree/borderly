/**
 * Tests for loginDetector.ts
 *
 * Covers:
 *  - detectLoginForm() against realistic VJW, CBP One, and GOV.UK ETA HTML snippets
 *  - detectLoginForm() edge cases: no form, multiple forms, 2FA prompt
 *  - is2FAPrompt() keyword detection
 *  - isLoginError() keyword detection
 */

import {
  detectLoginForm,
  is2FAPrompt,
  isLoginError,
} from '../../../src/services/submission/loginDetector';

// ---------------------------------------------------------------------------
// Realistic HTML fixtures
// ---------------------------------------------------------------------------

/** Visit Japan Web — simplified login page HTML. */
const VJW_LOGIN_HTML = `
<!DOCTYPE html>
<html>
  <head><title>Visit Japan Web - Login</title></head>
  <body>
    <div class="login-container">
      <h1>Sign in to Visit Japan Web</h1>
      <form action="/login" method="post">
        <label for="email">Email address</label>
        <input type="email" id="email" name="email" autocomplete="email" />
        <label for="password">Password</label>
        <input type="password" id="password" name="password" autocomplete="current-password" />
        <button type="submit" id="login-btn">Sign in</button>
      </form>
    </div>
  </body>
</html>`;

/** CBP One — simplified login page HTML (username-style login). */
const CBP_LOGIN_HTML = `
<!DOCTYPE html>
<html>
  <head><title>CBP One - Sign In</title></head>
  <body>
    <div id="app">
      <form>
        <input type="text" name="username" id="username" placeholder="Username" autocomplete="username" />
        <input type="password" name="password" id="password" placeholder="Password" />
        <button type="submit" id="sign-in-btn">Sign In</button>
      </form>
    </div>
  </body>
</html>`;

/** GOV.UK One Login — simplified login page HTML (GOV.UK design system). */
const GOVUK_LOGIN_HTML = `
<!DOCTYPE html>
<html lang="en" class="govuk-template">
  <head><title>Sign in - GOV.UK One Login</title></head>
  <body class="govuk-template__body">
    <main>
      <form action="/enter-email" method="post">
        <div class="govuk-form-group">
          <label class="govuk-label" for="email">Email address</label>
          <input class="govuk-input" id="email" name="email" type="email" autocomplete="email" />
        </div>
        <div class="govuk-form-group">
          <label class="govuk-label" for="password">Password</label>
          <input class="govuk-input" id="password" name="password" type="password" autocomplete="current-password" />
        </div>
        <button type="submit" class="govuk-button">Continue</button>
      </form>
    </main>
  </body>
</html>`;

/** Page with no login form (dashboard / landing page). */
const NO_LOGIN_HTML = `
<!DOCTYPE html>
<html>
  <head><title>Visit Japan Web - Dashboard</title></head>
  <body>
    <nav class="user-info">
      <span>Welcome, Traveler</span>
    </nav>
    <main>
      <h1>Your Registrations</h1>
      <p>You have no pending registrations.</p>
    </main>
  </body>
</html>`;

/** Page with a search form but no password field — should NOT be detected as login. */
const SEARCH_FORM_HTML = `
<!DOCTYPE html>
<html>
  <head><title>Search</title></head>
  <body>
    <form action="/search">
      <input type="text" name="q" placeholder="Search..." />
      <button type="submit">Search</button>
    </form>
  </body>
</html>`;

/** Page with ONLY a username field but no password (step 1 of two-step login). */
const USERNAME_ONLY_HTML = `
<!DOCTYPE html>
<html>
  <head><title>Enter your email</title></head>
  <body>
    <form>
      <input type="email" name="email" />
      <button type="submit">Continue</button>
    </form>
  </body>
</html>`;

/** 2FA / OTP page that follows a successful first factor. */
const TWO_FA_HTML = `
<!DOCTYPE html>
<html>
  <head><title>Two-factor authentication</title></head>
  <body>
    <h1>Two-factor authentication</h1>
    <p>Enter the 6-digit verification code from your authenticator app.</p>
    <form>
      <input type="text" name="otp" maxlength="6" placeholder="Enter code" />
      <button type="submit">Verify</button>
    </form>
  </body>
</html>`;

/** A page with multiple forms (nav search + login). */
const MULTI_FORM_HTML = `
<!DOCTYPE html>
<html>
  <head><title>Portal</title></head>
  <body>
    <header>
      <form id="site-search" role="search">
        <input type="text" name="q" />
        <button type="submit">Search</button>
      </form>
    </header>
    <main>
      <form id="login-form">
        <input type="email" name="email" />
        <input type="password" name="password" />
        <button type="submit">Sign in</button>
      </form>
    </main>
  </body>
</html>`;

/** Login error response page. */
const LOGIN_ERROR_HTML = `
<!DOCTYPE html>
<html>
  <head><title>Sign In Error</title></head>
  <body>
    <div class="error-message">Invalid password. Please try again.</div>
    <form>
      <input type="email" name="email" value="user@example.com" />
      <input type="password" name="password" />
      <button type="submit">Sign in</button>
    </form>
  </body>
</html>`;

/** Account locked page. */
const ACCOUNT_LOCKED_HTML = `
<!DOCTYPE html>
<html>
  <head><title>Account Locked</title></head>
  <body>
    <div class="alert">Your account is locked due to too many attempts.</div>
  </body>
</html>`;

// ---------------------------------------------------------------------------
// detectLoginForm()
// ---------------------------------------------------------------------------

describe('detectLoginForm', () => {
  describe('Visit Japan Web login page', () => {
    it('detects a login form', () => {
      const result = detectLoginForm(VJW_LOGIN_HTML);
      expect(result.hasLoginForm).toBe(true);
    });

    it('returns a username selector', () => {
      const result = detectLoginForm(VJW_LOGIN_HTML);
      expect(result.usernameSelector).not.toBeNull();
    });

    it('returns a password selector', () => {
      const result = detectLoginForm(VJW_LOGIN_HTML);
      expect(result.passwordSelector).not.toBeNull();
    });

    it('returns a submit selector', () => {
      const result = detectLoginForm(VJW_LOGIN_HTML);
      expect(result.submitSelector).not.toBeNull();
    });

    it('prefers type="email" for username', () => {
      const result = detectLoginForm(VJW_LOGIN_HTML);
      expect(result.usernameSelector).toBe('input[type="email"]');
    });

    it('prefers type="password" for password', () => {
      const result = detectLoginForm(VJW_LOGIN_HTML);
      expect(result.passwordSelector).toBe('input[type="password"]');
    });
  });

  describe('CBP One login page (username-style)', () => {
    it('detects a login form', () => {
      const result = detectLoginForm(CBP_LOGIN_HTML);
      expect(result.hasLoginForm).toBe(true);
    });

    it('finds a username-style selector', () => {
      const result = detectLoginForm(CBP_LOGIN_HTML);
      // Should match name*="username" or id*="username"
      expect(result.usernameSelector).not.toBeNull();
    });

    it('finds a password selector', () => {
      const result = detectLoginForm(CBP_LOGIN_HTML);
      expect(result.passwordSelector).toBe('input[type="password"]');
    });

    it('finds a submit selector', () => {
      const result = detectLoginForm(CBP_LOGIN_HTML);
      expect(result.submitSelector).not.toBeNull();
    });
  });

  describe('GOV.UK One Login page', () => {
    it('detects a login form', () => {
      const result = detectLoginForm(GOVUK_LOGIN_HTML);
      expect(result.hasLoginForm).toBe(true);
    });

    it('finds an email-type username selector', () => {
      const result = detectLoginForm(GOVUK_LOGIN_HTML);
      expect(result.usernameSelector).toBe('input[type="email"]');
    });

    it('finds a password selector', () => {
      const result = detectLoginForm(GOVUK_LOGIN_HTML);
      expect(result.passwordSelector).toBe('input[type="password"]');
    });

    it('finds a submit selector', () => {
      const result = detectLoginForm(GOVUK_LOGIN_HTML);
      expect(result.submitSelector).not.toBeNull();
    });
  });

  describe('edge cases', () => {
    it('returns hasLoginForm=false for a page with no forms', () => {
      const result = detectLoginForm(NO_LOGIN_HTML);
      expect(result.hasLoginForm).toBe(false);
      expect(result.usernameSelector).toBeNull();
      expect(result.passwordSelector).toBeNull();
      expect(result.submitSelector).toBeNull();
    });

    it('returns hasLoginForm=false for a search form with no password field', () => {
      const result = detectLoginForm(SEARCH_FORM_HTML);
      expect(result.hasLoginForm).toBe(false);
    });

    it('returns hasLoginForm=false when only a username field is present', () => {
      const result = detectLoginForm(USERNAME_ONLY_HTML);
      expect(result.hasLoginForm).toBe(false);
    });

    it('correctly handles a page with multiple forms (search + login)', () => {
      const result = detectLoginForm(MULTI_FORM_HTML);
      expect(result.hasLoginForm).toBe(true);
      expect(result.passwordSelector).not.toBeNull();
    });

    it('detects a login form on a login-error page (form still present)', () => {
      const result = detectLoginForm(LOGIN_ERROR_HTML);
      expect(result.hasLoginForm).toBe(true);
    });

    it('returns hasLoginForm=false for empty HTML', () => {
      const result = detectLoginForm('');
      expect(result.hasLoginForm).toBe(false);
    });

    it('handles case-insensitive HTML attributes', () => {
      const html = `<INPUT TYPE="PASSWORD" NAME="pass">`;
      const result = detectLoginForm(html);
      expect(result.hasLoginForm).toBe(false); // No username selector → hasLoginForm stays false?
      // Actually, password is found → hasLoginForm depends on username too
      // This page has ONLY a password field, so username won't be found, hasLoginForm = false
      expect(result.passwordSelector).not.toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// is2FAPrompt()
// ---------------------------------------------------------------------------

describe('is2FAPrompt', () => {
  it('returns true for a two-factor authentication page', () => {
    expect(is2FAPrompt(TWO_FA_HTML)).toBe(true);
  });

  it('returns true for HTML containing "2fa"', () => {
    expect(is2FAPrompt('<p>Please complete 2FA to continue.</p>')).toBe(true);
  });

  it('returns true for "one-time" keyword', () => {
    expect(is2FAPrompt('<p>Enter your one-time password.</p>')).toBe(true);
  });

  it('returns true for "otp" keyword', () => {
    expect(is2FAPrompt('<input name="otp" />')).toBe(true);
  });

  it('returns true for "verification code"', () => {
    expect(is2FAPrompt('<p>Enter the verification code sent to your phone.</p>')).toBe(true);
  });

  it('returns true for "security code"', () => {
    expect(is2FAPrompt('<p>Enter your security code.</p>')).toBe(true);
  });

  it('returns false for a normal login page', () => {
    expect(is2FAPrompt(VJW_LOGIN_HTML)).toBe(false);
  });

  it('returns false for a dashboard page', () => {
    expect(is2FAPrompt(NO_LOGIN_HTML)).toBe(false);
  });

  it('returns false for empty HTML', () => {
    expect(is2FAPrompt('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isLoginError()
// ---------------------------------------------------------------------------

describe('isLoginError', () => {
  it('returns true for "Invalid password" error', () => {
    expect(isLoginError(LOGIN_ERROR_HTML)).toBe(true);
  });

  it('returns true for "incorrect password"', () => {
    expect(isLoginError('<div>Incorrect password.</div>')).toBe(true);
  });

  it('returns true for "account locked"', () => {
    expect(isLoginError(ACCOUNT_LOCKED_HTML)).toBe(true);
  });

  it('returns true for "too many attempts"', () => {
    expect(isLoginError('<p>Too many attempts. Try again later.</p>')).toBe(true);
  });

  it('returns true for "login failed"', () => {
    expect(isLoginError('<span>Login failed. Please check your credentials.</span>')).toBe(true);
  });

  it('returns true for "authentication failed"', () => {
    expect(isLoginError('<p>Authentication failed.</p>')).toBe(true);
  });

  it('returns false for a normal login page', () => {
    expect(isLoginError(VJW_LOGIN_HTML)).toBe(false);
  });

  it('returns false for a dashboard page', () => {
    expect(isLoginError(NO_LOGIN_HTML)).toBe(false);
  });

  it('returns false for empty HTML', () => {
    expect(isLoginError('')).toBe(false);
  });
});
