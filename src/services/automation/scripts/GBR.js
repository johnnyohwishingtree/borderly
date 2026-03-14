/**
 * GBR.js — UK ETA (Electronic Travel Authorisation) confirmation page detector
 *
 * Injected into the WebView after each page load. Checks whether the current
 * page is the GOV.UK ETA approval page and, if so, extracts the application reference.
 *
 * Uses GOV.UK design system patterns (govuk-* CSS classes).
 *
 * Posts one of two messages back to the React Native layer:
 *   { type: 'QR_PAGE_CHECK',    isQRPage: false }
 *   { type: 'QR_PAGE_DETECTED', isQRPage: true, confirmationNumber: string|null,
 *     pageUrl: string, countryCode: 'GBR' }
 */
(function () {
  'use strict';

  // ── 1. Determine whether we are on the ETA approval page ─────────────────

  var isQRPage = false;

  // URL heuristics for GOV.UK ETA confirmation page.
  try {
    var url = window.location.href.toLowerCase();
    if (
      url.indexOf('confirmation') >= 0 ||
      url.indexOf('approved') >= 0 ||
      url.indexOf('complete') >= 0 ||
      url.indexOf('success') >= 0 ||
      url.indexOf('application-complete') >= 0 ||
      url.indexOf('eta-approved') >= 0
    ) {
      isQRPage = true;
    }
  } catch (e) {}

  // DOM heuristics: GOV.UK design system confirmation panel.
  if (!isQRPage) {
    try {
      var approvalEl = document.querySelector(
        '.govuk-panel--confirmation, .application-complete, #eta-approval, ' +
          '[class*="confirmation-panel"], [class*="application-complete"]'
      );
      if (approvalEl) {
        isQRPage = true;
      }
    } catch (e) {}
  }

  // Text heuristics: ETA approval language.
  if (!isQRPage) {
    try {
      var bodyText = (document.body && document.body.innerText
        ? document.body.innerText
        : ''
      ).toLowerCase();
      if (
        (bodyText.indexOf('eta') >= 0 ||
          bodyText.indexOf('electronic travel authorisation') >= 0 ||
          bodyText.indexOf('gov.uk') >= 0) &&
        (bodyText.indexOf('approved') >= 0 ||
          bodyText.indexOf('application complete') >= 0 ||
          bodyText.indexOf('reference number') >= 0 ||
          bodyText.indexOf('eta number') >= 0)
      ) {
        isQRPage = true;
      }
    } catch (e) {}
  }

  if (!isQRPage) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: 'QR_PAGE_CHECK', isQRPage: false })
    );
    return true;
  }

  // ── 2. Try to extract the application reference / ETA number ─────────────

  var confirmationNumber = null;
  try {
    // Try GOV.UK design system selectors first.
    var selectors = [
      '#application-reference',
      '#eta-number',
      '.govuk-panel__body',
      '[class*="reference"]',
      '[id*="reference"]',
    ];
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el && el.textContent.trim()) {
        confirmationNumber = el.textContent.trim();
        break;
      }
    }

    if (!confirmationNumber) {
      // Regex fallback in page HTML.
      var bodyHtml = document.body ? document.body.innerHTML : '';
      var refMatch = bodyHtml.match(
        /(?:reference|eta|application)\s*(?:no|number|#)?[:\s]+([A-Z0-9\-]{6,20})/i
      );
      if (refMatch) {
        confirmationNumber = refMatch[1].trim();
      }
    }
  } catch (e) {}

  // ── 3. Report back to React Native ──────────────────────────────────────

  window.ReactNativeWebView.postMessage(
    JSON.stringify({
      type: 'QR_PAGE_DETECTED',
      isQRPage: true,
      qrImageBase64: null, // UK ETA does not issue QR codes
      confirmationNumber: confirmationNumber,
      pageUrl: window.location.href,
      countryCode: 'GBR',
    })
  );

  return true;
})();
