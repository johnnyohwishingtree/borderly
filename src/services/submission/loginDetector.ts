/**
 * Login form detector for government portal WebViews.
 *
 * Analyses raw HTML to determine whether the current page is a login page and,
 * if so, returns the CSS selectors most likely to address the username field,
 * password field, and submit button.
 *
 * Detection is intentionally heuristic — government portals vary widely in their
 * HTML structure, so we try a ranked list of common patterns and return the first
 * match.  Country-specific `loginSelectors` defined in the mapping files always
 * take precedence over the generic detector (see `autoLogin.ts`).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LoginFormInfo {
  /** True when the current page appears to contain a login form. */
  hasLoginForm: boolean;
  /** Best CSS selector for the username / email field, or null. */
  usernameSelector: string | null;
  /** Best CSS selector for the password field, or null. */
  passwordSelector: string | null;
  /** Best CSS selector for the submit button, or null. */
  submitSelector: string | null;
}

// ---------------------------------------------------------------------------
// Candidate selector lists (ordered from most specific to most generic)
// ---------------------------------------------------------------------------

/** Candidate selectors for the username / email input. */
const USERNAME_CANDIDATES: string[] = [
  // Explicit type="email"
  'input[type="email"]',
  // Common name attributes that carry "email" or "user"
  'input[name*="email"]',
  'input[name*="username"]',
  'input[name*="user"]',
  // Common id attributes
  'input[id*="email"]',
  'input[id*="username"]',
  'input[id*="user"]',
  // Autocomplete hint
  'input[autocomplete="email"]',
  'input[autocomplete="username"]',
  // GOV.UK One Login pattern
  'input[name="email"]',
  // Generic text fallback — only considered when password field is present
  'input[type="text"]',
];

/** Candidate selectors for the password input. */
const PASSWORD_CANDIDATES: string[] = [
  'input[type="password"]',
  'input[name*="password"]',
  'input[id*="password"]',
  'input[autocomplete="current-password"]',
  'input[autocomplete="new-password"]',
];

/** Candidate selectors for the submit / login button. */
const SUBMIT_CANDIDATES: string[] = [
  // Typed submit button inside a form
  'button[type="submit"]',
  'input[type="submit"]',
  // Buttons with login-related text or ids
  'button[id*="login"]',
  'button[id*="signin"]',
  'button[id*="submit"]',
  'button[name*="login"]',
  'button[name*="signin"]',
  // Anchor styled as button (some gov portals)
  'a[id*="login"]',
  // Generic last-resort button (inside a form element)
  'form button',
  'button',
];

// ---------------------------------------------------------------------------
// HTML presence check helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if any of the provided CSS selectors appear to have a matching
 * element in the raw HTML string.  This is a lightweight textual heuristic —
 * it does NOT parse the HTML into a DOM.  We look for attribute patterns that
 * would be present in the serialised HTML.
 *
 * The check strips the leading `input[`, `button[`, etc. wrapper and tests for
 * the attribute fragment directly, which is sufficient for detecting whether an
 * element with that attribute exists somewhere in the HTML.
 */
function selectorPresentInHtml(html: string, selector: string): boolean {
  const lower = html.toLowerCase();

  // Split compound selectors (comma-separated) and test each part.
  const parts = selector.split(',').map((s) => s.trim());
  return parts.some((part) => attributeFragmentInHtml(lower, part));
}

/**
 * Extracts the key attribute fragment from a CSS selector and checks whether
 * it exists as a substring in the HTML.
 *
 * e.g. `input[type="email"]`  → checks for `type="email"` or `type='email'`
 *      `input[name*="user"]`  → checks for `name=` containing "user"
 *      `button[type="submit"]`→ checks for `type="submit"`
 *      `form button`          → checks for `<button` inside a `<form`
 */
