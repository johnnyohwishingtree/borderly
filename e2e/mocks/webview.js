import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

// Web implementation of react-native-webview using a real <iframe>.
// Renders actual web content instead of a blank div.
//
// Government portals (and many external sites) block iframe embedding via
// X-Frame-Options or CSP frame-ancestors. When the iframe fails to load
// within a timeout, we fire onError so the parent screen can show a
// meaningful error instead of spinning forever.
const LOAD_TIMEOUT_MS = 8000;

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
  const loadedRef = useRef(false);
  const timeoutRef = useRef(null);

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

  const markLoaded = () => {
    loadedRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleIframeLoad = () => {
    markLoaded();
    if (onNavigationStateChange) {
      onNavigationStateChange({ url, loading: false, canGoBack: false, canGoForward: false });
    }
    if (onLoadEnd) onLoadEnd({ nativeEvent: { url, loading: false } });
    if (onLoad) onLoad({ nativeEvent: { url, loading: false } });
  };

  const handleIframeError = () => {
    markLoaded();
    if (onError) {
      onError({ nativeEvent: { description: 'Failed to load page', code: -1 } });
    }
  };

  useEffect(() => {
    if (!url) return;
    loadedRef.current = false;

    if (onLoadStart) {
      onLoadStart({ nativeEvent: { url, loading: true, navigationType: 'other' } });
    }

    // Safety net: if the iframe never fires onLoad (e.g. blocked by
    // X-Frame-Options, network error, or cross-origin restriction),
    // fire onError after a timeout so the UI doesn't spin forever.
    timeoutRef.current = setTimeout(() => {
      if (!loadedRef.current) {
        if (onNavigationStateChange) {
          onNavigationStateChange({ url, loading: false, canGoBack: false, canGoForward: false });
        }
        if (onError) {
          onError({
            nativeEvent: {
              description: 'The page could not be loaded in the embedded viewer. The site may block iframe embedding. Try opening it in your browser instead.',
              code: -2,
            },
          });
        }
        if (onLoadEnd) onLoadEnd({ nativeEvent: { url, loading: false } });
      }
    }, LOAD_TIMEOUT_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [url, onLoadStart, onNavigationStateChange, onError, onLoadEnd]);

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
