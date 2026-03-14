/**
 * SGP.js — Singapore SG Arrival Card confirmation page detector
 *
 * Injected into the WebView after each page load. Checks whether the current
 * page is the confirmation / completion page (step 7 of the SG Arrival Card
 * submission guide) and, if so, attempts to extract a confirmation image or
 * reference number.
 *
 * Posts one of two messages back to the React Native layer:
 *   { type: 'QR_PAGE_CHECK',    isQRPage: false }
 *   { type: 'QR_PAGE_DETECTED', isQRPage: true,  qrImageBase64: string|null,
 *     confirmationNumber: string|null, pageUrl: string, countryCode: 'SGP' }
 */
(function () {
  'use strict';

  // ── 1. Determine whether we are on the confirmation page ─────────────────

  var isQRPage = false;

  // URL heuristics for SG Arrival Card completion page.
  try {
    var url = window.location.href.toLowerCase();
    if (
      url.indexOf('success') >= 0 ||
      url.indexOf('complete') >= 0 ||
      url.indexOf('confirm') >= 0 ||
      url.indexOf('thank') >= 0 ||
      url.indexOf('receipt') >= 0 ||
      url.indexOf('acknowledgement') >= 0 ||
      url.indexOf('submission') >= 0
    ) {
      isQRPage = true;
    }
  } catch (e) {}

  // DOM heuristics: QR element or confirmation-related elements.
  if (!isQRPage) {
    try {
      var confirmEl = document.querySelector(
        'canvas, img[alt*="QR" i], img[src*="qr" i], ' +
          '[class*="qr" i], [id*="qr" i], .qr-code, #qr-code, ' +
          '[class*="confirmation" i], [id*="confirmation" i], ' +
          '[class*="acknowledgement" i], [id*="acknowledgement" i]'
      );
      if (confirmEl) {
        isQRPage = true;
      }
    } catch (e) {}
  }

  // Text heuristics: confirmation / acknowledgement language on the page.
  if (!isQRPage) {
    try {
      var bodyText = (document.body && document.body.innerText
        ? document.body.innerText
        : ''
      ).toLowerCase();
      if (
        (bodyText.indexOf('arrival card') >= 0 ||
          bodyText.indexOf('sg arrival') >= 0 ||
          bodyText.indexOf('immigration') >= 0) &&
        (bodyText.indexOf('success') >= 0 ||
          bodyText.indexOf('complete') >= 0 ||
          bodyText.indexOf('submitted') >= 0 ||
          bodyText.indexOf('acknowledged') >= 0 ||
          bodyText.indexOf('thank you') >= 0)
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

  // ── 2. Attempt to extract QR / confirmation image ────────────────────────

  var qrImageBase64 = null;

  // Strategy A: canvas element.
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
        'img[alt*="QR" i], img[src*="qr" i], img[class*="qr" i], img[id*="qr" i]'
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

  // ── 3. Try to extract a confirmation / acknowledgement number ────────────

  var confirmationNumber = null;
  try {
    var bodyHtml = document.body ? document.body.innerHTML : '';
    // Look for patterns like "Acknowledgement No: SG12345", "Ref: ABC" etc.
    var refMatch = bodyHtml.match(
      /(?:acknowledgement|reference|submission|ref(?:erence)?\s*(?:no|number|#)?)[:\s]+([A-Z0-9\-]{4,25})/i
    );
    if (refMatch) {
      confirmationNumber = refMatch[1].trim();
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
      countryCode: 'SGP',
    })
  );

  return true;
})();
