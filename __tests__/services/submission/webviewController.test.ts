import { WebViewController } from '../../../src/services/submission/webviewController';
import { automationScriptRegistry } from '../../../src/services/submission/automationScripts';

describe('WebViewController', () => {
  let controller: WebViewController;

  beforeEach(() => {
    controller = new WebViewController();
  });

  describe('setWebViewRef', () => {
    it('marks controller as ready after setWebViewRef', () => {
      expect(controller.isReady()).toBe(false);
      controller.setWebViewRef({ injectJavaScript: jest.fn() });
      expect(controller.isReady()).toBe(true);
    });

    it('injects wrapped JavaScript when executeScript is called', async () => {
      const injectMock = jest.fn();
      controller.setWebViewRef({ injectJavaScript: injectMock });

      // executeScript will inject code and wait for a postMessage response
      const promise = controller.executeScript({ code: '1+1', timeout: 5000, expectsResult: true });

      // Verify that injectJavaScript was called with wrapped code
      expect(injectMock).toHaveBeenCalledTimes(1);
      const injectedCode = injectMock.mock.calls[0][0] as string;
      expect(injectedCode).toContain('SCRIPT_RESULT');
      expect(injectedCode).toContain('ReactNativeWebView');

      // Extract the callback ID from the injected code.
      // The pattern in the script is: id:<JSON-string> — e.g. id:"brd_xxx"
      const idMatch = injectedCode.match(/id:"([^"]+)"/);
      expect(idMatch).not.toBeNull();
      const callbackId = idMatch![1];

      controller.handleWebViewMessage(
        JSON.stringify({ type: 'SCRIPT_RESULT', id: callbackId, result: 2 })
      );

      const result = await promise;
      expect(result).toBe(2);
    });

    it('rejects the promise when SCRIPT_ERROR is received', async () => {
      const injectMock = jest.fn();
      controller.setWebViewRef({ injectJavaScript: injectMock });

      const promise = controller.executeScript({ code: 'throw new Error("boom")', timeout: 5000, expectsResult: true });

      const injectedCode = injectMock.mock.calls[0][0] as string;
      const idMatch = injectedCode.match(/id:"([^"]+)"/);
      const callbackId = idMatch![1];

      controller.handleWebViewMessage(
        JSON.stringify({ type: 'SCRIPT_ERROR', id: callbackId, error: 'boom' })
      );

      await expect(promise).rejects.toThrow('boom');
    });
  });

  describe('handleWebViewMessage', () => {
    it('ignores non-JSON messages without throwing', () => {
      controller.setWebViewRef({ injectJavaScript: jest.fn() });
      expect(() => controller.handleWebViewMessage('not json')).not.toThrow();
    });

    it('ignores messages with unknown types', () => {
      controller.setWebViewRef({ injectJavaScript: jest.fn() });
      expect(() =>
        controller.handleWebViewMessage(JSON.stringify({ type: 'OTHER', id: 'x' }))
      ).not.toThrow();
    });

    it('ignores messages whose callback ID is not pending', () => {
      controller.setWebViewRef({ injectJavaScript: jest.fn() });
      expect(() =>
        controller.handleWebViewMessage(
          JSON.stringify({ type: 'SCRIPT_RESULT', id: 'nonexistent', result: 42 })
        )
      ).not.toThrow();
    });
  });
});

describe('automationScriptRegistry singleton', () => {
  it('is exported and has automation for JPN', () => {
    expect(automationScriptRegistry.hasAutomation('JPN')).toBe(true);
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
});
