/**
 * WebView Controller - Manages WebView interactions and JavaScript injection
 * 
 * Provides a secure interface for automating government portal interactions
 * through controlled JavaScript injection and DOM manipulation.
 */

import { 
  WebViewState, 
  JavaScriptPayload, 
  WebViewNavigationEvent,
  SecurityValidationResult
} from '@/types/submission';

/**
 * Interface for WebView implementation (React Native WebView)
 * This abstracts the actual WebView component for testing
 */
export interface WebViewImplementation {
  loadUrl(url: string): Promise<void>;
  executeJavaScript(code: string): Promise<any>;
  goBack(): Promise<void>;
  goForward(): Promise<void>;
  reload(): Promise<void>;
  clearCache(): Promise<void>;
  clearCookies(): Promise<void>;
  setUserAgent(userAgent: string): Promise<void>;
  addEventListener(event: string, callback: (data: any) => void): void;
  removeEventListener(event: string, callback: (data: any) => void): void;
}

/**
 * Prerequisites for WebView initialization
 */
interface WebViewPrerequisites {
  cookiesEnabled: boolean;
  javascriptEnabled: boolean;
  userAgent?: string;
  viewport?: { width: number; height: number };
}

/**
 * WebView security constraints
 */
interface SecurityConstraints {
  allowedDomains: string[];
  maxExecutionTime: number;
  maxResponseSize: number;
  validateSSL: boolean;
}

/**
 * Main WebView controller class
 */
export class WebViewController {
  private webviewImpl?: WebViewImplementation;
  private state: WebViewState;
  private securityConstraints: SecurityConstraints;
  private navigationListeners: ((event: WebViewNavigationEvent) => void)[];
  private isInitialized = false;

  constructor() {
    this.state = {
      url: '',
      loading: false,
      canGoBack: false,
      canGoForward: false
    };
    
    this.securityConstraints = {
      allowedDomains: [
        'vjw-lp.digital.go.jp', // Japan - Visit Japan Web
        'mdac.gov.my', // Malaysia - MDAC
        'eservices.ica.gov.sg', // Singapore - ICA
        'localhost', // Development
        '127.0.0.1' // Development
      ],
      maxExecutionTime: 30000, // 30 seconds
      maxResponseSize: 1024 * 1024, // 1MB
      validateSSL: true
    };
    
    this.navigationListeners = [];
  }

  /**
   * Initialize WebView with prerequisites and security constraints
   */
  async initialize(prerequisites: WebViewPrerequisites): Promise<void> {
    if (this.isInitialized) {
      throw new Error('WebViewController already initialized');
    }

    try {
      // Set up WebView implementation (would be injected in production)
      this.webviewImpl = this.createWebViewImplementation();
      
      // Configure WebView settings
      if (prerequisites.userAgent) {
        await this.webviewImpl.setUserAgent(prerequisites.userAgent);
      }
      
      // Clear existing data for security
      await this.webviewImpl.clearCache();
      if (!prerequisites.cookiesEnabled) {
        await this.webviewImpl.clearCookies();
      }
      
      // Set up event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      
    } catch (error) {
      throw new Error(`Failed to initialize WebView: ${(error as Error).message}`);
    }
  }

  /**
   * Navigate to a URL with security validation
   */
  async navigateTo(url: string): Promise<void> {
    this.ensureInitialized();
    
    // Validate URL security
    const securityResult = this.validateUrl(url);
    if (!securityResult.isValid) {
      throw new Error(`URL security validation failed: ${securityResult.errors.join(', ')}`);
    }
    
    try {
      this.state.loading = true;
      this.state.url = url;
      
      await this.webviewImpl!.loadUrl(url);
      
      // Wait for page load completion (or timeout)
      await this.waitForPageLoad();
      
    } catch (error) {
      this.state.loading = false;
      this.state.error = (error as Error).message;
      throw error;
    }
  }

