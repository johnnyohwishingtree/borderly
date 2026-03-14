/**
 * CAN.js — Canada eTA confirmation page detector
 *
 * Injected into the WebView after each page load. Checks whether the current
 * page is the Canada eTA approval/confirmation page and extracts the eTA number.
 *
 * Posts one of two messages back to the React Native layer:
 *   { type: 'QR_PAGE_CHECK',    isQRPage: false }
 *   { type: 'QR_PAGE_DETECTED', isQRPage: true,  qrImageBase64: string|null,
 *     pageUrl: string, countryCode: 'CAN', etaNumber: string|null }
 */
(function () {
  'use strict';

  // ── 1. Determine whether we are on the eTA confirmation page ────────────

  var isQRPage = false;

  // URL heuristics for Canada eTA confirmation/approval page
  try {
    var url = window.location.href.toLowerCase();
    if (
      url.indexOf('approved') >= 0 ||
      url.indexOf('confirmation') >= 0 ||
      url.indexOf('eta-number') >= 0 ||
      url.indexOf('result') >= 0 ||
      url.indexOf('complete') >= 0
    ) {
      isQRPage = true;
    }
  } catch (e) {}

  // DOM heuristics: presence of eTA approved indicator
  if (!isQRPage) {
    try {
      var approvedElement = document.querySelector(
        '.eta-approved, #confirmation-number, ' +
          '[id*="eta-number"], [class*="eta-approved"]'
      );
      if (approvedElement) {
        isQRPage = true;
      }
    } catch (e) {}
  }

  // Text heuristics: page mentions eTA approval
  if (!isQRPage) {
    try {
      var bodyText = (document.body && document.body.innerText
        ? document.body.innerText
        : ''
      ).toLowerCase();
      if (
        (bodyText.indexOf('eta') >= 0 || bodyText.indexOf('electronic travel') >= 0) &&
        (bodyText.indexOf('approved') >= 0 ||
          bodyText.indexOf('confirmation') >= 0 ||
          bodyText.indexOf('issued') >= 0)
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

  // ── 2. Attempt to extract eTA confirmation data ───────────────────────────

  var qrImageBase64 = null;
  var etaNumber = null;

  // Extract eTA number
  try {
    var etaElement = document.querySelector(
      '#eta-number, [id*="eta-number"], [class*="eta-number"], #confirmation-number'
    );
    if (etaElement) {
      etaNumber = etaElement.textContent.trim();
    }
  } catch (e) {}

  // Check for any QR code images
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

  if (!qrImageBase64) {
    try {
      var qrImgs = document.querySelectorAll(
        'img[alt*="QR" i], img[src*="qr" i], img[class*="qr" i]'
      );
      if (qrImgs.length > 0 && qrImgs[0].src) {
        qrImageBase64 = qrImgs[0].src;
      }
    } catch (e) {}
  }

  // ── 3. Report back to React Native ──────────────────────────────────────

  window.ReactNativeWebView.postMessage(
    JSON.stringify({
      type: 'QR_PAGE_DETECTED',
      isQRPage: true,
      qrImageBase64: qrImageBase64,
      pageUrl: window.location.href,
      countryCode: 'CAN',
      etaNumber: etaNumber,
    })
  );

  return true;
})();
