/**
 * Ambient type declarations for react-native-webview.
 *
 * These stubs allow `pnpm typecheck` to pass before the native package is
 * installed in CI. They mirror the public API surface used by PortalWebView.
 */
declare module 'react-native-webview' {
  import type { ForwardRefExoticComponent, RefAttributes } from 'react';
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

  // The WebView component (default and named export)
  export declare class WebView extends ForwardRefExoticComponent<
    WebViewProps & RefAttributes<WebViewRef>
  > {
    injectJavaScript(script: string): void;
    goBack(): void;
    goForward(): void;
    reload(): void;
    stopLoading(): void;
  }

  export default WebView;
}