  /**
   * Execute JavaScript code in the WebView context
   */
  async executeScript(payload: JavaScriptPayload): Promise<any> {
    this.ensureInitialized();
    
    // Security validation of JavaScript code
    const securityResult = this.validateJavaScript(payload.code);
    if (!securityResult.isValid) {
      throw new Error(`JavaScript security validation failed: ${securityResult.errors.join(', ')}`);
    }
    
    try {
      // Wrap JavaScript with error handling and timeout
      const wrappedCode = this.wrapJavaScriptCode(payload.code, payload.timeout);
      
      // Execute with timeout
      const result = await Promise.race([
        this.webviewImpl!.executeJavaScript(wrappedCode),
        this.createTimeout(payload.timeout, 'JavaScript execution timeout')
      ]);
      
      // Validate response size
      if (this.getResponseSize(result) > this.securityConstraints.maxResponseSize) {
        throw new Error('JavaScript response exceeds maximum allowed size');
      }
      
      return result;
      
    } catch (error) {
      throw new Error(`JavaScript execution failed: ${(error as Error).message}`);
    }
  }

  /**
   * Inject form data into the current page
   */
  async injectFormData(fieldMappings: Record<string, any>): Promise<void> {
    const injectionScript = this.generateFormInjectionScript(fieldMappings);
    
    await this.executeScript({
      code: injectionScript,
      timeout: 10000,
      expectsResult: false
    });
  }

  /**
   * Capture screenshot of current page state
   */
  async captureScreenshot(): Promise<string> {
    const screenshotScript = `
      (function() {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const video = document.createElement('video');
        
        return new Promise((resolve) => {
          video.addEventListener('loadeddata', function() {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          });
          
          navigator.mediaDevices.getDisplayMedia({ video: true })
            .then(stream => {
              video.srcObject = stream;
              video.play();
            });
        });
      })();
    `;
    
    try {
      const screenshot = await this.executeScript({
        code: screenshotScript,
        timeout: 5000,
        expectsResult: true
      });
      
      return screenshot as string;
    } catch (error) {
      // Fallback: return empty screenshot if capture fails
      return '';
    }
  }

  /**
   * Check if a specific element exists on the page
   */
  async elementExists(selector: string): Promise<boolean> {
    const checkScript = `
      document.querySelector(${JSON.stringify(selector)}) !== null;
    `;
    
    try {
      const result = await this.executeScript({
        code: checkScript,
        timeout: 5000,
        expectsResult: true
      });
      
      return Boolean(result);
    } catch (error) {
      return false;
    }
  }

  /**
   * Wait for a specific element to appear
   */
  async waitForElement(selector: string, maxWaitMs = 10000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitMs) {
      if (await this.elementExists(selector)) {
        return true;
      }
      
      await new Promise(resolve => setTimeout(() => resolve(undefined), 500));
    }
    
