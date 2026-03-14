/**
 * THA.js — Thailand Pass QR code page detector
 *
 * Injected into the WebView after each page load. Checks whether the current
 * page is the Thailand Pass QR code result page and extracts the QR code.
 *
 * Posts one of two messages back to the React Native layer:
 *   { type: 'QR_PAGE_CHECK',    isQRPage: false }
 *   { type: 'QR_PAGE_DETECTED', isQRPage: true,  qrImageBase64: string|null,
 *     pageUrl: string, countryCode: 'THA', confirmationNumber: string|null }
 */
(function () {
  'use strict';

  // ── 1. Determine whether we are on the Thailand Pass QR page ────────────

  var isQRPage = false;

  // URL heuristics for Thailand Pass QR/confirmation page
  try {
    var url = window.location.href.toLowerCase();
    if (
      url.indexOf('qr') >= 0 ||
      url.indexOf('confirmation') >= 0 ||
      url.indexOf('complete') >= 0 ||
      url.indexOf('result') >= 0 ||
      url.indexOf('approved') >= 0
    ) {
      isQRPage = true;
    }
  } catch (e) {}

  // DOM heuristics: presence of QR code display element
  if (!isQRPage) {
    try {
      var qrElement = document.querySelector(
        '#qr-code-display, #qr-code, .qr-code, ' +
          'canvas, img[alt*="QR" i], img[src*="qr" i], ' +
          '[id*="qr" i], [class*="qr" i]'
      );
      if (qrElement) {
        isQRPage = true;
      }
    } catch (e) {}
  }

  // Text heuristics: page mentions QR code or Thailand Pass success
  if (!isQRPage) {
    try {
      var bodyText = (document.body && document.body.innerText
        ? document.body.innerText
        : ''
      ).toLowerCase();
      if (
        bodyText.indexOf('qr code') >= 0 &&
        (bodyText.indexOf('thailand pass') >= 0 ||
          bodyText.indexOf('approved') >= 0 ||
          bodyText.indexOf('successful') >= 0)
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

  // ── 2. Attempt to extract Thailand Pass QR code ──────────────────────────

  var qrImageBase64 = null;
  var confirmationNumber = null;

  // Strategy A: canvas element — dynamically rendered QR codes
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

  // Strategy B: QR code image in specific containers
  if (!qrImageBase64) {
    try {
      var qrImgs = document.querySelectorAll(
        '#qr-code img, .qr-code img, img[alt*="QR" i], img[src*="qr" i], img[class*="qr" i]'
      );
      if (qrImgs.length > 0 && qrImgs[0].src) {
        qrImageBase64 = qrImgs[0].src;
      }
    } catch (e) {}
  }

  // Strategy C: any roughly square image in the QR code range
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

  // Extract confirmation number
  try {
    var confirmElement = document.querySelector(
      '#confirmation-number, [id*="confirmation-number"], [class*="confirmation"]'
    );
    if (confirmElement) {
      confirmationNumber = confirmElement.textContent.trim();
    }
  } catch (e) {}

  // ── 3. Report back to React Native ──────────────────────────────────────

  window.ReactNativeWebView.postMessage(
    JSON.stringify({
      type: 'QR_PAGE_DETECTED',
      isQRPage: true,
      qrImageBase64: qrImageBase64,
      pageUrl: window.location.href,
      countryCode: 'THA',
      confirmationNumber: confirmationNumber,
    })
  );

  return true;
})();
