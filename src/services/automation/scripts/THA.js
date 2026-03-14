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

  var isQRPage = false;

  // URL heuristics for Thailand Pass completion page.
  try {
    var url = window.location.href.toLowerCase();
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
  } catch (e) {}

  // DOM heuristics: QR code or confirmation elements.
  if (!isQRPage) {
    try {
      var qrElement = document.querySelector(
        '.confirmation-page, #qr-code-display, #qr-code, ' +
          'canvas, img[alt*="QR" i], img[src*="qr" i], ' +
          '[class*="qr" i], [id*="qr" i]'
      );
      if (qrElement) {
        isQRPage = true;
      }
    } catch (e) {}
  }

  // Text heuristics: Thailand Pass approval language.
  if (!isQRPage) {
    try {
      var bodyText = (document.body && document.body.innerText
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
    } catch (e) {}
  }

  if (!isQRPage) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: 'QR_PAGE_CHECK', isQRPage: false })
    );
    return true;
  }

  // ── 2. Attempt to extract QR code image (3-strategy approach) ────────────

  var qrImageBase64 = null;

  // Strategy A: canvas element (QR code rendered on canvas).
  try {
    var canvases = document.querySelectorAll('canvas');
    for (var i = 0; i < canvases.length; i++) {
      var c = canvases[i];
      if (c.width >= 50 && c.height >= 50) {
        qrImageBase64 = c.toDataURL('image/png');
        break;
      }
    }
  } catch (e) {}

  // Strategy B: QR-labelled image.
  if (!qrImageBase64) {
    try {
      var qrImgs = document.querySelectorAll(
        '#qr-code img, .qr-code img, img[alt*="QR" i], img[src*="qr" i], img[id*="qr" i]'
      );
      if (qrImgs.length > 0 && qrImgs[0].src) {
        qrImageBase64 = qrImgs[0].src;
      }
    } catch (e) {}
  }

  // Strategy C: any roughly square image in the 100-500 px range.
  if (!qrImageBase64) {
    try {
      var allImgs = document.querySelectorAll('img');
      for (var j = 0; j < allImgs.length; j++) {
        var img = allImgs[j];
        var w = img.naturalWidth || img.width;
        var h = img.naturalHeight || img.height;
        if (w >= 100 && w <= 600 && Math.abs(w - h) < w * 0.1) {
          qrImageBase64 = img.src;
          break;
        }
      }
    } catch (e) {}
  }

  // ── 3. Try to extract the confirmation number ─────────────────────────────

  var confirmationNumber = null;
  try {
    var selectors = [
      '#confirmation-number',
      '.confirmation-number',
      '[id*="confirmation"]',
      '[class*="confirmation-number"]',
    ];
    for (var k = 0; k < selectors.length; k++) {
      var el = document.querySelector(selectors[k]);
      if (el && el.textContent.trim()) {
        confirmationNumber = el.textContent.trim();
        break;
      }
    }

    if (!confirmationNumber) {
      var bodyHtml = document.body ? document.body.innerHTML : '';
      var refMatch = bodyHtml.match(
        /(?:confirmation|reference|pass)\s*(?:no|number|#)?[:\s]+([A-Z0-9\-]{6,20})/i
      );
      if (refMatch) {
        confirmationNumber = refMatch[1].trim();
      }
    }
  } catch (e) {}

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
