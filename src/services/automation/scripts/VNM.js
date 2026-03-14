/**
 * VNM.js — Vietnam e-Visa success/download page detector
 *
 * Injected into the WebView after each page load. Checks whether the current
 * page is the Vietnam e-Visa success page where the e-Visa can be downloaded,
 * and if so, extracts the application reference number.
 *
 * Posts one of two messages back to the React Native layer:
 *   { type: 'QR_PAGE_CHECK',    isQRPage: false }
 *   { type: 'QR_PAGE_DETECTED', isQRPage: true, confirmationNumber: string|null,
 *     pageUrl: string, countryCode: 'VNM' }
 */
(function () {
  'use strict';

  // ── 1. Determine whether we are on the e-Visa success/download page ───────

  let isQRPage = false;

  // URL heuristics for Vietnam e-Visa completion page.
  try {
    const url = window.location.href.toLowerCase();
    if (
      url.indexOf('success') >= 0 ||
      url.indexOf('download') >= 0 ||
      url.indexOf('complete') >= 0 ||
      url.indexOf('approved') >= 0 ||
      url.indexOf('result') >= 0 ||
      url.indexOf('evisa-download') >= 0
    ) {
      isQRPage = true;
    }
  } catch (e) {
    console.error('[VNM] URL check error:', e);
  }

  // DOM heuristics: e-Visa success or download elements.
  if (!isQRPage) {
    try {
      const successEl = document.querySelector(
        '.application-success, #download-evisa, [id*="evisa-download"], ' +
          '[class*="application-success"], [id*="download"]'
      );
      if (successEl) {
        isQRPage = true;
      }
    } catch (e) {
      console.error('[VNM] DOM check error:', e);
    }
  }

  // Text heuristics: Vietnam e-Visa success language.
  if (!isQRPage) {
    try {
      const bodyText = (document.body && document.body.innerText
        ? document.body.innerText
        : ''
      ).toLowerCase();
      if (
        (bodyText.indexOf('e-visa') >= 0 ||
          bodyText.indexOf('evisa') >= 0 ||
          bodyText.indexOf('viet nam') >= 0 ||
          bodyText.indexOf('vietnam') >= 0) &&
        (bodyText.indexOf('approved') >= 0 ||
          bodyText.indexOf('download') >= 0 ||
          bodyText.indexOf('success') >= 0 ||
          bodyText.indexOf('application number') >= 0 ||
          bodyText.indexOf('reference number') >= 0)
      ) {
        isQRPage = true;
      }
    } catch (e) {
      console.error('[VNM] Text check error:', e);
    }
  }

  if (!isQRPage) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: 'QR_PAGE_CHECK', isQRPage: false })
    );
    return true;
  }

  // ── 2. Try to extract the application reference number ───────────────────

  let confirmationNumber = null;
  try {
    // Try specific selectors first.
    const selectors = [
      '#application-reference',
      '[id*="application-reference"]',
      '[class*="reference-number"]',
      '[id*="reference"]',
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
        /(?:application|reference|e-?visa)\s*(?:no|number|#)?[:\s]+([A-Z0-9\-]{6,20})/i
      );
      if (refMatch) {
        confirmationNumber = refMatch[1].trim();
      }
    }
  } catch (e) {
    console.error('[VNM] Confirmation extraction error:', e);
  }

  // ── 3. Try to extract e-Visa download link ────────────────────────────────

  let eVisaLink = null;
  try {
    const downloadEl = document.querySelector('#evisa-download-link, a[href*="evisa"], a[href*="download"]');
    if (downloadEl && downloadEl.href) {
      eVisaLink = downloadEl.href;
    }
  } catch (e) {
    console.error('[VNM] Download link extraction error:', e);
  }

  // ── 4. Report back to React Native ──────────────────────────────────────

  window.ReactNativeWebView.postMessage(
    JSON.stringify({
      type: 'QR_PAGE_DETECTED',
      isQRPage: true,
      qrImageBase64: null, // Vietnam e-Visa is a PDF document, not a QR code
      confirmationNumber: confirmationNumber,
      eVisaLink: eVisaLink,
      pageUrl: window.location.href,
      countryCode: 'VNM',
    })
  );

  return true;
})();
