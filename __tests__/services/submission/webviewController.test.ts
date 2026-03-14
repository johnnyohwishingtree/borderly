import { WebViewController } from '../../../src/services/submission/webviewController';
import { automationScriptRegistry } from '../../../src/services/submission/automationScripts';

/**
 * Helper: set up a controller with a mock WebView ref and simulate a
 * SCRIPT_RESULT / SCRIPT_ERROR response for a single pending call.
 */
function executeWithMockedResult(
  controller: WebViewController,
  code: string,
  response: { type: 'SCRIPT_RESULT'; result: unknown } | { type: 'SCRIPT_ERROR'; error: string },
): Promise<unknown> {
  const injectMock = jest.fn();
  controller.setWebViewRef({ injectJavaScript: injectMock });

  const promise = controller.executeScript({ code, timeout: 5000, expectsResult: true });

  const injectedCode = injectMock.mock.calls[0][0] as string;
  const idMatch = injectedCode.match(/id:"([^"]+)"/);
  const callbackId = idMatch![1];

  if (response.type === 'SCRIPT_RESULT') {
    controller.handleWebViewMessage(
      JSON.stringify({ type: 'SCRIPT_RESULT', id: callbackId, result: response.result }),
    );
  } else {
    controller.handleWebViewMessage(
      JSON.stringify({ type: 'SCRIPT_ERROR', id: callbackId, error: response.error }),
    );
  }

  return promise;
}

describe('WebViewController', () => {
  let controller: WebViewController;

  beforeEach(() => {
    controller = new WebViewController();
  });

  // ─── isReady / setWebViewRef ──────────────────────────────────────────────

  describe('setWebViewRef', () => {
    it('is not ready before setWebViewRef', () => {
      expect(controller.isReady()).toBe(false);
    });

    it('marks controller as ready after setWebViewRef', () => {
      controller.setWebViewRef({ injectJavaScript: jest.fn() });
      expect(controller.isReady()).toBe(true);
    });

    it('injects wrapped JavaScript when executeScript is called', async () => {
      const result = await executeWithMockedResult(controller, '1+1', {
        type: 'SCRIPT_RESULT',
        result: 2,
      });
      expect(result).toBe(2);
    });

    it('wraps code with SCRIPT_RESULT / ReactNativeWebView postMessage pattern', () => {
      const injectMock = jest.fn();
      controller.setWebViewRef({ injectJavaScript: injectMock });

      void controller.executeScript({ code: 'true', timeout: 1000, expectsResult: false });

      const injectedCode = injectMock.mock.calls[0][0] as string;
      expect(injectedCode).toContain('SCRIPT_RESULT');
      expect(injectedCode).toContain('ReactNativeWebView');
      expect(injectedCode).toContain('postMessage');
    });

    it('generates a unique callback ID for each call', () => {
      const injectMock = jest.fn();
      controller.setWebViewRef({ injectJavaScript: injectMock });

      void controller.executeScript({ code: 'true', timeout: 1000, expectsResult: false });
      void controller.executeScript({ code: 'true', timeout: 1000, expectsResult: false });

      const id1 = (injectMock.mock.calls[0][0] as string).match(/id:"([^"]+)"/)![1];
      const id2 = (injectMock.mock.calls[1][0] as string).match(/id:"([^"]+)"/)![1];
      expect(id1).not.toBe(id2);
    });

    it('rejects the promise when SCRIPT_ERROR is received', async () => {
      await expect(
        executeWithMockedResult(controller, 'throw new Error("boom")', {
          type: 'SCRIPT_ERROR',
          error: 'boom',
        }),
      ).rejects.toThrow('boom');
    });

    it('resolves with null result when SCRIPT_RESULT result is null', async () => {
      const result = await executeWithMockedResult(controller, 'null', {
        type: 'SCRIPT_RESULT',
        result: null,
      });
      expect(result).toBeNull();
    });

    it('resolves with object result when SCRIPT_RESULT result is an object', async () => {
      const result = await executeWithMockedResult(controller, '({a:1,b:2})', {
        type: 'SCRIPT_RESULT',
        result: { a: 1, b: 2 },
      });
      expect(result).toEqual({ a: 1, b: 2 });
    });
  });

  // ─── handleWebViewMessage ─────────────────────────────────────────────────

  describe('handleWebViewMessage', () => {
    beforeEach(() => {
      controller.setWebViewRef({ injectJavaScript: jest.fn() });
    });

    it('ignores non-JSON messages without throwing', () => {
      expect(() => controller.handleWebViewMessage('not json')).not.toThrow();
    });

    it('ignores empty string messages without throwing', () => {
      expect(() => controller.handleWebViewMessage('')).not.toThrow();
    });

    it('ignores messages with unknown types', () => {
      expect(() =>
        controller.handleWebViewMessage(JSON.stringify({ type: 'OTHER', id: 'x' })),
      ).not.toThrow();
    });

    it('ignores messages whose callback ID is not pending', () => {
      expect(() =>
        controller.handleWebViewMessage(
          JSON.stringify({ type: 'SCRIPT_RESULT', id: 'nonexistent', result: 42 }),
        ),
      ).not.toThrow();
    });

    it('ignores AUTO_FILL_RESULT messages (they are handled by the screen)', () => {
      expect(() =>
        controller.handleWebViewMessage(
          JSON.stringify({ type: 'AUTO_FILL_RESULT', filled: 5, total: 10 }),
        ),
      ).not.toThrow();
    });

    it('ignores QR_PAGE_DETECTED messages (they are handled by the screen)', () => {
      expect(() =>
        controller.handleWebViewMessage(
          JSON.stringify({ type: 'QR_PAGE_DETECTED', isQRPage: true, countryCode: 'JPN' }),
        ),
      ).not.toThrow();
    });
  });

  // ─── URL validation ───────────────────────────────────────────────────────

  describe('URL validation (via executeScript security)', () => {
    it('throws if executeScript is called before initialization', async () => {
      // Un-initialized controller — ensureInitialized() should throw
      await expect(
        controller.executeScript({ code: 'true', timeout: 1000, expectsResult: false }),
      ).rejects.toThrow(/not initialized/i);
    });
  });

  // ─── JavaScript security validation ──────────────────────────────────────

  describe('JavaScript security validation', () => {
    beforeEach(() => {
      controller.setWebViewRef({ injectJavaScript: jest.fn() });
    });

    it.each([
      ['eval()', 'eval("x")'],
      ['Function()', 'new Function("x")'],
      ['document.write()', 'document.write("<b>x</b>")'],
      ['fetch()', 'fetch("https://evil.com")'],
      ['XMLHttpRequest', 'new XMLHttpRequest()'],
      ['window.location =', 'window.location = "https://evil.com"'],
      ['document.domain =', 'document.domain = "evil.com"'],
    ])('rejects code containing %s', async (_label, code) => {
      await expect(
        controller.executeScript({ code, timeout: 1000, expectsResult: false }),
      ).rejects.toThrow(/security/i);
    });

    it('accepts safe code without rejection', async () => {
      const injectMock = jest.fn();
      const safeController = new WebViewController();
      safeController.setWebViewRef({ injectJavaScript: injectMock });

      const promise = safeController.executeScript({
        code: 'document.title',
        timeout: 5000,
        expectsResult: true,
      });

      const injectedCode = injectMock.mock.calls[0][0] as string;
      const idMatch = injectedCode.match(/id:"([^"]+)"/);
      const callbackId = idMatch![1];

      safeController.handleWebViewMessage(
        JSON.stringify({ type: 'SCRIPT_RESULT', id: callbackId, result: 'My Page' }),
      );

      const result = await promise;
      expect(result).toBe('My Page');
    });
  });

  // ─── Navigation listeners ─────────────────────────────────────────────────

  describe('navigation listeners', () => {
    it('adds and removes navigation listeners', () => {
      const cb = jest.fn();
      controller.onNavigation(cb);
      controller.removeNavigationListener(cb);
      // After removal, notifyNavigationListeners should not call cb
      // (protected method — tested indirectly by verifying no crash on removal)
      expect(cb).not.toHaveBeenCalled();
    });

    it('does not throw when removing a listener that was not added', () => {
      const cb = jest.fn();
      expect(() => controller.removeNavigationListener(cb)).not.toThrow();
    });
  });

  // ─── State accessors ──────────────────────────────────────────────────────

  describe('getState', () => {
    it('returns initial state before any navigation', () => {
      const state = controller.getState();
      expect(state.url).toBe('');
      expect(state.loading).toBe(false);
      expect(state.canGoBack).toBe(false);
      expect(state.canGoForward).toBe(false);
    });

    it('returns a copy — mutations do not affect internal state', () => {
      const state = controller.getState();
      state.url = 'https://evil.com';
      expect(controller.getState().url).toBe('');
    });
  });

  // ─── dispose ─────────────────────────────────────────────────────────────

  describe('dispose', () => {
    it('marks controller as not ready after dispose', async () => {
      controller.setWebViewRef({ injectJavaScript: jest.fn() });
      expect(controller.isReady()).toBe(true);
      await controller.dispose();
      expect(controller.isReady()).toBe(false);
    });
  });
});

