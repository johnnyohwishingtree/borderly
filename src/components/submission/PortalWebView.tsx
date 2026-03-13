import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import WebView, { WebViewNavigation, WebViewMessageEvent, WebViewRef } from 'react-native-webview';

// Allowed government portal domains (and localhost for development)
const ALLOWED_DOMAINS = [
  'vjw-lp.digital.go.jp',    // Visit Japan Web
  'mdac.gov.my',              // Malaysia MDAC
  'eservices.ica.gov.sg',     // Singapore SG Arrival Card
  'localhost',                // Dev / E2E testing
  '127.0.0.1',               // Dev / E2E testing
];

/**
 * Common automation utilities injected on every page load.
 * Exposes helpers that parent components can call via injectJavaScript.
 */
const COMMON_JS = `
(function() {
  window.__borderly = window.__borderly || {};

  /**
   * Fill an input field by selector and value.
   */
  window.__borderly.fillField = function(selector, value) {
    var el = document.querySelector(selector);
    if (!el) return false;
    var nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    ).set;
    nativeInputValueSetter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };

  /**
   * Click an element by selector.
   */
  window.__borderly.clickElement = function(selector) {
    var el = document.querySelector(selector);
    if (!el) return false;
    el.click();
    return true;
  };

  /**
   * Select an option in a <select> element.
   */
  window.__borderly.selectOption = function(selector, value) {
    var el = document.querySelector(selector);
    if (!el) return false;
    el.value = value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };

  true; // Required: scripts must end with a truthy value
})();
`;

export interface PortalWebViewHandle {
  /** Inject arbitrary JavaScript into the currently-loaded page. */
  injectJavaScript: (script: string) => void;
}

export interface NavigationState {
  url: string;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

export interface PortalWebViewProps {
  /** The URL to load. Must match an allowed domain. */
  url: string;
  /** Called when the page finishes loading. */
  onPageLoad?: (url: string) => void;
  /** Called whenever the navigation state changes (URL, loading status). */
  onNavigationChange?: (state: NavigationState) => void;
  /** Called when a WebView error occurs. */
  onError?: (errorMessage: string) => void;
  /** Called when a message is posted from within the WebView via window.ReactNativeWebView.postMessage. */
  onMessage?: (event: WebViewMessageEvent) => void;
  testID?: string;
}

/**
 * PortalWebView — secure WebView wrapper for government portal automation.
 *
 * Security features:
 * - Domain allowlisting: blocks navigation to non-approved hosts
 * - Injects common automation utilities on every page load
 * - Exposes injectJavaScript via ref for parent-driven automation
 * - Shows loading overlay while the page is loading
 * - Renders error UI on WebView crashes
 */
const PortalWebView = forwardRef<PortalWebViewHandle, PortalWebViewProps>(
  function PortalWebView(
    { url, onPageLoad, onNavigationChange, onError, onMessage, testID },
    ref,
  ) {
    const webViewRef = useRef<WebViewRef>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Expose injectJavaScript via the forwarded ref
    useImperativeHandle(ref, () => ({
      injectJavaScript: (script: string) => {
        webViewRef.current?.injectJavaScript(script);
      },
    }));

    /** Check whether a URL belongs to an allowed domain. */
    const isAllowedDomain = (targetUrl: string): boolean => {
      try {
        const parsed = new URL(targetUrl);
        return ALLOWED_DOMAINS.some(
          (domain) =>
            parsed.hostname === domain ||
            parsed.hostname.endsWith('.' + domain),
        );
      } catch {
        // Unparseable URL — deny
        return false;
      }
    };

    const handleNavigationStateChange = (navState: WebViewNavigation) => {
      const { url: currentUrl, loading, canGoBack, canGoForward } = navState;

      // Block navigation to non-allowed domains
      if (currentUrl && !loading && !isAllowedDomain(currentUrl)) {
        webViewRef.current?.injectJavaScript(
          `window.history.back(); true;`,
        );
        onError?.(`Navigation to ${currentUrl} blocked by domain allowlist.`);
        return;
      }

      onNavigationChange?.({ url: currentUrl, loading, canGoBack, canGoForward });
    };

    const handleLoadEnd = ({ nativeEvent }: { nativeEvent: { url: string } }) => {
      setIsLoading(false);
      onPageLoad?.(nativeEvent.url);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
      setErrorMessage(null);
    };

    const handleError = ({
      nativeEvent,
    }: {
      nativeEvent: { description?: string; code?: number };
    }) => {
      const msg =
        nativeEvent.description ??
        `WebView error (code ${nativeEvent.code ?? 'unknown'})`;
      setIsLoading(false);
      setErrorMessage(msg);
      onError?.(msg);
    };

    if (!isAllowedDomain(url)) {
      return (
        <View style={styles.errorContainer} testID={testID}>
          <Text style={styles.errorTitle}>Access Denied</Text>
          <Text style={styles.errorMessage}>
            This URL is not permitted.{'\n'}
            Only official government portals may be loaded.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.container} testID={testID}>
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          style={styles.webView}
          injectedJavaScript={COMMON_JS}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onNavigationStateChange={handleNavigationStateChange}
          onError={handleError}
          onMessage={onMessage}
          // Security: block mixed content and file access
          mixedContentMode="never"
          allowFileAccess={false}
          allowUniversalAccessFromFileURLs={false}
          // Open target="_blank" links inside the WebView
          setSupportMultipleWindows={false}
        />

        {isLoading && !errorMessage && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#0066CC" />
          </View>
        )}

        {errorMessage && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Unable to Load Page</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
          </View>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FAFAFA',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#CC0000',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export { PortalWebView };
