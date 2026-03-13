/**
 * Type stub for react-native-webview.
 * The real types ship with the package; this stub ensures typecheck passes
 * even before `pnpm install` has resolved the dependency.
 * Once the package is installed, skipLibCheck: true means the installed
 * types take precedence and this file is superseded.
 */
declare module 'react-native-webview' {
  import type { Component, Ref } from 'react';
  import type { StyleProp, ViewStyle } from 'react-native';

  export interface WebViewNavigation {
    url: string;
    loading: boolean;
    canGoBack: boolean;
    canGoForward: boolean;
    title?: string;
    navigationType?: string;
    mainDocumentURL?: string;
  }

  export interface WebViewNativeEvent {
    url: string;
    loading: boolean;
    title?: string;
    canGoBack?: boolean;
    canGoForward?: boolean;
    description?: string;
  }

  export interface WebViewNavigationEvent {
    nativeEvent: WebViewNativeEvent;
  }

  export interface WebViewErrorEvent {
    nativeEvent: WebViewNativeEvent & { description: string; code?: number };
  }

  export interface WebViewSource {
    uri?: string;
    html?: string;
    headers?: Record<string, string>;
  }

  export interface WebViewProps {
    source?: WebViewSource;
    injectedJavaScript?: string;
    injectedJavaScriptBeforeContentLoaded?: string;
    javaScriptEnabled?: boolean;
    domStorageEnabled?: boolean;
    style?: StyleProp<ViewStyle>;
    testID?: string;
    onLoadStart?: (event: WebViewNavigationEvent) => void;
    onLoad?: (event: WebViewNavigationEvent) => void;
    onLoadEnd?: (event: WebViewNavigationEvent) => void;
    onError?: (event: WebViewErrorEvent) => void;
    onNavigationStateChange?: (event: WebViewNavigation) => void;
  }

  export interface WebViewRef {
    injectJavaScript: (script: string) => void;
    goBack: () => void;
    goForward: () => void;
    reload: () => void;
    stopLoading: () => void;
  }

  class WebView extends Component<WebViewProps> {
    injectJavaScript(script: string): void;
    goBack(): void;
    goForward(): void;
    reload(): void;
    stopLoading(): void;
  }

  export default WebView;
}
