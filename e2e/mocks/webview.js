import React, { forwardRef, useImperativeHandle, useEffect, useState } from 'react';

// Mock WebView for web E2E tests
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

  const [loading, setLoading] = useState(true);

  useImperativeHandle(ref, () => ({
    injectJavaScript: (script) => {
      // no-op in web mock
    },
    goBack: () => {},
    goForward: () => {},
    reload: () => {},
    stopLoading: () => {},
  }));

  useEffect(() => {
    if (onLoadStart) onLoadStart({ nativeEvent: { url: source?.uri || '', loading: true } });
    const timer = setTimeout(() => {
      setLoading(false);
      if (onLoad) onLoad({ nativeEvent: { url: source?.uri || '', loading: false } });
      if (onLoadEnd) onLoadEnd({ nativeEvent: { url: source?.uri || '', loading: false } });
      if (onNavigationStateChange) {
        onNavigationStateChange({ url: source?.uri || '', loading: false, canGoBack: false, canGoForward: false });
      }
    }, 200);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source?.uri]);

  return (
    <div
      data-testid={testID || 'webview-mock'}
      style={{ flex: 1, backgroundColor: '#fff', border: '1px solid #eee', ...style }}
    >
      {loading && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          Loading...
        </div>
      )}
      {!loading && source?.uri && (
        <div style={{ padding: '12px', fontSize: '14px', color: '#333' }}>
          <div data-testid="webview-url">{source.uri}</div>
        </div>
      )}
    </div>
  );
});

WebView.displayName = 'WebView';

export default WebView;
