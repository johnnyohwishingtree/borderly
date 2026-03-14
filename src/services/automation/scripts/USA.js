/**
 * USA.js — ESTA QR/confirmation page detector
 *
 * Injected into the WebView after each page load. Checks whether the current
 * page is the ESTA authorization result page and, if so, attempts to extract
 * the application number and authorization status.
 *
 * Posts one of two messages back to the React Native layer:
 *   { type: 'QR_PAGE_CHECK',    isQRPage: false }
 *   { type: 'QR_PAGE_DETECTED', isQRPage: true,  qrImageBase64: string|null,
 *     pageUrl: string, countryCode: 'USA', applicationNumber: string|null,
 *     authorizationStatus: string|null }
 */
(function () {
  'use strict';

  // ── 1. Determine whether we are on the ESTA result page ─────────────────

  var isQRPage = false;

  // URL heuristics for the ESTA confirmation/result page
  try {
    var url = window.location.href.toLowerCase();
    if (
      url.indexOf('authorization') >= 0 ||
      url.indexOf('approved') >= 0 ||
      url.indexOf('result') >= 0 ||
      url.indexOf('status') >= 0 ||
      url.indexOf('confirmation') >= 0
    ) {
      isQRPage = true;
    }
  } catch (e) {}

  // DOM heuristics: presence of authorization approved indicator
  if (!isQRPage) {
    try {
      var approvedElement = document.querySelector(
        '.authorization-approved, #esta-approval, ' +
          '[id*="authorization-approved"], [class*="authorization-approved"]'
      );
      if (approvedElement) {
        isQRPage = true;
      }
    } catch (e) {}
  }

  // Text heuristics: page mentions authorization or approval
  if (!isQRPage) {
    try {
      var bodyText = (document.body && document.body.innerText
        ? document.body.innerText
        : ''
      ).toLowerCase();
      if (
        (bodyText.indexOf('authorization') >= 0 ||
          bodyText.indexOf('approved') >= 0) &&
        (bodyText.indexOf('travel') >= 0 || bodyText.indexOf('esta') >= 0)
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

  // ── 2. Attempt to extract confirmation data ───────────────────────────────

  var qrImageBase64 = null;
  var applicationNumber = null;
  var authorizationStatus = null;

  // ESTA uses application number rather than QR code
  try {
    var appNumElement = document.querySelector(
      '#application-number, [id*="application-number"], [class*="application-number"]'
    );
    if (appNumElement) {
      applicationNumber = appNumElement.textContent.trim();
    }
  } catch (e) {}

  // Detect authorization status
  try {
    if (document.querySelector('.authorization-approved, #esta-approval')) {
      authorizationStatus = 'AUTHORIZATION APPROVED';
    } else if (document.querySelector('.authorization-denied, .authorization-pending')) {
      authorizationStatus = 'PENDING OR DENIED';
    }
  } catch (e) {}

  // Check for any QR code images (ESTA may add QR in future)
  try {
    var qrElement = document.querySelector(
      'canvas, img[alt*="QR" i], img[src*="qr" i], [class*="qr" i]'
    );
    if (qrElement) {
      if (qrElement.tagName === 'CANVAS' && qrElement.width >= 50) {
        qrImageBase64 = qrElement.toDataURL('image/png');
      } else if (qrElement.src) {
        qrImageBase64 = qrElement.src;
      }
    }
  } catch (e) {}

  // ── 3. Report back to React Native ──────────────────────────────────────

  window.ReactNativeWebView.postMessage(
    JSON.stringify({
      type: 'QR_PAGE_DETECTED',
      isQRPage: true,
      qrImageBase64: qrImageBase64,
      pageUrl: window.location.href,
      countryCode: 'USA',
      applicationNumber: applicationNumber,
      authorizationStatus: authorizationStatus,
    })
  );

  return true;
})();
