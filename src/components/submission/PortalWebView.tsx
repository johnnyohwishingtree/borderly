/**
 * PortalWebView - Secure WebView wrapper for government portal access
 *
 * Enforces domain allowlisting so only official government portals can be loaded.
 * Exposes injectJavaScript via ref and auto-injects common.js utilities on page load.
 */

import React, {
  forwardRef,
  useRef,
  useImperativeHandle,
  useState,
  useCallback,
} from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import WebView from 'react-native-webview';
import type {
  WebViewNavigation,
  WebViewNavigationEvent,
} from 'react-native-webview';

// Allowed government portal domains (plus localhost for dev)
const ALLOWED_DOMAINS = [
  'vjw-lp.digital.go.jp',   // Visit Japan Web
  'mdac.gov.my',             // Malaysia MDAC
  'eservices.ica.gov.sg',   // Singapore SG Arrival Card
  'localhost',               // Dev / E2E testing
  '127.0.0.1',
];

/** Common automation utilities injected on every page load */
const COMMON_JS = `
(function() {
  window.__borderly = window.__borderly || {};

  // Fill a form field by selector with a value
  window.__borderly.fillField = function(selector, value) {
    var el = document.querySelector(selector);
    if (!el) return false;
    var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeInputValueSetter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };

  // Click an element by selector
  window.__borderly.click = function(selector) {
    var el = document.querySelector(selector);
    if (!el) return false;
    el.click();
    return true;
  };

  // Check if an element exists
  window.__borderly.exists = function(selector) {
    return !!document.querySelector(selector);
  };

  window.__borderly.ready = true;
  true; // required for WKWebView
})();
`;

export interface PortalWebViewRef {
  /** Inject a JavaScript string into the current page */
  injectJavaScript: (script: string) => void;
}

export interface PortalWebViewProps {
  /** The URL to load — must match an allowed domain */
  url: string;
  /** Called when a page finishes loading */
  onPageLoad?: (url: string) => void;
  /** Called on every navigation state change */
  onNavigationChange?: (state: WebViewNavigation) => void;
  /** Called when the WebView encounters a load error */
  onError?: (error: string) => void;
  /** Test ID for E2E tests */
  testID?: string;
}

function isDomainAllowed(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith('.' + domain),
    );
  } catch {
    return false;
  }
}

/**
 * PortalWebView
 *
 * Wraps react-native-webview with:
 * - Domain allowlisting
 * - Automatic common.js injection
 * - Loading indicator
 * - Error boundary display
 * - Imperative injectJavaScript via ref
 */
const PortalWebView = forwardRef<PortalWebViewRef, PortalWebViewProps>(
  function PortalWebView({ url, onPageLoad, onNavigationChange, onError, testID }, ref) {
    const webViewRef = useRef<WebView>(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Expose injectJavaScript via ref
    useImperativeHandle(ref, () => ({
      injectJavaScript: (script: string) => {
        webViewRef.current?.injectJavaScript(script);
      },
    }));

    // Domain guard — render error view synchronously before hooks run below
    const domainAllowed = isDomainAllowed(url);

    const handleLoadStart = useCallback(() => {
      setLoading(true);
      setErrorMessage(null);
    }, []);

    const handleLoadEnd = useCallback(
      (event: WebViewNavigationEvent) => {
        setLoading(false);
        onPageLoad?.(event.nativeEvent.url);
      },
      [onPageLoad],
    );

    const handleNavigationStateChange = useCallback(
      (state: WebViewNavigation) => {
        onNavigationChange?.(state);
      },
      [onNavigationChange],
    );

    const handleError = useCallback(
      (event: WebViewNavigationEvent) => {
        const msg = event.nativeEvent.description ?? 'Unknown error';
        setLoading(false);
        setErrorMessage(msg);
        onError?.(msg);
      },
      [onError],
    );

    if (!domainAllowed) {
      const msg = `Blocked: domain not in allowlist (${url})`;
      return (
        <View style={styles.errorContainer} testID={testID}>
          <Text style={styles.errorTitle}>Access Denied</Text>
          <Text style={styles.errorBody}>{msg}</Text>
        </View>
      );
    }

    return (
      <View style={styles.container} testID={testID}>
        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Failed to load page</Text>
            <Text style={styles.errorBody}>{errorMessage}</Text>
          </View>
        ) : (
          <>
            <WebView
              ref={webViewRef}
              source={{ uri: url }}
              injectedJavaScript={COMMON_JS}
              injectedJavaScriptBeforeContentLoaded={COMMON_JS}
              onLoadStart={handleLoadStart}
              onLoadEnd={handleLoadEnd}
              onNavigationStateChange={handleNavigationStateChange}
              onError={handleError}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              style={styles.webView}
            />
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.loadingText}>Loading portal…</Text>
              </View>
            )}
          </>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(249,250,251,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFF',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 8,
  },
  errorBody: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default PortalWebView;
