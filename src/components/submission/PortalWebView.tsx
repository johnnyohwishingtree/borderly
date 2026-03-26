import {
  forwardRef,
  useEffect,
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
import { colors } from '../../utils/colors';

import { getAllowedDomains } from '@/services/submission/portalRegistry';

/**
 * Allowed government portal domains (and localhost for development/E2E).
 * Derived from the portal registry — no hardcoded list needed here.
 */
const ALLOWED_DOMAINS = getAllowedDomains();

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
  /** Called when the WebView begins loading a new page. */
  onLoadStart?: () => void;
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
    { url, onPageLoad, onLoadStart: onLoadStartProp, onNavigationChange, onError, onMessage, testID },
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
      } catch (e) {
        if (__DEV__) {
          console.error(`isAllowedDomain: Unparseable URL '${targetUrl}'`, e);
        }
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
      onLoadStartProp?.();
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

    const urlBlocked = !isAllowedDomain(url);

    // When the URL is blocked at render time, notify the parent so it can
    // clear loading indicators and show appropriate UI.
    useEffect(() => {
      if (urlBlocked) {
        onNavigationChange?.({ url, loading: false, canGoBack: false, canGoForward: false });
        onError?.('This URL is not permitted. Only official government portals may be loaded.');
      }
    }, [urlBlocked, url, onNavigationChange, onError]);

    if (urlBlocked) {
      return (
        <View className="flex-1 justify-center items-center p-6 bg-gray-50" testID={testID}>
          <Text className="text-lg font-semibold text-red-700 mb-2 text-center">Access Denied</Text>
          <Text className="text-sm text-gray-600 text-center leading-5">
            This URL is not permitted.{'\n'}
            Only official government portals may be loaded.
          </Text>
        </View>
      );
    }

    return (
      <View className="flex-1 relative" testID={testID}>
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          style={{ flex: 1 }}
          injectedJavaScript={COMMON_JS}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onNavigationStateChange={handleNavigationStateChange}
          onError={handleError}
          onMessage={(event) => onMessage?.(event)}
          // Security: block mixed content and file access
          mixedContentMode="never"
          allowFileAccess={false}
          allowUniversalAccessFromFileURLs={false}
          // Open target="_blank" links inside the WebView
          setSupportMultipleWindows={false}
        />

        {isLoading && !errorMessage && (
          <View style={StyleSheet.absoluteFillObject} className="bg-white/85 justify-center items-center">
            <ActivityIndicator size="large" color={colors.blue[600]} />
          </View>
        )}

        {errorMessage && (
          <View className="flex-1 justify-center items-center p-6 bg-gray-50">
            <Text className="text-lg font-semibold text-red-700 mb-2 text-center">Unable to Load Page</Text>
            <Text className="text-sm text-gray-600 text-center leading-5">{errorMessage}</Text>
          </View>
        )}
      </View>
    );
  },
);

export { PortalWebView };
