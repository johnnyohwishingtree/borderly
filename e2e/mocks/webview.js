import React, { useEffect, useImperativeHandle, forwardRef } from 'react';

// Web implementation of react-native-webview using a real <iframe>.
// Renders actual web content instead of a blank div.
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

  useImperativeHandle(ref, () => ({
    injectJavaScript: (script) => {
      void script;
    },
    simulateMessage: (data) => {
      if (onMessage) {
        onMessage({ nativeEvent: { data: JSON.stringify(data) } });
      }
    },
    simulateNavigationStateChange: (state) => {
      if (onNavigationStateChange) {
        onNavigationStateChange({ url, loading: false, canGoBack: false, canGoForward: false, ...state });
      }
    },
    simulateError: (errorMessage) => {
      if (onError) {
        onError({ nativeEvent: { description: errorMessage, code: -1 } });
      }
    },
  }));

  const handleIframeLoad = () => {
    if (onNavigationStateChange) {
      onNavigationStateChange({ url, loading: false, canGoBack: false, canGoForward: false });
    }
    if (onLoadEnd) onLoadEnd({ nativeEvent: { url, loading: false } });
    if (onLoad) onLoad({ nativeEvent: { url, loading: false } });
  };

  const handleIframeError = () => {
    if (onError) {
      onError({ nativeEvent: { description: 'Failed to load page', code: -1 } });
    }
  };

  useEffect(() => {
    if (onLoadStart && url) {
      onLoadStart({ nativeEvent: { url, loading: true, navigationType: 'other' } });
    }
  }, [url, onLoadStart]);

  if (!url) {
    return (
      <div
        data-testid={testID || 'webview'}
        style={{ flex: 1, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}
      >
        <span style={{ color: '#666' }}>No URL provided</span>
      </div>
    );
  }

  return (
    <div
      data-testid={testID || 'webview'}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', ...style }}
    >
      <iframe
        src={url}
        title="Embedded content"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          border: 'none',
          minHeight: 400,
        }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        referrerPolicy="no-referrer"
      />
    </div>
  );
});

export default WebView;
