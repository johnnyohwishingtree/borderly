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
    injectedJavaScript,
    style,
    testID,
  } = props;

  const url = source && source.uri ? source.uri : '';

  // Expose injectJavaScript via ref
  useImperativeHandle(ref, () => ({
    injectJavaScript: (script) => {
      // No-op in web mock environment
      void script;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

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
