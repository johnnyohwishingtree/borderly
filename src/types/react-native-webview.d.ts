/**
 * Ambient type declarations for react-native-webview.
 *
 * These declarations supplement the package's own types to add WebViewRef
 * (used for the forwarded ref in PortalWebView) and ensure JSX compatibility.
 */
declare module 'react-native-webview' {
  import type { Component } from 'react';
  import type { StyleProp, ViewStyle } from 'react-native';

  export interface WebViewNativeEvent {
    url: string;
    loading: boolean;
    title?: string;
    canGoBack: boolean;
    canGoForward: boolean;
    description?: string;
    code?: number;
  }

  export interface WebViewNavigation extends WebViewNativeEvent {
    navigationType?: string;
  }

  export interface WebViewMessageEvent {
    nativeEvent: {
      data: string;
      url: string;
    };
  }

  export interface WebViewRef {
    injectJavaScript: (script: string) => void;
    goBack: () => void;
    goForward: () => void;
    reload: () => void;
    stopLoading: () => void;
  }

  export interface WebViewProps {
    source?: { uri: string } | { html: string };
    style?: StyleProp<ViewStyle>;
    injectedJavaScript?: string;
    onLoadStart?: (event: { nativeEvent: WebViewNativeEvent }) => void;
    onLoadEnd?: (event: { nativeEvent: WebViewNativeEvent }) => void;
    onNavigationStateChange?: (event: WebViewNavigation) => void;
    onError?: (event: { nativeEvent: WebViewNativeEvent }) => void;
    onMessage?: (event: WebViewMessageEvent) => void;
    mixedContentMode?: 'never' | 'always' | 'compatibility';
    allowFileAccess?: boolean;
    allowUniversalAccessFromFileURLs?: boolean;
    setSupportMultipleWindows?: boolean;
    testID?: string;
  }

  // Declare WebView as a full Component subclass so TypeScript accepts it in JSX.
  // The class form is used here (not ForwardRefExoticComponent) to match the
  // real package's declaration and satisfy JSX element type checking.
  class WebView extends Component<WebViewProps> {
    injectJavaScript: (script: string) => void;
    goBack: () => void;
    goForward: () => void;
    reload: () => void;
    stopLoading: () => void;
  }

  export { WebView };
  export default WebView;
}
