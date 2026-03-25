/**
 * Types for WebView Controller
 */

/**
 * Interface for WebView implementation (React Native WebView)
 * This abstracts the actual WebView component for testing
 */
export interface WebViewImplementation {
  loadUrl(url: string): Promise<void>;
  executeJavaScript(code: string): Promise<unknown>;
  goBack(): Promise<void>;
  goForward(): Promise<void>;
  reload(): Promise<void>;
  clearCache(): Promise<void>;
  clearCookies(): Promise<void>;
  setUserAgent(userAgent: string): Promise<void>;
  addEventListener(event: string, callback: (data: unknown) => void): void;
  removeEventListener(event: string, callback: (data: unknown) => void): void;
}

/**
 * Prerequisites for WebView initialization
 */
export interface WebViewPrerequisites {
  cookiesEnabled: boolean;
  javascriptEnabled: boolean;
  userAgent?: string;
  viewport?: { width: number; height: number };
}

/**
 * WebView security constraints
 */
export interface SecurityConstraints {
  allowedDomains: string[];
  maxExecutionTime: number;
  maxResponseSize: number;
  validateSSL: boolean;
}

/**
 * Minimal interface for wiring to a live PortalWebView handle.
 * Matches PortalWebViewHandle from PortalWebView.tsx without a cross-layer import.
 */
export interface WebViewHandle {
  injectJavaScript: (script: string) => void;
}
