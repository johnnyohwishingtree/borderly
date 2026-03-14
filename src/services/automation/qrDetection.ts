/**
 * qrDetection.ts
 *
 * Exports country-specific QR page detection scripts as JavaScript strings
 * ready for injection into a WebView via `injectJavaScript()`.
 *
 * Source implementations are maintained in parallel as plain .js files under
 * `src/services/automation/scripts/` for easier testing and readability. The
 * string constants below mirror those implementations exactly.
 *
 * Each injected script posts one of two messages to the React Native layer:
 *   { type: 'QR_PAGE_CHECK',    isQRPage: false }
 *   { type: 'QR_PAGE_DETECTED', isQRPage: true, qrImageBase64: string|null,
 *     confirmationNumber?: string|null, pageUrl: string, countryCode: string }
 *
 * Robustness: each script runs detection immediately when injected, and also
 * sets up a MutationObserver to re-run when the DOM changes (e.g. when a QR
 * code image is rendered asynchronously). The observer disconnects once a QR
 * page is detected, or after a 30-second safety timeout.
 */

/**
 * The payload shape posted by a QR detection script when a QR / confirmation
 * page is found.
 */
export interface QRDetectionMessage {
  type: 'QR_PAGE_DETECTED' | 'QR_PAGE_CHECK';
  isQRPage: boolean;
  qrImageBase64?: string | null;
  confirmationNumber?: string | null;
  pageUrl?: string;
  countryCode?: string;
}

// ── Shared helper snippet ────────────────────────────────────────────────────

/**
 * Common QR extraction logic shared across all country scripts.
 * Tries: (A) canvas.toDataURL, (B) QR-labelled <img>, (C) roughly-square <img>.
 * Declares `var qrImageBase64` in the enclosing function scope.
 */
const EXTRACT_QR_IMAGE_SNIPPET = `
  var qrImageBase64=null;
  (function(){
    try{var cs=document.querySelectorAll('canvas');for(var i=0;i<cs.length;i++){var c=cs[i];if(c.width>=50&&c.height>=50){qrImageBase64=c.toDataURL('image/png');return;}}}catch(e){}
    try{var qi=document.querySelectorAll('img[alt*="QR" i],img[src*="qr" i],img[class*="qr" i],img[id*="qr" i]');if(qi.length>0&&qi[0].src){qrImageBase64=qi[0].src;return;}}catch(e){}
    try{var ai=document.querySelectorAll('img');for(var j=0;j<ai.length;j++){var img=ai[j];var w=img.naturalWidth||img.width;var h=img.naturalHeight||img.height;if(w>=100&&w<=600&&Math.abs(w-h)<w*0.1){qrImageBase64=img.src;return;}}}catch(e){}
  })();
`;

/**
 * Shared MutationObserver suffix.
 * Expects the caller to have defined `runDetection` as a function that:
 *   - returns true if a QR page was detected (and has already posted the message)
 *   - returns false otherwise (and has already posted QR_PAGE_CHECK)
 * The observer disconnects once detection succeeds or after 30 s.
 */
const MUTATION_OBSERVER_SUFFIX = `
  try {
    var _obs=new MutationObserver(function(){if(runDetection()){_obs.disconnect();}});
    _obs.observe(document.documentElement||document.body,{childList:true,subtree:true});
    setTimeout(function(){_obs.disconnect();},30000);
  } catch(e) {}
  return true;
`;

// ── Country scripts ──────────────────────────────────────────────────────────

/**
 * JPN — Visit Japan Web QR page detector.
 * Detects step 6: the QR code result / completion page.
 */
export const JPN_QR_DETECTION_SCRIPT = `
(function(){
  'use strict';
  var _detected=false;
  function runDetection(){
    if(_detected)return true;
    var isQRPage=false;
    try{var url=window.location.href.toLowerCase();if(url.indexOf('complete')>=0||url.indexOf('result')>=0||url.indexOf('qr')>=0||url.indexOf('finish')>=0||url.indexOf('receipt')>=0){isQRPage=true;}}catch(e){}
    if(!isQRPage){try{if(document.querySelector('canvas,img[alt*="QR" i],img[src*="qr" i],[class*="qr" i],[id*="qr" i]')){isQRPage=true;}}catch(e){}}
    if(!isQRPage){try{var bt=(document.body&&document.body.innerText?document.body.innerText:'').toLowerCase();if(bt.indexOf('qr code')>=0&&(bt.indexOf('generated')>=0||bt.indexOf('complete')>=0||bt.indexOf('success')>=0)){isQRPage=true;}}catch(e){}}
    if(!isQRPage){window.ReactNativeWebView.postMessage(JSON.stringify({type:'QR_PAGE_CHECK',isQRPage:false}));return false;}
    ${EXTRACT_QR_IMAGE_SNIPPET}
    _detected=true;
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'QR_PAGE_DETECTED',isQRPage:true,qrImageBase64:qrImageBase64,pageUrl:window.location.href,countryCode:'JPN'}));
    return true;
  }
  if(!runDetection()){${MUTATION_OBSERVER_SUFFIX}}
  return true;
})();
`;

