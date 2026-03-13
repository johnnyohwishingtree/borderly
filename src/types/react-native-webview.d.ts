/**
 * Ambient type declarations for react-native-webview.
 *
 * The package's own index.d.ts uses `declare class WebView extends Component`
 * which does not satisfy TypeScript's JSX element type checks without a full
 * runtime implementation. We override the module here with a
 * ForwardRefExoticComponent declaration that TypeScript accepts in JSX and
 * correctly types the ref as WebViewRef (with injectJavaScript etc.).
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

  // Declare WebView as a ForwardRef component so TypeScript accepts it in JSX
  // and the ref resolves to WebViewRef (injectJavaScript, goBack, etc.).
  declare const WebView: ForwardRefExoticComponent<
    WebViewProps & RefAttributes<WebViewRef>
  >;

  export { WebView };
  export default WebView;
}