function attributeFragmentInHtml(lowerHtml: string, selector: string): boolean {
  // Handle tag-only selectors like "button", "form button"
  const tagOnlyMatch = /^(?:[\w-]+ +)?([\w-]+)$/.exec(selector);
  if (tagOnlyMatch) {
    const tag = tagOnlyMatch[1].toLowerCase();
    return lowerHtml.includes(`<${tag}`);
  }

  // Extract [attr…] part from selector
  const attrMatch = /\[([^\]]+)\]/.exec(selector);
  if (!attrMatch) {
    // Fallback: check for a CSS class
    const classMatch = /\.([^ ]+)/.exec(selector);
    if (classMatch) {
      return lowerHtml.includes(`class="${classMatch[1].toLowerCase()}"`) ||
        lowerHtml.includes(classMatch[1].toLowerCase());
    }
    return false;
  }

  const attrExpr = attrMatch[1]; // e.g. `type="email"` or `name*="user"`

  if (attrExpr.includes('*=')) {
    // Substring match: name*="user" → look for name="...user..." or name='...user...'
    // Use a regex to avoid false positives where the value appears as text outside
    // the attribute (e.g. '<p>username</p>' matching selector input[name*="user"]).
    const [attrName, attrValue] = attrExpr.split('*=');
    const val = attrValue.replace(/['"]/g, '').toLowerCase();
    const name = attrName.toLowerCase();
    const regex = new RegExp(`${name}\\s*=\\s*["'][^"']*${val}[^"']*["']`);
    return regex.test(lowerHtml);
  }

  if (attrExpr.includes('=')) {
    // Exact match: type="email" → look for type="email" or type='email'
    const [attrName, attrValue] = attrExpr.split('=');
    const val = attrValue.replace(/['"]/g, '').toLowerCase();
    const name = attrName.toLowerCase();
    return (
      lowerHtml.includes(`${name}="${val}"`) ||
      lowerHtml.includes(`${name}='${val}'`) ||
      // Some portals omit quotes: type=password
      lowerHtml.includes(`${name}=${val}`)
    );
  }

  // Attribute presence: [type] → look for type=
  return lowerHtml.includes(`${attrExpr.toLowerCase()}=`);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detects login form elements in the provided HTML string.
 *
 * Returns a `LoginFormInfo` describing the best candidate selectors for the
 * username, password, and submit elements.  `hasLoginForm` is `true` only when
 * both a username/email field AND a password field are detected.
 *
 * @param html - Raw HTML string of the current WebView page.
 */
export function detectLoginForm(html: string): LoginFormInfo {
  // Must have a password field for this to be a login form.
  const passwordSelector = PASSWORD_CANDIDATES.find((sel) =>
    selectorPresentInHtml(html, sel),
  ) ?? null;

  if (!passwordSelector) {
    return {
      hasLoginForm: false,
      usernameSelector: null,
      passwordSelector: null,
      submitSelector: null,
    };
  }

  // Find username selector (exclude the generic text fallback unless nothing
  // more specific matched).
  const specificUsernameCandidates = USERNAME_CANDIDATES.filter(
    (s) => s !== 'input[type="text"]',
  );
  let usernameSelector =
    specificUsernameCandidates.find((sel) => selectorPresentInHtml(html, sel)) ?? null;

  // Fall back to generic text input only if no specific match was found and
  // a password field is present (strong signal that this is a login form).
  if (!usernameSelector && selectorPresentInHtml(html, 'input[type="text"]')) {
    usernameSelector = 'input[type="text"]';
  }

  const submitSelector =
    SUBMIT_CANDIDATES.find((sel) => selectorPresentInHtml(html, sel)) ?? null;

  return {
    hasLoginForm: usernameSelector !== null,
    usernameSelector,
    passwordSelector,
    submitSelector,
  };
}

/**
 * Returns true when the provided HTML appears to be a 2FA / OTP prompt rather
 * than a standard username+password login form.
 *
 * This is used to fall back to manual mode when automated login cannot proceed.
 */
export function is2FAPrompt(html: string): boolean {
  const lower = html.toLowerCase();
  const twoFaKeywords = [
    'two-factor',
    'two factor',
    '2-factor',
    '2fa',
    'one-time',
    'otp',
    'verification code',
    'authenticator',
    'sms code',
    'text message code',
    'enter the code',
    'enter code',
    'security code',
    'backup code',
  ];
  return twoFaKeywords.some((kw) => lower.includes(kw));
}

/**
 * Returns true when the provided HTML appears to show a login error
 * (invalid credentials, account locked, etc.).
 */
export function isLoginError(html: string): boolean {
  const lower = html.toLowerCase();
  const errorKeywords = [
    'invalid password',
    'incorrect password',
    'wrong password',
    'invalid email',
    'invalid username',
    'account not found',
    'login failed',
    'sign in failed',
    'authentication failed',
    'too many attempts',
    'account locked',
    'account disabled',
  ];
  return errorKeywords.some((kw) => lower.includes(kw));
}
