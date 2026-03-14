/**
 * GBR.js — UK ETA confirmation page detector
 *
 * Injected into the WebView after each page load. Checks whether the current
 * page is the GOV.UK ETA approval/confirmation page and extracts the reference.
 *
 * Posts one of two messages back to the React Native layer:
 *   { type: 'QR_PAGE_CHECK',    isQRPage: false }
 *   { type: 'QR_PAGE_DETECTED', isQRPage: true,  qrImageBase64: string|null,
 *     pageUrl: string, countryCode: 'GBR', applicationReference: string|null }
 */
(function () {
  'use strict';

  // ── 1. Determine whether we are on the UK ETA confirmation page ──────────

  var isQRPage = false;

  // URL heuristics for GOV.UK ETA confirmation/approval
  try {
    var url = window.location.href.toLowerCase();
    if (
      url.indexOf('complete') >= 0 ||
      url.indexOf('confirmation') >= 0 ||
      url.indexOf('approved') >= 0 ||
      url.indexOf('application-complete') >= 0 ||
      url.indexOf('eta-approval') >= 0
    ) {
      isQRPage = true;
    }
  } catch (e) {}

  // DOM heuristics: GOV.UK design system completion panel
  if (!isQRPage) {
    try {
      var completionElement = document.querySelector(
        '.govuk-panel--confirmation, .application-complete, #eta-approval, ' +
          '.govuk-panel__title, [class*="confirmation"]'
      );
      if (completionElement) {
        isQRPage = true;
      }
    } catch (e) {}
  }

  // Text heuristics: GOV.UK success language
  if (!isQRPage) {
    try {
      var bodyText = (document.body && document.body.innerText
        ? document.body.innerText
        : ''
      ).toLowerCase();
      if (
        (bodyText.indexOf('eta') >= 0 || bodyText.indexOf('electronic travel') >= 0) &&
        (bodyText.indexOf('approved') >= 0 ||
          bodyText.indexOf('application complete') >= 0 ||
          bodyText.indexOf('application submitted') >= 0)
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

  // ── 2. Attempt to extract UK ETA confirmation data ───────────────────────

  var qrImageBase64 = null;
  var applicationReference = null;

  // Extract GOV.UK application reference
  try {
    var refElement = document.querySelector(
      '#application-reference, [id*="application-reference"], ' +
        '.govuk-panel__body, [class*="reference-number"]'
    );
    if (refElement) {
      applicationReference = refElement.textContent.trim();
    }
  } catch (e) {}

  // Check for any QR code images (GOV.UK may include QR for verification)
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
      countryCode: 'GBR',
      applicationReference: applicationReference,
    })
  );

  return true;
})();
