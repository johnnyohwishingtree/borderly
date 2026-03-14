/**
 * THA.js — Thailand Pass QR code / confirmation page detector
 *
 * Injected into the WebView after each page load. Checks whether the current
 * page is the Thailand Pass QR code result page and, if so, attempts to
 * extract the QR code image and confirmation number.
 *
 * Thailand Pass issues a QR code that travelers must show upon arrival.
 *
 * Posts one of two messages back to the React Native layer:
 *   { type: 'QR_PAGE_CHECK',    isQRPage: false }
 *   { type: 'QR_PAGE_DETECTED', isQRPage: true, qrImageBase64: string|null,
 *     confirmationNumber: string|null, pageUrl: string, countryCode: 'THA' }
 */
(function () {
  'use strict';

  // ── 1. Determine whether we are on the Thailand Pass QR / confirmation page

  let isQRPage = false;

  // URL heuristics for Thailand Pass completion page.
  try {
    const url = window.location.href.toLowerCase();
    if (
      url.indexOf('success') >= 0 ||
      url.indexOf('approved') >= 0 ||
      url.indexOf('qr') >= 0 ||
      url.indexOf('confirmation') >= 0 ||
      url.indexOf('complete') >= 0 ||
      url.indexOf('result') >= 0
    ) {
      isQRPage = true;
    }
  } catch (e) {
    console.error('[THA] URL check error:', e);
  }

  // DOM heuristics: QR code or confirmation elements.
  if (!isQRPage) {
    try {
      const qrElement = document.querySelector(
        '.confirmation-page, #qr-code-display, #qr-code, ' +
          'canvas, img[alt*="QR" i], img[src*="qr" i], ' +
          '[class*="qr" i], [id*="qr" i]'
      );
      if (qrElement) {
        isQRPage = true;
      }
    } catch (e) {
      console.error('[THA] DOM check error:', e);
    }
  }

  // Text heuristics: Thailand Pass approval language.
  if (!isQRPage) {
    try {
      const bodyText = (document.body && document.body.innerText
        ? document.body.innerText
        : ''
      ).toLowerCase();
      if (
        (bodyText.indexOf('thailand pass') >= 0 ||
          bodyText.indexOf('tp.consular') >= 0) &&
        (bodyText.indexOf('approved') >= 0 ||
          bodyText.indexOf('qr code') >= 0 ||
          bodyText.indexOf('confirmation') >= 0 ||
          bodyText.indexOf('success') >= 0)
      ) {
        isQRPage = true;
      }
    } catch (e) {
      console.error('[THA] Text check error:', e);
    }
  }

  if (!isQRPage) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: 'QR_PAGE_CHECK', isQRPage: false })
    );
    return true;
  }

  // ── 2. Attempt to extract QR code image (3-strategy approach) ────────────

  let qrImageBase64 = null;

  // Strategy A: canvas element (QR code rendered on canvas).
  try {
    const canvases = document.querySelectorAll('canvas');
    for (let i = 0; i < canvases.length; i++) {
      const c = canvases[i];
      if (c.width >= 50 && c.height >= 50) {
        qrImageBase64 = c.toDataURL('image/png');
        break;
      }
    }
  } catch (e) {
    console.error('[THA] Canvas QR extraction error:', e);
  }

  // Strategy B: QR-labelled image.
  if (!qrImageBase64) {
    try {
      const qrImgs = document.querySelectorAll(
        '#qr-code img, .qr-code img, img[alt*="QR" i], img[src*="qr" i], img[id*="qr" i]'
      );
      if (qrImgs.length > 0 && qrImgs[0].src) {
        qrImageBase64 = qrImgs[0].src;
      }
    } catch (e) {
      console.error('[THA] Image QR extraction error:', e);
    }
  }

  // Strategy C: any roughly square image in the 100-500 px range.
  if (!qrImageBase64) {
    try {
      const allImgs = document.querySelectorAll('img');
      for (let j = 0; j < allImgs.length; j++) {
        const img = allImgs[j];
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (w >= 100 && w <= 600 && Math.abs(w - h) < w * 0.1) {
          qrImageBase64 = img.src;
          break;
        }
      }
    } catch (e) {
      console.error('[THA] Square image QR extraction error:', e);
    }
  }

  // ── 3. Try to extract the confirmation number ─────────────────────────────

  let confirmationNumber = null;
  try {
    const selectors = [
      '#confirmation-number',
      '.confirmation-number',
      '[id*="confirmation"]',
      '[class*="confirmation-number"]',
    ];
    for (let k = 0; k < selectors.length; k++) {
      const el = document.querySelector(selectors[k]);
      if (el && el.textContent.trim()) {
        confirmationNumber = el.textContent.trim();
        break;
      }
    }

    if (!confirmationNumber) {
      const bodyHtml = document.body ? document.body.innerHTML : '';
      const refMatch = bodyHtml.match(
        /(?:confirmation|reference|pass)\s*(?:no|number|#)?[:\s]+([A-Z0-9\-]{6,20})/i
      );
      if (refMatch) {
        confirmationNumber = refMatch[1].trim();
      }
    }
  } catch (e) {
    console.error('[THA] Confirmation extraction error:', e);
  }

  // ── 4. Report back to React Native ──────────────────────────────────────

  window.ReactNativeWebView.postMessage(
    JSON.stringify({
      type: 'QR_PAGE_DETECTED',
      isQRPage: true,
      qrImageBase64: qrImageBase64,
      confirmationNumber: confirmationNumber,
      pageUrl: window.location.href,
      countryCode: 'THA',
    })
  );

  return true;
})();
