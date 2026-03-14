/**
 * JPN.js — Visit Japan Web QR page detector
 *
 * Injected into the WebView after each page load. Checks whether the current
 * page is the QR code result page (step 6 of the Visit Japan Web submission
 * guide) and, if so, attempts to extract the QR code image as a base64 string.
 *
 * Posts one of two messages back to the React Native layer:
 *   { type: 'QR_PAGE_CHECK',    isQRPage: false }
 *   { type: 'QR_PAGE_DETECTED', isQRPage: true,  qrImageBase64: string|null,
 *     pageUrl: string, countryCode: 'JPN' }
 */
(function () {
  'use strict';

  // ── 1. Determine whether we are on the QR code result page ──────────────

  var isQRPage = false;

  // URL heuristics for the Visit Japan Web completion / QR code page.
  try {
    var url = window.location.href.toLowerCase();
    if (
      url.indexOf('complete') >= 0 ||
      url.indexOf('result') >= 0 ||
      url.indexOf('qr') >= 0 ||
      url.indexOf('finish') >= 0 ||
      url.indexOf('receipt') >= 0
    ) {
      isQRPage = true;
    }
  } catch (e) {}

  // DOM heuristics: presence of a canvas or QR-labelled image.
  if (!isQRPage) {
    try {
      var qrElement = document.querySelector(
        'canvas, img[alt*="QR" i], img[src*="qr" i], ' +
          '[class*="qr" i], [id*="qr" i], .qr-code, #qr-code'
      );
      if (qrElement) {
        isQRPage = true;
      }
    } catch (e) {}
  }

  // Text heuristics: page body mentions QR code alongside success language.
  if (!isQRPage) {
    try {
      var bodyText = (document.body && document.body.innerText
        ? document.body.innerText
        : ''
      ).toLowerCase();
      if (
        bodyText.indexOf('qr code') >= 0 &&
        (bodyText.indexOf('generated') >= 0 ||
          bodyText.indexOf('complete') >= 0 ||
          bodyText.indexOf('success') >= 0 ||
          bodyText.indexOf('registration complete') >= 0)
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

  // ── 2. Attempt to extract the QR code image ──────────────────────────────

  var qrImageBase64 = null;

  // Strategy A: canvas element — most reliable for dynamically rendered QR codes.
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

  // Strategy B: <img> with explicit QR-related attributes.
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

  // ── 3. Report back to React Native ──────────────────────────────────────

  window.ReactNativeWebView.postMessage(
    JSON.stringify({
      type: 'QR_PAGE_DETECTED',
      isQRPage: true,
      qrImageBase64: qrImageBase64,
      pageUrl: window.location.href,
      countryCode: 'JPN',
    })
  );

  return true;
})();
