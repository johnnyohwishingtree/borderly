import React, { useEffect, useImperativeHandle, forwardRef } from 'react';

// Mock WebView component for web E2E tests.
// Uses named imports to ensure same React instance as the app.
const WebView = forwardRef(function WebView(props, ref) {
  const {
    source,
    onLoad,
    onLoadStart,
    onLoadEnd,
    onError,
    onNavigationStateChange,
    onMessage,
    injectedJavaScript,
    style,
    testID,
  } = props;

  const url = source && source.uri ? source.uri : '';

  // Expose imperative API via ref
  useImperativeHandle(ref, () => ({
    injectJavaScript: (script) => {
      // No-op in web mock environment
      void script;
    },
    /**
     * Simulate a message from the in-page JavaScript back to React Native.
     * Usage (from tests): webViewRef.current.simulateMessage({ type: 'AUTO_FILL_RESULT', filled: 3, total: 5 })
     */
    simulateMessage: (data) => {
      if (onMessage) {
        onMessage({ nativeEvent: { data: JSON.stringify(data) } });
      }
    },
    /**
     * Simulate a navigation state change (e.g. page navigation inside the WebView).
     * Usage: webViewRef.current.simulateNavigationStateChange({ url: 'https://...', canGoBack: true })
     */
    simulateNavigationStateChange: (state) => {
      if (onNavigationStateChange) {
        onNavigationStateChange({ url, loading: false, canGoBack: false, canGoForward: false, ...state });
      }
    },
    /**
     * Simulate a load error (e.g. network failure or timeout).
     * Usage: webViewRef.current.simulateError('Network request failed')
     */
    simulateError: (errorMessage) => {
      if (onError) {
        onError({ nativeEvent: { description: errorMessage, code: -1 } });
      }
    },
  }));

  useEffect(() => {
    const loadTimer = setTimeout(() => {
      if (onLoadStart) onLoadStart({ nativeEvent: { url, loading: true, navigationType: 'other' } });

      setTimeout(() => {
        if (onNavigationStateChange) {
          onNavigationStateChange({ url, loading: false, canGoBack: false, canGoForward: false });
        }
        if (onLoadEnd) onLoadEnd({ nativeEvent: { url, loading: false } });
        if (onLoad) onLoad({ nativeEvent: { url, loading: false } });
        // Execute injected JS (no-op in mock)
        void injectedJavaScript;
      }, 100);
    }, 50);

    return () => clearTimeout(loadTimer);
  }, [url, injectedJavaScript, onLoad, onLoadEnd, onLoadStart, onNavigationStateChange]);

  return (
    <div
      data-testid={testID || 'webview'}
      style={{ flex: 1, background: '#fff', ...style }}
    >
      <div data-webview-url={url} />
    </div>
  );
});

export default WebView;
