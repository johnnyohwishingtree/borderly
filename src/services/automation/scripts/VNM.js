/**
 * VNM.js — Vietnam e-Visa confirmation page detector
 *
 * Injected into the WebView after each page load. Checks whether the current
 * page is the Vietnam e-Visa confirmation/download page and extracts the
 * application reference number.
 *
 * Posts one of two messages back to the React Native layer:
 *   { type: 'QR_PAGE_CHECK',    isQRPage: false }
 *   { type: 'QR_PAGE_DETECTED', isQRPage: true,  qrImageBase64: string|null,
 *     pageUrl: string, countryCode: 'VNM', applicationNumber: string|null }
 */
(function () {
  'use strict';

  // ── 1. Determine whether we are on the Vietnam e-Visa result page ────────

  var isQRPage = false;

  // URL heuristics for Vietnam e-Visa confirmation/success page
  try {
    var url = window.location.href.toLowerCase();
    if (
      url.indexOf('success') >= 0 ||
      url.indexOf('confirmation') >= 0 ||
      url.indexOf('result') >= 0 ||
      url.indexOf('complete') >= 0 ||
      url.indexOf('download') >= 0 ||
      url.indexOf('evisa') >= 0
    ) {
      isQRPage = true;
    }
  } catch (e) {}

  // DOM heuristics: presence of application success or download element
  if (!isQRPage) {
    try {
      var successElement = document.querySelector(
        '.application-success, #download-evisa, ' +
          '[id*="application-reference"], [class*="application-success"], ' +
          'a[href*="evisa"], a[href*="download"]'
      );
      if (successElement) {
        isQRPage = true;
      }
    } catch (e) {}
  }

  // Text heuristics: page mentions e-Visa success or application reference
  if (!isQRPage) {
    try {
      var bodyText = (document.body && document.body.innerText
        ? document.body.innerText
        : ''
      ).toLowerCase();
      if (
        (bodyText.indexOf('e-visa') >= 0 || bodyText.indexOf('evisa') >= 0) &&
        (bodyText.indexOf('application') >= 0 &&
          (bodyText.indexOf('success') >= 0 ||
            bodyText.indexOf('submitted') >= 0 ||
            bodyText.indexOf('download') >= 0))
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

  // ── 2. Attempt to extract Vietnam e-Visa confirmation data ───────────────

  var qrImageBase64 = null;
  var applicationNumber = null;

  // Extract application reference number
  try {
    var refElement = document.querySelector(
      '#application-reference, [id*="application-reference"], ' +
        '[class*="application-number"], [id*="reference-number"]'
    );
    if (refElement) {
      applicationNumber = refElement.textContent.trim();
    }
  } catch (e) {}

  // Check for any QR code images on the result page
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

  // Vietnam e-Visa result: look for any square images that might be QR codes
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
      countryCode: 'VNM',
      applicationNumber: applicationNumber,
    })
  );

  return true;
})();