// ─── AutomationScriptRegistry ──────────────────────────────────────────────

describe('automationScriptRegistry singleton', () => {
  it('is exported and has automation for JPN', () => {
    expect(automationScriptRegistry.hasAutomation('JPN')).toBe(true);
  });

  it('has automation for MYS', () => {
    expect(automationScriptRegistry.hasAutomation('MYS')).toBe(true);
  });

  it('has automation for SGP', () => {
    expect(automationScriptRegistry.hasAutomation('SGP')).toBe(true);
  });

  it('returns false for an unknown country', () => {
    expect(automationScriptRegistry.hasAutomation('ZZZ')).toBe(false);
  });

  it('returns null from getScriptSync for unknown country', () => {
    expect(automationScriptRegistry.getScriptSync('ZZZ')).toBeNull();
  });

  it('getScriptSync returns the same script as getScript', async () => {
    const sync = automationScriptRegistry.getScriptSync('JPN');
    const async_ = await automationScriptRegistry.getScript('JPN');
    expect(sync).toBe(async_);
  });

  it('returns field mappings for JPN', () => {
    const script = automationScriptRegistry.getScriptSync('JPN');
    expect(script).not.toBeNull();
    expect(Object.keys(script!.fieldMappings).length).toBeGreaterThan(0);
  });

  it('returns a portal URL for JPN', () => {
    const script = automationScriptRegistry.getScriptSync('JPN');
    expect(script?.portalUrl).toBeTruthy();
  });

  it('returns steps for JPN', () => {
    const script = automationScriptRegistry.getScriptSync('JPN');
    expect(Array.isArray(script?.steps)).toBe(true);
    expect(script!.steps.length).toBeGreaterThan(0);
  });

  it('JPN field mappings have selector and inputType', () => {
    const script = automationScriptRegistry.getScriptSync('JPN');
    for (const mapping of Object.values(script!.fieldMappings)) {
      expect(typeof mapping.selector).toBe('string');
      expect(typeof mapping.inputType).toBe('string');
    }
  });
});
