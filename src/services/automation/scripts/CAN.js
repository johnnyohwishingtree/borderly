/**
 * CAN.js — Canada eTA confirmation page detector
 *
 * Injected into the WebView after each page load. Checks whether the current
 * page is the Canada eTA confirmation page and, if so, extracts the eTA number.
 *
 * Posts one of two messages back to the React Native layer:
 *   { type: 'QR_PAGE_CHECK',    isQRPage: false }
 *   { type: 'QR_PAGE_DETECTED', isQRPage: true, confirmationNumber: string|null,
 *     pageUrl: string, countryCode: 'CAN' }
 */
(function () {
  'use strict';

  // ── 1. Determine whether we are on the eTA confirmation page ─────────────

  let isQRPage = false;

  // URL heuristics for Canada eTA confirmation page.
  try {
    const url = window.location.href.toLowerCase();
    if (
      url.indexOf('confirmation') >= 0 ||
      url.indexOf('approved') >= 0 ||
      url.indexOf('success') >= 0 ||
      url.indexOf('complete') >= 0 ||
      url.indexOf('eta-number') >= 0 ||
      url.indexOf('result') >= 0
    ) {
      isQRPage = true;
    }
  } catch (e) {
    console.error('[CAN] URL check error:', e);
  }

  // DOM heuristics: eTA approval / confirmation elements.
  if (!isQRPage) {
    try {
      const approvalEl = document.querySelector(
        '.eta-approved, #confirmation-number, [class*="eta-approved"], ' +
          '[id*="eta-number"], [class*="confirmation"], .application-approved'
      );
      if (approvalEl) {
        isQRPage = true;
      }
    } catch (e) {
      console.error('[CAN] DOM check error:', e);
    }
  }

  // Text heuristics: eTA success language.
  if (!isQRPage) {
    try {
      const bodyText = (document.body && document.body.innerText
        ? document.body.innerText
        : ''
      ).toLowerCase();
      if (
        (bodyText.indexOf('eta') >= 0 ||
          bodyText.indexOf('electronic travel') >= 0 ||
          bodyText.indexOf('canada.ca') >= 0) &&
        (bodyText.indexOf('approved') >= 0 ||
          bodyText.indexOf('confirmation') >= 0 ||
          bodyText.indexOf('eta number') >= 0 ||
          bodyText.indexOf('application number') >= 0)
      ) {
        isQRPage = true;
      }
    } catch (e) {
      console.error('[CAN] Text check error:', e);
    }
  }

  if (!isQRPage) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: 'QR_PAGE_CHECK', isQRPage: false })
    );
    return true;
  }

  // ── 2. Try to extract the eTA / confirmation number ──────────────────────

  let confirmationNumber = null;
  try {
    // Try specific selectors first.
    const selectors = [
      '#eta-number',
      '#confirmation-number',
      '[id*="eta-number"]',
      '[id*="confirmation"]',
      '.eta-number',
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
        /(?:eta|application|confirmation)\s*(?:no|number|#)?[:\s]+([A-Z0-9\-]{6,20})/i
      );
      if (refMatch) {
        confirmationNumber = refMatch[1].trim();
      }
    }
  } catch (e) {
    console.error('[CAN] Confirmation extraction error:', e);
  }

  // ── 3. Report back to React Native ──────────────────────────────────────

  window.ReactNativeWebView.postMessage(
    JSON.stringify({
      type: 'QR_PAGE_DETECTED',
      isQRPage: true,
      qrImageBase64: null, // Canada eTA does not issue QR codes
      confirmationNumber: confirmationNumber,
      pageUrl: window.location.href,
      countryCode: 'CAN',
    })
  );

  return true;
})();
