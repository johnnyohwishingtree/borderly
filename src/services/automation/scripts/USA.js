/**
 * USA.js — ESTA (Electronic System for Travel Authorization) confirmation page detector
 *
 * Injected into the WebView after each page load. Checks whether the current
 * page is the ESTA authorization result page and, if so, attempts to extract
 * the application/authorization number.
 *
 * Posts one of two messages back to the React Native layer:
 *   { type: 'QR_PAGE_CHECK',    isQRPage: false }
 *   { type: 'QR_PAGE_DETECTED', isQRPage: true, confirmationNumber: string|null,
 *     pageUrl: string, countryCode: 'USA' }
 */
(function () {
  'use strict';

  // ── 1. Determine whether we are on the ESTA authorization page ───────────

  let isQRPage = false;

  // URL heuristics for ESTA completion page.
  try {
    const url = window.location.href.toLowerCase();
    if (
      url.indexOf('authorization') >= 0 ||
      url.indexOf('approved') >= 0 ||
      url.indexOf('status') >= 0 ||
      url.indexOf('confirmation') >= 0 ||
      url.indexOf('result') >= 0
    ) {
      isQRPage = true;
    }
  } catch (e) {
    console.error('[USA] URL check error:', e);
  }

  // DOM heuristics: authorization approval elements.
  if (!isQRPage) {
    try {
      const approvalEl = document.querySelector(
        '.authorization-approved, #esta-approval, .esta-status-approved, ' +
          '[class*="approved"], [id*="approval"]'
      );
      if (approvalEl) {
        isQRPage = true;
      }
    } catch (e) {
      console.error('[USA] DOM check error:', e);
    }
  }

  // Text heuristics: authorization / approval language.
  if (!isQRPage) {
    try {
      const bodyText = (document.body && document.body.innerText
        ? document.body.innerText
        : ''
      ).toLowerCase();
      if (
        (bodyText.indexOf('esta') >= 0 ||
          bodyText.indexOf('electronic system') >= 0 ||
          bodyText.indexOf('travel authorization') >= 0) &&
        (bodyText.indexOf('authorization approved') >= 0 ||
          bodyText.indexOf('authorization granted') >= 0 ||
          bodyText.indexOf('application number') >= 0 ||
          bodyText.indexOf('confirmation number') >= 0)
      ) {
        isQRPage = true;
      }
    } catch (e) {
      console.error('[USA] Text check error:', e);
    }
  }

  if (!isQRPage) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: 'QR_PAGE_CHECK', isQRPage: false })
    );
    return true;
  }

  // ── 2. Try to extract the application / authorization number ────────────

  let confirmationNumber = null;
  try {
    // Try specific selectors first.
    const selectors = [
      '#application-number',
      '#authorization-number',
      '[id*="application"][id*="number"]',
      '[class*="application"][class*="number"]',
      '[id*="confirmation"]',
    ];
    for (let i = 0; i < selectors.length; i++) {
      const el = document.querySelector(selectors[i]);
      if (el && el.textContent.trim()) {
        confirmationNumber = el.textContent.trim();
        break;
      }
    }

    if (!confirmationNumber) {
      // Regex fallback in page HTML.
      const bodyHtml = document.body ? document.body.innerHTML : '';
      const refMatch = bodyHtml.match(
        /(?:application|authorization|confirmation)\s*(?:no|number|#)?[:\s]+([A-Z0-9\-]{6,20})/i
      );
      if (refMatch) {
        confirmationNumber = refMatch[1].trim();
      }
    }
  } catch (e) {
    console.error('[USA] Confirmation extraction error:', e);
  }

  // ── 3. Report back to React Native ──────────────────────────────────────

  window.ReactNativeWebView.postMessage(
    JSON.stringify({
      type: 'QR_PAGE_DETECTED',
      isQRPage: true,
      qrImageBase64: null, // ESTA does not issue QR codes
      confirmationNumber: confirmationNumber,
      pageUrl: window.location.href,
      countryCode: 'USA',
    })
  );

  return true;
})();