    return false;
  }

  /**
   * Fill a form field with specified value
   */
  async fillField(selector: string, value: string, inputType = 'text'): Promise<void> {
    const fillScript = this.generateFieldFillScript(selector, value, inputType);
    
    await this.executeScript({
      code: fillScript,
      timeout: 5000,
      expectsResult: false
    });
  }

  /**
   * Click an element
   */
  async clickElement(selector: string): Promise<void> {
    const clickScript = `
      const element = document.querySelector(${JSON.stringify(selector)});
      if (element) {
        element.scrollIntoView();
        element.focus();
        element.click();
        return true;
      }
      return false;
    `;
    
    const success = await this.executeScript({
      code: clickScript,
      timeout: 5000,
      expectsResult: true
    });
    
    if (!success) {
      throw new Error(`Failed to click element: ${selector}`);
    }
  }

  /**
   * Get current page information
   */
  async getPageInfo(): Promise<{ title: string; url: string; ready: boolean }> {
    const infoScript = `
      ({
        title: document.title,
        url: window.location.href,
        ready: document.readyState === 'complete'
      });
    `;
    
    return await this.executeScript({
      code: infoScript,
      timeout: 3000,
      expectsResult: true
    });
  }

  /**
   * Navigation methods
   */
  async goBack(): Promise<void> {
    this.ensureInitialized();
    await this.webviewImpl!.goBack();
  }

  async goForward(): Promise<void> {
    this.ensureInitialized();
    await this.webviewImpl!.goForward();
  }

  async reload(): Promise<void> {
    this.ensureInitialized();
    await this.webviewImpl!.reload();
  }

  /**
   * Event handling
   */
  onNavigation(callback: (event: WebViewNavigationEvent) => void): void {
    this.navigationListeners.push(callback);
  }

  removeNavigationListener(callback: (event: WebViewNavigationEvent) => void): void {
    const index = this.navigationListeners.indexOf(callback);
    if (index > -1) {
      this.navigationListeners.splice(index, 1);
    }
  }

  /**
   * State accessors
   */
  getState(): WebViewState {
    return { ...this.state };
  }

  isReady(): boolean {
    return this.isInitialized && !this.state.loading && !this.state.error;
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    if (this.webviewImpl) {
      await this.webviewImpl.clearCache();
      await this.webviewImpl.clearCookies();
    }
    
    this.navigationListeners = [];
    this.isInitialized = false;
  }

  /**
   * Private helper methods
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.webviewImpl) {
      throw new Error('WebViewController not initialized. Call initialize() first.');
    }
  }

  private validateUrl(url: string): SecurityValidationResult {
    const result: SecurityValidationResult = {
      isValid: true,
      warnings: [],
      errors: [],
      checks: {
        noPIILeakage: true,
        validDomain: false,
        secureConnection: false,
        dataWithinLimits: true
      }
    };

    try {
      const urlObj = new URL(url);
      
      // Check protocol
      if (urlObj.protocol === 'https:') {
        result.checks.secureConnection = true;
      } else if (urlObj.protocol === 'http:' && urlObj.hostname === 'localhost') {
        result.checks.secureConnection = true;
        result.warnings.push('Using HTTP on localhost (development only)');
      } else {
        result.errors.push('Only HTTPS URLs are allowed');
        result.checks.secureConnection = false;
      }
      
      // Check domain allowlist
      const isAllowedDomain = this.securityConstraints.allowedDomains.some(domain => 
        urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
      );
      
      if (isAllowedDomain) {
        result.checks.validDomain = true;
      } else {
        result.errors.push(`Domain not in allowlist: ${urlObj.hostname}`);
        result.checks.validDomain = false;
      }
      
    } catch (error) {
      result.errors.push(`Invalid URL: ${(error as Error).message}`);
    }
    
    result.isValid = result.errors.length === 0;
    return result;
  }

  private validateJavaScript(code: string): SecurityValidationResult {
    const result: SecurityValidationResult = {
      isValid: true,
      warnings: [],
      errors: [],
      checks: {
        noPIILeakage: true,
        validDomain: true,
        secureConnection: true,
        dataWithinLimits: code.length <= 10000
      }
    };

    // Check for dangerous patterns
    const dangerousPatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /document\.write\s*\(/,
      /innerHTML\s*=.*script/i,
      /fetch\s*\(/,
      /XMLHttpRequest/,
      /window\.location\s*=/,
      /document\.domain\s*=/
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        result.errors.push(`Potentially dangerous JavaScript pattern detected: ${pattern}`);
      }
    }

    // Check code size
    if (!result.checks.dataWithinLimits) {
      result.errors.push('JavaScript code exceeds maximum allowed size');
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  private wrapJavaScriptCode(code: string, timeoutMs: number): string {
    return `
      (function() {
        try {
          const startTime = Date.now();
          const result = ${code};
          
          // Check execution time
          if (Date.now() - startTime > ${timeoutMs}) {
            throw new Error('Execution timeout');
          }
          
          return result;
        } catch (error) {
          throw new Error('Script execution error: ' + error.message);
        }
      })();
    `;
  }

  private generateFormInjectionScript(fieldMappings: Record<string, any>): string {
    const mappingEntries = Object.entries(fieldMappings)
      .map(([fieldId, mapping]) => `${JSON.stringify(fieldId)}: ${JSON.stringify(mapping)}`)
      .join(',\n    ');

    return `
      (function() {
        const fieldMappings = {
          ${mappingEntries}
        };
        
        const results = {};
        
        for (const [fieldId, mapping] of Object.entries(fieldMappings)) {
          try {
            const element = document.querySelector(mapping.selector);
            if (element) {
              // Fill the field based on input type
              if (mapping.inputType === 'select') {
                element.value = mapping.value;
                element.dispatchEvent(new Event('change'));
              } else if (mapping.inputType === 'checkbox' || mapping.inputType === 'radio') {
                element.checked = Boolean(mapping.value);
                element.dispatchEvent(new Event('change'));
              } else {
                element.value = mapping.value;
                element.dispatchEvent(new Event('input'));
                element.dispatchEvent(new Event('change'));
              }
              
              results[fieldId] = true;
            } else {
              results[fieldId] = false;
            }
          } catch (error) {
            results[fieldId] = false;
          }
        }
        
        return results;
      })();
    `;
  }

  private generateFieldFillScript(selector: string, value: string, inputType: string): string {
    return `
      (function() {
        const element = document.querySelector(${JSON.stringify(selector)});
        if (!element) {
          throw new Error('Element not found: ${selector}');
        }
        
        element.scrollIntoView();
        element.focus();
        
        if (${JSON.stringify(inputType)} === 'select') {
          element.value = ${JSON.stringify(value)};
          element.dispatchEvent(new Event('change'));
        } else if (${JSON.stringify(inputType)} === 'checkbox' || ${JSON.stringify(inputType)} === 'radio') {
          element.checked = ${JSON.stringify(value)} === 'true' || ${JSON.stringify(value)} === true;
          element.dispatchEvent(new Event('change'));
        } else {
          element.value = ${JSON.stringify(value)};
          element.dispatchEvent(new Event('input'));
          element.dispatchEvent(new Event('change'));
        }
        
        return true;
      })();
    `;
  }

  private async waitForPageLoad(): Promise<void> {
    const maxWaitTime = 15000; // 15 seconds
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const pageInfo = await this.getPageInfo();
        if (pageInfo.ready) {
          this.state.loading = false;
          return;
        }
      } catch (error) {
        // Continue waiting
      }
      
      await new Promise(resolve => setTimeout(() => resolve(undefined), 500));
    }
    
    throw new Error('Page load timeout');
  }

  private createTimeout(ms: number, message: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }

  private getResponseSize(response: any): number {
    return JSON.stringify(response).length;
  }

  private setupEventListeners(): void {
    // This would set up actual WebView event listeners in a real implementation
    // For now, we'll just set up a placeholder structure
  }

  private createWebViewImplementation(): WebViewImplementation {
    // In a real implementation, this would return a React Native WebView instance
    // For now, we'll return a mock implementation
    return {
      loadUrl: async (_url: string) => { /* Mock implementation */ },
      executeJavaScript: async (_code: string) => { /* Mock implementation */ },
      goBack: async () => { /* Mock implementation */ },
      goForward: async () => { /* Mock implementation */ },
      reload: async () => { /* Mock implementation */ },
      clearCache: async () => { /* Mock implementation */ },
      clearCookies: async () => { /* Mock implementation */ },
      setUserAgent: async (_userAgent: string) => { /* Mock implementation */ },
      addEventListener: (_event: string, _callback: (data: any) => void) => { /* Mock implementation */ },
      removeEventListener: (_event: string, _callback: (data: any) => void) => { /* Mock implementation */ }
    };
  }

  // private notifyNavigationListeners(event: WebViewNavigationEvent): void {
  //   this.navigationListeners.forEach(callback => {
  //     try {
  //       callback(event);
  //     } catch (error) {
  //       console.warn('Navigation listener error:', error);
  //     }
  //   });
  // }
}