/**
 * MYS — Malaysia MDAC QR / confirmation page detector.
 * Detects step 6: the submission confirmation page.
 */
export const MYS_QR_DETECTION_SCRIPT = `
(function(){
  'use strict';
  var _detected=false;
  function runDetection(){
    if(_detected)return true;
    var isQRPage=false;
    try{var url=window.location.href.toLowerCase();if(url.indexOf('success')>=0||url.indexOf('complete')>=0||url.indexOf('confirm')>=0||url.indexOf('thank')>=0||url.indexOf('receipt')>=0||url.indexOf('result')>=0){isQRPage=true;}}catch(e){}
    if(!isQRPage){try{if(document.querySelector('canvas,img[alt*="QR" i],img[src*="qr" i],[class*="qr" i],[id*="qr" i]')){isQRPage=true;}}catch(e){}}
    if(!isQRPage){try{var bt=(document.body&&document.body.innerText?document.body.innerText:'').toLowerCase();if((bt.indexOf('submission')>=0||bt.indexOf('arrival card')>=0||bt.indexOf('mdac')>=0)&&(bt.indexOf('success')>=0||bt.indexOf('complete')>=0||bt.indexOf('submitted')>=0||bt.indexOf('confirmed')>=0||bt.indexOf('reference')>=0)){isQRPage=true;}}catch(e){}}
    if(!isQRPage){window.ReactNativeWebView.postMessage(JSON.stringify({type:'QR_PAGE_CHECK',isQRPage:false}));return false;}
    ${EXTRACT_QR_IMAGE_SNIPPET}
    var confirmationNumber=null;
    try{var bh=document.body?document.body.innerHTML:'';var rm=bh.match(/(?:reference|ref(?:erence)?\\s*(?:no|number|#)?)[:\\s]+([A-Z0-9\\-]{6,20})/i);if(rm){confirmationNumber=rm[1].trim();}}catch(e){}
    _detected=true;
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'QR_PAGE_DETECTED',isQRPage:true,qrImageBase64:qrImageBase64,confirmationNumber:confirmationNumber,pageUrl:window.location.href,countryCode:'MYS'}));
    return true;
  }
  if(!runDetection()){${MUTATION_OBSERVER_SUFFIX}}
  return true;
})();
`;

/**
 * SGP — Singapore SG Arrival Card confirmation page detector.
 * Detects step 7: the submission receipt / acknowledgement page.
 */
export const SGP_QR_DETECTION_SCRIPT = `
(function(){
  'use strict';
  var _detected=false;
  function runDetection(){
    if(_detected)return true;
    var isQRPage=false;
    try{var url=window.location.href.toLowerCase();if(url.indexOf('success')>=0||url.indexOf('complete')>=0||url.indexOf('confirm')>=0||url.indexOf('thank')>=0||url.indexOf('receipt')>=0||url.indexOf('acknowledgement')>=0||url.indexOf('submission')>=0){isQRPage=true;}}catch(e){}
    if(!isQRPage){try{if(document.querySelector('canvas,img[alt*="QR" i],img[src*="qr" i],[class*="qr" i],[id*="qr" i],[class*="confirmation" i],[id*="confirmation" i],[class*="acknowledgement" i],[id*="acknowledgement" i]')){isQRPage=true;}}catch(e){}}
    if(!isQRPage){try{var bt=(document.body&&document.body.innerText?document.body.innerText:'').toLowerCase();if((bt.indexOf('arrival card')>=0||bt.indexOf('sg arrival')>=0||bt.indexOf('immigration')>=0)&&(bt.indexOf('success')>=0||bt.indexOf('complete')>=0||bt.indexOf('submitted')>=0||bt.indexOf('acknowledged')>=0||bt.indexOf('thank you')>=0)){isQRPage=true;}}catch(e){}}
    if(!isQRPage){window.ReactNativeWebView.postMessage(JSON.stringify({type:'QR_PAGE_CHECK',isQRPage:false}));return false;}
    ${EXTRACT_QR_IMAGE_SNIPPET}
    var confirmationNumber=null;
    try{var bh=document.body?document.body.innerHTML:'';var rm=bh.match(/(?:acknowledgement|reference|submission|ref(?:erence)?\\s*(?:no|number|#)?)[:\\s]+([A-Z0-9\\-]{4,25})/i);if(rm){confirmationNumber=rm[1].trim();}}catch(e){}
    _detected=true;
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'QR_PAGE_DETECTED',isQRPage:true,qrImageBase64:qrImageBase64,confirmationNumber:confirmationNumber,pageUrl:window.location.href,countryCode:'SGP'}));
    return true;
  }
  if(!runDetection()){${MUTATION_OBSERVER_SUFFIX}}
  return true;
})();
`;

/**
 * Returns the QR detection script for a given country code, or null if no
 * script is defined for that country.
 */
export function getQRDetectionScript(countryCode: string): string | null {
  switch (countryCode) {
    case 'JPN':
      return JPN_QR_DETECTION_SCRIPT;
    case 'MYS':
      return MYS_QR_DETECTION_SCRIPT;
    case 'SGP':
      return SGP_QR_DETECTION_SCRIPT;
    default:
      return null;
  }
}
